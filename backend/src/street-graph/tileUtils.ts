import { graphCache, TILE_SIZE } from "../globalVariables.js";
import { updateVisibleActivitiesFromTiles } from "../tile-manager/tileCache.js";
import { waitForGraphTiles } from "../street-graph/graphQueue.js";
import { GraphNode } from "./graphSchema.js";

/**
 * Converts a tile key string (e.g., "3,5") into bounding coordinates.
 *
 * @param tileKey - String like "i,j" representing tile indices
 * @param size - Tile size in degrees (defaults to TILE_SIZE)
 * @returns Tuple [minLat, minLon, maxLat, maxLon]
 *
 *   STUDENT NOTES:
 * - You can use this to know the bounding box of any tile for routing or visualization.
 */
export function tileKeyToBounds(
  tileKey: string,
  size = TILE_SIZE
): [minLat: number, minLon: number, maxLat: number, maxLon: number] {
  const [iStr, jStr] = tileKey.split(",");
  const i = parseInt(iStr, 10);
  const j = parseInt(jStr, 10);
  const minLat = i * size;
  const minLon = j * size;
  return [minLat, minLon, minLat + size, minLon + size];
}

/**
 * Ensures a graph tile is loaded into memory.
 *
 *
 * @param key - Tile key string
 * @throws Error if the tile cannot be loaded
 *
 *   STUDENT NOTES:
 * - Call this before trying to use nodes inside a tile only if you are unsure weather it has been loaded.
 */
export async function ensureTileLoaded(key: string): Promise<void> {
  updateVisibleActivitiesFromTiles([key]);
  await waitForGraphTiles([key]);

  const tile = graphCache[key];
  if (!tile) {
    throw new Error(`Tile ${key} not available after wait`);
  }
}

/**
 * Euclidean distance between two points in a plane.
 */
export function euclid(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

/**
 * Haversine distance between two lat/lon coordinates in meters.
 *
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in meters
 *
 * 📚 STUDENT NOTES:
 * - Use this to measure actual distance along Earth's surface.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // radius of Earth in meters
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Builds a flat index of all nodes in the graph cache.
 *
 * @returns Record mapping node IDs → GraphNode objects
 *
 *   STUDENT NOTES:
 * - Useful to quickly convert from node ID (used in routing) to lat/lon coordinates.
 */
export function buildNodeIndex(): Record<string, GraphNode> {
  const nodeMap: Record<string, GraphNode> = {};

  for (const tile of Object.values(graphCache)) {
    for (const node of tile.nodes) {
      nodeMap[node.id] = node;
    }
  }

  return nodeMap;
}
