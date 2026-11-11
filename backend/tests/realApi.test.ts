import { test, expect } from "vitest";
import { fetchACSData } from "../src/acs/acsFetcher.js";
import { fetchEmployment } from "../src/fbi/peFetcher.js";

test("Real ACS Fetcher returns nationwide state data", async () => {
  const data = await fetchACSData(undefined, undefined, "NAME", "all", "state");
  expect(data).toBeDefined();
  expect(Array.isArray(data)).toBe(true);
  expect(data[0]).toContain("NAME");
});

test("Real Employment Fetcher returns national data", async () => {
  const data = await fetchEmployment("41.8", "-71.4", "national");
  expect(data).toBeDefined();
  expect(data.year).toBeGreaterThan(2010);
  expect(data.totalEmployees).toBeGreaterThan(0);
});
