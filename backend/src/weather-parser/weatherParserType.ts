import { z } from "zod";

/**
 * Zod schema defining a weather row with optional Voronoi polygon.
 */
export const WeatherRowSchema = z.object({
  date: z.string().refine((d) => !isNaN(Date.parse(d)), {
    message: "Invalid date",
  }),
  minTemp: z.coerce.number(),
  maxTemp: z.coerce.number(),
  precipitation: z.coerce.number(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  description: z.coerce.string().optional(),
  polygon: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
      })
    )
    .optional(),
});

/**
 * Type for a validated weather row.
 */
export type WeatherRow = z.infer<typeof WeatherRowSchema>;

/**
 * Zod schema defining a geographic bounding box.
 */
export const BoundingBoxSchema = z.object({
  minLat: z.coerce.number(),
  maxLat: z.coerce.number(),
  minLon: z.coerce.number(),
  maxLon: z.coerce.number(),
});

/**
 * Type representing a bounding box.
 */
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

/**
 * Zod schema for a raw Open-Meteo CSV row.
 */
export const OpenMeteoRawRowSchema = z.object({
  time: z.coerce.string(),
  "temperature_2m_max (°C)": z.coerce.number(),
  "temperature_2m_min (°C)": z.coerce.number(),
  "precipitation_sum (mm)": z.coerce.number(),
  "weathercode (wmo code)": z.coerce.number(),
});

/**
 * Maps a numeric Open-Meteo weather code to a human-readable description.
 *
 * @param code - Weather code from Open-Meteo.
 * @returns Description string corresponding to the code.
 */
export function getWeatherDescriptionFromCode(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Heavy Rain";
  if (code >= 85 && code <= 86) return "Heavy Snow";
  if (code === 95) return "Thunderstorm";
  if (code >= 96 && code <= 99) return "Thunderstorm with hail";
  return "Unknown";
}
