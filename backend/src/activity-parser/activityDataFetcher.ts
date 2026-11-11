import { parseCSV, getFromAPI, getFromFile } from "../utils/parserUtils.js";
import { RowSchema } from "./activityParserType.js";

import NodeCache from "node-cache";

/**
 * Represents a validated row of activity data
 * parsed according to the `RowSchema`.
 */
export type ActivityRow = typeof RowSchema._output;

/**
 * In-memory cache for storing fetched activity data.
 * Each entry is cached for 10 minutes (`stdTTL: 600s`).
 */
const activityCache = new NodeCache({ stdTTL: 60 * 10 });

/**
 * Fetches activity data from a Google Sheet published as CSV.
 *
 * - Retrieves the CSV from the given `sheetUrl`.
 * - Parses rows according to `RowSchema`.
 * - Results are cached in memory for 10 minutes, keyed by the sheet URL.
 *
 * @param sheetUrl - Publicly accessible Google Sheets CSV URL.
 * @returns A promise resolving to an array of validated activity rows.
 *
 */
export async function fetchActivityDataFromGoogleSheet(
  sheetUrl: string
): Promise<ActivityRow[]> {
  const cacheKey = `sheet:${sheetUrl}`;
  const cached = activityCache.get<ActivityRow[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const getCSV = getFromAPI(sheetUrl);
  const parsed = await parseCSV(getCSV, RowSchema);

  activityCache.set(cacheKey, parsed);
  return parsed;
}

/**
 * Fetches activity data from a local CSV file.
 *
 * - Useful for testing and mocking without relying on a live Google Sheet.
 * - Parses rows according to `RowSchema`.
 *
 * @param filePath - Path to a local CSV file containing activity data.
 * @returns A promise resolving to an array of validated activity rows.
 */
export function fetchActivityDataFromFile(
  filePath: string
): Promise<ActivityRow[]> {
  const getCSV = getFromFile(filePath);
  return parseCSV(getCSV, RowSchema);
}

/**
 * Transforms an array of activity rows into a lookup map keyed by
 * geographic coordinates (`lat,lng`).
 *
 * - Ensures fast lookup of activity data by coordinate.
 * - Last occurrence of a coordinate will overwrite earlier ones.
 *
 * @param activities - Array of validated activity rows.
 * @returns A map where keys are `"lat,lng"` strings and values are `ActivityRow` objects.
 *
 * @example
 * ```ts
 * const activities = await fetchActivityDataFromFile("./activities.csv");
 * const map = transformToLonLatMap(activities);
 * console.log(map["40.7128,-74.0060"]); // ActivityRow at NYC coords
 * ```
 */
export function transformToLonLatMap(activities: ActivityRow[]) {
  const finalMap: Record<string, ActivityRow> = {};

  for (const activity of activities) {
    const key = `${activity.lat},${activity.lng}`;
    finalMap[key] = activity;
  }

  return finalMap;
}
