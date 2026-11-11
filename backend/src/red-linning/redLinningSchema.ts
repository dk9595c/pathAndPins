import { z } from "zod";

/**
 * Schema representing the geometry of a redlining feature.
 *
 * - `type`: Must be "MultiPolygon".
 * - `coordinates`: Nested array of coordinates defining polygons.
 */
export const GeometrySchema = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(z.array(z.tuple([z.number(), z.number()])))),
});

/**
 * Schema representing the properties of a redlining feature.
 *
 * Fields:
 * - `city`: Name of the city.
 * - `holc_grade`: Redlining grade.
 * - `area_description_data`: Additional descriptive data as key-value pairs.
 */
export const PropertiesSchema = z.object({
  city: z.string(),
  holc_grade: z.string(),
  area_description_data: z.record(z.string()),
});

/**
 * Schema representing a single redlining GeoJSON feature.
 *
 * Fields:
 * - `type`: Must be "Feature".
 * - `geometry`: Geometry of the feature (`GeometrySchema`).
 * - `properties`: Properties of the feature (`PropertiesSchema`).
 */
export const FeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: GeometrySchema,
  properties: PropertiesSchema,
});

/**
 * Schema representing a redlining GeoJSON FeatureCollection.
 *
 * Fields:
 * - `type`: Must be "FeatureCollection".
 * - `features`: Array of redlining features (`FeatureSchema`).
 */
export const GeoJsonSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(FeatureSchema),
});

/**
 * Type representing a single validated redlining feature.
 */
export type RedliningFeature = z.infer<typeof FeatureSchema>;
