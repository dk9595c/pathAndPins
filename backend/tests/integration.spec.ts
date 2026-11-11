import { test, expect } from "@playwright/test";
import express from "express";
import { makeAcsHandler } from "../src/acs/acsHandler.js";
import { makeEmploymentHandler } from "../src/fbi/peHandler.js";

let testServer: any;

test.beforeAll(async () => {
  const app = express();
  
  // Create a mock ACS fetcher
  const mockAcsFetcher = async (lat: any, lon: any, vars: string, top: string, bottom: string) => {
    return [
      ["NAME", "B19013_001E"],
      ["Mockville City", "75000"]
    ];
  };

  // Create a mock Employment fetcher
  const mockPeFetcher = async (lat: string, lon: string, gran: any) => {
    return {
      year: 2022,
      officerCount: 100,
      civilianCount: 20,
      totalEmployees: 120,
      granularity: gran,
      identifier: "MOCK123"
    };
  };

  app.get("/acs", makeAcsHandler(mockAcsFetcher));
  app.get("/employment", makeEmploymentHandler(mockPeFetcher));
  
  testServer = app.listen(3002);
});

test.afterAll(() => {
  testServer.close();
});

test("ACS Endpoint returns mocked success on valid parameters", async ({ request }) => {
  const response = await request.get("http://localhost:3002/acs?topLevel=all&bottomLevel=county&variables=NAME");
  expect(response.status()).toBe(200);
  
  const json = await response.json();
  expect(json.result).toBe("success");
  expect(json.data[1][0]).toBe("Mockville City");
});

test("ACS Endpoint returns 400 error on bad hierarchy", async ({ request }) => {
  const response = await request.get("http://localhost:3002/acs?topLevel=county&bottomLevel=state&variables=NAME");
  expect(response.status()).toBe(400);
  
  const json = await response.json();
  expect(json.result).toBe("error_bad_request");
});

test("Employment Endpoint returns mocked success", async ({ request }) => {
  const response = await request.get("http://localhost:3002/employment?lat=41.8&lon=-71.4&granularity=state");
  expect(response.status()).toBe(200);
  
  const json = await response.json();
  expect(json.data.totalEmployees).toBe(120);
});
