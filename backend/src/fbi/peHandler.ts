import { Request, Response } from "express";
import { fetchEmployment, type PEFetcher } from "./peFetcher.js";

export function makeEmploymentHandler(fetcher: PEFetcher) {
  return async function employmentHandler(req: Request, res: Response): Promise<void> {
    const { lat, lon, granularity } = req.query;

    if (!lat || !lon || !granularity) {
      res.status(400).json({
        result: "error_bad_request",
        message: "Missing required query parameters: lat, lon, and granularity",
        receivedParams: req.query
      });
      return;
    }

    const validGranularities = ["national", "state", "agency"];
    const normalizedGranularity = String(granularity).toLowerCase();

    if (!validGranularities.includes(normalizedGranularity)) {
      res.status(400).json({
        result: "error_bad_request",
        message: "Granularity must be national, state, or agency",
        receivedParams: req.query
      });
      return;
    }

    try {
      const data = await fetcher(
        String(lat),
        String(lon),
        normalizedGranularity as "national" | "state" | "agency"
      );

      res.status(200).json({
        result: "success",
        timestamp: new Date().toISOString(),
        data: data,
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
  };
}

export const employmentHandler = makeEmploymentHandler(fetchEmployment);
