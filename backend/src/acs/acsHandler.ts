import { Request, Response } from "express";

// Define the signature of the fetcher function so it can accept either the real one or a mock
export type ACSFetcher = (
  lat: string | undefined,
  lon: string | undefined,
  variables: string,
  topLevel: string,
  bottomLevel: string
) => Promise<any>;

// Higher-order function that injects the data source
export function makeAcsHandler(fetcher: ACSFetcher) {
  return async function acsHandler(req: Request, res: Response): Promise<void> {
    const { lat, lon, variables, topLevel, bottomLevel, top, bottom } = req.query;

    const resolvedTop = String(topLevel || top || "");
    const resolvedBottom = String(bottomLevel || bottom || "");

    // Variables and granularities are always required
    if (!variables || !resolvedTop || !resolvedBottom) {
      res.status(400).json({
        result: "error_bad_request",
        message: "Missing required query parameters: variables, topLevel, and bottomLevel are required",
        receivedParams: req.query,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const hierarchy: Record<string, number> = {
      all: 4,
      state: 3,
      county: 2,
      city: 1,
      place: 1
    };

    const topWeight = hierarchy[resolvedTop.toLowerCase()];
    const bottomWeight = hierarchy[resolvedBottom.toLowerCase()];

    if (topWeight === undefined || bottomWeight === undefined) {
      res.status(400).json({
        result: "error_bad_request",
        message: "Invalid granularity levels provided",
        receivedParams: req.query,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Hierarchy validation: top level must be strictly broader than bottom level
    if (topWeight <= bottomWeight) {
      res.status(400).json({
        result: "error_bad_request",
        message: `Hierarchy error: top-level '${resolvedTop}' cannot be smaller than or equal to bottom-level '${resolvedBottom}'`,
        receivedParams: req.query,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Coordinates are required UNLESS topLevel is 'all'
    if (resolvedTop.toLowerCase() !== "all" && (!lat || !lon)) {
      res.status(400).json({
        result: "error_bad_request",
        message: "Latitude and longitude coordinates are required when topLevel is not 'all'",
        receivedParams: req.query,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Format variables whether passed as an array or a comma-separated string
    let parsedVars = "";
    if (Array.isArray(variables)) {
      parsedVars = variables.map(String).join(",");
    } else {
      parsedVars = String(variables);
    }

    try {
      // Use the injected fetcher instead of a hardcoded import
      const acsData = await fetcher(
        lat ? String(lat) : undefined,
        lon ? String(lon) : undefined,
        parsedVars,
        resolvedTop,
        resolvedBottom
      );

      res.status(200).json({
        result: "success",
        timestamp: new Date().toISOString(),
        data: acsData,
        receivedParams: req.query
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
