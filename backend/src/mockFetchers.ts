import fc from "fast-check";
import { mockDataRegistry } from "./mockData.js";
import { CensusGeocoderResponse } from "./apiSchemas.js";

export interface GeocoderQuery {
  x: number;
  y: number;
}
export type GeocoderFetcher = (query: GeocoderQuery) => Promise<CensusGeocoderResponse>;

const geocoderFuzzGen = fc.record({
  result: fc.record({
    input: fc.record({
      benchmark: fc.record({ benchmarkName: fc.string({ minLength: 1 }) }),
      location: fc.record({ x: fc.double(), y: fc.double() }),
    }),
    geographies: fc.record({
      Counties: fc.array(
        fc.record({
          GEOID: fc.string(), NAME: fc.string(), STATE: fc.string(), COUNTY: fc.string(),
          CENTLAT: fc.option(fc.string(), { nil: undefined }), CENTLON: fc.option(fc.string(), { nil: undefined })
        })
      ),
      States: fc.array(
        fc.record({
          GEOID: fc.string(), NAME: fc.string(), STATE: fc.string(), STUSAB: fc.string()
        })
      )
    })
  })
});

// Fix 1: Access the nested providenceCoordinates property
export const fetchGeocoderStatic: GeocoderFetcher = async (query) => {
  return mockDataRegistry.censusGeocoder.providenceCoordinates.response as CensusGeocoderResponse;
};

export const fetchGeocoderFuzzed: GeocoderFetcher = async (query) => {
  const sample = fc.sample(geocoderFuzzGen, 1)[0];
  return sample as CensusGeocoderResponse;
};

// Fix 2: Corrected the vintage parameter to "Current_Current"
export const fetchGeocoderReal: GeocoderFetcher = async (query) => {
  const response = await fetch(
    "https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=-71.4025&y=41.8268&benchmark=Public_AR_Current&vintage=Current_Current&format=json"
  );
  const data = await response.json();
  return data as CensusGeocoderResponse;
};
