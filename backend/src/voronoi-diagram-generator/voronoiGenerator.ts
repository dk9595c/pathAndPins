import { Delaunay } from "d3-delaunay";
import { BoundingBox, WeatherRow } from "../weather-parser/weatherParserType";

/**
 * Global variable holding weather rows enriched with Voronoi polygons.
 */
export let voronoiRows: WeatherRow[];

/**
 * Assigns Voronoi polygons to weather rows based on their coordinates.
 *
 * - Removes duplicate coordinates.
 * - Constructs a Delaunay triangulation and Voronoi diagram.
 * - Adds a `polygon` property to each weather row representing its Voronoi cell.
 * - Updates the global `voronoiRows` variable with the enriched rows.
 *
 * @param rows - Array of weather rows to process.
 * @param bbox - Bounding box defining the extent of the Voronoi diagram.
 * @returns Array of weather rows enriched with Voronoi polygons.
 */
export function assignVoronoiPolygonsToWeatherRows(
  rows: WeatherRow[],
  bbox: BoundingBox
): WeatherRow[] {
  // Map coordinates and remove duplicates
  const coordMap = new Map<
    string,
    { coord: [number, number]; row: WeatherRow }
  >();
  for (const row of rows) {
    const key = `${row.lng},${row.lat}`;
    if (!coordMap.has(key)) {
      coordMap.set(key, { coord: [row.lng, row.lat], row });
    }
  }

  const uniqueCoords = Array.from(coordMap.values());

  const coords: [number, number][] = uniqueCoords.map((c) => c.coord);
  const delaunay = Delaunay.from(coords);
  const voronoi = delaunay.voronoi([
    bbox.minLon,
    bbox.minLat,
    bbox.maxLon,
    bbox.maxLat,
  ]);

  const enrichedRows: WeatherRow[] = [];

  uniqueCoords.forEach(({ row }, i) => {
    const polygon = voronoi.cellPolygon(i);
    if (!polygon) {
      return; // skip
    }
    enrichedRows.push({
      ...row,
      polygon: polygon.map(([x, y]) => ({ x, y })),
    });
  });
  voronoiRows = enrichedRows;
  return enrichedRows;
}
