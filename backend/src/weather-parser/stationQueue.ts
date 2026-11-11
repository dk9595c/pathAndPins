import { cachedStations, tileCache, TILE_SIZE } from "../globalVariables.js";

/**
 * Represents a task for fetching weather stations for a given tile.
 */
type StationTask = {
  tileKey: string;
  tileSize: number;
  resolve: () => void;
  reject: (err: any) => void;
};

const stationTaskQueue: StationTask[] = [];
const tileTaskMap = new Map<string, Promise<void>>();
let processPromise: Promise<void> | null = null;

/**
 * Enqueues a task to fetch weather stations for a given tile.
 *
 * - Returns a promise that resolves when the task is completed.
 * - Avoids duplicate tasks for the same tile key.
 *
 * @param tileKey - Tile identifier in the format "latIndex,lngIndex".
 * @param tileSize - Size of the tile in degrees.
 * @returns Promise that resolves when the station task completes.
 */
export function enqueueStationTask(
  tileKey: string,
  tileSize: number
): Promise<void> {
  if (tileTaskMap.has(tileKey)) {
    return tileTaskMap.get(tileKey)!;
  }

  const promise = new Promise<void>((resolve, reject) => {
    stationTaskQueue.push({ tileKey, tileSize, resolve, reject });
  });

  tileTaskMap.set(tileKey, promise);

  if (!processPromise) {
    processPromise = processQueue().finally(() => {
      processPromise = null;
    });
  }

  return promise;
}

/**
 * Processes the station task queue sequentially.
 *
 * - Fetches stations from the NOAA API for each tile.
 * - Adds retrieved stations to the global `cachedStations`.
 * - Resolves or rejects the corresponding promise for each task.
 */
async function processQueue() {
  const token = process.env.NOAA_API_TOKEN!;
  const { getStationsInBoundingBox } = await import(
    "../weather-parser/weatherStationService.js"
  );

  while (stationTaskQueue.length > 0) {
    const { tileKey, tileSize, resolve, reject } = stationTaskQueue.shift()!;
    const [minLat, minLon, maxLat, maxLon] = tileKeyToBounds(tileKey, tileSize);

    try {
      const stations = await getStationsInBoundingBox(
        minLat,
        minLon,
        maxLat,
        maxLon,
        token
      );
      cachedStations.push(...stations);
      resolve();
    } catch (err) {
      reject(0);
    } finally {
      tileTaskMap.delete(tileKey);
    }
  }
}

/**
 * Converts a tile key to its geographic bounding box.
 *
 * @param tileKey - Tile identifier in the format "latIndex,lngIndex".
 * @param tileSize - Size of the tile in degrees.
 * @returns Tuple containing [minLat, minLon, maxLat, maxLon].
 */
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

/**
 * Waits for all specified tiles to finish loading station data.
 *
 * - Skips tiles that have already been loaded.
 *
 * @param tileKeys - Array of tile identifiers.
 * @returns Promise that resolves when all new tiles are loaded.
 */
export function waitForTilesToLoad(tileKeys: string[]): Promise<void[]> {
  const newTiles = tileKeys.filter(
    (tileKey) => !tileCache.loadedTiles.has(tileKey)
  );

  return Promise.all(
    newTiles.map((tileKey) => enqueueStationTask(tileKey, TILE_SIZE))
  );
}
