import { describe, it, expect } from "vitest";
import {
  fetchActivityDataFromFile,
  fetchActivityDataFromGoogleSheet,
} from "../activityDataFetcher";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
//added a flag to prevent running api calls in tests everytime
const runExternal = process.env.RUN_EXTERNAL === "true";

(runExternal ? describe : describe.skip)(
  "fetchActivityDataFromGoogleSheet",
  () => {
    it("should fetch and parse CSV data from a Google Sheet", async () => {
      const data = await fetchActivityDataFromGoogleSheet(
        process.env.SPREADSHEET!
      );
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      const activity = data[0];
      expect(activity).toHaveProperty("name");
      expect(activity).toHaveProperty("lat");
      expect(activity).toHaveProperty("lng");
      expect(activity).toHaveProperty("duration");
    });

    it("should throw for invalid URLs", async () => {
      const badUrl = "https://example.com/invalid.csv";
      await expect(fetchActivityDataFromGoogleSheet(badUrl)).rejects.toThrow();
    });
  }
);

describe("fetchActivityDataFromFile", () => {
  const samplePath = path.join(__dirname, "../sample-activities.csv");

  it("should parse a sample activity CSV correctly", async () => {
    const data = await fetchActivityDataFromFile(samplePath);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    for (const activity of data) {
      expect(activity).toHaveProperty("name");
      expect(activity).toHaveProperty("lat");
      expect(activity).toHaveProperty("lng");
      expect(activity).toHaveProperty("duration");
      expect(typeof activity.name).toBe("string");
      expect(typeof activity.lat).toBe("number");
      expect(typeof activity.lng).toBe("number");
      expect(typeof activity.duration).toBe("number");
    }
  });

  it("should contain a specific known activity", async () => {
    const data = await fetchActivityDataFromFile(samplePath);
    const GoldenGateWalk = data.find((a) =>
      a.name.toLowerCase().includes("golden gate walk")
    );

    expect(GoldenGateWalk).toBeDefined();
    expect(GoldenGateWalk?.duration).toBeGreaterThan(0);
  });

  it("should throw an error for a missing file", async () => {
    const badPath = path.join(__dirname, "../nonexistent-activities.csv");

    try {
      await fetchActivityDataFromFile(badPath);
      expect(false).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});
