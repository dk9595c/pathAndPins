import { Express, Request, Response } from "express";
import { firestore } from "./firebaseSetUp.js";

export function registerSaveTripHandler(app: Express) {
  app.post("/savePins", async (req: Request, res: Response) => {
    try {
      const { userId, title, destination, startDate, endDate } = req.body;

      if (!userId || !title || !destination) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      // TODO: Uncomment this after firebase setup (Sprint 6)
      // const docRef = await firestore.collection("trips").add({
      //   userId,
      //   title,
      //   destination,
      //   startDate,
      //   endDate,
      //   createdAt: new Date(),
      // });
      const docRef = { id: "fake id" };

      res.status(200).json({
        success: true,
        message: "Trip saved successfully.",
        tripId: docRef.id,
      });
    } catch (error) {
      console.error("Failed to save trip:", error);
      res.status(500).json({ error: "Server error while saving trip." });
    }
  });
}
