import { useEffect, useState } from "react";
import "./LocationPicker.css";
import axios from "axios";
import { z } from "zod";

export const LocationSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
});
const LocationArraySchema = z.array(LocationSchema);
export type Location = z.infer<typeof LocationSchema>;

type LocationPickerProps = {
  value: Location | null;
  onChange: (value: Location) => void;
};

export default function LocationPicker({
  value,
  onChange,
}: LocationPickerProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filtered, setFiltered] = useState<Location[]>([]);
  const [inputText, setInputText] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await axios.get("http://localhost:3001/activityLocations");
        const parsed = LocationArraySchema.safeParse(res.data.data);

        if (parsed.success) {
          setLocations(parsed.data);
        } else {
          console.error("Invalid location data format", parsed.error);
        }
      } catch (err) {
        console.error("Failed to fetch locations", err);
      }
    }

    fetchLocations();
  }, []);

  useEffect(() => {
    const matches = locations.filter((loc) =>
      loc.name.toLowerCase().includes(inputText.toLowerCase())
    );
    setFiltered(matches);
  }, [inputText, locations]);

  function handleSelect(location: Location) {
    onChange(location);
    setInputText(location.name);
    setIsFocused(false);
  }

  return (
    <div className="location-picker">
      <input
        type="text"
        placeholder="e.g. San Francisco"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 100)}
      />
      {isFocused && filtered.length > 0 && (
        <ul className="dropdown">
          {filtered.map((loc, idx) => (
            <li key={idx} onMouseDown={() => handleSelect(loc)}>
              {loc.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
