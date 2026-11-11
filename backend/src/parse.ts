import { Readable } from "node:stream";
import { getCharsFromReadable } from "./utils";
import { ZodSchema, ZodError } from "zod";

// Task C: Structured Error for the parser
export class CSVParseError extends Error {
  constructor(
    message: string,
    public recordIndex: number,
    public recordString: string[],
    public zodError?: ZodError
  ) {
    super(message);
    this.name = "CSVParseError";
  }
}

// Enum to represent the current state of our parser machine (Task A3)
enum State {
  Unquoted,
  Quoted,
  QuoteInQuoted
}

/**
 * This is a JSDoc comment. Similar to JavaDoc, it documents a public-facing
 * function for others to use. Most modern editors will show the comment when
 * mousing over this function name. Try it in run-parser.ts!
 *
 * Retrieving the lines from a Readable stream in TypeScript is "asynchronous",
 * meaning that we can't just read the file and return its contents.
 * You'll learn more about this in class. For now, just leave the
 * "async" and "await" where they are. You shouldn't need to alter them.
 *
 * @param path The path to the file being loaded.
 * @returns a "promise" to produce a 2-d array of cell values
 */
export async function parseCSV(charSource: Readable): Promise<string[][]>;
export async function parseCSV<T>(charSource: Readable, schema: ZodSchema<T>): Promise<T[]>;
export async function parseCSV<T = string[]>(
  charSource: Readable,
  schema?: ZodSchema<T>
): Promise<T[] | string[][]> {
  const chars = getCharsFromReadable(charSource);

  // Create an empty array to hold the results
  const records: any[] = [];
  
  // State machine buffers
  let currentRecord: string[] = [];
  let currentField = "";
  let state = State.Unquoted;

  const processCompletedRow = () => {
    currentRecord.push(currentField);
    
    if (schema) {
      const parsed = schema.safeParse(currentRecord);
      if (!parsed.success) {
        throw new CSVParseError(
          `Validation failed at record ${records.length}`,
          records.length,
          currentRecord,
          parsed.error
        );
      }
      records.push(parsed.data);
    } else {
      records.push(currentRecord);
    }
    
    currentRecord = [];
    currentField = "";
  };

  // We add the "await" here.
  // We need to force TypeScript to _wait_ for a row before moving on.
  // More on this in class soon!
  for await(const char of chars) {
      switch (state) {
          case State.Unquoted:
              if (char === '"') {
                  state = State.Quoted;
              } else if (char === ',') {
                  currentRecord.push(currentField);
                  currentField = "";
              } else if (char === '\n') {
                  processCompletedRow();
              } else {
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
                  // Two quotes in a row inside a quoted field resolves to a single escaped quote
                  currentField += '"';
                  state = State.Quoted;
              } else if (char === ',') {
                  // The previous quote actually closed the field
                  currentRecord.push(currentField);
                  currentField = "";
                  state = State.Unquoted;
              } else if (char === '\n') {
                  processCompletedRow();
                  state = State.Unquoted;
              } else {
                  // Malformed CSV (text immediately following a closing quote), but we recover safely
                  currentField += char;
                  state = State.Unquoted;
              }
              break;
      }
  }
  
  // Handle any trailing data if the file stream ends without a final newline
  // Because serializeCSV joins rows with '\n', there is always an unpushed buffer at EOF.
    // Handle any trailing data if the file stream ends without a final newline
      if (currentField !== "" || currentRecord.length > 0) {
          processCompletedRow();
      }
      
      return records;
  
  return records;
}
