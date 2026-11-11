import { parseCSV, getFromFile } from "../utils/parserUtils";
import { z } from "zod";
import {
  BoundingBoxSchema,
  WeatherRowSchema,
} from "../weather-parser/weatherParserType";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Mock function that simulates fetching weather data from NOAA,
 * by reading a local CSV file.
 */
export async function mockFetchWeatherInBoundingBox(
  _boundingBox: z.infer<typeof BoundingBoxSchema>,
  _token: string
): Promise<{
  count: number;
  data: z.infer<typeof WeatherRowSchema>[];
}> {
  const filePath = path.join(__dirname, "./tests/sample-weather.csv");
  const rawData = getFromFile(filePath);
  const data = await parseCSV(rawData, WeatherRowSchema);

  return {
    count: data.length,
    data,
  };
}
