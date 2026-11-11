import { describe, it, expect } from "vitest";
import path from "path";
import { fetchLocDataFromFile } from "../InitialLocDataFetcher";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
describe("fetchLocDataFromFile", () => {
  const samplePath = path.join(__dirname, "../sample.csv");

  it("should parse a sample CSV file correctly", async () => {
    const data = await fetchLocDataFromFile(samplePath);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    for (const row of data) {
      expect(row).toHaveProperty("name");
      expect(row).toHaveProperty("lat");
      expect(row).toHaveProperty("lng");
      expect(typeof row.name).toBe("string");
      expect(typeof row.lat).toBe("number");
      expect(typeof row.lng).toBe("number");
    }
  });

  it("should parse known city locations", async () => {
    const data = await fetchLocDataFromFile(samplePath);
    const sf = data.find((row) => row.name === "San Francisco");

    expect(sf).toBeDefined();
    expect(sf?.lat).toBeGreaterThan(30);
    expect(sf?.lng).toBeLessThan(-100);
  });

  it("should fail gracefully when given an invalid path", async () => {
    const badPath = path.join(__dirname, "../nonexistent.csv");

    try {
      await fetchLocDataFromFile(badPath);
      expect(false).toBe(true);
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });
});
