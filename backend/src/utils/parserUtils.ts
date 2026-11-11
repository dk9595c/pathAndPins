import { ZodSchema } from "zod";
import fs from "fs/promises";
import fetch from "node-fetch";

// Enum to represent the current state of our parser machine
enum State {
  Unquoted,
  Quoted,
  QuoteInQuoted
}

/**
 * Parses a CSV string into an array of validated objects using a Zod schema.
 *
 * - Fetches the CSV content via the provided `getCSVText` function.
 * - Splits the CSV into lines and maps each row to an object using the header (how would we determine when there is a header?).
 * - Validates each row against the provided Zod schema.
 *
 * @param getCSVText - Async function that returns the CSV text.
 * @param schema - Zod schema used to validate each row.
 * @returns Promise resolving to an array of validated objects.
 */
export async function parseCSV<T>(
  getCSVText: () => Promise<string>,
  schema: ZodSchema<T>
): Promise<T[]> {
  const csv = await getCSVText();
  //TODO: use your CSV here, you may need to adapt it so read carefully what functions use this method and look at what we pass in!!!
  
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = "";
  let state = State.Unquoted;

  const processCompletedRow = () => {
    currentRecord.push(currentField);
    records.push(currentRecord);
    currentRecord = [];
    currentField = "";
  };

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    switch (state) {
      case State.Unquoted:
        if (char === '"') {
          state = State.Quoted;
        } else if (char === ',') {
          currentRecord.push(currentField);
          currentField = "";
        } else if (char === '\n') {
          processCompletedRow();
        } else if (char !== '\r') {
          currentField += char;
        }
        break;
      case State.Quoted:
        if (char === '"') {
          state = State.QuoteInQuoted;
        } else {
          currentField += char;
        }
        break;
      case State.QuoteInQuoted:
        if (char === '"') {
          currentField += '"';
          state = State.Quoted;
        } else if (char === ',') {
          currentRecord.push(currentField);
          currentField = "";
          state = State.Unquoted;
        } else if (char === '\n') {
          processCompletedRow();
          state = State.Unquoted;
        } else if (char !== '\r') {
          currentField += char;
          state = State.Unquoted;
        }
        break;
    }
  }

  if (currentField !== "" || currentRecord.length > 0) {
    processCompletedRow();
  }

  if (records.length === 0) return [];

  const headers = records[0];
  const validObjects: T[] = [];

  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    // Safely skip completely empty trailing rows
    if (row.length === 1 && row[0].trim() === "") continue;

    const rowObj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = row[j] || "";
    }

    const parsed = schema.safeParse(rowObj);
    if (parsed.success) {
      validObjects.push(parsed.data);
    } else {
      throw new Error(`Validation failed at row ${i}: ${parsed.error}`);
    }
  }

  return validObjects;
}

/**
 * Returns a function that reads CSV content from a local file.
 *
 * @param filePath - Path to the local CSV file.
 * @returns Function that resolves to the CSV text when called.
 */
export const getFromFile = (filePath: string) => () =>
  fs.readFile(filePath, "utf-8");

/**
 * Returns a function that fetches CSV content from a remote API.
 *
 * @param url - URL to fetch the CSV from.
 * @returns Async function that resolves to the CSV text when called.
 * @throws Error if the fetch response is not OK.
 */
export const getFromAPI = (url: string) => async () => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
  return res.text();
};
