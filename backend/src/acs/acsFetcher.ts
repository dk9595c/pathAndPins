import dotenv from "dotenv";
dotenv.config();


const ACS_YEAR = process.env.ACS_YEAR || "2021";


type Dataset = "base" | "subject" | "profile" | "cprofile";

const DATASET_PATH: Record<Dataset, string> = {
  base: "",
  subject: "/subject",
  profile: "/profile",
  cprofile: "/cprofile"
};

/** Returns the endpoint a variable lives on, or null for geography fields like NAME. */
function datasetForVariable(variable: string): Dataset | null {
  // Allow the Census `group(S2802)` shorthand
  const name = variable.trim().replace(/^group\(/i, "").replace(/\)$/, "").toUpperCase();
  if (/^DP\d/.test(name)) return "profile";
  if (/^CP\d/.test(name)) return "cprofile";
  if (/^S\d/.test(name)) return "subject";
  if (/^[BC]\d/.test(name)) return "base";
  return null;
}

export async function fetchACSData(
  lat: string | undefined,
  lon: string | undefined,
  variables: string,
  topLevel: string,
  bottomLevel: string
): Promise<any> {
  const apiKey = process.env.CENSUS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing CENSUS_API_KEY in .env file");
  }

  const normalizedTop = topLevel.toLowerCase();
  const normalizedBottom = bottomLevel.toLowerCase();

  let stateCode = "";
  let countyCode = "";

  // Reverse geocode ONLY if topLevel needs coordinates (e.g., state or county)
  if (normalizedTop !== "all") {
    if (!lat || !lon) {
      throw new Error(`Latitude and longitude are required when topLevel is '${topLevel}'`);
    }

    const geoUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${encodeURIComponent(
      lon
    )}&y=${encodeURIComponent(lat)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;

    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) {
      throw new Error(`Census Geocoder API returned HTTP status ${geoResponse.status}`);
    }

    const geoData = (await geoResponse.json()) as any;
    const geographies = geoData.result?.geographies;

    const states = geographies?.States || geographies?.["2020 Census Blocks"] || [];
    if (states.length === 0) {
      throw new Error(`Census Geocoder found no state for coordinates (${lat}, ${lon})`);
    }
    stateCode = String(states[0].STATE).padStart(2, "0");

    const counties = geographies?.Counties || [];
    if (counties.length > 0) {
      countyCode = String(counties[0].COUNTY).padStart(3, "0");
    } else if (normalizedTop === "county") {
      // No silent fallback to a default county
      throw new Error(`Census Geocoder found no county for coordinates (${lat}, ${lon})`);
    }
  }

  // Build Census 'for' and 'in' clauses based on both topLevel and bottomLevel
  let forClause = "";
  let inClause = "";

  if (normalizedTop === "all") {
    if (normalizedBottom === "state") {
      forClause = "state:*";
    } else if (normalizedBottom === "county") {
      forClause = "county:*";
      inClause = "&in=state:*";
    } else if (normalizedBottom === "place" || normalizedBottom === "city") {
      forClause = "place:*";
      inClause = "&in=state:*";
    }
  } else if (normalizedTop === "state") {
    inClause = `&in=state:${stateCode}`;
    if (normalizedBottom === "county") {
      forClause = "county:*";
    } else if (normalizedBottom === "place" || normalizedBottom === "city") {
      forClause = "place:*";
    }
  } else if (normalizedTop === "county") {
    inClause = `&in=state:${stateCode}%20county:${countyCode}`;
    forClause = "county subdivision:*";
  }

  if (!forClause) {
    throw new Error(`Unsupported combination: topLevel '${topLevel}' with bottomLevel '${bottomLevel}'`);
  }

  const varList = variables
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (!varList.includes("NAME")) {
    varList.unshift("NAME");
  }
  const cleanVariables = varList.join(",");


  const datasets = new Set(varList.map(datasetForVariable).filter((d): d is Dataset => d !== null));
  if (datasets.size > 1) {
    throw new Error(
      `Variables come from different ACS datasets (${[...datasets].join(", ")}) and the Census API ` +
        `can't combine them in one request. Request them separately.`
    );
  }
  const dataset: Dataset = [...datasets][0] ?? "base";

  const acsUrl = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5${DATASET_PATH[dataset]}?get=${cleanVariables}&for=${forClause}${inClause}&key=${apiKey}`;
  console.log(`\n[Census ACS] Fetching: ${acsUrl.replace(apiKey, "***")}`);

  const acsResponse = await fetch(acsUrl);
  const textResponse = await acsResponse.text();

  if (!acsResponse.ok) {
    throw new Error(
      `ACS API error (${acsResponse.status}) from ${ACS_YEAR} acs5 ${dataset} dataset: ${textResponse.slice(0, 150)}`
    );
  }

  try {
    return JSON.parse(textResponse);
  } catch {
    throw new Error(`Invalid JSON received from ACS endpoint: ${textResponse.slice(0, 150)}`);
  }
}
