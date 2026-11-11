import { ActivityRow } from "./activity-parser/activityDataFetcher";
import { RedliningFeature } from "./red-linning/redLinningSchema";
import { GraphTile } from "./street-graph/graphSchema";
import { WeatherStation } from "./weather-parser/weatherStationSchema";

/**
 * Global cache for activity data.
 * Maps coordinates "lat,lng" to ActivityRow objects.
 */
export const activityCache: {
  activityMap: Record<string, ActivityRow>;
} = {
  activityMap: {},
};

/**
 * Cache for tile-related data.
 * - `loadedTiles` tracks which tiles have been loaded.
 * - `visibleActivityMap` stores activities currently visible on tiles.
 */
export const tileCache = {
  loadedTiles: new Set<string>(),
  visibleActivityMap: [] as ActivityRow[],
};

/**
 * Cache for weather stations fetched from NOAA or other sources.
 */
export const cachedStations: WeatherStation[] = [];

/**
 * Cache for redlining data.
 * - `areas` holds the GeoJSON features for redlining zones.
 */
export const redliningCache: {
  areas: RedliningFeature[] | null;
} = {
  areas: null,
};

/**
 * Global cache for street graph tiles.
 * Maps tile keys to GraphTile objects.
 */
export const graphCache: Record<string, GraphTile> = {};

export const TILE_SIZE = 0.1;
