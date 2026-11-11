import { aStarWithOnDemandTiles } from "./Astar.js";

export type NodeId = string;

/**
 * Plan a route that visits multiple stops in order.
 *
 *   STUDENT NOTES:
 * - You are given an array of node IDs to visit, in order.
 * - You already wrote A* for two points, now think about how to
 *   reuse it to handle many points.
 *
 * @param nodeIds - ordered list of node IDs to route through
 * @returns a full path visiting each stop, as an array of node IDs
 */
export async function routeThroughStops(nodeIds: NodeId[]): Promise<NodeId[]> {
  if (nodeIds.length < 2) return nodeIds;

  const fullPath: NodeId[] = [];

  for (let i = 0; i < nodeIds.length - 1; i++) {
    // Route between stop A and stop B
    const segment = await aStarWithOnDemandTiles([nodeIds[i], nodeIds[i + 1]]);

    if (segment.length === 0) {
      return []; // Return empty if any segment of the itinerary is disconnected
    }

    if (i === 0) {
      fullPath.push(...segment);
    } else {
      // Remove the first node of the segment to prevent duplicating the intermediate stop
      fullPath.push(...segment.slice(1));
    }
  }

  return fullPath;
}
