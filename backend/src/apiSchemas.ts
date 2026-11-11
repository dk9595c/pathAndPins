import { z } from "zod";

/**
 * 1. Census ACS Schema
 * Returns a 2D array of strings where row 0 is always the header labels.
 */
export const CensusACSResponseSchema = z.array(z.array(z.string())).min(1);
export type CensusACSResponse = z.infer<typeof CensusACSResponseSchema>;

/**
 * 2. FBI Crime API Schemas
 * Covers both summarized offenses and law-enforcement employee counts.
 */
export const FBISummarizedCrimeItemSchema = z.object({
  year: z.number().int(),
  violent_crime: z.number().nonnegative().optional(),
  homicide: z.number().nonnegative().optional(),
  robbery: z.number().nonnegative().optional(),
  aggravated_assault: z.number().nonnegative().optional(),
});

export const FBISummarizedCrimeResponseSchema = z.object({
  title: z.string(),
  state: z.string().length(2),
  data: z.array(FBISummarizedCrimeItemSchema),
});
export type FBISummarizedCrimeResponse = z.infer<typeof FBISummarizedCrimeResponseSchema>;

export const FBIPoliceEmployeeItemSchema = z.object({
  year: z.number().int(),
  male_officers: z.number().nonnegative().optional(),
  female_officers: z.number().nonnegative().optional(),
  total_officers: z.number().nonnegative().optional(),
  male_civilians: z.number().nonnegative().optional(),
  female_civilians: z.number().nonnegative().optional(),
  total_pe: z.number().nonnegative().optional(),
});

export const FBIPoliceEmployeeResponseSchema = z.object({
  agency_ori: z.string(),
  agency_name: z.string(),
  data: z.array(FBIPoliceEmployeeItemSchema),
});
export type FBIPoliceEmployeeResponse = z.infer<typeof FBIPoliceEmployeeResponseSchema>;

/**
 * 3. Census Geocoder Schema
 * Translates coordinates into geographic identifiers (State & County FIPS).
 */
export const CountyGeographySchema = z.object({
  GEOID: z.string(),
  NAME: z.string(),
  STATE: z.string(),
  COUNTY: z.string(),
  CENTLAT: z.string().optional(),
  CENTLON: z.string().optional(),
});

export const StateGeographySchema = z.object({
  GEOID: z.string(),
  NAME: z.string(),
  STATE: z.string(),
  STUSAB: z.string(),
});

export const CensusGeocoderResponseSchema = z.object({
  result: z.object({
    input: z.object({
      benchmark: z.object({
        benchmarkName: z.string(),
      }),
      location: z.object({
        x: z.number(),
        y: z.number(),
      }),
    }),
    geographies: z.object({
      Counties: z.array(CountyGeographySchema).default([]),
      States: z.array(StateGeographySchema).default([]),
    }),
  }),
});
export type CensusGeocoderResponse = z.infer<typeof CensusGeocoderResponseSchema>;

/**
 * 4. GeoJSON Schema for State and County Boundaries
 */
const geometrySchema = z.object({
  type: z.enum(["Polygon", "MultiPolygon"]),
  coordinates: z.array(z.any()),
});

const featureSchema = z.object({
  type: z.literal("Feature"),
  properties: z.record(z.any()),
  geometry: geometrySchema,
});

export const geoJsonSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(featureSchema),
});
