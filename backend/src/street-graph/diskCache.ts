/**
 * diskCache.ts
 *
 * Implements persistent on-disk tile caching for Task Y and Task Z.
 *
 * Persists parsed GraphTile JSON structures to local disk storage
 * so that subsequent queries and server restarts avoid cold-start
 * Overpass API network latency.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GraphTile } from './graphSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory where tiles are saved on disk
const CACHE_DIR = path.resolve(__dirname, '../../data/tile_cache');

/**
 * Ensures the cache directory exists on disk.
 */
function ensureCacheDirExists(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Converts a tile key (e.g. '418,-715') to a safe filename on disk.
 */
function getTileFilePath(tileKey: string): string {
  const safeKey = tileKey.replace(/[^a-zA-Z0-9_\-,]/g, '_');
  return path.join(CACHE_DIR, `tile_${safeKey}.json`);
}

/**
 * Checks whether a tile exists in persistent disk storage.
 *
 * @param tileKey - Tile coordinate key
 * @returns true if the tile is stored on disk
 */
export function isTileCachedOnDisk(tileKey: string): boolean {
  const filePath = getTileFilePath(tileKey);
  return fs.existsSync(filePath);
}

/**
 * Loads a GraphTile from persistent disk storage into memory.
 *
 * @param tileKey - Tile coordinate key
 * @returns The parsed GraphTile or null if unavailable
 */
export function loadTileFromDisk(tileKey: string): GraphTile | null {
  try {
    const filePath = getTileFilePath(tileKey);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const tile: GraphTile = JSON.parse(rawData);
    return tile;
  } catch (error) {
    console.warn(`Failed to read tile ${tileKey} from disk cache:`, error);
    return null;
  }
}

/**
 * Writes a GraphTile to disk storage as formatted JSON.
 *
 * @param tileKey - Tile coordinate key
 * @param tileData - The complete graph tile data to persist
 */
export function saveTileToDisk(tileKey: string, tileData: GraphTile): void {
  try {
    ensureCacheDirExists();
    const filePath = getTileFilePath(tileKey);
    fs.writeFileSync(filePath, JSON.stringify(tileData, null, 2), 'utf-8');
  } catch (error) {
    console.warn(`Failed to write tile ${tileKey} to disk cache:`, error);
  }
}

/**
 * Pre-populates the in-memory cache with all tiles saved on disk.
 * Called during server bootstrap to warm the cache.
 *
 * @param memoryCache - The shared in-memory graphCache record
 * @returns Number of tiles successfully warmed into memory
 */
export function preloadDiskCacheIntoMemory(
  memoryCache: Record<string, GraphTile>
): number {
  try {
    ensureCacheDirExists();
    const files = fs.readdirSync(CACHE_DIR);
    let loadedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const fullPath = path.join(CACHE_DIR, file);
      const rawData = fs.readFileSync(fullPath, 'utf-8');
      const tile: GraphTile = JSON.parse(rawData);

      if (tile && tile.tileKey) {
        memoryCache[tile.tileKey] = tile;
        loadedCount += 1;
      }
    }

    return loadedCount;
  } catch (error) {
    console.warn('Error pre-loading disk cache into memory:', error);
    return 0;
  }
}
