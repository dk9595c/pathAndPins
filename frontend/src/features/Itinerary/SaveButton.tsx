import { saveUserItinerary } from "../../utils/pinService";

interface SaveTripButtonProps {
  activitiesByDate: any;
}

export default function SaveTripButton({ activitiesByDate }: SaveTripButtonProps) {
  // Bypassed Clerk hook for unauthenticated demo presentation
  const isSignedIn = false;
  const user = null;

  const saveTrip = async () => {
    if (!isSignedIn || !user) return;
    
    try {
      const success = await saveUserItinerary(user.id, activitiesByDate);
      if (success) {
        alert("Trip saved successfully!");
      } else {
        alert("Failed to save trip.");
      }
    } catch (error) {
      console.error("Error saving trip:", error);
      alert("Failed to save trip.");
    }
  };

  if (!isSignedIn) {
    return (
      <button className="bg-gray-400 text-white rounded px-4 py-2 cursor-pointer">
        Sign in to Save
      </button>
    );
  }

  return (
    <button
      onClick={saveTrip}
      className="bg-blue-500 text-white rounded px-4 py-2"
    >
      Save Trip
    </button>
  );
}