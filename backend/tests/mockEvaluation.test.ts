import { describe, it, expect } from "vitest";
import { CensusGeocoderResponseSchema } from "../src/apiSchemas.js";
import {
  fetchGeocoderStatic,
  fetchGeocoderFuzzed,
  fetchGeocoderReal
} from "../src/mockFetchers.js";

describe("Task F: Mock Evaluation", () => {
  const dummyQuery = { x: -71.4025, y: 41.8268 };

  it("verifies the static mock satisfies the consumer contract", async () => {
    const data = await fetchGeocoderStatic(dummyQuery);
    const validation = CensusGeocoderResponseSchema.safeParse(data);
    expect(validation.success).toBe(true);
  });

  it("verifies the fuzzed mock satisfies the consumer contract", async () => {
    const data = await fetchGeocoderFuzzed(dummyQuery);
    const validation = CensusGeocoderResponseSchema.safeParse(data);
    expect(validation.success).toBe(true);
  });

  it("verifies the real network mock satisfies the consumer contract", async () => {
    const data = await fetchGeocoderReal(dummyQuery);
    const validation = CensusGeocoderResponseSchema.safeParse(data);
    expect(validation.success).toBe(true);
  });
});
