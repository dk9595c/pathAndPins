import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  CensusACSResponseSchema,
  FBISummarizedCrimeResponseSchema,
  FBIPoliceEmployeeResponseSchema,
  CensusGeocoderResponseSchema,
} from "../src/apiSchemas.js";

const censusACSArbitrary = fc
  .tuple(
    fc.constant(["NAME", "B19013_001E", "B01003_001E", "state", "county"]),
    fc.array(
      fc.tuple(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 0, max: 250000 }).map(String),
        fc.integer({ min: 0, max: 10000000 }).map(String),
        fc.integer({ min: 1, max: 56 }).map((n) => n.toString().padStart(2, "0")),
        fc.integer({ min: 1, max: 840 }).map((n) => n.toString().padStart(3, "0"))
      ),
      { minLength: 1, maxLength: 20 }
    )
  )
  .map(([headers, rows]) => [headers, ...rows]);

const fbiSummarizedCrimeArbitrary = fc.record({
  title: fc.string({ minLength: 1 }),
  state: fc.stringMatching(/^[A-Z]{2}$/),
  data: fc.array(
    fc.record({
      year: fc.integer({ min: 1960, max: 2026 }),
      violent_crime: fc.option(fc.integer({ min: 0, max: 100000 }), { nil: undefined }),
      homicide: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: undefined }),
      robbery: fc.option(fc.integer({ min: 0, max: 50000 }), { nil: undefined }),
      aggravated_assault: fc.option(fc.integer({ min: 0, max: 50000 }), { nil: undefined }),
    }),
    { minLength: 1, maxLength: 10 }
  ),
});

const fbiPoliceEmployeeArbitrary = fc.record({
  agency_ori: fc.stringMatching(/^[A-Z]{2}[0-9]{7}$/),
  agency_name: fc.string({ minLength: 1 }),
  data: fc.array(
    fc.record({
      year: fc.integer({ min: 1960, max: 2026 }),
      male_officers: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: undefined }),
      female_officers: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: undefined }),
      total_officers: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: undefined }),
      male_civilians: fc.option(fc.integer({ min: 0, max: 2000 }), { nil: undefined }),
      female_civilians: fc.option(fc.integer({ min: 0, max: 2000 }), { nil: undefined }),
      total_pe: fc.option(fc.integer({ min: 0, max: 15000 }), { nil: undefined }),
    }),
    { minLength: 1, maxLength: 10 }
  ),
});

const censusGeocoderArbitrary = fc.record({
  result: fc.record({
    input: fc.record({
      benchmark: fc.record({
        benchmarkName: fc.string({ minLength: 1 }),
      }),
      location: fc.record({
        x: fc.double({ min: -180, max: 180, noNaN: true }),
        y: fc.double({ min: -90, max: 90, noNaN: true }),
      }),
    }),
    geographies: fc.record({
      Counties: fc.array(
        fc.record({
          GEOID: fc.stringMatching(/^[0-9]{5}$/),
          NAME: fc.string({ minLength: 1 }),
          STATE: fc.stringMatching(/^[0-9]{2}$/),
          COUNTY: fc.stringMatching(/^[0-9]{3}$/),
          CENTLAT: fc.option(fc.string(), { nil: undefined }),
          CENTLON: fc.option(fc.string(), { nil: undefined }),
        }),
        { maxLength: 5 }
      ),
      States: fc.array(
        fc.record({
          GEOID: fc.stringMatching(/^[0-9]{2}$/),
          NAME: fc.string({ minLength: 1 }),
          STATE: fc.stringMatching(/^[0-9]{2}$/),
          STUSAB: fc.stringMatching(/^[A-Z]{2}$/),
        }),
        { maxLength: 2 }
      ),
    }),
  }),
});

describe("Task E: Response Fuzzing with fast-check", () => {
  it("generates random Census ACS responses that validate against CensusACSResponseSchema", () => {
    fc.assert(
      fc.property(censusACSArbitrary, (data) => {
        const result = CensusACSResponseSchema.safeParse(data);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("generates random FBI Summarized Crime responses that validate against FBISummarizedCrimeResponseSchema", () => {
    fc.assert(
      fc.property(fbiSummarizedCrimeArbitrary, (data) => {
        const result = FBISummarizedCrimeResponseSchema.safeParse(data);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("generates random FBI Police Employee responses that validate against FBIPoliceEmployeeResponseSchema", () => {
    fc.assert(
      fc.property(fbiPoliceEmployeeArbitrary, (data) => {
        const result = FBIPoliceEmployeeResponseSchema.safeParse(data);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("generates random Census Geocoder responses that validate against CensusGeocoderResponseSchema", () => {
    fc.assert(
      fc.property(censusGeocoderArbitrary, (data) => {
        const result = CensusGeocoderResponseSchema.safeParse(data);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
