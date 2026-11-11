/**
 * Graph Schema & Types
 *
 *   STUDENT NOTES:
 * - You do NOT need to change anything here but feel free to add new schemas if needed.
 * - These schemas/types are provided so you can rely on consistent
 *   data structures for nodes, neighbors, and tiles.
 */

import { z } from "zod";

/**
 * A single node in the graph.
 *
 * - `id`: unique identifier (string)
 * - `lat`, `lon`: geographic coordinates
 * - `elevation`: optional elevation data (meters)
 */
export const GraphNodeSchema = z.object({
  id: z.string(),
  lat: z.number(),
  lon: z.number(),
  elevation: z.number().optional(),
});

/**
 * A directed edge between two nodes in the graph.
 *
 * - `from`, `to`: node IDs
 * - `distance`: numeric cost (usually meters)
 * - `metadata`: optional extra data about the edge (e.g. whether it is a bridge)
 */
export const GraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  distance: z.number(),
  metadata: z
    .object({
      bridge: z.boolean().optional(),
    })
    .optional(),
});

/**
 * A neighbor record (used for adjacency lists).
 * - `id`: node ID
 * - `weight`: cost to travel from owner to this neighbor
 */
export const NeighborSchema = z.object({
  id: z.string(),
  weight: z.number(),
});

/**
 * A tile of graph data. Each tile contains:
 * - `tileKey`: unique key for the tile (lat/lon grid)
 * - `nodes`: all nodes in this tile
 * - `neighbors`: adjacency list of nodes -> neighbors
 */
export const GraphTileSchema = z.object({
  tileKey: z.string(),
  nodes: z.array(GraphNodeSchema),
  neighbors: z.record(z.string(), z.array(NeighborSchema)),
});

/**
 * Request format for pathfinding:
 * - `from`, `to`: coordinates
 */
export const PathRequestSchema = z.object({
  from: z.object({ lat: z.number(), lon: z.number() }),
  to: z.object({ lat: z.number(), lon: z.number() }),
});

/**
 * Response format for pathfinding:
 * - `path`: ordered list of `{ lat, lon }` objects
 * - `distance`: total distance traveled
 */
export const PathResponseSchema = z.object({
  path: z.array(z.object({ lat: z.number(), lon: z.number() })),
  distance: z.number(),
});

// ---------------------------
// Exported Types
// ---------------------------

/**
 * Bounding box tuple [minLon, minLat, maxLon, maxLat]
 */
export type BBox = [
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number
];

/**
 * A node ID (alias for string)
 */
export type NodeId = string;

/**
 * Record stored in A* open set:
 * - `g`: cost so far
 * - `f`: estimated total cost (g + heuristic)
 * - `parent`: ID of previous node in path
 */
export type OpenRec = { id: NodeId; g: number; f: number; parent?: NodeId };

// Type aliases from schemas for developer convenience
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type Neighbor = z.infer<typeof NeighborSchema>;
export type GraphTile = z.infer<typeof GraphTileSchema>;
export type PathRequest = z.infer<typeof PathRequestSchema>;
export type PathResponse = z.infer<typeof PathResponseSchema>;

/**
 * Function signature for routing algorithms (like A* or djikstra).
 */
export type RoutingAlgorithm = (nodeIds: string[]) => Promise<string[]>;
