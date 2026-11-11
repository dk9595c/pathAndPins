import React, { useState } from "react";
import axios from "axios";
import ActivityCard from "./ActivityCard";
import Button from "../../components/Button/Button";
import { SearchResultItem } from "../Search/SearchResults";
import "./ItineraryPanel.css";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SaveTripButton from "./SaveButton";

export type DatedActivity = SearchResultItem & { date: string };
export type ActivitiesByDate = Record<string, DatedActivity[]>;
type HighlightMode = "none" | "weather" | "redlining" | "states" | "counties";

type ItineraryPanelProps = {
  arrivalDate: Date;
  departureDate: Date;
  activitiesByDate: ActivitiesByDate;
  onRemoveActivity: (date: string, id: string) => void;
  onDateChange: (date: string) => void;
  onReorderActivities: (date: string, reordered: DatedActivity[]) => void;
  currentDate: string;
  highlightMode: HighlightMode;
  onHighlightModeChange: (mode: HighlightMode) => void;
  onRouteCalculated?: (route: { lat: number; lng: number }[]) => void;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
  });
}

function getDateRange(start: Date, end: Date): Date[] {
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function SortableActivityCard({
  activity,
  onRemove,
}: {
  activity: DatedActivity;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: "0.5rem",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ActivityCard
        name={activity.name}
        onRemove={() => onRemove(activity.id)}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

const ItineraryPanel: React.FC<ItineraryPanelProps> = ({
  arrivalDate,
  departureDate,
  activitiesByDate,
  onRemoveActivity,
  onDateChange,
  onReorderActivities,
  currentDate,
  highlightMode,
  onHighlightModeChange,
  onRouteCalculated,
}) => {
  const dateRange = getDateRange(arrivalDate, departureDate);
  const currentActivities = activitiesByDate[currentDate] || [];
  const [isCalculating, setIsCalculating] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = currentActivities.findIndex((a) => a.id === active.id);
    const newIndex = currentActivities.findIndex((a) => a.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(currentActivities, oldIndex, newIndex);
      onReorderActivities(currentDate, reordered);
    }
  };

  const handleBestRoute = async () => {
    if (currentActivities.length < 2) {
      alert("Please add at least 2 activities to this date's itinerary to calculate the best route.");
      return;
    }

    const points = currentActivities.map((activity) => ({
      lat: activity.lat,
      lng: activity.lng,
    }));

    setIsCalculating(true);

    try {
      const res = await axios.post("http://localhost:3001/find-path", { points });

      if (res.status === 200 && res.data) {
        const computedPath = res.data.path || res.data;
          alert(`Route calculated successfully! The path contains ${computedPath.length} coordinates.`);
        if (onRouteCalculated) {
          onRouteCalculated(computedPath);
        }

        // Broadcast event so MapView renders the line immediately
        window.dispatchEvent(
          new CustomEvent("route-updated", { detail: computedPath })
        );
      }
    } catch (error) {
      console.error("Failed to calculate path:", error);
      alert("Pathfinding failed. Please ensure the backend server is running on port 3001.");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <aside className="itinerary-panel">
      <h2>Itinerary</h2>
      <hr />
      <div className="itinerary-dates">
        {dateRange.map((date) => {
          const label = formatDate(date);
          const isSelected = label === currentDate;
          return (
            <button
              key={label}
              className={`date-pill ${isSelected ? "selected" : ""}`}
              onClick={() => onDateChange(label)}
              aria-label={`Select date ${label}${isSelected ? ", currently selected" : ""}`}
              aria-pressed={isSelected}
            >
              {label}
            </button>
          );
        })}
      </div>

      <hr />
      <div className="highlight-dropdown">
        <label htmlFor="highlight-select">Highlight:</label>
        <select
          id="highlight-select"
          value={highlightMode}
          onChange={(e) =>
            onHighlightModeChange(e.target.value as HighlightMode)
          }
          aria-label="Map highlight options"
        >
          <option value="none">None</option>
          <option value="weather">Weather</option>
          <option value="redlining">Red Lining</option>
          <option value="states">U.S. States</option>
          <option value="counties">U.S. Counties</option>
        </select>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={currentActivities.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="activity-list">
            {currentActivities.map((activity) => (
              <SortableActivityCard
                key={activity.id}
                activity={activity}
                onRemove={(id) => onRemoveActivity(currentDate, id)}
              />
            ))}
            {currentActivities.length !== 0 && <hr />}
          </div>
        </SortableContext>
      </DndContext>

      <div className="itinerary-buttons">
        <Button onClick={handleBestRoute}>
          {isCalculating ? "Finding Route..." : "Best Route"}
        </Button>
        <SaveTripButton activitiesByDate={activitiesByDate} />
      </div>
    </aside>
  );
};

export default ItineraryPanel;
