import { Request, Response } from "express";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RawRouteRecord {
  userId: string;
  timestamp: number;
  path: LatLng[];
}

/**
 * Calculates Haversine distance in meters between two coordinates.
 */
function haversineMeters(p1: LatLng, p2: LatLng): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Trims 500 meters from the start and end of a path.
 * If the path total length is under 1000m, suppresses the path entirely
 * to prevent leaking micro-commutes.
 */
export function trimPathEndpoints(path: LatLng[], trimDistanceMeters: number = 500): LatLng[] {
  if (!path || path.length < 2) return [];

  // Calculate cumulative distances
  const cumDistances: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    const segment = haversineMeters(path[i - 1], path[i]);
    cumDistances.push(cumDistances[i - 1] + segment);
  }

  const totalLength = cumDistances[cumDistances.length - 1];
  if (totalLength <= trimDistanceMeters * 2) {
    // Suppress route entirely if it cannot safely support 500m trims on both ends
    return [];
  }

  const startCutoff = trimDistanceMeters;
  const endCutoff = totalLength - trimDistanceMeters;

  const trimmed: LatLng[] = [];
  for (let i = 0; i < path.length; i++) {
    if (cumDistances[i] >= startCutoff && cumDistances[i] <= endCutoff) {
      trimmed.push(path[i]);
    }
  }

  return trimmed;
}

/**
 * Snaps coordinates to a coarse geographic grid (3 decimal places ~= 110 meters)
 * to prevent pinpoint physical tracking.
 */
export function snapToGrid(coord: LatLng, precision: number = 3): LatLng {
  const factor = Math.pow(10, precision);
  return {
    lat: Math.round(coord.lat * factor) / factor,
    lng: Math.round(coord.lng * factor) / factor,
  };
}

/**
 * Sanitizes raw user trip records for external stakeholders.
 */
export function sanitizeRouteForStakeholder(record: RawRouteRecord) {
  const trimmed = trimPathEndpoints(record.path, 500);

  if (trimmed.length === 0) {
    return null;
  }

  const coarsenedPath = trimmed.map((pt) => snapToGrid(pt, 3));

  // Deduplicate consecutive identical snapped points
  const dedupedPath: LatLng[] = [];
  for (const pt of coarsenedPath) {
    if (
      dedupedPath.length === 0 ||
      dedupedPath[dedupedPath.length - 1].lat !== pt.lat ||
      dedupedPath[dedupedPath.length - 1].lng !== pt.lng
    ) {
      dedupedPath.push(pt);
    }
  }

  return {
    // PII removed: User ID replaced by generalized day bucket
    dayBucket: new Date(record.timestamp).toISOString().split("T")[0],
    pointCount: dedupedPath.length,
    path: dedupedPath,
  };
}

/**
 * Express handler for POST /api/stakeholder-data
 */
export function stakeholderDataHandler(req: Request, res: Response) {
  try {
    const rawRoutes: RawRouteRecord[] = req.body?.routes;

    if (!rawRoutes || !Array.isArray(rawRoutes)) {
      return res.status(400).json({
        error: "Missing or invalid routes array in request body.",
      });
    }

    const sanitizedRoutes = rawRoutes
      .map(sanitizeRouteForStakeholder)
      .filter((route) => route !== null);

    return res.status(200).json({
      success: true,
      deliveredRoutes: sanitizedRoutes.length,
      routes: sanitizedRoutes,
    });
  } catch (error) {
    console.error("Error processing stakeholder data export:", error);
    return res.status(500).json({ error: "Failed to sanitize stakeholder data." });
  }
}
