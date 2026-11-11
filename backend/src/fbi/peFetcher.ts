import { makeTables32 } from "../csv/tables32.js";
import { toReadable } from "../csv/utils.js";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const FBI_BASE_URL = "https://api.usa.gov/crime/fbi/cde";
const FIRST_YEAR = 2010;
const DATA_LAG_YEARS = 2;
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
  if (cachedRecords) return cachedRecords;
  const csvPath = path.resolve("data", "Law-Enforcement-Agency-Identifiers-Crosswalk-2012.csv");
  cachedHandle = await t32Manager.parseCSV(toReadable({ kind: "file", path: csvPath }));
  const records = t32Manager.getData(cachedHandle);
  if (!records) throw new Error("Unable to retrieve records from crosswalk CSV");
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
  const geoUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${encodeURIComponent(lon)}&y=${encodeURIComponent(lat)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
  const response = await fetch(geoUrl);
  if (!response.ok) throw new Error(`Census Geocoder error with status ${response.status}`);

  const geoJson = (await response.json()) as any;
  const geographies = geoJson.result?.geographies;

  const states = geographies?.States || geographies?.["2020 Census Blocks"] || [];
  if (states.length === 0) throw new Error(`Census Geocoder found no state for coordinates (${lat}, ${lon})`);
  const stateCode = String(states[0].STATE).padStart(2, "0");

  const counties = geographies?.Counties || [];
  const countyCode = counties.length > 0 ? String(counties[0].COUNTY).padStart(3, "0") : undefined;

  const places = geographies?.["Incorporated Places"] || geographies?.["Census Designated Places"] || [];
  const placeCode = places.length > 0 ? String(places[0].PLACE).padStart(5, "0") : undefined;

  return { stateCode, countyCode, fullFips: countyCode ? `${stateCode}${countyCode}` : undefined, placeCode };
}

function findAgencyRow(
  crosswalk: Record<string, string>[],
  geo: GeocodedLocation
): Record<string, string> | undefined {
  if (geo.placeCode) {
    const byPlace = crosswalk.find(
      (row) => row.ORI9 && row.FIPS_ST === geo.stateCode && row.FPLACE === geo.placeCode
    );
    if (byPlace) return byPlace;
  }
  if (geo.countyCode) {
    return crosswalk.find(
      (row) =>
        row.ORI9 &&
        (row.FIPS === geo.fullFips || (row.FIPS_ST === geo.stateCode && row.FIPS_COUNTY === geo.countyCode))
    );
  }
  return undefined;
}

export interface EmploymentData {
  year: number;
  officerCount: number;
  civilianCount: number;
  totalEmployees: number;
  officersPer1000: number;
  granularity: string;
  identifier: string;
}

export type PEFetcher = (
  lat: string,
  lon: string,
  granularity: "national" | "state" | "agency"
) => Promise<EmploymentData>;

export async function fetchEmployment(
  lat: string,
  lon: string,
  granularity: "national" | "state" | "agency"
): Promise<EmploymentData> {
  const apiKey = process.env.DATA_GOV_API_KEY || process.env.FBI_API_KEY || "DEMO_KEY";
  const lastYear = Number(process.env.FBI_LAST_DATA_YEAR) || new Date().getFullYear() - DATA_LAG_YEARS;

  let targetIdentifier: string;
  let paths: string[];

  if (granularity === "national") {
    targetIdentifier = "national";
    paths = ["pe"];
  } else {
    const geo = await reverseGeocode(lat, lon);
    const stateAbbr = STATE_ABBR_BY_FIPS[geo.stateCode];
    if (!stateAbbr) throw new Error(`No state abbreviation known for FIPS code ${geo.stateCode}`);

    if (granularity === "state") {
      targetIdentifier = stateAbbr;
      paths = [`pe/${encodeURIComponent(stateAbbr)}`];
    } else {
      const row = findAgencyRow(await getCrosswalkData(), geo);
      if (!row) throw new Error(`Unable to find an FBI ORI code for coordinates (${lat}, ${lon})`);
      const ori = row.ORI9;
      if (DEBUG) console.log(`[FBI API PE] Crosswalk agency: ${ori} ${row.NAME ?? row.ADDRESS_NAME ?? ""}`);

      targetIdentifier = ori;
      paths = [
        `pe/${encodeURIComponent(stateAbbr)}/${encodeURIComponent(ori)}`,
        `pe/agency/${encodeURIComponent(ori)}/byYearRange`
      ];
    }
  }

  const failures: string[] = [];

  for (const p of paths) {
    const baseUrl = `${FBI_BASE_URL}/${p}?from=${FIRST_YEAR}&to=${lastYear}`;
    console.log(`\n[FBI API PE] Fetching: ${baseUrl}&API_KEY=***`);

    const resp = await fetch(`${baseUrl}&API_KEY=${encodeURIComponent(apiKey)}`);
    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[FBI API PE] Error ${resp.status}: ${errText}`);
      failures.push(`${p} -> HTTP ${resp.status}: ${errText.slice(0, 150)}`);
      continue;
    }

    const json: unknown = await resp.json();
    if (DEBUG) {
      const topKeys = json && typeof json === "object" ? Object.keys(json) : typeof json;
      console.log("[FBI API PE] Top-level shape:", topKeys);
      console.log("[FBI API PE] Response sample:", JSON.stringify(json).slice(0, 1500));
    }

    try {
      return summarizeEmployment(json, targetIdentifier, granularity);
    } catch (err) {
      failures.push(`${p} -> ${(err as Error).message}`);
    }
  }

  throw new Error(
    `No employment data from FBI API for ${targetIdentifier}. ${failures.join(" | ")}` +
      (DEBUG ? "" : " (set FBI_DEBUG=1 to inspect the response)")
  );
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

interface Row {
  year: number;
  metric: string;
  value: number;
}

const PERIOD_KEY = /^(?:\d{1,2}-)?(\d{4})$/;
const NOT_A_COUNT = /\b(rates?|per|populations?|percent|pct|participated)\b/;
const GENDER = /\b(male|female|men|women)\b/;

function toCount(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v !== "number" && typeof v !== "string") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function norm(metric: string): string {
  return metric.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function collectRows(node: unknown, trail: string[], out: Row[]): void {
  if (node === null || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const rec = item as Record<string, unknown>;
        const rawYear = rec.data_year ?? rec.year;
        if (rawYear !== undefined && !Number.isNaN(Number(rawYear))) {
          for (const [k, v] of Object.entries(rec)) {
            if (k === "data_year" || k === "year") continue;
            const n = toCount(v);
            if (n !== undefined) out.push({ year: Number(rawYear), metric: [...trail, k].join(" > "), value: n });
          }
          continue;
        }
      }
      collectRows(item, trail, out);
    }
    return;
  }

  for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
    const period = PERIOD_KEY.exec(key);
    if (period && (typeof child === "number" || typeof child === "string" || child === null)) {
      const n = toCount(child);
      if (n !== undefined) out.push({ year: Number(period[1]), metric: trail.join(" > "), value: n });
    } else {
      collectRows(child, [...trail, key], out);
    }
  }
}

function resolveCount(metrics: Map<string, number>, role: RegExp): number | undefined {
  const matching = [...metrics].filter(([k]) => role.test(norm(k)));
  if (matching.length === 0) return undefined;
  const aggregate = matching.find(([k]) => !GENDER.test(norm(k)));
  if (aggregate) return aggregate[1];
  return matching.reduce((sum, [, v]) => sum + v, 0);
}

function resolveOfficersPer1000(metrics: Map<string, number>, officerCount: number): number {
  for (const [k, v] of metrics.entries()) {
    const nk = norm(k);
    const mentionsRate = nk.includes("rate") || nk.includes("per 1000") || nk.includes("per 1k");
    const mentionsOfficers = nk.includes("officer") || nk.includes("sworn") || nk.includes("pe");
    if (mentionsRate && mentionsOfficers) {
      return Number(v);
    }
  }

  for (const [k, v] of metrics.entries()) {
    const nk = norm(k);
    if (nk.includes("rate") || nk.includes("per 1000") || nk.includes("per 1k")) {
      return Number(v);
    }
  }

  for (const [k, v] of metrics.entries()) {
    const nk = norm(k);
    if (nk.includes("population") || nk === "pop") {
      if (v > 0 && officerCount > 0) {
        return Number(((officerCount / v) * 1000).toFixed(2));
      }
    }
  }

  return 0;
}

function summarizeEmployment(json: unknown, targetIdentifier: string, granularity: string): EmploymentData {
  const rows: Row[] = [];
  collectRows(json, [], rows);
  if (rows.length === 0) {
    throw new Error("response contained no numeric values (all null or an unrecognised shape)");
  }

  const byYearAllMetrics = new Map<number, Map<string, number>>();
  const byYearCounts = new Map<number, Map<string, number>>();

  for (const r of rows) {
    const allMetrics = byYearAllMetrics.get(r.year) ?? new Map<string, number>();
    allMetrics.set(r.metric, r.value);
    byYearAllMetrics.set(r.year, allMetrics);

    if (!NOT_A_COUNT.test(norm(r.metric))) {
      const countMetrics = byYearCounts.get(r.year) ?? new Map<string, number>();
      countMetrics.set(r.metric, r.value);
      byYearCounts.set(r.year, countMetrics);
    }
  }

  const years = [...byYearAllMetrics.keys()].sort((a, b) => b - a);
  for (const year of years) {
    const countMetrics = byYearCounts.get(year) ?? new Map<string, number>();
    const allMetrics = byYearAllMetrics.get(year) ?? new Map<string, number>();

    const officerCount = resolveCount(countMetrics, /\b(officers?|sworn)\b/) ?? 0;
    const civilianCount = resolveCount(countMetrics, /\bcivilians?\b/) ?? 0;

    let totalEmployees = officerCount + civilianCount;
    if (totalEmployees === 0) {
      totalEmployees = resolveCount(countMetrics, /\btotal\b/) ?? 0;
    }

    if (totalEmployees > 0) {
      const officersPer1000 = resolveOfficersPer1000(allMetrics, officerCount);
      return {
        year,
        officerCount,
        civilianCount,
        totalEmployees,
        officersPer1000,
        granularity,
        identifier: targetIdentifier
      };
    }
  }

  throw new Error("no non-null employment counts found");
}
