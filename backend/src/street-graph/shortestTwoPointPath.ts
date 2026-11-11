import { RoutingAlgorithm } from "./graphSchema.js";
import { graphCache, TILE_SIZE } from "../globalVariables.js";
import {
  buildNodeIndex,
  ensureTileLoaded,
  haversineDistance,
} from "./tileUtils.js";

/**
 * Handles a shortest-path request by:
 *  1. Making sure the tiles that contain the start and goal are loaded.
 *  2. Finding the nearest graph nodes to each input point.
 *  3. Calling the chosen routing algorithm.
 *  4. Converting the resulting node IDs into lat/lon pairs.
 *
 * @param points - Array of `{lat, lng}` points, first = start, last = goal
 * @param algorithm - A function implementing a routing algorithm (A*, Dijkstra, etc.)
 * @returns An object with a `path` array of `{lat, lng}` points to draw on a map.
 */
export async function handleShortestPathRequest(
  points: { lat: number; lng: number }[],
  algorithm: RoutingAlgorithm
): Promise<{ path: { lat: number; lng: number }[] }> {
  if (!points || points.length < 2) {
    return { path: [] };
  }

  // 1. Ensure tiles for start & goal are loaded into the graph cache
  await ensureStartGoalTiles(points);

  // 2. Find the nearest graph nodes to the requested points
  const nodes = points.map((p) => findNearestGraphNode(p));

  // If graph nodes could not be identified, return the input points directly
  if (nodes.some((n) => !n)) {
    console.warn("Could not find nearest graph nodes for some points; falling back to input points.");
    return { path: points };
  }

  // 3. Call the routing algorithm (A* / routeThroughStops)
  const pathIds = await algorithm(nodes as string[]);

  // 4. Build a fast lookup of nodes → coordinates
  const nodeIndex = buildNodeIndex();

  // 5. Convert the path node IDs to actual lat/lng coords for visualization
  const coords: { lat: number; lng: number }[] = [];
  if (pathIds && pathIds.length > 0) {
    for (const nodeId of pathIds) {
      const node = nodeIndex[nodeId];
      if (node) {
        coords.push({ lat: node.lat, lng: node.lon });
      }
    }
  }

  // Fallback: If search yielded no path, return the original points so the map never crashes
  if (coords.length === 0) {
    return { path: points };
  }

  return { path: coords };
}

/**
 * Compute the tile key from a lat/lng pair, given the tile size.
 */
export function tileKeyFromCoord(
  lat: number,
  lng: number,
  tileSize: number
): string {
  const latIdx = Math.floor(lat / tileSize);
  const lngIdx = Math.floor(lng / tileSize);
  return `${latIdx},${lngIdx}`;
}

/**
 * Ensures that both the start and goal tiles are loaded before routing.
 * Wrapped in try/catch so network timeouts on adjacent tiles do not abort the route.
 */
async function ensureStartGoalTiles(points: { lat: number; lng: number }[]) {
  if (!points || points.length === 0) return;

  const keysToLoad = new Set<string>();
  for (const p of points) {
    keysToLoad.add(tileKeyFromCoord(p.lat, p.lng, TILE_SIZE));
  }

  for (const key of keysToLoad) {
    try {
      await ensureTileLoaded(key);
    } catch (err) {
      console.warn(`[ensureStartGoalTiles] Tile ${key} could not be loaded over network, proceeding with local cache:`, err);
    }
  }
}

/**
 * Find the nearest graph node to a given coordinate.
 */
export function findNearestGraphNode(pos: {
  lat: number;
  lng: number;
}): string | null {
  let closestNodeId: string | null = null;
  let minDist = Infinity;

  for (const tileData of Object.values(graphCache)) {
    if (!tileData || !tileData.nodes) continue;
    for (const node of tileData.nodes) {
      const dist = haversineDistance(pos.lat, pos.lng, node.lat, node.lon);
      if (dist < minDist) {
        minDist = dist;
        closestNodeId = node.id;
      }
    }
  }

  return closestNodeId;
}
