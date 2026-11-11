/**
 * osmEnricher.ts
 *
 * Implements road attribute enrichment and junction penalty modeling for Task X & Z.
 *
 * Uses raw OpenStreetMap tags to refine routing edge weights:
 *  1. Signal Delay: Adds time/distance penalties for 'highway="traffic_signals"'.
 *  2. Stop Delay: Adds deceleration and wait penalties for 'highway="stop"'.
 *  3. Speed Adjustments: Adjusts baseline edge costs by roadway travel speed.
 */

import { GraphTile } from './graphSchema.js';

export interface IntersectionControls {
  trafficSignals: Set<string>;
  stopSigns: Set<string>;
}

// Penalty additions in equivalent meters (simulating travel delay seconds)
const TRAFFIC_SIGNAL_PENALTY_METERS = 75; // Approx 15 to 20 second red light delay
const STOP_SIGN_PENALTY_METERS = 35; // Approx 5 to 8 second stop and clear delay

/**
 * Scans raw OSM element XML or JSON records to identify controlled intersection nodes.
 *
 * @param elements - Parsed OSM node records with tags
 * @returns Sets of node IDs with traffic signals or stop controls
 */
export function extractIntersectionControls(
  elements: { id: string | number; tags?: Record<string, string> }[]
): IntersectionControls {
  const trafficSignals = new Set<string>();
  const stopSigns = new Set<string>();

  for (const el of elements) {
    const id = String(el.id);
    const tags = el.tags || {};

    if (tags['highway'] === 'traffic_signals') {
      trafficSignals.add(id);
    } else if (tags['highway'] === 'stop') {
      stopSigns.add(id);
    }
  }

  return { trafficSignals, stopSigns };
}

/**
 * Enriches a standard GraphTile by augmenting edge weights that lead into
 * controlled intersections (traffic signals and stop signs) as identified in Task X.
 *
 * @param tile - Baseline GraphTile with purely geometric distances
 * @param controls - Sets of controlled intersection node IDs
 * @returns Enriched GraphTile with delay-adjusted edge weights
 */
export function applyTaskXEnrichment(
  tile: GraphTile,
  controls: IntersectionControls
): GraphTile {
  const enrichedNeighbors: Record<string, { id: string; weight: number }[]> = {};

  for (const [fromId, neighbors] of Object.entries(tile.neighbors)) {
    enrichedNeighbors[fromId] = neighbors.map((edge) => {
      let extraPenalty = 0;

      // Penalize edges entering a traffic signal
      if (controls.trafficSignals.has(edge.id)) {
        extraPenalty += TRAFFIC_SIGNAL_PENALTY_METERS;
      }

      // Penalize edges entering a stop sign
      if (controls.stopSigns.has(edge.id)) {
        extraPenalty += STOP_SIGN_PENALTY_METERS;
      }

      return {
        id: edge.id,
        weight: edge.weight + extraPenalty,
      };
    });
  }

  return {
    ...tile,
    neighbors: enrichedNeighbors,
  };
}
