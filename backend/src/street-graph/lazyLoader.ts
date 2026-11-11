import { TILE_SIZE } from "../globalVariables.js";

const EDGE_FRAC = 0.08;

/**
 * Compute bounding box for a given tile key.
 *
 *   STUDENT NOTES:
 * - Tile keys are stored as "i,j" where i and j are grid coordinates.
 * - Each tile covers TILE_SIZE degrees of latitude/longitude.
 * - This function converts the key into numeric bounds you can use.
 *
 * @param key - tile key string (e.g. "42,17")
 * @param size - optional override for tile size (defaults to TILE_SIZE)
 * @returns bounding box information for the tile
 */
function boundsFromKey(key: string, size = TILE_SIZE) {
  const [iStr, jStr] = key.split(",");
  const i = parseInt(iStr, 10);
  const j = parseInt(jStr, 10);

  const minLat = i * size;
  const maxLat = minLat + size;
  const minLon = j * size;
  const maxLon = minLon + size;

  return { i, j, minLat, minLon, maxLat, maxLon };
}

/**
 * Check if a given (lat, lon) is close to the edge of its tile.
 *
 *   STUDENT NOTES:
 * - Use this to decide whether to prefetch neighbor tiles.
 * - A point is considered "near the edge" if it's within 8% of
 *   any tile border.
 *
 * @param lat - latitude of the point
 * @param lon - longitude of the point
 * @param key - tile key string (the tile that contains the point)
 * @returns true if the point is near the edge of the tile
 */
export function nearEdge(lat: number, lon: number, key: string): boolean {
  const { minLat, minLon, maxLat, maxLon } = boundsFromKey(key);
  const padLat = TILE_SIZE * EDGE_FRAC;
  const padLon = TILE_SIZE * EDGE_FRAC;

  return (
    lat <= minLat + padLat ||
    lat >= maxLat - padLat ||
    lon <= minLon + padLon ||
    lon >= maxLon - padLon
  );
}

/**
 *   STUDENT TODO:
 * Implement a function that uses `nearEdge()` to detect when you
 * should load neighbor tiles.
 */
export async function loadNeighborsIfNeeded(
  lat: number,
  lon: number,
  key: string,
  loadFn: (k: string) => Promise<void>
): Promise<void> {
  if (!nearEdge(lat, lon, key)) return;

  const { i, j, minLat, minLon, maxLat, maxLon } = boundsFromKey(key);
  const padLat = TILE_SIZE * EDGE_FRAC;
  const padLon = TILE_SIZE * EDGE_FRAC;

  const promises: Promise<void>[] = [];
  
  // Fetch North/South edges
  if (lat <= minLat + padLat) promises.push(loadFn(`${i - 1},${j}`));
  if (lat >= maxLat - padLat) promises.push(loadFn(`${i + 1},${j}`));
  
  // Fetch East/West edges
  if (lon <= minLon + padLon) promises.push(loadFn(`${i},${j - 1}`));
  if (lon >= maxLon - padLon) promises.push(loadFn(`${i},${j + 1}`));

  await Promise.allSettled(promises);
}
