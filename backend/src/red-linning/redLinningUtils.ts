import { ActivityRow } from "../activity-parser/activityDataFetcher";
import { RedliningFeature } from "./redLinningSchema";

/**
 * Determines whether any point of a redlining feature lies within a bounding box.
 *
 * @param feature - The redlining feature to test.
 * @param minLat - Minimum latitude of the bounding box.
 * @param maxLat - Maximum latitude of the bounding box.
 * @param minLng - Minimum longitude of the bounding box.
 * @param maxLng - Maximum longitude of the bounding box.
 * @returns True if any point of the feature is inside the bounding box.
 */
export function isFeatureInBoundingBox(
  feature: RedliningFeature,
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): boolean {
  const coordinates = feature.geometry.coordinates;

  for (const polygon of coordinates) {
    for (const ring of polygon) {
      for (const [lng, lat] of ring) {
        if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Filters a list of redlining features to only those intersecting a bounding box.
 *
 * @param features - Array of redlining features.
 * @param bounds - Bounding box with min/max latitude and longitude.
 * @returns Array of features within the bounding box.
 */
export function filterFeaturesByBoundingBox(
  features: RedliningFeature[],
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number }
): RedliningFeature[] {
  return features.filter((f) =>
    isFeatureInBoundingBox(
      f,
      bounds.minLat,
      bounds.maxLat,
      bounds.minLon,
      bounds.maxLon
    )
  );
}

/**
 * Determines if a 2D point lies inside a polygon using the ray-casting algorithm.
 *
 * @param point - Tuple [x, y] representing the point.
 * @param polygon - Array of tuples [[x, y], ...] representing the polygon vertices.
 * @returns True if the point is inside the polygon, false otherwise.
 */
function isPointInsidePolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1];
    const xj = polygon[j][0],
      yj = polygon[j][1];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0000001) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Assigns redlining grades to activity rows based on their location.
 *
 * - Checks if the activity's coordinates fall within any redlining feature polygon.
 * - Adds `redliningGrade` property to the activity if a match is found.
 *
 * @param activities - Array of activity rows.
 * @param redliningFeatures - Array of redlining features.
 * @returns Array of activity rows with `redliningGrade` assigned where applicable.
 */
export function assignRedliningToActivities(
  activities: ActivityRow[],
  redliningFeatures: RedliningFeature[]
): ActivityRow[] {
  return activities.map((activity) => {
    const { lat, lng } = activity;
    if (lat == null || lng == null) return activity;
    for (const feature of redliningFeatures) {
      for (const polygon of feature.geometry.coordinates) {
        const outerRing = polygon[0];
        if (isPointInsidePolygon([lng, lat], outerRing)) {
          return {
            ...activity,
            redliningGrade: feature.properties.holc_grade,
          };
        }
      }
    }

    return { ...activity, redliningGrade: undefined };
  });
}
