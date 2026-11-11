import { describe, it, expect, vi, beforeEach } from "vitest";
import { aStarWithOnDemandTiles } from "./street-graph/Astar.js";
import { graphCache } from "./globalVariables.js";
import { GraphTile } from "./street-graph/graphSchema.js";

// ==========================================
// 1. DATA STRUCTURES & PROTOTYPE TYPES
// ==========================================

export interface GraphNode {
  id: string;
  lat: number;
  lng: number;
  neighbors: string[]; // Neighbor node IDs
}

export type AdjacencyGraph = Record<string, GraphNode>;

export interface PathResult {
  path: GraphNode[];
  totalDistance: number;
}

// Simple Euclidean heuristic for our coordinate plane
function getHeuristicDistance(a: GraphNode, b: GraphNode): number {
  const dx = a.lng - b.lng;
  const dy = a.lat - b.lat;
  return Math.sqrt(dx * dx + dy * dy);
}

// Distance between adjacent nodes
function getEdgeCost(a: GraphNode, b: GraphNode): number {
  return getHeuristicDistance(a, b);
}

// ==========================================
// 2. QUICK PROTOTYPE: LAZY A* SEARCH
// ==========================================

export async function prototypeLazyAStar(
  startId: string,
  targetId: string,
  initialGraph: AdjacencyGraph,
  fetchTileForNode?: (missingNodeId: string) => Promise<AdjacencyGraph>
): Promise<PathResult | null> {
  const localGraph: AdjacencyGraph = { ...initialGraph };

  if (!localGraph[startId]) {
    if (fetchTileForNode) {
      const fetched = await fetchTileForNode(startId);
      Object.assign(localGraph, fetched);
    }
  }

  if (!localGraph[startId]) return null;

  const openSet = new Set<string>([startId]);
  const cameFrom = new Map<string, string>();

  const gScore = new Map<string, number>();
  gScore.set(startId, 0);

  const fScore = new Map<string, number>();
  const initialH = localGraph[targetId]
    ? getHeuristicDistance(localGraph[startId], localGraph[targetId])
    : 0;
  fScore.set(startId, initialH);

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
      const path: GraphNode[] = [];
      let curr: string | undefined = currentId;
      while (curr) {
        path.unshift(localGraph[curr]);
        curr = cameFrom.get(curr);
      }
      return {
        path,
        totalDistance: gScore.get(targetId) ?? 0,
      };
    }

    openSet.delete(currentId);
    const currentNode = localGraph[currentId];

    for (const neighborId of currentNode.neighbors) {
      if (!localGraph[neighborId] && fetchTileForNode) {
        const fetched = await fetchTileForNode(neighborId);
        Object.assign(localGraph, fetched);
      }

      const neighborNode = localGraph[neighborId];
      if (!neighborNode) continue;

      const tentativeG =
        (gScore.get(currentId) ?? Infinity) +
        getEdgeCost(currentNode, neighborNode);

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, currentId);
        gScore.set(neighborId, tentativeG);

        const h = localGraph[targetId]
          ? getHeuristicDistance(neighborNode, localGraph[targetId])
          : 0;
        fScore.set(neighborId, tentativeG + h);
        openSet.add(neighborId);
      }
    }
  }

  return null;
}

// ==========================================
// 3. STEP 2: SUBPROPERTIES AS PREDICATES
// ==========================================

function isStartAndEndCorrect(
  path: GraphNode[],
  startId: string,
  endId: string
): boolean {
  if (!path || path.length === 0) return false;
  return path[0].id === startId && path[path.length - 1].id === endId;
}

function isPathContinuous(
  path: GraphNode[],
  graph: AdjacencyGraph
): boolean {
  if (!path || path.length < 2) return true;

  for (let i = 0; i < path.length - 1; i++) {
    const currentId = path[i].id;
    const nextId = path[i + 1].id;
    const currentNode = graph[currentId];

    if (!currentNode || !currentNode.neighbors.includes(nextId)) {
      return false;
    }
  }
  return true;
}

function isCycleFree(path: GraphNode[]): boolean {
  const visited = new Set<string>();
  for (const node of path) {
    if (visited.has(node.id)) return false;
    visited.add(node.id);
  }
  return true;
}

// ==========================================
// 4. STEP 3 & 4: TEST SUITE & PREDICATE CHECKS
// ==========================================

describe("Lazy A* Pathfinding Property Tests", () => {
  const sampleGraph: AdjacencyGraph = {
    A: { id: "A", lat: 0, lng: 0, neighbors: ["B", "C"] },
    B: { id: "B", lat: 2, lng: 1, neighbors: ["A", "D"] },
    C: { id: "C", lat: -2, lng: 1, neighbors: ["A", "D"] },
    D: { id: "D", lat: 0, lng: 3, neighbors: ["B", "C"] },
  };

  it("verifies basic path properties: origin, destination, continuity, and acyclicity", async () => {
    const result = await prototypeLazyAStar("A", "D", sampleGraph);

    expect(result).not.toBeNull();
    const path = result!.path;

    expect(isStartAndEndCorrect(path, "A", "D")).toBe(true);
    expect(isPathContinuous(path, sampleGraph)).toBe(true);
    expect(isCycleFree(path)).toBe(true);
  });

  it("chooses the cheaper route when alternative paths exist", async () => {
    const graphWithShortcut: AdjacencyGraph = {
      ...sampleGraph,
      A: { id: "A", lat: 0, lng: 0, neighbors: ["B", "C", "E"] },
      E: { id: "E", lat: 0, lng: 1.5, neighbors: ["A", "D"] },
      D: { id: "D", lat: 0, lng: 3, neighbors: ["B", "C", "E"] },
    };

    const result = await prototypeLazyAStar("A", "D", graphWithShortcut);
    expect(result).not.toBeNull();

    const pathIds = result!.path.map((node) => node.id);
    expect(pathIds).toEqual(["A", "E", "D"]);
    expect(result!.totalDistance).toBeCloseTo(3.0, 4);
  });

  it("returns null when start and target are in disconnected components", async () => {
    const disconnectedGraph: AdjacencyGraph = {
      ...sampleGraph,
      X: { id: "X", lat: 10, lng: 10, neighbors: ["Y"] },
      Y: { id: "Y", lat: 10, lng: 12, neighbors: ["X"] },
    };

    const result = await prototypeLazyAStar("A", "Y", disconnectedGraph);
    expect(result).toBeNull();
  });

  it("demonstrates laziness: only fetches external tile when frontier expands to missing node", async () => {
    const partialGraph: AdjacencyGraph = {
      A: { id: "A", lat: 0, lng: 0, neighbors: ["B"] },
      B: { id: "B", lat: 1, lng: 1, neighbors: ["A", "D"] },
    };

    const mockTileFetcher = vi.fn().mockImplementation(async (nodeId: string) => {
      if (nodeId === "D") {
        return {
          D: { id: "D", lat: 2, lng: 2, neighbors: ["B"] },
        };
      }
      return {};
    });

    const result = await prototypeLazyAStar("A", "D", partialGraph, mockTileFetcher);

    expect(result).not.toBeNull();
    expect(result!.path.map((n) => n.id)).toEqual(["A", "B", "D"]);

    expect(mockTileFetcher).toHaveBeenCalledWith("D");
    expect(mockTileFetcher).toHaveBeenCalledTimes(1);
  });
});

// =========================================================================
// 5. TASK B PRODUCTION: SUBPROPERTIES AS PREDICATES
// =========================================================================

export function isProductionStartAndEndCorrect(
  path: string[],
  startId: string,
  goalId: string
): boolean {
  if (!path || path.length === 0) return false;
  return path[0] === startId && path[path.length - 1] === goalId;
}

export function isProductionPathContinuous(
  path: string[],
  cache: Record<string, GraphTile>
): boolean {
  if (!path || path.length < 2) return true;

  const allNeighbors: Record<string, Set<string>> = {};
  for (const tile of Object.values(cache)) {
    for (const [fromId, neighbors] of Object.entries(tile.neighbors)) {
      if (!allNeighbors[fromId]) {
        allNeighbors[fromId] = new Set();
      }
      for (const nbr of neighbors) {
        allNeighbors[fromId].add(nbr.id);
      }
    }
  }

  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    const neighborsOfU = allNeighbors[u];

    if (!neighborsOfU || !neighborsOfU.has(v)) {
      return false;
    }
  }

  return true;
}

export function isProductionCycleFree(path: string[]): boolean {
  if (!path) return true;
  const visited = new Set<string>();
  for (const nodeId of path) {
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
  }
  return true;
}

export function calculateProductionPathCost(
  path: string[],
  cache: Record<string, GraphTile>
): number {
  if (!path || path.length < 2) return 0;
  let total = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    let edgeWeight: number | null = null;

    for (const tile of Object.values(cache)) {
      const edge = tile.neighbors[u]?.find((n) => n.id === v);
      if (edge) {
        edgeWeight = edge.weight;
        break;
      }
    }

    if (edgeWeight === null) {
      return Infinity;
    }
    total += edgeWeight;
  }

  return total;
}

// =========================================================================
// 6. TASK B PRODUCTION: RELATIONAL PROPERTY & OPTIMALITY TEST SUITE
// =========================================================================

describe("Task B: Production A* Relational Property Tests", () => {
  beforeEach(() => {
    for (const key of Object.keys(graphCache)) {
      delete graphCache[key];
    }
  });

  it("verifies start/end correctness, continuity, acyclicity, and optimal cost", async () => {
    // Symmetrical diamond graph:
    // n1 at (41.84, -71.46)
    // n2 at (41.85, -71.45) with cost 50
    // n3 at (41.83, -71.45) with cost 30
    // n4 at (41.84, -71.44)
    // Equal geographic heuristic to goal n4 from n2 and n3 guarantees cost 30 branch is taken
    graphCache["418,-715"] = {
      tileKey: "418,-715",
      nodes: [
        { id: "n1", lat: 41.84, lon: -71.46 },
        { id: "n2", lat: 41.85, lon: -71.45 },
        { id: "n3", lat: 41.83, lon: -71.45 },
        { id: "n4", lat: 41.84, lon: -71.44 },
      ],
      neighbors: {
        n1: [
          { id: "n2", weight: 50 },
          { id: "n3", weight: 30 },
        ],
        n2: [
          { id: "n1", weight: 50 },
          { id: "n4", weight: 50 },
        ],
        n3: [
          { id: "n1", weight: 30 },
          { id: "n4", weight: 30 },
        ],
        n4: [
          { id: "n2", weight: 50 },
          { id: "n3", weight: 30 },
        ],
      },
    };

    const path = await aStarWithOnDemandTiles(["n1", "n4"]);

    expect(isProductionStartAndEndCorrect(path, "n1", "n4")).toBe(true);
    expect(isProductionPathContinuous(path, graphCache)).toBe(true);
    expect(isProductionCycleFree(path)).toBe(true);

    const cost = calculateProductionPathCost(path, graphCache);
    expect(cost).toBe(60);
    expect(path).toEqual(["n1", "n3", "n4"]);
  });

  it("handles equal cost alternative paths relationally without failing", async () => {
    graphCache["418,-715"] = {
      tileKey: "418,-715",
      nodes: [
        { id: "A", lat: 41.84, lon: -71.46 },
        { id: "B1", lat: 41.85, lon: -71.45 },
        { id: "B2", lat: 41.83, lon: -71.45 },
        { id: "C", lat: 41.84, lon: -71.44 },
      ],
      neighbors: {
        A: [
          { id: "B1", weight: 10 },
          { id: "B2", weight: 10 },
        ],
        B1: [
          { id: "A", weight: 10 },
          { id: "C", weight: 10 },
        ],
        B2: [
          { id: "A", weight: 10 },
          { id: "C", weight: 10 },
        ],
        C: [
          { id: "B1", weight: 10 },
          { id: "B2", weight: 10 },
        ],
      },
    };

    const path = await aStarWithOnDemandTiles(["A", "C"]);

    expect(isProductionStartAndEndCorrect(path, "A", "C")).toBe(true);
    expect(isProductionPathContinuous(path, graphCache)).toBe(true);
    expect(isProductionCycleFree(path)).toBe(true);

    const cost = calculateProductionPathCost(path, graphCache);
    expect(cost).toBe(20);
  });

  it("finds paths stitched across multiple tile boundaries", async () => {
    // Tile 1 contains border1 and shared boundary node border2
    graphCache["418,-715"] = {
      tileKey: "418,-715",
      nodes: [
        { id: "border1", lat: 41.84, lon: -71.46 },
        { id: "border2", lat: 41.84, lon: -71.41 },
      ],
      neighbors: {
        border1: [{ id: "border2", weight: 100 }],
        border2: [{ id: "border1", weight: 100 }],
      },
    };

    // Tile 2 contains shared boundary node border2 and border3
    graphCache["418,-714"] = {
      tileKey: "418,-714",
      nodes: [
        { id: "border2", lat: 41.84, lon: -71.41 },
        { id: "border3", lat: 41.84, lon: -71.36 },
      ],
      neighbors: {
        border2: [{ id: "border3", weight: 120 }],
        border3: [{ id: "border2", weight: 120 }],
      },
    };

    const path = await aStarWithOnDemandTiles(["border1", "border3"]);

    expect(isProductionStartAndEndCorrect(path, "border1", "border3")).toBe(true);
    expect(isProductionPathContinuous(path, graphCache)).toBe(true);
    expect(isProductionCycleFree(path)).toBe(true);
    expect(calculateProductionPathCost(path, graphCache)).toBe(220);
  });

  it("returns an empty path when the target is unreachable", async () => {
    graphCache["418,-715"] = {
      tileKey: "418,-715",
      nodes: [
        { id: "isolatedA", lat: 41.84, lon: -71.46 },
        { id: "isolatedB", lat: 41.86, lon: -71.44 },
      ],
      neighbors: {
        isolatedA: [],
        isolatedB: [],
      },
    };

    const path = await aStarWithOnDemandTiles(["isolatedA", "isolatedB"]);
    expect(path).toEqual([]);
  });
});
