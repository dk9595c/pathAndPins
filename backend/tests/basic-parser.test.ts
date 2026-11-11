import { test, expect } from "vitest";
import { parseCSV } from "../src/parse";
import { createReadStream } from "node:fs";
import { toReadable } from "../src/utils";

import * as path from "path";

const PEOPLE_CSV_PATH = path.join(__dirname, "../data/people.csv");

test("parseCSV yields arrays", async () => {
  const results = await parseCSV(toReadable({kind: 'file', path: PEOPLE_CSV_PATH}));

  expect(results).toHaveLength(5);
  expect(results[0]).toEqual(["name", "age"]);
  expect(results[1]).toEqual(["Alice", "23"]);
  expect(results[2]).toEqual(["Bob", "thirty"]);
  expect(results[3]).toEqual(["Charlie", "25"]);
  expect(results[4]).toEqual(["Nim", "22"]);
});

test("parseCSV yields only arrays", async () => {
  const results = await parseCSV(toReadable({kind: 'file', path: PEOPLE_CSV_PATH}));
  for(const row of results) {
    expect(Array.isArray(row)).toBe(true);
  }
});

test("parseCSV incorrectly splits fields that contain commas but are wrapped in double quotes", async () => {
  const inputString = 'Julius Caesar,"veni, vidi, vici"';
  const results = await parseCSV(toReadable({kind: 'string', value: inputString}));
  
  // The naive parser incorrectly splits this into 4 columns instead of 2.
  // (State Machine update: The parser now correctly groups them into 2 columns)
  expect(results[0].length).toBe(2);
  expect(results[0]).toEqual(["Julius Caesar", "veni, vidi, vici"]);
});

test("parseCSV fails to handle escaped double quotes correctly", async () => {
  const inputString = 'Suetonius,"""The die is cast,"" said he."';
  const results = await parseCSV(toReadable({kind: 'string', value: inputString}));
  
  // The naive parser does not un-escape the quotes.
  // (State Machine update: The parser now accurately resolves the escaped quotes)
  expect(results[0].length).toBe(2);
  expect(results[0][1]).toBe('"The die is cast," said he.');
});
