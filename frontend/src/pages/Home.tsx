import axios from "axios";
import { useRef, useState } from "react";
import DatePicker from "../components/DatePicker/DatePicker";
import LocationPicker from "../components/LocationPicker/LocationPicker";
import { Location } from "../components/LocationPicker/LocationPicker";
import "./Home.css";
import { Planner } from "./Planner";

export default function Home() {
  const [arrivalDate, setArrivalDate] = useState<Date | null>(null);
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const plannerRef = useRef<HTMLDivElement | null>(null);

  const handleExploreClick = () => {
    if (location && arrivalDate && departureDate) {
      //call the csv api for activities and also the weather api
      setShowPlanner(true);
      setTimeout(() => {
        plannerRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      alert("Please complete all fields first.");
    }
  };

  const handleCSVLoad = async () => {
    const res = await axios.post("http://localhost:3001/upload-csv");

    if (res.status) {
      console.log("Invalid location data format", res.status);
    }
  };

  return (
    <main className="home-container">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Let’s Discover the World Together</h1>
          <p>
            Find the best trips and experiences, tailored to your perfect days.
          </p>

          <div className="search-card">
            <div className="input-wrapper">
              <label>Destination</label>
              <LocationPicker
                value={location}
                onChange={(value) => {
                  setLocation(value);
                  handleCSVLoad();
                }}
              />
            </div>
            <div className="input-wrapper">
              <DatePicker
                label="Arrival"
                selectedDate={arrivalDate}
                onChange={setArrivalDate}
              />
            </div>
            <div className="input-wrapper">
              <DatePicker
                label="Departure"
                selectedDate={departureDate}
                onChange={setDepartureDate}
              />
            </div>
            <button className="explore-btn" onClick={handleExploreClick}>
              Explore
            </button>
          </div>
        </div>

        <div className="canvas-wrapper">
          <div className="overlay" />
          {/* Maybe 3d model goes here if i have time - Roberto*/}
        </div>
      </section>

      {showPlanner && (
        <section ref={plannerRef}>
          <Planner
            arrivalDate={arrivalDate!}
            departureDate={departureDate!}
            location={location || { name: "", lat: 0, lng: 0 }}
          />
        </section>
      )}
    </main>
  );
}
