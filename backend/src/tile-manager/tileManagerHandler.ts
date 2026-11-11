import { Express, Request, Response } from "express";
import { z } from "zod";
import { updateVisibleActivitiesFromTiles } from "./tileCache.js";

/**
 * Schema for validating the payload of tile updates.
 *
 * Fields:
 * - `tileKeys`: Array of strings representing **tile indices** "i,j" (integers),
 *   NOT raw lat/lng coordinates.
 */
const TilePayloadSchema = z.object({
  tileKeys: z.array(z.string().regex(/^[-]?\d+,\s*[-]?\d+$/)).nonempty(),
});

/** Normalize tile keys like " 123 , -45 " → "123,-45" */
function normalizeTileKey(key: string): string {
  const [i, j] = key.split(",");
  return `${i.trim()},${j.trim()}`;
}

/**
 * Registers the `/update-visible-tiles` endpoint.
 *
 * Responsibilities:
 * - Validates incoming payload of tile index keys.
 * - Updates visible activities based on the new tiles.
 * - Returns a summary including the count of newly processed tiles.
 */
export function registerTileManagerHandler(app: Express) {
  app.post("/update-visible-tiles", (req: Request, res: Response) => {
    const parsed = TilePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return;
    }

    try {
      // Normalize keys once; tolerate spaces after commas
      const newTileKeys = parsed.data.tileKeys.map(normalizeTileKey);
      const newlyAdded = updateVisibleActivitiesFromTiles(newTileKeys);

      res.status(200).json({
        success: true,
        message: `${newlyAdded.length} new tile(s) processed.`,
        newlyAddedTiles: newlyAdded,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });
}
