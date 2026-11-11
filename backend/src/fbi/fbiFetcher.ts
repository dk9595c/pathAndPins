import { makeTables32 } from "../csv/tables32.js";
import { toReadable } from "../csv/utils.js";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const FBI_BASE_URL = "https://api.usa.gov/crime/fbi/cde";
const FIRST_YEAR = 2010;
// Arrest data lags the calendar by a year or two, and asking for a year that hasn't been published yet is a needless way to get errors or empty results.
// Set FBI_LAST_DATA_YEAR to override.
const DATA_LAG_YEARS = 2;
// Set FBI_DEBUG=1 to print the raw shape of the API response.
const DEBUG = process.env.FBI_DEBUG === "1";

const STATE_ABBR_BY_FIPS: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY", "72": "PR"
};

const t32Manager = makeTables32();
let cachedHandle: any = null;
let cachedRecords: Record<string, string>[] | null = null;

async function getCrosswalkData(): Promise<Record<string, string>[]> {
  if (cachedRecords) {
    return cachedRecords;
  }
  const csvPath = path.resolve("data", "Law-Enforcement-Agency-Identifiers-Crosswalk-2012.csv");
  cachedHandle = await t32Manager.parseCSV(toReadable({ kind: "file", path: csvPath }));
  const records = t32Manager.getData(cachedHandle);
  if (!records) {
    throw new Error("Unable to retrieve records from crosswalk CSV");
  }
  cachedRecords = records;
  return cachedRecords;
}

interface GeocodedLocation {
  stateCode: string;
  countyCode?: string;
  fullFips?: string;
  placeCode?: string;
}

async function reverseGeocode(lat: string, lon: string): Promise<GeocodedLocation> {
  const geoUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${encodeURIComponent(
    lon
  )}&y=${encodeURIComponent(lat)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;

  const response = await fetch(geoUrl);
  if (!response.ok) {
    throw new Error(`Census Geocoder error with status ${response.status}`);
  }

  const geoJson = (await response.json()) as any;
  const geographies = geoJson.result?.geographies;


  const states = geographies?.States || geographies?.["2020 Census Blocks"] || [];
  if (states.length === 0) {
    throw new Error(`Census Geocoder found no state for coordinates (${lat}, ${lon})`);
  }
  const stateCode = String(states[0].STATE).padStart(2, "0");

  const counties = geographies?.Counties || [];
  const countyCode = counties.length > 0 ? String(counties[0].COUNTY).padStart(3, "0") : undefined;

  const places = geographies?.["Incorporated Places"] || geographies?.["Census Designated Places"] || [];
  const placeCode = places.length > 0 ? String(places[0].PLACE).padStart(5, "0") : undefined;

  return {
    stateCode,
    countyCode,
    fullFips: countyCode ? `${stateCode}${countyCode}` : undefined,
    placeCode
  };
}

/**
 * Finds the 9-character ORI the CDE agency endpoint expects. A match on the
 * Census place wins over a county-level match, and there is deliberately no
 * "any agency in the state" fallback, since that returns an unrelated agency.
 */
function findOri(crosswalk: Record<string, string>[], geo: GeocodedLocation): string {
  if (geo.placeCode) {
    const byPlace = crosswalk.find(
      (row) => row.ORI9 && row.FIPS_ST === geo.stateCode && row.FPLACE === geo.placeCode
    );
    if (byPlace) return byPlace.ORI9;
  }

  if (geo.countyCode) {
    const byCounty = crosswalk.find(
      (row) =>
        row.ORI9 &&
        (row.FIPS === geo.fullFips || (row.FIPS_ST === geo.stateCode && row.FIPS_COUNTY === geo.countyCode))
    );
    if (byCounty) return byCounty.ORI9;
  }

  return "";
}

interface SeriesPoint {
  series: string;
  year: number;
  value: number;
}

// Matches 2021 or 03-2021
const PERIOD_KEY = /^(?:\d{1,2}-)?(\d{4})$/;

function toCount(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v !== "number" && typeof v !== "string") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Walks whatever JSON the API returns and collects (series, year, value) points.
 * Handles both a flat array of {data_year, value}-style records and nested
 * "series name -> period -> count" maps, since the response shape isn't
 * documented well.
 */
function collectPoints(node: unknown, trail: string[], out: SeriesPoint[]): void {
  if (node === null || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const rec = item as Record<string, any>;
        const yr = rec.data_year ?? rec.year;
        if (yr !== undefined && yr !== null) {
          const val = toCount(
            rec.value ?? rec.actual ?? rec.arrests ?? rec.total ?? rec.count ?? rec.Arrest ?? rec.Count
          );
          if (val !== undefined && !Number.isNaN(Number(yr))) {
            out.push({ series: trail.join(" > "), year: Number(yr), value: val });
          }
          continue;
        }
      }
      collectPoints(item, trail, out);
    }
    return;
  }

  for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
    const period = PERIOD_KEY.exec(key);
    if (period && (typeof child === "number" || typeof child === "string" || child === null)) {
      const val = toCount(child);
      if (val !== undefined) {
        out.push({ series: trail.join(" > "), year: Number(period[1]), value: val });
      }
    } else {
      collectPoints(child, [...trail, key], out);
    }
  }
}

export async function fetchArrests(
  lat: string,
  lon: string,
  granularity: "national" | "state" | "agency"
): Promise<{
  year: number;
  totalArrests: number;
  granularity: string;
  identifier: string;
}> {
  const apiKey = process.env.DATA_GOV_API_KEY || process.env.FBI_API_KEY || "DEMO_KEY";
  const lastYear = Number(process.env.FBI_LAST_DATA_YEAR) || new Date().getFullYear() - DATA_LAG_YEARS;

  let pathPart: string;
  let targetIdentifier: string;

  if (granularity === "national") {
    // No geocoding or crosswalk needed for a national query
    targetIdentifier = "national";
    pathPart = "arrest/national/all";
  } else {
    const geo = await reverseGeocode(lat, lon);

    if (granularity === "state") {
      const stateAbbr = STATE_ABBR_BY_FIPS[geo.stateCode];
      if (!stateAbbr) {
        throw new Error(`No state abbreviation known for FIPS code ${geo.stateCode}`);
      }
      targetIdentifier = stateAbbr;
      pathPart = `arrest/state/${encodeURIComponent(stateAbbr)}/all`;
    } else {
      const ori = findOri(await getCrosswalkData(), geo);
      if (!ori) {
        throw new Error(`Unable to find an FBI ORI code for coordinates (${lat}, ${lon})`);
      }
      targetIdentifier = ori;
      pathPart = `arrest/agency/${encodeURIComponent(ori)}/all`;
    }
  }

  // The CDE rejects arrest requests without a 'type' ("Invalid 'type'", HTTP 400).
  const query = new URLSearchParams({
    type: "counts",
    from: `01-${FIRST_YEAR}`,
    to: `12-${lastYear}`
  });
  const baseUrl = `${FBI_BASE_URL}/${pathPart}?${query}`;

  // Log the URL without the API key
  console.log(`\n[FBI API] Fetching: ${baseUrl}&API_KEY=***`);

  const resp = await fetch(`${baseUrl}&API_KEY=${encodeURIComponent(apiKey)}`);
  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[FBI API] Error ${resp.status}: ${errText}`);
    throw new Error(`FBI API returned HTTP ${resp.status}: ${errText.slice(0, 150)}`);
  }

  const json: unknown = await resp.json();

  if (DEBUG) {
    const topKeys = json && typeof json === "object" ? Object.keys(json) : typeof json;
    console.log("[FBI API] Top-level shape:", topKeys);
    console.log("[FBI API] Response sample:", JSON.stringify(json).slice(0, 1500));
  }

  const points: SeriesPoint[] = [];
  collectPoints(json, [], points);

  if (points.length === 0) {
    throw new Error(
      `No records returned from FBI API for ${targetIdentifier} (set FBI_DEBUG=1 to inspect the response)`
    );
  }

  // Totals per series, per year
  const bySeries = new Map<string, Map<number, number>>();
  for (const p of points) {
    const years = bySeries.get(p.series) ?? new Map<number, number>();
    years.set(p.year, (years.get(p.year) ?? 0) + p.value);
    bySeries.set(p.series, years);
  }

  // A flat response has one series. A nested one can carry many overlapping offense series, so prefer a single series labelled as a total, and warn if we have to sum everything.
  let chosen = [...bySeries.keys()];
  if (chosen.length > 1) {
    const totalSeries = chosen.filter((s) => /\btotal\b/i.test(s));
    if (totalSeries.length === 1) {
      chosen = totalSeries;
    } else {
      console.warn(
        `[FBI API] ${chosen.length} series in the response and none is a single "total"; ` +
          `summing them all may double-count overlapping offense levels. ` +
          `Run with FBI_DEBUG=1 to inspect the shape.`
      );
    }
  }

  // Group and sum arrest totals by year
  const yearlyTotals: Record<number, number> = {};
  for (const name of chosen) {
    for (const [yr, total] of bySeries.get(name)!) {
      yearlyTotals[yr] = (yearlyTotals[yr] || 0) + total;
    }
  }

  // Find the most recent year with greater than 0 total arrests
  const sortedYears = Object.keys(yearlyTotals).map(Number).sort((a, b) => b - a);

  for (const yr of sortedYears) {
    if (yearlyTotals[yr] > 0) {
      return {
        year: yr,
        totalArrests: yearlyTotals[yr],
        granularity,
        identifier: targetIdentifier
      };
    }
  }

  throw new Error(`No non-null arrest records found across available reporting years for ${targetIdentifier}`);
}
