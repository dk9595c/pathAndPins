import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveTileToDisk,
  loadTileFromDisk,
  isTileCachedOnDisk,
} from './diskCache.js';
import {
  extractIntersectionControls,
  applyTaskXEnrichment,
} from './osmEnricher.js';
import { GraphTile } from './graphSchema.js';

describe('Task Z: Implementation of Task X and Task Y', () => {
  const sampleTile: GraphTile = {
    tileKey: 'test_tile',
    nodes: [
      { id: 'node_sig', lat: 41.82, lon: -71.41 },
      { id: 'node_regular', lat: 41.83, lon: -71.41 },
    ],
    neighbors: {
      node_regular: [{ id: 'node_sig', weight: 50 }],
      node_sig: [{ id: 'node_regular', weight: 50 }],
    },
  };

  it('correctly persists and reloads graph tiles to/from disk (Task Y)', () => {
    saveTileToDisk('test_tile', sampleTile);
    expect(isTileCachedOnDisk('test_tile')).toBe(true);

    const reloaded = loadTileFromDisk('test_tile');
    expect(reloaded).not.toBeNull();
    expect(reloaded!.tileKey).toBe('test_tile');
    expect(reloaded!.nodes.length).toBe(2);
  });

  it('augments edge weights with traffic light and stop sign penalties (Task X)', () => {
    const rawElements = [
      { id: 'node_sig', tags: { highway: 'traffic_signals' } },
    ];

    const controls = extractIntersectionControls(rawElements);
    expect(controls.trafficSignals.has('node_sig')).toBe(true);

    const enriched = applyTaskXEnrichment(sampleTile, controls);
    // Edge entering node_sig should have received the 75m traffic light penalty (50 + 75 = 125)
    const edgeToSignal = enriched.neighbors['node_regular'].find(
      (e) => e.id === 'node_sig'
    );
    expect(edgeToSignal!.weight).toBe(125);

    // Edge leaving node_sig toward regular node retains original base cost
    const edgeFromSignal = enriched.neighbors['node_sig'].find(
      (e) => e.id === 'node_regular'
    );
    expect(edgeFromSignal!.weight).toBe(50);
  });
});
