import { test, expect } from "vitest";
import { parseCSV, CSVParseError } from "../src/parse";
import { toReadable } from "../src/utils";
import { z } from "zod";

test("Parser handles basic tuple schemas and coerces data types", async () => {
  const input = "Deepak,23,true\nAlice,25,false";
  
  // Schema 1: Coercing strings into numbers, and transforming boolean strings
  const schema = z.tuple([
    z.string(),
    z.coerce.number(),
    z.enum(["true", "false"]).transform((val) => val === "true")
  ]);

  const results = await parseCSV(toReadable({ kind: "string", value: input }), schema);

  expect(results).toHaveLength(2);
  // Vitest will check that '23' became the number 23, and 'true'/'false' evaluated strictly
  expect(results[0]).toEqual(["Deepak", 23, true]);
  expect(results[1]).toEqual(["Alice", 25, false]);
});

test("Parser throws structured CSVParseError on schema mismatch", async () => {
  // Missing a column in the second row
  const input = "col1,col2\nbadrow";
  
  const schema = z.tuple([z.string(), z.string()]);

  try {
    await parseCSV(toReadable({ kind: "string", value: input }), schema);
    expect.unreachable("Parser should have thrown an error");
  } catch (error) {
    expect(error).toBeInstanceOf(CSVParseError);
    if (error instanceof CSVParseError) {
      expect(error.recordIndex).toBe(1); // The second row (index 1) failed
      expect(error.recordString).toEqual(["badrow"]);
      expect(error.zodError).toBeDefined();
    }
  }
});

test("Parser handles variable-length array schemas", async () => {
  const input = "a,b\na,b,c,d";
  
  // Schema 2: Array of strings with min/max bounds (allows jagged rows)
  const schema = z.array(z.string()).min(2).max(4);

  const results = await parseCSV(toReadable({ kind: "string", value: input }), schema);
  
  expect(results[0]).toHaveLength(2);
  expect(results[1]).toHaveLength(4);
});

test("Parser enforces strict enums and string formats", async () => {
  const input = "user@brown.edu,ACTIVE\nbad-email,INACTIVE";
  
  // Schema 3: Validating email formats and strict literal unions
  const schema = z.tuple([
    z.string().email(),
    z.enum(["ACTIVE", "INACTIVE"])
  ]);

  try {
    await parseCSV(toReadable({ kind: "string", value: input }), schema);
    expect.unreachable("Parser should have thrown an error due to bad email");
  } catch (error) {
    expect(error instanceof CSVParseError).toBe(true);
    if (error instanceof CSVParseError) {
      expect(error.recordIndex).toBe(1);
    }
  }
});
