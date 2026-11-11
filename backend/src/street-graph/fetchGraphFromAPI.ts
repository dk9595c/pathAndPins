import { BBox, GraphNode, GraphTile } from "./graphSchema.js";

/**
 * fetchGraphDataFromAPI
 *
 * Fetches street graph data (nodes + edges) from the Overpass API
 * for a given bounding box, and converts it into a `GraphTile` object
 * that the pathfinding algorithm can consume.
 *
 * @param bbox - Bounding box [minLon, minLat, maxLon, maxLat] that defines
 *               the rectangular area of interest.
 * @returns A GraphTile containing:
 *          - tileKey: unique key based on bbox
 *          - nodes: array of GraphNodes (id, lat, lon)
 *          - neighbors: adjacency list (fromNodeId -> [{id, weight}, ...])
 *
 *
 * Notes for Students:
 * - You do NOT need to modify this function.
 * - It is useful to read through it to understand how real map data
 *   is converted into a graph your algorithm will work on.
 * - The distance between nodes is computed using an approximate
 *   planar calculation (`fastMeters`), which is fast enough for
 *   small geographic areas.
 */
export async function fetchGraphDataFromAPI(bbox: BBox): Promise<GraphTile> {
  const [minLon, minLat, maxLon, maxLat] = bbox;

  // Precompute constants for fast distance calculation
  const midLat = 0.5 * (minLat + maxLat);
  const cosMid = Math.cos((midLat * Math.PI) / 180);
  const K_LAT = 111_320; // meters per degree latitude
  const K_LON = 111_320 * cosMid; // meters per degree longitude at this latitude

  // Simple helper for fast approximate distance between two lat/lon points
  const fastMeters = (
    aLat: number,
    aLon: number,
    bLat: number,
    bLon: number
  ) => {
    const dx = (bLon - aLon) * K_LON;
    const dy = (bLat - aLat) * K_LAT;
    return Math.hypot(dx, dy);
  };

  // Fetch only major road types
  const highwayRegex =
    "^(motorway|trunk|primary|secondary|tertiary|unclassified|residential)$";

  // Overpass QL query: get all roads in bounding box, expand to nodes
  const query = `
  [out:json][timeout:25];
  (
    way["highway"~"${highwayRegex}"](${minLat},${minLon},${maxLat},${maxLon});
  );
  (._; >;);
  out skel geom;
`;

  const url = "https://overpass-api.de/api/interpreter";

  let response: Response;
  try {
    // Send request to Overpass API
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: query,
    });
  } catch (e) {
    console.error("Overpass network error:", e);
    throw e;
  }

  if (!response.ok) {
    throw new Error(`Overpass API request failed with status`);
  }

  const data = await response.json();

  /**
   * Step 1: Determine which nodes are relevant.
   * We only keep nodes that belong to "way" elements (roads).
   */
  const needed = new Set<string>();
  for (const el of data.elements) {
    if (el.type === "way" && el.nodes?.length >= 2) {
      for (let i = 0; i < el.nodes.length; i++) needed.add(String(el.nodes[i]));
    }
  }

  /**
   * Step 2: Collect node coordinates for all "needed" nodes.
   */
  const nodesById: Record<string, GraphNode> = {};
  for (const el of data.elements) {
    if (el.type === "node" && needed.has(String(el.id))) {
      nodesById[el.id] = { id: String(el.id), lat: el.lat, lon: el.lon };
    }
  }

  /**
   * Step 3: Build adjacency list with distances as edge weights.
   */
  const neighbors: Record<string, { id: string; weight: number }[]> = {};
  const addNbr = (from: string, to: string, w: number) => {
    (neighbors[from] ??= []).push({ id: to, weight: w });
  };

  for (const el of data.elements) {
    if (el.type !== "way" || !el.nodes || el.nodes.length < 2) continue;

    for (let i = 0; i < el.nodes.length - 1; i++) {
      const fromId = String(el.nodes[i]);
      const toId = String(el.nodes[i + 1]);
      const from = nodesById[fromId];
      const to = nodesById[toId];
      if (!from || !to) continue;

      const dist = fastMeters(from.lat, from.lon, to.lat, to.lon);
      addNbr(fromId, toId, dist);
      addNbr(toId, fromId, dist);
    }
  }

  // Return graph tile object
  console.log(`${minLat}_${minLon}_${maxLat}_${maxLon}`);
  return {
    tileKey: `${minLat}_${minLon}_${maxLat}_${maxLon}`,
    nodes: Object.values(nodesById),
    neighbors,
  };
}
