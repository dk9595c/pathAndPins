import { graphCache } from "../globalVariables.js";
import { ensureTileLoaded, buildNodeIndex, haversineDistance } from "./tileUtils.js";
import { loadNeighborsIfNeeded } from "./lazyLoader.js";

/**
 * aStarWithOnDemandTiles
 *
 * Implement the A* pathfinding algorithm here.
 *
 * @param nodeIds - An array of node IDs that represent the path goals.
 *                  The first ID is the start node, the last ID is the goal node.
 *
 * Your task:
 * 1. Implement A* search to find the shortest path from the start node to the goal node (within a tile for Sprint 7).
 * 2. Use the provided graph/tile-loading utilities to:
 *    - Fetch neighbors for the current node.
 * 3. Once the goal is reached, reconstruct the path and return an array of node IDs
 *    representing the shortest path.
 *
 * Tips:
 * - Use a priority queue (min-heap) for selecting the next node with the lowest fScore.
 * - Define a good heuristic function (e.g., Euclidean distance or Haversine distance).
 * - Handle lazy tile loading when exploring neighbors that are in unloaded tiles.
 *
 * @returns A Promise that resolves to an array of node IDs representing the final path.
 */
export async function aStarWithOnDemandTiles(
  nodeIds: string[]
): Promise<string[]> {
  if (!nodeIds || nodeIds.length < 2) return [];

  const startId = nodeIds[0];
  const targetId = nodeIds[nodeIds.length - 1];

  let nodeIndex = buildNodeIndex();
  if (!nodeIndex[startId] || !nodeIndex[targetId]) return [];

  const openSet = new Set<string>([startId]);
  const closedSet = new Set<string>();
  const cameFrom = new Map<string, string>();
  
  const gScore = new Map<string, number>();
  gScore.set(startId, 0);

  const fScore = new Map<string, number>();
  fScore.set(startId, haversineDistance(
    nodeIndex[startId].lat, nodeIndex[startId].lon,
    nodeIndex[targetId].lat, nodeIndex[targetId].lon
  ));

  while (openSet.size > 0) {
    let currentId = "";
    let lowestF = Infinity;
    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        currentId = id;
      }
    }

    if (currentId === targetId) {
      const path: string[] = [];
      let curr: string | undefined = currentId;
      while (curr) {
        path.unshift(curr);
        curr = cameFrom.get(curr);
      }
      return path;
    }

    openSet.delete(currentId);
    closedSet.add(currentId);

    // Collect all neighbors across all tiles in graphCache without breaking early
    let currentNodeNeighbors: { id: string; weight: number }[] = [];
    let currentTileKey = "";

    for (const [tileKey, tileData] of Object.entries(graphCache)) {
      if (tileData.neighbors[currentId]) {
        currentNodeNeighbors.push(...tileData.neighbors[currentId]);
        currentTileKey = tileKey;
      }
    }

    const currentNodeCoords = nodeIndex[currentId];
    
    // Handle lazy tile loading when exploring neighbors near tile boundaries
    if (currentNodeCoords && currentTileKey) {
      const cacheSizeBefore = Object.keys(graphCache).length;
      
      await loadNeighborsIfNeeded(
        currentNodeCoords.lat,
        currentNodeCoords.lon,
        currentTileKey,
        ensureTileLoaded
      );
      
      if (Object.keys(graphCache).length > cacheSizeBefore) {
        nodeIndex = buildNodeIndex();
      }
    }

    for (const neighbor of currentNodeNeighbors) {
      const neighborId = neighbor.id;
      if (closedSet.has(neighborId)) continue;

      const tentativeG = (gScore.get(currentId) ?? Infinity) + neighbor.weight;

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, currentId);
        gScore.set(neighborId, tentativeG);

        const neighborCoords = nodeIndex[neighborId];
        let h = 0;
        if (neighborCoords) {
          h = haversineDistance(
            neighborCoords.lat, neighborCoords.lon,
            nodeIndex[targetId].lat, nodeIndex[targetId].lon
          );
        }
        
        fScore.set(neighborId, tentativeG + h);
        openSet.add(neighborId);
      }
    }
  }

  return [];
}
