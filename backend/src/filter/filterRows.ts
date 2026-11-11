import { WeatherRow } from "../weather-parser/weatherParserType";
import { ActivityRow } from "../activity-parser/activityDataFetcher";
import {
  FilterConfig,
  FilterOperator,
  OperatorFunction,
} from "./filterConfigSchema";

/**
 * Mapping of supported filter operators to their evaluation functions.
 */
const operatorFunctions: Record<FilterOperator, OperatorFunction> = {
  "==": (a, b) => a === b,
  ">=": (a, b) => typeof a === "number" && a >= b,
  "<=": (a, b) => typeof a === "number" && a <= b,
  contains: (a, b) =>
    typeof a === "string" &&
    typeof b === "string" &&
    a.toLowerCase().includes(b.toLowerCase()),
};

/**
 * Filters an array of rows based on the provided filter configuration.
 *
 * - Each field in the config must exist in the row.
 * - Boolean configs require strict equality.
 * - Operator configs use the appropriate operator function.
 *
 * @param rows - The dataset to filter.
 * @param config - The filter configuration.
 * @returns Filtered rows matching the conditions.
 */
export function filterRows<T extends Record<string, any>>(
  rows: T[],
  config: FilterConfig
): T[] {
  return rows.filter((row) => {
    for (const field in config) {
      if (!(field in row)) return false;

      const filter = config[field];
      const rowValue = row[field];

      if (typeof filter === "boolean") {
        if (rowValue !== filter) return false;
      } else {
        const { operator, value } = filter;
        const opFunc = operatorFunctions[operator];
        if (!opFunc || !opFunc(rowValue, value)) return false;
      }
    }
    return true;
  });
}

/**
 * Filters rows using `filterRows`, with a backup fallback strategy:
 *
 * - If no primary matches are found, attempts a fallback name-based match
 *   against the backup dataset.
 * - The fallback only applies if the config specifies a `contains` condition
 *   on a string field (default: `"name"`).
 *
 * @param rows - The primary dataset to filter.
 * @param config - The filter configuration.
 * @param backupRows - Optional backup dataset to search if no primary matches.
 * @param opts - Options to override default behavior (e.g., custom `nameField`).
 * @returns Filtered rows from primary or backup dataset.
 */
export function filterRowsWithBackup<T extends Record<string, any>>(
  rows: T[],
  config: FilterConfig,
  backupRows: T[] = [],
  opts: { nameField?: string } = {}
): T[] {
  const primary = filterRows(rows, config);
  if (primary.length) return primary;

  const nameField = opts.nameField ?? "name";
  const cond = config[nameField];

  if (!cond || typeof cond === "boolean") return [];
  const { value } = cond;

  if (typeof value !== "string") return [];

  const needle = value.trim().toLowerCase();
  if (!needle) return [];

  return backupRows.filter((row) => {
    const v = row[nameField];
    return typeof v === "string" && v.trim().toLowerCase() === needle;
  });
}

/**
 * Assigns weather data to activities based on spatial containment.
 *
 * - Iterates through activities and finds the first weather row
 *   whose polygon contains the activity’s coordinates.
 * - Assigns midpoint temperature and condition description.
 *
 * @param activities - Array of activities to update.
 * @param weatherRows - Weather rows with associated Voronoi polygons.
 */
export function assignWeatherToActivities(
  activities: ActivityRow[],
  weatherRows: (WeatherRow & { polygon: { x: number; y: number }[] })[]
): void {
  for (const activity of activities) {
    const point = { x: activity.lng, y: activity.lat };

    for (const weatherRow of weatherRows) {
      if (weatherRow.polygon && isPointInPolygon(point, weatherRow.polygon)) {
        activity.temperature = (weatherRow.maxTemp - weatherRow.minTemp) / 2;
        activity.condition = weatherRow.description;
        break;
      }
    }
  }
}

/**
 * Determines whether a given point lies inside a polygon using the ray-casting algorithm.
 *
 * @param point - The point to test.
 * @param polygon - The polygon defined as an array of vertices `{ x, y }`.
 * @returns True if the point is inside the polygon, false otherwise.
 */
export function isPointInPolygon(
  point: { x: number; y: number },
  polygon: { x: number; y: number }[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.0000001) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}
