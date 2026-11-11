import { z } from "zod";
import {
  BoundingBox,
  getWeatherDescriptionFromCode,
  OpenMeteoRawRowSchema,
  WeatherRow,
} from "./weatherParserType.js";
import { parseCSV } from "../utils/parserUtils.js";
import NodeCache from "node-cache";
import { cachedStations } from "../globalVariables.js";
import { assignVoronoiPolygonsToWeatherRows } from "../voronoi-diagram-generator/voronoiGenerator.js";

/**
 * Cache for storing fetched weather CSV data.
 */
export const weatherCache = new NodeCache({ stdTTL: 60 * 10 });

/**
 * Fetches weather data from Open-Meteo API for all NOAA stations within a bounding box.
 *
 * - Fetches data from the API if not present in the cache.
 * - Parses and normalizes raw CSV rows into `WeatherRow` objects.
 * - Assigns Voronoi polygons to each weather row.
 *
 * @param bbox - Bounding box defining the area of interest.
 * @returns Array of `WeatherRow` objects enriched with Voronoi polygons.
 */
export async function fetchWeatherInBoundingBox(bbox: BoundingBox) {
  const allWeatherRows: WeatherRow[] = [];

  for (const station of cachedStations) {
    const { latitude: lat, longitude: lon } = station;
    const cacheKey = `weather:${lat.toFixed(2)},${lon.toFixed(2)}`;

    let weatherCSV: string | undefined = weatherCache.get(cacheKey);

    if (!weatherCSV) {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2024-06-01&end_date=2024-06-01&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&format=csv`;

      const res = await fetch(url);
      if (!res.ok) {
        continue;
      }

      weatherCSV = await res.text();
      weatherCSV = weatherCSV
        .split("\n")
        .slice(3) // For some reason the API returns part of the query as Metadata so we need to take that out first 3 lines
        .join("\n");

      weatherCache.set(cacheKey, weatherCSV);
    }

    try {
      const rawRows = await parseCSV(
        () => Promise.resolve(weatherCSV!),
        OpenMeteoRawRowSchema
      );

      const normalized = rawRows.map((raw) =>
        normalizeWeatherRow(raw, lat, lon)
      );
      allWeatherRows.push(...normalized);
    } catch (err) {
      continue;
    }
  }
  const rowsWithPolygons = assignVoronoiPolygonsToWeatherRows(
    allWeatherRows,
    bbox
  );
  return rowsWithPolygons;
}

/**
 * Normalizes a raw Open-Meteo CSV row into a `WeatherRow`.
 *
 * @param raw - Raw CSV row validated by `OpenMeteoRawRowSchema`.
 * @param lat - Latitude of the station.
 * @param lng - Longitude of the station.
 * @returns `WeatherRow` object with standardized fields.
 */
export function normalizeWeatherRow(
  raw: z.infer<typeof OpenMeteoRawRowSchema>,
  lat: number,
  lng: number
): WeatherRow {
  return {
    date: raw.time,
    minTemp: raw["temperature_2m_min (°C)"],
    maxTemp: raw["temperature_2m_max (°C)"],
    precipitation: raw["precipitation_sum (mm)"],
    lat,
    lng,
    description: getWeatherDescriptionFromCode(raw["weathercode (wmo code)"]),
  };
}
