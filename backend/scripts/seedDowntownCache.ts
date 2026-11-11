/**
 * seedDowntownCache.ts
 *
 * Implements Task Z: Takes the raw Providence map.osm extract, applies
 * Task X intersection penalties, and saves it as an on-disk pre-cached tile (Task Y).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GraphNode, GraphTile } from '../src/street-graph/graphSchema.js';
import { saveTileToDisk } from '../src/street-graph/diskCache.js';
import {
  extractIntersectionControls,
  applyTaskXEnrichment,
} from '../src/street-graph/osmEnricher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your map.osm file
const OSM_FILE_PATH = path.resolve(__dirname, '../../map.osm');

function fastMeters(aLat: number, aLon: number, bLat: number, bLon: number) {
  const K_LAT = 111320;
  const K_LON = 111320 * Math.cos((((aLat + bLat) / 2) * Math.PI) / 180);
  const dx = (bLon - aLon) * K_LON;
  const dy = (bLat - aLat) * K_LAT;
  return Math.hypot(dx, dy);
}

function runSeed() {
  if (!fs.existsSync(OSM_FILE_PATH)) {
    console.error('Could not find map.osm at:', OSM_FILE_PATH);
    return;
  }

  console.log('Reading map.osm for Task Z pre-caching...');
  const xml = fs.readFileSync(OSM_FILE_PATH, 'utf-8');

  // Extract nodes
  const nodeRegex = /<node id="(\d+)"[^>]*lat="([^"]+)" lon="([^"]+)"/g;
  const nodesById: Record<string, GraphNode> = {};
  let match;

  while ((match = nodeRegex.exec(xml)) !== null) {
    nodesById[match[1]] = {
      id: match[1],
      lat: parseFloat(match[2]),
      lon: parseFloat(match[3]),
    };
  }

  // Extract Task X intersection controls from tags
  const elementBlocks = xml.split('</node>');
  const taggedElements: { id: string; tags: Record<string, string> }[] = [];

  for (const block of elementBlocks) {
    const idMatch = block.match(/<node id="(\d+)"/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const tagMatches = block.matchAll(/<tag k="([^"]+)" v="([^"]+)"/g);
    const tags: Record<string, string> = {};
    for (const tm of tagMatches) {
      tags[tm[1]] = tm[2];
    }
    if (Object.keys(tags).length > 0) {
      taggedElements.push({ id, tags });
    }
  }

  const controls = extractIntersectionControls(taggedElements);
  console.log(
    `Extracted ${controls.trafficSignals.size} traffic signals and ${controls.stopSigns.size} stop signs.`
  );

  // Extract ways and build edges
  const neighbors: Record<string, { id: string; weight: number }[]> = {};
  const addNbr = (from: string, to: string, w: number) => {
    (neighbors[from] ??= []).push({ id: to, weight: w });
  };

  const wayBlocks = xml.split('</way>');
  for (const wb of wayBlocks) {
    if (!wb.includes('k="highway"')) continue;
    const ndMatches = [...wb.matchAll(/<nd ref="(\d+)"/g)].map((m) => m[1]);
    if (ndMatches.length < 2) continue;

    for (let i = 0; i < ndMatches.length - 1; i++) {
      const u = ndMatches[i];
      const v = ndMatches[i + 1];
      const nodeU = nodesById[u];
      const nodeV = nodesById[v];
      if (!nodeU || !nodeV) continue;

      const dist = fastMeters(nodeU.lat, nodeU.lon, nodeV.lat, nodeV.lon);
      addNbr(u, v, dist);
      addNbr(v, u, dist);
    }
  }

  // Base tile covering Downtown Providence tileKey '418,-715'
  const baseTile: GraphTile = {
    tileKey: '418,-715',
    nodes: Object.values(nodesById),
    neighbors,
  };

  // Apply Task X intersection wait penalties
  const enrichedTile = applyTaskXEnrichment(baseTile, controls);

  // Save to disk for Task Y & Z
  saveTileToDisk('418,-715', enrichedTile);
  console.log(
    `Successfully pre-cached enriched tile '418,-715' with ${enrichedTile.nodes.length} nodes to disk!`
  );
}

runSeed();
