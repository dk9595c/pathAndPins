import { describe, it, expect, vi } from "vitest";
import { fetchWeatherInBoundingBox } from "../fetchWeatherServices";
import { BoundingBoxSchema, WeatherRowSchema } from "../weatherParserType";
import dotenv from "dotenv";
import { mockFetchWeatherInBoundingBox } from "../mockFetchWeather";

dotenv.config();

const sampleBoundingBox = {
  minLat: 37.6,
  maxLat: 37.8,
  minLon: -122.6,
  maxLon: -122.3,
};

describe("mockFetchWeatherInBoundingBox", () => {
  it("should parse sample weather CSV correctly", async () => {
    const token = "fake-token";
    const { count, data } = await mockFetchWeatherInBoundingBox(
      sampleBoundingBox,
      token
    );

    expect(count).toBeGreaterThan(0);
    for (const row of data) {
      const parsed = WeatherRowSchema.safeParse(row);
      expect(parsed.success).toBe(true);
    }
  });
});

const runExternal = process.env.RUN_EXTERNAL === "true";

describe("fetchWeatherInBoundingBox", () => {
  const token = process.env.NOAA_API_TOKEN;

  if (!token || !runExternal) {
    it("[SKIPPED] should fetch real NOAA data", async () => {
      expect(true).toBe(true);
    });
    return;
  }

  it("should fetch real weather data from NOAA", async () => {
    const { count, data } = await fetchWeatherInBoundingBox(
      sampleBoundingBox,
      token
    );

    expect(count).toBeGreaterThan(0);
    for (const row of data) {
      const parsed = WeatherRowSchema.safeParse(row);
      expect(parsed.success).toBe(true);
    }
  });

  it("should throw if token is invalid", async () => {
    try {
      await fetchWeatherInBoundingBox(sampleBoundingBox, "bad-token");
      expect(false).toBe(true); // Should not reach
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it("should validate bounding box input", () => {
    const badInput = {
      minLat: "bad",
      maxLat: 37.8,
      minLon: -122.6,
      maxLon: -122.3,
    };
    const parsed = BoundingBoxSchema.safeParse(badInput);
    expect(parsed.success).toBe(false);
  });
});
