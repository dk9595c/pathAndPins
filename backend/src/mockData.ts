import type { GraphNode } from "./street-graph/graphSchema.js";

/**
 * Types representing query parameters and structured responses.
 */
export interface MockAPIRecord<Q = Record<string, unknown>, R = unknown> {
  endpoint: string;
  description: string;
  query: Q;
  response: R;
}

/**
 * Registry storing representative query and response pairs for:
 * 1. Census American Community Survey (ACS) 1-Year API
 * 2. FBI Crime Reporting Statistics API (Arrests and Law Enforcement counts)
 * 3. Census Geocoder Coordinates API
 */
export const mockDataRegistry = {
  // ==========================================
  // 1. U.S. Census ACS API Examples
  // ==========================================
  censusACS: {
    // Median Household Income & Total Population for Rhode Island Counties
    countyIncomeAndPop: {
      endpoint: "https://api.census.gov/data/2022/acs/acs1",
      description: "ACS 1-year estimates for median household income and total population across RI counties",
      query: {
        get: "NAME,B19013_001E,B01003_001E",
        for: "county:*",
        in: "state:44"
      },
      response: [
        ["NAME", "B19013_001E", "B01003_001E", "state", "county"],
        ["Providence County, Rhode Island", "68146", "660741", "44", "007"],
        ["Kent County, Rhode Island", "83478", "171278", "44", "003"],
        ["Washington County, Rhode Island", "95325", "129839", "44", "009"],
        ["Newport County, Rhode Island", "89452", "83832", "44", "005"],
        ["Bristol County, Rhode Island", "92340", "50793", "44", "001"]
      ]
    },
    // State-level aggregate query
    stateLevelSummary: {
      endpoint: "https://api.census.gov/data/2022/acs/acs1",
      description: "ACS 1-year state level aggregate for Rhode Island",
      query: {
        get: "NAME,B01003_001E,B19013_001E",
        for: "state:44"
      },
      response: [
        ["NAME", "B01003_001E", "B19013_001E", "state"],
        ["Rhode Island", "1093734", "81370", "44"]
      ]
    }
  },

  // ==========================================
  // 2. FBI Crime Reporting Statistics API Examples
  // ==========================================
  fbiCrime: {
    // User Story 1: Summarized violent crime / arrest data
    violentCrimeArrests: {
      endpoint: "https://api.usa.gov/crime/fbi/cbr/v1/summarized/state/RI/violent-crime",
      description: "Summarized violent crime offenses and arrests for Rhode Island",
      query: {
        state: "RI",
        offense: "violent-crime",
        granularity: "state"
      },
      response: {
        title: "Violent Crime Summarized Data for Rhode Island",
        state: "RI",
        data: [
          {
            year: 2021,
            violent_crime: 2511,
            homicide: 29,
            robbery: 372,
            aggravated_assault: 1620
          },
          {
            year: 2022,
            violent_crime: 2398,
            homicide: 27,
            robbery: 341,
            aggravated_assault: 1565
          }
        ]
      }
    },
    // User Story 2: Police employment counts
    policeEmploymentCounts: {
      endpoint: "https://api.usa.gov/crime/fbi/cbr/v1/pe/agency/RI0040100",
      description: "Law enforcement employee counts for Providence Police Department",
      query: {
        agency: "RI0040100",
        granularity: "agency"
      },
      response: {
        agency_ori: "RI0040100",
        agency_name: "Providence Police Department",
        data: [
          {
            year: 2021,
            male_officers: 398,
            female_officers: 42,
            total_officers: 440,
            male_civilians: 50,
            female_civilians: 65,
            total_pe: 555
          },
          {
            year: 2022,
            male_officers: 390,
            female_officers: 45,
            total_officers: 435,
            male_civilians: 52,
            female_civilians: 68,
            total_pe: 555
          }
        ]
      }
    }
  },

  // ==========================================
  // 3. Census Geocoder Coordinates API
  // ==========================================
  censusGeocoder: {
    providenceCoordinates: {
      endpoint: "https://geocoding.geo.census.gov/geocoder/geographies/coordinates",
      description: "Coordinate lookup translating lat/lon to County and State FIPS codes",
      query: {
        x: -71.4025,
        y: 41.8268,
        benchmark: "Public_AR_Current",
        vintage: "Current_Census1"
      },
      response: {
        result: {
          input: {
            benchmark: {
              benchmarkName: "Public_AR_Current"
            },
            location: {
              x: -71.4025,
              y: 41.8268
            }
          },
          geographies: {
            Counties: [
              {
                GEOID: "44007",
                NAME: "Providence County",
                STATE: "44",
                COUNTY: "007",
                CENTLAT: "+41.8706",
                CENTLON: "-071.5794"
              }
            ],
            States: [
              {
                GEOID: "44",
                NAME: "Rhode Island",
                STATE: "44",
                STUSAB: "RI"
              }
            ]
          }
        }
      }
    }
  }
};



// ==========================================
// 4. Street Graph Pathfinding Mock Data (Sprint 7 Task A)
// ==========================================

/**
 * Mocked OpenStreetMap nodes representing street intersections
 * near Brown University on College Hill.
 */
export const mockStreetNodes: Record<string, GraphNode> = {
  "osm_thayer_waterman": {
    id: "osm_thayer_waterman",
    lat: 41.8272,
    lon: -71.4002
  },
  "osm_thayer_angell": {
    id: "osm_thayer_angell",
    lat: 41.8282,
    lon: -71.4002
  },
  "osm_thayer_meeting": {
    id: "osm_thayer_meeting",
    lat: 41.8291,
    lon: -71.4003
  },
  "osm_brown_waterman": {
    id: "osm_brown_waterman",
    lat: 41.8272,
    lon: -71.4025
  },
  "osm_brown_angell": {
    id: "osm_brown_angell",
    lat: 41.8282,
    lon: -71.4025
  },
  "osm_prospect_waterman": {
    id: "osm_prospect_waterman",
    lat: 41.8272,
    lon: -71.4048
  }
};

/**
 * Mock Set 1: A direct linear path along Thayer Street.
 * Represents the sequence of node IDs returned by A* or Dijkstra.
 */
export const mockDirectPathNodeIds: string[] = [
  "osm_thayer_waterman",
  "osm_thayer_angell",
  "osm_thayer_meeting"
];

/**
 * Mock Set 2: A two-segment turn path from Thayer & Waterman to Brown & Angell.
 */
export const mockTurnPathNodeIds: string[] = [
  "osm_thayer_waterman",
  "osm_thayer_angell",
  "osm_brown_angell"
];

/**
 * Mock Set 3: An alternate cross-campus route via Waterman Street.
 */
export const mockAlternatePathNodeIds: string[] = [
  "osm_thayer_waterman",
  "osm_brown_waterman",
  "osm_prospect_waterman"
];

/**
 * Mocked route responses formatted for the frontend.
 * Matches the return shape of handleShortestPathRequest in shortestTwoPointPath.ts.
 */
export const mockFrontendRouteResponse = {
  path: [
    { lat: 41.8272, lng: -71.4002 },
    { lat: 41.8282, lng: -71.4002 },
    { lat: 41.8291, lng: -71.4003 }
  ]
};

export const mockFrontendTurnResponse = {
  path: [
    { lat: 41.8272, lng: -71.4002 },
    { lat: 41.8282, lng: -71.4002 },
    { lat: 41.8282, lng: -71.4025 }
  ]
};
