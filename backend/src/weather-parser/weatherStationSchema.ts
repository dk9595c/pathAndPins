import { z } from "zod";

/**
 * Zod schema defining a weather station.
 */
export const WeatherStationSchema = z.object({
  id: z.coerce.string(),
  name: z.coerce.string(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  elevation: z.coerce.number().optional(),
});

/**
 * Type representing a weather station.
 */
export type WeatherStation = z.infer<typeof WeatherStationSchema>;
