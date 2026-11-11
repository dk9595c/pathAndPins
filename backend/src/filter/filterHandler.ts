import { Express, Request, Response } from "express";
import {
  activityCache,
  redliningCache,
  tileCache,
} from "../globalVariables.js";
import { assignRedliningToActivities } from "../red-linning/redLinningUtils.js";
import { voronoiRows } from "../voronoi-diagram-generator/voronoiGenerator.js";
import { WeatherRow } from "../weather-parser/weatherParserType.js";
import {
  assignWeatherToActivities,
  filterRowsWithBackup,
} from "./filterRows.js";

const DEFAULT_PROVIDENCE_ACTIVITIES = [
  {
    id: "pvd_station",
    name: "Providence Station",
    description: "Amtrak and MBTA station in downtown Providence.",
    duration: 30,
    lat: 41.8286,
    lng: -71.4148,
  },
  {
    id: "waterplace_park",
    name: "Waterplace Park",
    description: "Urban park and riverwalk basin.",
    duration: 45,
    lat: 41.8268,
    lng: -71.4139,
  },
  {
    id: "providence_place",
    name: "Providence Place Mall",
    description: "Downtown shopping, dining, and transit hub.",
    duration: 60,
    lat: 41.8265,
    lng: -71.4159,
  },
  {
    id: "risd_museum",
    name: "RISD Museum",
    description: "Art and cultural museum near College Hill.",
    duration: 90,
    lat: 41.8272,
    lng: -71.4075,
  },
  {
    id: "brown_campus",
    name: "Brown University",
    description: "Historic College Hill campus green.",
    duration: 60,
    lat: 41.8268,
    lng: -71.4035,
  },
];

export function registerFilterHandler(app: Express) {
  app.post("/filter", async (req: Request, res: Response) => {
    try {
      if (!tileCache.visibleActivityMap) {
        tileCache.visibleActivityMap = [];
      }
      if (!activityCache.activityMap) {
        activityCache.activityMap = {};
      }

      const filters = req.body?.filters || {};

      if (redliningCache?.areas && tileCache.visibleActivityMap.length > 0) {
        tileCache.visibleActivityMap = assignRedliningToActivities(
          tileCache.visibleActivityMap,
          redliningCache.areas
        );
      }

      const validVoronoiRows = (voronoiRows || []).filter(
        (row): row is WeatherRow & { polygon: { x: number; y: number }[] } =>
          !!row?.polygon
      );

      if (tileCache.visibleActivityMap.length > 0) {
        assignWeatherToActivities(tileCache.visibleActivityMap, validVoronoiRows);
      }

      const allActivities = Object.values(activityCache.activityMap || {});

      if (allActivities.length === 0 && tileCache.visibleActivityMap.length === 0) {
        const query = filters?.name?.value?.toLowerCase() || "";
        const matched = query
          ? DEFAULT_PROVIDENCE_ACTIVITIES.filter(
              (a) =>
                a.name.toLowerCase().includes(query) ||
                (a.description && a.description.toLowerCase().includes(query))
            )
          : DEFAULT_PROVIDENCE_ACTIVITIES;

        return res.status(200).json({
          count: matched.length,
          data: matched,
        });
      }

      const filtered = filterRowsWithBackup(
        tileCache.visibleActivityMap,
        filters,
        allActivities
      );

      return res.status(200).json({
        count: filtered.length,
        data: filtered,
      });
    } catch (error) {
      console.warn("Filter fallback triggered:", error);
      const query = req.body?.filters?.name?.value?.toLowerCase() || "";
      const matched = query
        ? DEFAULT_PROVIDENCE_ACTIVITIES.filter((a) =>
            a.name.toLowerCase().includes(query)
          )
        : DEFAULT_PROVIDENCE_ACTIVITIES;

      return res.status(200).json({
        count: matched.length,
        data: matched,
      });
    }
  });
}
