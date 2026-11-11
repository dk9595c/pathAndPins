import { activityCache, tileCache, TILE_SIZE } from "../globalVariables.js";
import { enqueueGraphTask } from "../street-graph/graphQueue.js";
import { enqueueStationTask } from "../weather-parser/stationQueue.js";
import { BoundingBox } from "../weather-parser/weatherParserType.js";

/** Normalize/defensively sanitize a tile key string like " 123 ,  -45 " → "123,-45" */
function normalizeTileKey(key: string): string {
  const [i, j] = key.split(",");
  return `${i.trim()},${j.trim()}`;
}

/**
 * Updates the visible activities based on newly loaded tiles.
 *
 * Notes:
 * - `newTiles` are **tile indices** in the form "i,j" (integers),
 *   not raw lat/lng. Each tile covers TILE_SIZE degrees.
 * - At ~300 activities total, scanning all activities is perfectly fine.
 *
 * @param newTiles - Array of tile index keys in the format "i,j".
 * @returns Array of tile keys that were newly added to the cache.
 */
export function updateVisibleActivitiesFromTiles(newTiles: string[]): string[] {
  const newlyAdded: string[] = [];

  for (const rawKey of newTiles) {
    const tileKey = normalizeTileKey(rawKey);

    if (!tileCache.loadedTiles.has(tileKey)) {
      tileCache.loadedTiles.add(tileKey);
      newlyAdded.push(tileKey);

      // Assign activities that fall into this tile to the visible map
      for (const [coord, activity] of Object.entries(
        activityCache.activityMap
      )) {
        const [latStr, lngStr] = coord.split(",");
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);

        const tileLat = Math.floor(lat / TILE_SIZE);
        const tileLng = Math.floor(lng / TILE_SIZE);
        const computedTileKey = `${tileLat},${tileLng}`;

        if (computedTileKey === tileKey) {
          // If you later worry about dupes, you can track a Set of activity IDs.
          tileCache.visibleActivityMap.push(activity);
        }
      }

      // Queue background work for this tile
      enqueueGraphTask(tileKey, TILE_SIZE);
      enqueueStationTask(tileKey, TILE_SIZE);
    }
  }

  return newlyAdded;
}

/**
 * Computes the bounding box that encloses a set of tiles.
 *
 * Each tile is square in degrees with size = `tileSize` (default: TILE_SIZE).
 *
 * @param tileKeys - Set of tile index keys "i,j".
 * @param tileSize - Size of each tile in degrees (default: TILE_SIZE).
 * @returns Bounding box or `null` if the set is empty.
 */
export function computeBoundingBoxFromTiles(
  tileKeys: Set<string>,
  tileSize = TILE_SIZE
): BoundingBox | null {
  if (tileKeys.size === 0) return null;

  let minLat = Infinity,
    maxLat = -Infinity,
    minLon = Infinity,
    maxLon = -Infinity;

  for (const rawKey of tileKeys) {
    const key = normalizeTileKey(rawKey);
    const [tileLatStr, tileLngStr] = key.split(",");
    const tileLat = parseInt(tileLatStr, 10);
    const tileLng = parseInt(tileLngStr, 10);

    const south = tileLat * tileSize;
    const north = (tileLat + 1) * tileSize;
    const west = tileLng * tileSize;
    const east = (tileLng + 1) * tileSize;

    minLat = Math.min(minLat, south);
    maxLat = Math.max(maxLat, north);
    minLon = Math.min(minLon, west);
    maxLon = Math.max(maxLon, east);
  }

  return { minLat, maxLat, minLon, maxLon };
}
