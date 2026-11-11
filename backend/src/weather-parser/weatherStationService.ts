import { z } from "zod";
import {
  WeatherStation,
  WeatherStationSchema,
} from "./weatherStationSchema.js";

const NOAA_STATIONS_URL_BASE =
  "https://www.ncei.noaa.gov/cdo-web/api/v2/stations";

/**
 * Fetches weather stations from NOAA API within a geographic bounding box.
 *
 * @param minLat - Minimum latitude of the bounding box.
 * @param minLon - Minimum longitude of the bounding box.
 * @param maxLat - Maximum latitude of the bounding box.
 * @param maxLon - Maximum longitude of the bounding box.
 * @param token - NOAA API token for authentication.
 * @returns Array of validated WeatherStation objects.
 * @throws Error if the fetch fails or station data is invalid.
 */
export async function getStationsInBoundingBox(
  minLat: number,
  minLon: number,
  maxLat: number,
  maxLon: number,
  token: string
): Promise<WeatherStation[]> {
  const url = `${NOAA_STATIONS_URL_BASE}?datasetid=GHCND&extent=${minLat},${minLon},${maxLat},${maxLon}&limit=1000`;
  const res = await fetchWithRetry(url, {
    headers: { token },
  });

  if (!res.ok) {
    const body = await res.text();
    return [];
  }

  const data = await res.json();
  const rawResults = data.results ?? [];

  const parsed = z.array(WeatherStationSchema).safeParse(rawResults);
  if (!parsed.success) {
    return [];
  }
  return parsed.data;
}

/**
 * Fetches a URL with automatic retries on failure or rate limiting.
 *
 * @param url - URL to fetch.
 * @param options - Fetch options.
 * @param maxRetries - Maximum number of retry attempts.
 * @param delay - Base delay in milliseconds between retries.
 * @returns Fetch Response object if successful.
 * @throws Last encountered error after exceeding max retries.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 5,
  delay = 500
): Promise<Response> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const body = await res.text();
        lastError = new Error(`Fetch failed (${res.status}): ${body}`);
        if (res.status === 503 || res.status === 429) {
          await new Promise((r) => setTimeout(r, delay * (i + 1)));
          continue;
        } else {
          throw lastError;
        }
      }
      return res;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }
  throw lastError;
}
