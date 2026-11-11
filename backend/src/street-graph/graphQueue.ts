import { graphCache } from "../globalVariables.js";
import { BBox, GraphTile } from "./graphSchema.js";
import { loadTileFromDisk } from "./diskCache.js";

/**
 * Represents a queued graph tile fetch.
 */
type GraphTask = {
  tileKey: string;
  tileSize: number;
  resolve: () => void;
  reject: (err: any) => void;
};

const graphTaskQueue: GraphTask[] = [];
const graphTileMap = new Map<string, Promise<void>>();
let graphProcessPromise: Promise<void> | null = null;

export function enqueueGraphTask(
  tileKey: string,
  tileSize: number
): Promise<void> {
  if (graphTileMap.has(tileKey)) return graphTileMap.get(tileKey)!;
  if (graphCache[tileKey]) return Promise.resolve();

  // Check persistent disk storage
  const diskTile = loadTileFromDisk(tileKey);
  if (diskTile) {
    graphCache[tileKey] = diskTile;
    return Promise.resolve();
  }

  // If not on disk, create an empty safe fallback tile instantly instead of timing out on network
  console.warn(`[graphQueue] Tile ${tileKey} not found on disk. Providing empty fallback tile (offline mode).`);
  graphCache[tileKey] = {
    tileKey,
    nodes: [],
    neighbors: {},
  };

  return Promise.resolve();
}

async function processGraphQueue() {
  // No-op since network fetching is disabled for offline stability
}

export function tileKeyToBounds(
  tileKey: string,
  tileSize: number
): [minLat: number, minLon: number, maxLat: number, maxLon: number] {
  const [latIndex, lngIndex] = tileKey.split(",").map(Number);
  const minLat = latIndex * tileSize;
  const minLon = lngIndex * tileSize;
  const maxLat = (latIndex + 1) * tileSize;
  const maxLon = (lngIndex + 1) * tileSize;
  return [minLat, minLon, maxLat, maxLon];
}

export async function waitForGraphTiles(tileKeys: string[]): Promise<void> {
  const keys = Array.from(new Set(tileKeys));

  for (const k of keys) {
    if (graphCache[k]) continue;

    const diskTile = loadTileFromDisk(k);
    if (diskTile) {
      graphCache[k] = diskTile;
      continue;
    }

    // Assign safe empty tile if missing
    graphCache[k] = {
      tileKey: k,
      nodes: [],
      neighbors: {},
    };
  }
}
