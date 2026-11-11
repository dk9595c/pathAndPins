import { Request, Response } from "express";
import { fetchArrests } from "./fbiFetcher.js";

export async function arrestsHandler(req: Request, res: Response): Promise<void> {
  const { lat, lon, granularity } = req.query;

  if (!lat || !lon || !granularity) {
    res.status(400).json({
      result: "error_bad_request",
      message: "Missing required query parameters: lat, lon, and granularity",
      receivedParams: req.query,
      timestamp: new Date().toISOString()
    });
    return;
  }

  const normalizedGranularity = String(granularity).toLowerCase();
  if (
    normalizedGranularity !== "national" &&
    normalizedGranularity !== "state" &&
    normalizedGranularity !== "agency"
  ) {
    res.status(400).json({
      result: "error_bad_request",
      message: "Granularity must be one of: 'national', 'state', or 'agency'",
      receivedParams: req.query,
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    const arrestData = await fetchArrests(
      String(lat),
      String(lon),
      normalizedGranularity as "national" | "state" | "agency"
    );

    res.status(200).json({
      result: "success",
      timestamp: new Date().toISOString(),
      data: arrestData,
      requestParams: req.query
    });
  } catch (error: any) {
    res.status(500).json({
      result: "error_datasource",
      message: error.message,
      receivedParams: req.query,
      timestamp: new Date().toISOString()
    });
  }
}
