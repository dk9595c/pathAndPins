import { parseCSV, getFromFile } from "../utils/parserUtils.js";
import { RowSchema } from "./InitialLocParserType.js";

/**
 * Type representing a validated activity location row,
 * derived from `RowSchema`.
 */
export type ActivityRow = typeof RowSchema._output;

/**
 * Fetches and parses activity location data from a local CSV file.
 *
 * - Reads the CSV file from the given path.
 * - Parses rows according to `RowSchema`.
 * - Returns validated activity location rows.
 *
 * @param filePath - Path to the local CSV file.
 * @returns A promise resolving to an array of activity rows.
 */
export function fetchLocDataFromFile(filePath: string): Promise<ActivityRow[]> {
  const getCSV = getFromFile(filePath);
  return parseCSV(getCSV, RowSchema);
}
