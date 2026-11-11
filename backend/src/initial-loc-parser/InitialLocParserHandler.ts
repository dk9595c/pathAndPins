import { Express, Request, Response } from "express";
import { fetchLocDataFromFile } from "./InitialLocDataFetcher.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Registers the `/activityLocations` endpoint.
 *
 * Responsibilities:
 * - Reads an initial CSV file containing activity location data.
 * - Parses the file into structured objects.
 * - Returns the parsed data and count in the response.
 *
 * Error Handling:
 * - Responds with `500` if CSV parsing fails.
 *
 * @param app - The Express application instance.
 */
export function registerInitLocationHandler(app: Express) {
  app.get("/activityLocations", async (req: Request, res: Response) => {
    try {
      const csvPath = path.join(__dirname, "../initial-loc-parser/sample.csv");
      const parsedObjects = await fetchLocDataFromFile(csvPath);

      res.status(200).json({
        count: parsedObjects.length,
        data: parsedObjects,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });
}
