import { Express, Request, Response } from "express";
import { activityCache } from "../globalVariables.js";
import {
  fetchActivityDataFromGoogleSheet,
  transformToLonLatMap,
} from "./activityDataFetcher.js";

/**
 * Registers an Express POST endpoint (`/upload-csv`) that fetches,
 * parses, and caches activity data.
 *
 * - Fetches activity data using the provided fetch function
 *   (defaults to Google Sheets CSV).
 * - Transforms parsed rows into a map keyed by latitude/longitude.
 * - Stores the map in the global `activityCache`.
 * - Returns a JSON response indicating success or failure.
 *
 * @param app - The Express application instance.
 * @param fetchCSV - Optional fetch function for retrieving CSV data.
 */
export function registerCSVHandler(
  app: Express,
  fetchCSV = fetchActivityDataFromGoogleSheet
) {
  app.post("/upload-csv", async (req: Request, res: Response) => {
    try {
      const parsedObjects = await fetchCSV(process.env.SPREADSHEET!);
      const map = transformToLonLatMap(parsedObjects);
      activityCache.activityMap = map;

      res.status(200).json({
        success: true,
        message: "CSV uploaded and cached successfully.",
        count: parsedObjects.length,
      });
    } catch (error) {}
  });
}
