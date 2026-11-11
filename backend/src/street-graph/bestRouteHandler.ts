import { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { RoutingAlgorithm } from "../street-graph/graphSchema.js";
import { handleShortestPathRequest } from "./shortestTwoPointPath.js";

dotenv.config();

/**
 * registerFindPathHandler
 *
 * Registers the POST /find-path endpoint for your backend API.
 *
 * This endpoint is responsible for receiving two or more points (start and goal(s)),
 * running the chosen routing algorithm (e.g., A*), and returning the shortest path
 * as a list of coordinates back to the frontend.
 *
 * @param app - The Express application instance.
 * @param algorithm - The routing algorithm to use (A*, Dijkstra, etc.)
 *
 * Workflow:
 * 1. The frontend sends a POST request to /find-path with a JSON body:
 *    {
 *      "points": [
 *        { "lat": 40.7128, "lng": -74.0060 },
 *        { "lat": 40.7306, "lng": -73.9352 }
 *      ]
 *    }
 *
 * 2. This handler:
 *    - Validates the request body (ensures at least two points with lat/lng).
 *    - Calls handleShortestPathRequest(points, algorithm) to compute the route.
 *    - Returns the resulting path as JSON.
 *
 * 3. If validation fails, it returns a 400 error.
 *    If something goes wrong during routing, it returns a 500 error.
 *
 * Notes for Students:
 * - You will **not** need to modify this file directly except for error handling.
 * - Your main task will be to implement the pathfinding logic in the algorithm function
 *   (e.g., aStarWithOnDemandTiles) that is eventually called by `handleShortestPathRequest`.
 * - You may look at this file to understand how your algorithm is used end-to-end.
 */
export function registerFindPathHandler(
  app: Express,
  algorithm: RoutingAlgorithm
) {
  app.post("/find-path", async (req: Request, res: Response) => {
    try {
      const { points } = req.body;

      // What happens if we have less than 2 points

      // Delegate pathfinding logic to other function
      const result = await handleShortestPathRequest(points, algorithm);

      // Return the result to the frontend
      res.status(200).json(result);
    } catch (error) {
      console.error("Pathfinding failed:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
}
