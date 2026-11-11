import { useEffect, useRef } from "react";

import debounce from "lodash.debounce";

type TileManagerProps = {
  map: mapboxgl.Map | null;
  minZoom?: number;
  tileSize?: number;
  onTilesChanged: (tileKeys: string[]) => void;
};

const DEFAULT_TILE_SIZE = 0.1;

function getTileKeys(
  bounds: mapboxgl.LngLatBounds | null,
  tileSize: number
): string[] {
  if (!bounds) return [];

  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const minLat = Math.floor(sw.lat / tileSize);
  const maxLat = Math.floor(ne.lat / tileSize);
  const minLng = Math.floor(sw.lng / tileSize);
  const maxLng = Math.floor(ne.lng / tileSize);

  const keys: string[] = [];
  for (let lat = minLat; lat <= maxLat; lat++) {
    for (let lng = minLng; lng <= maxLng; lng++) {
      keys.push(`${lat},${lng}`);
    }
  }
  return keys;
}

export default function TileManager({
  map,
  tileSize = DEFAULT_TILE_SIZE,
  minZoom = 12,
  onTilesChanged,
}: TileManagerProps) {
  const prevTilesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    console.log("MAP: ", map);
    if (!map) return;
    const updateTiles = () => {
      if (map.getZoom() < minZoom) return;

      const bounds = map.getBounds();
      const keys = getTileKeys(bounds, tileSize);
      const keySet = new Set(keys);

      const hasChanged =
        keys.length > prevTilesRef.current.size ||
        keys.some((k) => !prevTilesRef.current.has(k));

      if (hasChanged) {
        prevTilesRef.current = keySet;
        onTilesChanged(keys);
      }
    };

    const debouncedUpdate = debounce(updateTiles, 500);

    map.on("moveend", debouncedUpdate);
    updateTiles();
    return () => {
      map.off("moveend", debouncedUpdate);
    };
  }, [map, tileSize, minZoom, onTilesChanged]);

  return null;
}
