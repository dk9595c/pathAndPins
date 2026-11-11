import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "./MapView.css";
import { DatedActivity } from "../Itinerary/ItineraryPanel";
import TileManager from "./TileManager";
import axios from "axios";
import type {
  FeatureCollection,
  Polygon,
  LineString,
  GeoJsonProperties,
} from "geojson";
import { weatherDescriptionColors } from "./WeatherColorCode";

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
if (mapboxToken) {
  mapboxgl.accessToken = mapboxToken;
}

const WEATHER_LAYER_ID = "weather-voronoi";
const REDLINING_LAYER_ID = "redlining-layer";
const STATES_LAYER_ID = "states-layer";
const COUNTIES_LAYER_ID = "counties-layer";

type HighlightMode = "none" | "weather" | "redlining" | "states" | "counties";

type Props = {
  markers: DatedActivity[];
  lat: number;
  lng: number;
  highlightMode: HighlightMode;
  route?: { lat: number; lng?: number; lon?: number; longitude?: number; latitude?: number }[];
};

export default function MapView({ markers, lat, lng, highlightMode, route }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);
  const [activeRoute, setActiveRoute] = useState<any[]>(route || []);

  useEffect(() => {
    if (route) {
      setActiveRoute(route);
    }
  }, [route]);

  // Listen for the route calculation event dispatched from ItineraryPanel
  useEffect(() => {
    const handleRouteUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<any[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setActiveRoute(customEvent.detail);
      }
    };

    window.addEventListener("route-updated", handleRouteUpdate);
    return () => {
      window.removeEventListener("route-updated", handleRouteUpdate);
    };
  }, []);

  // Initialize map instance only if access token is available
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [lng, lat],
      zoom: 12,
    });

    setMapInstance(map);

    return () => {
      map.remove();
    };
  }, []);

  // Render markers and automatically center the camera on Providence
  useEffect(() => {
    if (!mapInstance) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    if (markers.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    markers.forEach((markerData) => {
      const marker = new mapboxgl.Marker()
        .setLngLat([markerData.lng, markerData.lat])
        .setPopup(new mapboxgl.Popup().setText(markerData.name ?? ""))
        .addTo(mapInstance);

      markerRefs.current.push(marker);
      bounds.extend([markerData.lng, markerData.lat]);
    });

    try {
      mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 1500 });
    } catch (err) {
      console.warn("Could not pan to markers:", err);
    }
  }, [markers, mapInstance]);

  // Render computed A* Route Layer safely using style load checks & normalized coordinates
  useEffect(() => {
    if (!mapInstance) return;

    const sourceId = "route-source";
    const layerId = "route-layer";

    const updateRouteLayer = () => {
      if (mapInstance.getLayer(layerId)) {
        mapInstance.removeLayer(layerId);
      }
      if (mapInstance.getSource(sourceId)) {
        mapInstance.removeSource(sourceId);
      }

      if (activeRoute && activeRoute.length > 1) {
        const coordinates = activeRoute
          .map((p: any) => {
            if (Array.isArray(p)) return p;
            const longitude = p.lng !== undefined ? p.lng : (p.lon !== undefined ? p.lon : p.longitude);
            const latitude = p.lat !== undefined ? p.lat : p.latitude;
            return [longitude, latitude];
          })
          .filter((coord) => coord[0] !== undefined && coord[1] !== undefined && !isNaN(coord[0]) && !isNaN(coord[1]));

        if (coordinates.length < 2) return;

        const geoJson: FeatureCollection<LineString> = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: coordinates,
              },
            },
          ],
        };

        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: geoJson,
        });

        mapInstance.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#3b82f6",
            "line-width": 6,
            "line-opacity": 0.9,
          },
        });

        try {
          const bounds = new mapboxgl.LngLatBounds();
          coordinates.forEach((coord) => bounds.extend(coord as [number, number]));
          mapInstance.fitBounds(bounds, { padding: 60, maxZoom: 15 });
        } catch (err) {
          console.warn("Could not adjust bounds to route:", err);
        }
      }
    };

    if (mapInstance.isStyleLoaded()) {
      updateRouteLayer();
    } else {
      mapInstance.once("load", updateRouteLayer);
    }
  }, [activeRoute, mapInstance]);

  // Fetch and render region boundaries (States or Counties)
  const fetchAndRenderRegionLayer = async (
    type: "state" | "county",
    sourceId: string,
    layerId: string,
    lineColor: string
  ) => {
    if (!mapInstance) return;

    try {
      const response = await axios.get(`http://localhost:3001/api/regions?type=${type}`);
      if (response.status !== 200) {
        throw new Error(`Failed to fetch ${type} boundaries.`);
      }
      const geoJson = response.data;

      if (!mapInstance.getSource(sourceId)) {
        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: geoJson,
        });

        mapInstance.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": lineColor,
            "line-width": 1.5,
            "line-opacity": 0.6,
          },
        });
      } else {
        const source = mapInstance.getSource(sourceId) as mapboxgl.GeoJSONSource;
        source.setData(geoJson);
      }
    } catch (err) {
      console.error(`Error rendering ${type} outlines:`, err);
    }
  };

  // Fetch and render weather polygons
  const fetchAndRenderWeatherPolygons = async (display: boolean = true) => {
    if (!mapInstance) return;

    try {
      const weatherRes = await axios.post(
        "http://localhost:3001/upload-weather-csv"
      );

      if (weatherRes.status !== 200) {
        throw new Error("Failed to fetch weather polygons.");
      }
      if (!display) {
        return;
      }
      const polygons = weatherRes.data;
      const geoJson = convertToGeoJSON(polygons);

      if (!mapInstance.getSource("weather")) {
        mapInstance.addSource("weather", {
          type: "geojson",
          data: geoJson,
        });

        mapInstance.addLayer({
          id: WEATHER_LAYER_ID,
          type: "fill",
          source: "weather",
          paint: {
            "fill-color": [
              "match",
              ["get", "weatherDescription"],
              ...Object.entries(weatherDescriptionColors).flat(),
              "#d1d5db",
            ],
            "fill-opacity": 0.4,
            "fill-outline-color": "#000000",
          },
        });
      } else {
        const source = mapInstance.getSource(
          "weather"
        ) as mapboxgl.GeoJSONSource;
        source.setData(geoJson);
      }
    } catch (err) {
      console.error("Error updating weather overlay:", err);
    }
  };

  const fetchAndRenderRedliningPolygons = async (display: boolean = true) => {
    if (!mapInstance) return;

    try {
      const redliningRes = await axios.post(
        "http://localhost:3001/highlight-redlining"
      );

      if (redliningRes.status !== 200) {
        throw new Error("Failed to fetch redlining polygons.");
      }
      if (!display) {
        return;
      }
      const geoJson: FeatureCollection = redliningRes.data;

      if (!mapInstance.getSource("redlining")) {
        mapInstance.addSource("redlining", {
          type: "geojson",
          data: geoJson,
        });

        mapInstance.addLayer({
          id: REDLINING_LAYER_ID,
          type: "fill",
          source: "redlining",
          paint: {
            "fill-color": [
              "match",
              ["get", "holc_grade"],
              "A",
              "#5bcc04",
              "B",
              "#04b8cc",
              "C",
              "#e9ed0e",
              "D",
              "#d11d1d",
              "H",
              "#000000",
              "#ccc",
            ],
            "fill-opacity": 0.2,
          },
        });
      } else {
        const source = mapInstance.getSource(
          "redlining"
        ) as mapboxgl.GeoJSONSource;
        source.setData(geoJson);
      }
    } catch (err) {
      console.error("Error updating redlining overlay:", err);
    }
  };

  useEffect(() => {
    if (!mapInstance) return;

    const removeLayerAndSource = (layerId: string, sourceId: string) => {
      if (mapInstance.getLayer(layerId)) {
        mapInstance.removeLayer(layerId);
      }
      if (mapInstance.getSource(sourceId)) {
        mapInstance.removeSource(sourceId);
      }
    };

    if (highlightMode !== "states") removeLayerAndSource(STATES_LAYER_ID, "states-source");
    if (highlightMode !== "counties") removeLayerAndSource(COUNTIES_LAYER_ID, "counties-source");
    if (highlightMode !== "weather") removeLayerAndSource(WEATHER_LAYER_ID, "weather");
    if (highlightMode !== "redlining") removeLayerAndSource(REDLINING_LAYER_ID, "redlining");

    if (highlightMode === "none") return;

    if (highlightMode === "states") {
      fetchAndRenderRegionLayer("state", "states-source", STATES_LAYER_ID, "#3b82f6");
    }

    if (highlightMode === "counties") {
      fetchAndRenderRegionLayer("county", "counties-source", COUNTIES_LAYER_ID, "#10b981");
    }

    if (highlightMode === "weather") {
      fetchAndRenderWeatherPolygons();
    }

    if (highlightMode === "redlining") {
      fetchAndRenderRedliningPolygons();
    }
  }, [highlightMode, mapInstance]);

  const handleTilesChanged = async (tileKeys: string[]) => {
    try {
      const tileRes = await axios.post(
        "http://localhost:3001/update-visible-tiles",
        { tileKeys }
      );

      if (tileRes.status !== 200) {
        throw new Error("Failed to update tiles.");
      }
      fetchAndRenderWeatherPolygons(false);
      fetchAndRenderRedliningPolygons(false);
    } catch (err) {
      console.error("Error updating tiles or weather overlay:", err);
    }
  };

  return (
    <div ref={mapContainer} className="map-container" style={{ position: "relative" }}>
      {mapInstance && (
        <TileManager map={mapInstance} onTilesChanged={handleTilesChanged} />
      )}
    </div>
  );
}

function convertToGeoJSON(
  stations: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    description?: string;
    polygon?: { x: number; y: number }[];
  }[]
): FeatureCollection<Polygon, GeoJsonProperties> {
  const features: Feature<Polygon, GeoJsonProperties>[] = stations
    .filter((s) => s.polygon && s.polygon.length >= 3)
    .map((station) => {
      const coords = station.polygon!.map((p) => [p.x, p.y]);
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords.push(first);
      }

      return {
        type: "Feature",
        properties: {
          id: station.id,
          name: station.name,
          weatherDescription: station.description ?? "Unknown",
        },
        geometry: {
          type: "Polygon",
          coordinates: [coords],
        },
      };
    });

  return {
    type: "FeatureCollection",
    features,
  };
}