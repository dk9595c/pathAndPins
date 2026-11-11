import { Request, Response } from "express";
import { makeTables32 } from "./tables32.js";
import { toReadable } from "./utils.js";
import path from "node:path";

export async function csvHandler(req: Request, res: Response): Promise<void> {
  const { filepath } = req.query;

  if (!filepath) {
    res.status(400).json({
      result: "error_bad_request",
      message: "Missing required query parameter: filepath"
    });
    return;
  }

  try {
    const t32 = makeTables32();
    
    // Resolve the path relative to the project root to ensure it finds the data folder
    const fullPath = path.resolve(String(filepath));
    
    const handle = await t32.parseCSV(toReadable({ kind: "file", path: fullPath }));
    const data = t32.getData(handle);
    
    // Clean up the memory handle after retrieving the data
    t32.close(handle);

    res.status(200).json({
      result: "success",
      data: data
    });
  } catch (error: any) {
    res.status(500).json({
      result: "error_datasource",
      message: `Failed to parse CSV: ${error.message}`
    });
  }
}
