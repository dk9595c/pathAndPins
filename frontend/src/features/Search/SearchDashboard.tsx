import { ThemeToggle } from '../../components/ThemeToggle';
import React, { useState } from "react";
import SearchBar from "./SearchBar";
import SearchResults, { SearchResultItem } from "./SearchResults";
import FilterPanel from "../Filters/FilterPanel";
import "./SearchDashboard.css";
import { DatedActivity } from "../Itinerary/ItineraryPanel";
import axios from "axios";
import { DataViewer } from "../../components/DataViewer/DataViewer";

const mockResults: SearchResultItem[] = [
  {
    id: "1",
    name: "Providence Station",
    description: "Amtrak and MBTA station in downtown Providence.",
    duration: 30,
    lat: 41.8286,
    lng: -71.4148,
  },
  {
    id: "2",
    name: "Waterplace Park",
    description: "Urban park and riverwalk basin.",
    duration: 45,
    lat: 41.8268,
    lng: -71.4139,
  },
  {
    id: "3",
    name: "Providence Place Mall",
    description: "Downtown shopping, dining, and transit hub.",
    duration: 60,
    lat: 41.8265,
    lng: -71.4159,
  },
  {
    id: "4",
    name: "RISD Museum",
    description: "Art and cultural museum near College Hill.",
    duration: 90,
    lat: 41.8272,
    lng: -71.4075,
  },
  {
    id: "5",
    name: "Brown University",
    description: "Historic College Hill campus green.",
    duration: 60,
    lat: 41.8268,
    lng: -71.4035,
  },
];

interface SearchDashboardProps {
  activities: DatedActivity[];
  setActivities: (items: DatedActivity[]) => void;
  date: string;
}

const SearchDashboard: React.FC<SearchDashboardProps> = ({
  activities,
  setActivities,
  date,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const handleSearch = async (q: string) => {
    setQuery(q);
    let updatedFilters = filters;
    if (q) {
      updatedFilters = {
        ...filters,
        name: {
          operator: "contains",
          value: q,
        },
      };

      setFilters(updatedFilters);
    }

    try {
      const res = await axios.post("http://localhost:3001/filter", {
        filters: updatedFilters,
      });

      if (res.status === 200 && res.data?.data && res.data.data.length > 0) {
        setResults(res.data.data);
      } else {
        const queryLower = q.toLowerCase();
        const fallback = queryLower
          ? mockResults.filter(
              (m) =>
                m.name.toLowerCase().includes(queryLower) ||
                m.description.toLowerCase().includes(queryLower)
            )
          : mockResults;
        setResults(fallback);
      }
    } catch (err) {
      console.warn("Backend /filter endpoint unavailable, activating local fallback:", err);
      const queryLower = q.toLowerCase();
      const fallback = queryLower
        ? mockResults.filter(
            (m) =>
              m.name.toLowerCase().includes(queryLower) ||
              m.description.toLowerCase().includes(queryLower)
          )
        : mockResults;
      setResults(fallback);
    }
  };

  const handleSelect = (item: SearchResultItem) => {
    const alreadyExists = activities.some(
      (a) => a.id === item.id && a.date === date
    );
    if (!alreadyExists) {
      const newActivity: DatedActivity = {
        ...item,
        date,
      };
      setActivities([...activities, newActivity]);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <div className={`search-dashboard ${isFocused ? "expanded" : ""}`}>
        <SearchBar
          onSearch={handleSearch}
          onFocus={() => {
            if (!results.length) {
              handleSearch("");
            }
            setIsFocused(true);
          }}
          onBlur={() => setIsFocused(false)}
          expanded={isFocused}
        />
        {isFocused && <FilterPanel filters={filters} setFilters={setFilters} />}
      </div>

      {isFocused && <SearchResults results={results} onSelect={handleSelect} />}
      
      {/* Render the DataViewer in the sidebar below the search components */}
      <div style={{ marginTop: "auto", paddingTop: "20px" }}>
        <DataViewer />
        <ThemeToggle />
      </div>
    </div>
  );
};

export default SearchDashboard;