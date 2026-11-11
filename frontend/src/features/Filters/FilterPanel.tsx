import React, { useEffect, useState } from "react";
import "./FilterPanel.css";

interface FilterConfig {
  [key: string]:
    | {
        operator: "==" | "<=" | ">=" | "contains";
        value: string | number;
      }
    | boolean;
}

interface FilterPanelProps {
  filters: FilterConfig;
  setFilters: (filters: FilterConfig) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, setFilters }) => {
  // UI raw state
  const [form, setForm] = useState({
    free: false,
    priceMin: "",
    priceMax: "",
    area: "",
    tempMin: "",
    tempMax: "",
    skyCondition: "",
    timeMin: "",
    timeMax: "",
    foodNearby: false,
    parking: false,
  });

  useEffect(() => {
    const newFilters: FilterConfig = {};

    if (form.free === true) newFilters.free = true;
    if (form.foodNearby === true) newFilters.foodNearby = true;
    if (form.parking === true) newFilters.parking = true;

    if (form.priceMin !== "") {
      newFilters.price = { operator: ">=", value: Number(form.priceMin) };
    }
    if (form.priceMax !== "") {
      newFilters.price = { operator: "<=", value: Number(form.priceMax) };
    }

    if (form.tempMin !== "") {
      newFilters.temperature = {
        operator: ">=",
        value: Number(form.tempMin),
      };
    }
    if (form.tempMax !== "") {
      newFilters.temperature = {
        operator: "<=",
        value: Number(form.tempMax),
      };
    }

    if (form.timeMin !== "") {
      newFilters.duration = {
        operator: ">=",
        value: Number(form.timeMin),
      };
    }
    if (form.timeMax !== "") {
      newFilters.duration = {
        operator: "<=",
        value: Number(form.timeMax),
      };
    }

    if (form.area !== "") {
      newFilters.redliningGrade = { operator: "contains", value: form.area };
    }

    if (form.skyCondition !== "") {
      newFilters.weatherDescription = {
        operator: "==",
        value: form.skyCondition,
      };
    }

    setFilters(newFilters);
  }, [form]);

  const updateForm = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCheckbox = (key: string) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  return (
    <div className="filter-panel">
      <div className="filter-group">
        <h5>Price</h5>
        <label>
          <input
            type="checkbox"
            checked={form.free}
            onChange={() => toggleCheckbox("free")}
          />
          Free
        </label>
        <input
          type="number"
          placeholder="Min"
          value={form.priceMin}
          onChange={(e) => updateForm("priceMin", e.target.value)}
        />
        <input
          type="number"
          placeholder="Max"
          value={form.priceMax}
          onChange={(e) => updateForm("priceMax", e.target.value)}
        />
      </div>

      <div className="divider" />

      <div className="filter-group">
        <h5>Area</h5>
        <div className="redLinningOptions">
          {["A", "B", "C", "D"].map((area) => (
            <button
              key={area}
              className={`area-box area-${area} ${
                form.area === area ? "selected" : ""
              }`}
              onClick={() => updateForm("area", area)}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      <div className="filter-group">
        <h5>Weather</h5>
        <div className="weather-columns">
          <div className="temperature-column">
            <label>Temperature</label>
            <input
              type="number"
              placeholder="Min"
              value={form.tempMin}
              onChange={(e) => updateForm("tempMin", e.target.value)}
            />
            <input
              type="number"
              placeholder="Max"
              value={form.tempMax}
              onChange={(e) => updateForm("tempMax", e.target.value)}
            />
          </div>
          <div className="weatherConditionSection">
            <label>Sky Condition</label>
            <div className="WeatherConditions">
              {["Clear", "Rain", "Light Rain", "Sunny", "Cloudy", "Misty"].map(
                (condition) => (
                  <button
                    key={condition}
                    className={`tag-button ${
                      form.skyCondition === condition ? "selected" : ""
                    }`}
                    onClick={() => updateForm("skyCondition", condition)}
                  >
                    {condition}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="divider" />

      <div className="filter-group">
        <h5>Activity Info</h5>
        <div>
          <label>Time</label>
          <input
            type="number"
            placeholder="Min"
            value={form.timeMin}
            onChange={(e) => updateForm("timeMin", e.target.value)}
          />
          <input
            type="number"
            placeholder="Max"
            value={form.timeMax}
            onChange={(e) => updateForm("timeMax", e.target.value)}
          />
        </div>
        <label>
          <input
            type="checkbox"
            checked={form.foodNearby}
            onChange={() => toggleCheckbox("foodNearby")}
          />
          Food Nearby
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.parking}
            onChange={() => toggleCheckbox("parking")}
          />
          Parking
        </label>
      </div>
    </div>
  );
};

export default FilterPanel;
