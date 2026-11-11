import { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { fetchWeatherInBoundingBox } from "./fetchWeatherServices.js";
import { assignVoronoiPolygonsToWeatherRows } from "../voronoi-diagram-generator/voronoiGenerator.js";
import { tileCache, TILE_SIZE } from "../globalVariables.js";
import { WeatherRow } from "./weatherParserType.js";
import { computeBoundingBoxFromTiles } from "../tile-manager/tileCache.js";
import { waitForTilesToLoad } from "./stationQueue.js";

dotenv.config();

/**
 * Registers the `/upload-weather-csv` endpoint.
 *
 * - Waits for all tiles to load their station data.
 * - Fetches weather data for the visible tiles' bounding box.
 * - Assigns Voronoi polygons to the weather rows.
 *
 * @param app - Express application instance.
 * @param fetchWeather - Optional dependency-injected function for fetching weather data.
 */
export function registerWeatherCSVHandler(
  app: Express,
  fetchWeather = fetchWeatherInBoundingBox
) {
  app.post("/upload-weather-csv", async (_req: Request, res: Response) => {
    try {
      const tileKeys = Array.from(tileCache.loadedTiles);
      await waitForTilesToLoad(tileKeys);
      const bbox = computeBoundingBoxFromTiles(
        tileCache.loadedTiles,
        TILE_SIZE
      );
      if (!bbox) {
        return;
      }
      const stations: WeatherRow[] = await fetchWeather(bbox);

      const stationsWithPolygons = assignVoronoiPolygonsToWeatherRows(
        stations,
        bbox
      );

      res.status(200).json(stationsWithPolygons);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });
}
