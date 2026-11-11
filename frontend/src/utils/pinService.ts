import { db } from "../firebase/firebaseConfig";
import {
  doc,
  setDoc,
  getDoc
} from "firebase/firestore";

/**
 * Saves all current itinerary activities to the user's collection in Firestore.
 */
export async function saveUserItinerary(userId: string, activitiesByDate: any): Promise<boolean> {
  if (!userId) {
    console.error("Cannot save pins: User is not authenticated.");
    return false;
  }

  try {
    const itineraryRef = doc(db, "users", userId, "itinerary", "current");
    await setDoc(itineraryRef, {
      activitiesByDate: activitiesByDate,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Firebase error saving itinerary:", error);
    alert("Failed to save your itinerary to the cloud. Please check your connection.");
    return false;
  }
}

/**
 * Loads the saved itinerary for the user when the application loads.
 */
export async function loadUserItinerary(userId: string): Promise<any> {
  if (!userId) return null;

  try {
    const itineraryRef = doc(db, "users", userId, "itinerary", "current");
    const snapshot = await getDoc(itineraryRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      return data.activitiesByDate || null;
    }
    return null;
  } catch (error) {
    console.error("Firebase error loading itinerary:", error);
    return null;
  }
}

/**
 * 1340 Challenge: Example of sending a secure request to the backend.
 * The frontend must pass its Clerk session token to prove its identity.
 */
export async function saveUserItinerarySecure(userId: string, activitiesByDate: any, clerkToken: string): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:3001/api/saveItinerary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${clerkToken}` // Mitigation: Passing the auth token
      },
      body: JSON.stringify({ userId, activitiesByDate })
    });

    if (response.ok) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error securely saving itinerary:", error);
    return false;
  }
}
