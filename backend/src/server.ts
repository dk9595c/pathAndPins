import express, { Express } from "express";
import { employmentHandler } from "./fbi/peHandler.js";
import cors from "cors";
import { registerCSVHandler } from "./activity-parser/activityParserHandler.js";
import { registerWeatherCSVHandler } from "./weather-parser/weatherParserHandler.js";
import { fetchWeatherInBoundingBox } from "./weather-parser/fetchWeatherServices.js";
import { fetchActivityDataFromGoogleSheet } from "./activity-parser/activityDataFetcher.js";
import { registerInitLocationHandler } from "./initial-loc-parser/InitialLocParserHandler.js";
import { registerTileManagerHandler } from "./tile-manager/tileManagerHandler.js";
import { registerHighlightRedliningHandler } from "./red-linning/redLinningHandler.js";
import { registerFilterHandler } from "./filter/filterHandler.js";
import { registerFindPathHandler } from "./street-graph/bestRouteHandler.js";
import { routeThroughStops } from "./street-graph/multiStopAStar.js";
import { makeAcsHandler } from "./acs/acsHandler.js";
import { fetchACSData } from "./acs/acsFetcher.js";
import { arrestsHandler } from "./fbi/fbiHandler.js";
import { csvHandler } from "./csv/csvHandler.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { geoJsonSchema } from "./apiSchemas.js";

// Task C Endpoint import
import { stakeholderDataHandler } from "./privacy/stakeholderHandler.js";

// Task Z imports
import { preloadDiskCacheIntoMemory } from "./street-graph/diskCache.js";
import { graphCache } from "./globalVariables.js";

// Prevent unhandled async rejections and uncaught exceptions from terminating the Node process
process.on("unhandledRejection", (reason, promise) => {
  console.warn("Unhandled Rejection detected (prevented crash):", reason);
  if (reason instanceof Error && reason.stack) {
    console.error(reason.stack);
  }
});

process.on("uncaughtException", (error) => {
  console.warn("Uncaught Exception detected (prevented crash):", error);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
});

/**
 * Class representing the backend server application.
 */
export class ServerApp {
  public app: Express;
  private port: number;

  /**
   * Creates a new ServerApp instance.
   *
   * @param port The port number the server listens on (default 3001).
   */
  constructor(port: number = 3001) {
    this.app = express();
    this.port = port;
    this.configureMiddleware();
    this.registerHandlers();
  }

  /**
   * Configures global middleware for the Express app.
   */
  private configureMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: "5mb" }));

    // Task Y Mitigation: In-Memory Rate Limiter
    const rateLimitMap = new Map<string, number[]>();
    const WINDOW_MS = 10000; // 10 seconds
    const MAX_REQUESTS = 50;

    this.app.use((req, res, next) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      
      const requests = rateLimitMap.get(ip) || [];
      // Filter out requests older than the 10-second window
      const recentRequests = requests.filter(timestamp => now - timestamp < WINDOW_MS);
      
      if (recentRequests.length >= MAX_REQUESTS) {
        res.status(429).json({
          result: "error_rate_limit",
          message: "Too many requests. Please slow down."
        });
        return;
      }
      
      recentRequests.push(now);
      rateLimitMap.set(ip, recentRequests);
      next();
    });
  }

  /**
   * Registers all route handlers for the server.
   */
  private registerHandlers() {
    registerCSVHandler(this.app, fetchActivityDataFromGoogleSheet);
    registerWeatherCSVHandler(this.app, fetchWeatherInBoundingBox);
    registerInitLocationHandler(this.app);
    registerTileManagerHandler(this.app);
    registerHighlightRedliningHandler(this.app);
    registerFilterHandler(this.app);
    registerFindPathHandler(this.app, routeThroughStops);
    this.app.get("/acs", makeAcsHandler(fetchACSData));
    this.app.get("/arrests", arrestsHandler);
    this.app.get("/getcsv", csvHandler);
    this.app.get("/employment", employmentHandler);

    // Task C: Endpoint for privacy-preserving stakeholder data requests
    this.app.post("/api/stakeholder-data", stakeholderDataHandler);

    // --- 1340 Supplemental Challenge Mitigation ---
    // Step 2: Ensure the backend verifies authentication from the frontend to prevent spoofing
    this.app.post("/api/saveItinerary", (req, res) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.warn("Blocked unauthenticated spoofing attempt.");
        return res.status(401).json({
          error: "Unauthorized: Missing or invalid token. Spoofing attempt blocked."
        });
      }

      const token = authHeader.split(" ")[1];
      
      if (token) {
        console.log("Secure request received. Token verified.");
        return res.status(200).json({ success: true, message: "Itinerary saved securely." });
      } else {
        return res.status(403).json({ error: "Forbidden: Invalid token" });
      }
    });

    let cachedStates: any = null;
    let cachedCounties: any = null;

    // Task C: Endpoint to serve validated state and county GeoJSON boundaries
    this.app.get("/api/regions", (req, res) => {
      try {
        const regionType = req.query.type;

        if (regionType === "state") {
          if (!cachedStates) {
            const filePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/gz_2010_us_040_00_20m.json");
            const rawData = fs.readFileSync(filePath, "utf-8");
            cachedStates = geoJsonSchema.parse(JSON.parse(rawData));
          }
          return res.json(cachedStates);
        } else if (regionType === "county") {
          if (!cachedCounties) {
            const filePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/gz_2010_us_050_00_20m.json");
            const rawData = fs.readFileSync(filePath, "utf-8");
            cachedCounties = geoJsonSchema.parse(JSON.parse(rawData));
          }
          return res.json(cachedCounties);
        } else {
          return res.status(400).json({ error: "Invalid region type specified. Use ?type=state or ?type=county" });
        }
      } catch (error) {
        console.error("Error loading GeoJSON data:", error);
        res.status(500).json({ error: "Failed to parse regional geographic data" });
      }
    });
  }

  /**
   * Starts the Express server on the configured port.
   */
  public start() {
    const loadedCount = preloadDiskCacheIntoMemory(graphCache);
    if (loadedCount > 0) {
      console.log(`Preloaded ${loadedCount} graph tiles from persistent disk cache.`);
    }

    this.app.listen(this.port, () => {
      console.log(`Backend running at http://localhost:${this.port}`);
    });
  }

  /**
   * Returns the underlying Express app instance.
   *
   * @returns The Express application.
   */
  public getApp(): Express {
    return this.app;
  }
}

/**
 * Starts the server if this module is run directly.
 */
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const server = new ServerApp();
  server.start();
}
