import { useState, useEffect } from "react";
import FilterPanel from "../features/Filters/FilterPanel";
import ItineraryPanel, {
  DatedActivity,
  ActivitiesByDate,
} from "../features/Itinerary/ItineraryPanel";
import MapView from "../features/Map/MapView";
import SearchDashboard from "../features/Search/SearchDashboard";
import { Location } from "../components/LocationPicker/LocationPicker";
import { loadUserItinerary } from "../utils/pinService";
import "./Planner.css";

interface PlannerProps {
  arrivalDate?: Date;
  departureDate?: Date;
  location?: Location;
}

function formatDate(date?: Date): string {
  const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  return validDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
  });
}

const DEFAULT_LOCATION: Location = {
  name: "Providence, RI",
  lat: 41.824,
  lng: -71.4128,
};

export const Planner: React.FC<PlannerProps> = ({
  arrivalDate = new Date(),
  departureDate = new Date(),
  location = DEFAULT_LOCATION,
}) => {
  // Bypassed Clerk hook to allow unauthenticated demo presentation
  const isSignedIn = false;
  const user = null;

  const [activitiesByDate, setActivitiesByDate] = useState<ActivitiesByDate>({});
  const [currentDate, setCurrentDate] = useState<string>(formatDate(arrivalDate));
  const [highlightMode, setHighlightMode] = useState<"none" | "weather" | "redlining">("none");
  const [mobileView, setMobileView] = useState<"itinerary" | "map">("itinerary");
  
  // 1. Add route state to Planner
  const [route, setRoute] = useState<{ lat: number; lng: number }[]>([]);

  // Load existing itinerary from Firestore automatically if the user is authenticated
  useEffect(() => {
    if (isSignedIn && user?.id) {
      loadUserItinerary(user.id).then((savedData) => {
        if (savedData && Object.keys(savedData).length > 0) {
          setActivitiesByDate(savedData);
        }
      });
    }
  }, [isSignedIn, user?.id]);

  const handleRemoveActivity = (date: string, id: string) => {
    console.log("remove");
    setActivitiesByDate((prev) => {
      const updated = [...(prev[date] || [])].filter((a) => a.id !== id);
      return { ...prev, [date]: updated };
    });
  };

  const handleReorderActivities = (
    date: string,
    reordered: DatedActivity[]
  ) => {
    setActivitiesByDate((prev) => ({ ...prev, [date]: reordered }));
  };

  const handleSetActivities = (newActivity: DatedActivity) => {
    setActivitiesByDate((prev) => {
      const current = prev[newActivity.date] || [];

      const alreadyExists = current.some((a) => a.id === newActivity.id);
      if (alreadyExists) return prev;

      return {
        ...prev,
        [newActivity.date]: [...current, newActivity],
      };
    });
  };

  const allActivities = Object.values(activitiesByDate).flat();

  return (
    <section id="planner" className={`planner-container show-${mobileView}`}>
      {/* Mobile Toggle Button */}
      <div className="mobile-toggle">
        <button
          className={mobileView === "itinerary" ? "active" : ""}
          onClick={() => setMobileView("itinerary")}
        >
          Show Itinerary
        </button>
        <button
          className={mobileView === "map" ? "active" : ""}
          onClick={() => setMobileView("map")}
        >
          Show Map
        </button>
      </div>

      <ItineraryPanel
        arrivalDate={arrivalDate}
        departureDate={departureDate}
        activitiesByDate={activitiesByDate}
        onRemoveActivity={handleRemoveActivity}
        onReorderActivities={handleReorderActivities}
        onDateChange={setCurrentDate}
        currentDate={currentDate}
        highlightMode={highlightMode}
        onHighlightModeChange={setHighlightMode}
        // 2. Pass route callback to update state when "Best Route" is clicked
        onRouteCalculated={(calculatedRoute) => setRoute(calculatedRoute)}
      />

      <div className="planner-map">
        <div className="map-search-bar">
          <SearchDashboard
            activities={allActivities}
            setActivities={(items) =>
              items.forEach((item) => handleSetActivities(item))
            }
            date={currentDate}
          />
        </div>
        <MapView
          markers={activitiesByDate[currentDate] || []}
          lat={location.lat}
          lng={location.lng}
          highlightMode={highlightMode}
          // 3. Pass the route down to MapView so it renders the blue line
          route={route}
        />
      </div>
    </section>
  );
};

export default Planner;