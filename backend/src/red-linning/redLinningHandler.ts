import { Express, Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import { redliningCache, tileCache, TILE_SIZE } from "../globalVariables.js";
import { computeBoundingBoxFromTiles } from "../tile-manager/tileCache.js";
import { GeoJsonSchema } from "./redLinningSchema.js";
import { filterFeaturesByBoundingBox } from "./redLinningUtils.js";

dotenv.config();

/**
 * Registers the `/highlight-redlining` endpoint.
 *
 * Responsibilities:
 * - Computes the bounding box from currently loaded tiles.
 * - Loads and parses redlining GeoJSON data if not cached.
 * - Filters redlining areas by the computed bounding box.
 * - Returns a GeoJSON FeatureCollection of the filtered areas.
 *
 * Error Handling:
 * - Responds with `500` if loading, parsing, or filtering fails.
 *
 * @param app - The Express application instance.
 */
export function registerHighlightRedliningHandler(app: Express) {
  app.post("/highlight-redlining", async (_req: Request, res: Response) => {
    try {
      const bbox = computeBoundingBoxFromTiles(
        tileCache.loadedTiles,
        TILE_SIZE
      );

      if (!redliningCache.areas) {
        const filePath = path.join(process.cwd(), "data", "redliningData.json");
        const jsonText = await fs.readFile(filePath, "utf-8");
        const raw = JSON.parse(jsonText);

        raw.features = raw.features.filter((f: any) => f?.geometry !== null);

        const parsed = GeoJsonSchema.parse(raw);
        redliningCache.areas = parsed.features;
      }
      if (!bbox) {
        return;
      }
      const filtered = filterFeaturesByBoundingBox(redliningCache.areas, bbox);
      res.status(200).json({
        type: "FeatureCollection",
        features: filtered,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });
}
