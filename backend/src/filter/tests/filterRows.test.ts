// src/filter/tests/filterRows.test.ts
import { describe, it, expect } from "vitest";
import { filterRows } from "../filterRows";
import { FilterConfig } from "../filterConfigSchema";

describe("filterRows", () => {
  const sampleData = [
    { name: "Hike A", duration: 60, difficulty: "easy", isFree: true },
    { name: "Hike B", duration: 30, difficulty: "moderate", isFree: false },
    { name: "Hike C", duration: 90, difficulty: "easy", isFree: true },
    { name: "Hike D", duration: 45, difficulty: "hard", isFree: true },
  ];

  it("should filter by boolean equality", () => {
    const filters: FilterConfig = {
      isFree: true,
    };

    const result = filterRows(sampleData, filters);
    expect(result.length).toBe(3);
    expect(result.every((r) => r.isFree === true)).toBe(true);
  });

  it("should filter by >= operator", () => {
    const filters: FilterConfig = {
      duration: { operator: ">=", value: 60 },
    };

    const result = filterRows(sampleData, filters);
    expect(result.length).toBe(2);
    expect(result.map((r) => r.name)).toEqual(["Hike A", "Hike C"]);
  });

  it("should filter by contains operator", () => {
    const filters: FilterConfig = {
      difficulty: { operator: "contains", value: "easy" },
    };

    const result = filterRows(sampleData, filters);
    expect(result.length).toBe(2);
    expect(result.every((r) => r.difficulty.includes("easy"))).toBe(true);
  });

  it("should combine multiple filters", () => {
    const filters: FilterConfig = {
      duration: { operator: ">=", value: 60 },
      difficulty: { operator: "contains", value: "easy" },
      isFree: true,
    };

    const result = filterRows(sampleData, filters);
    expect(result.length).toBe(2);
    expect(result.map((r) => r.name)).toEqual(["Hike A", "Hike C"]);
  });

  it("should return empty array if no rows match", () => {
    const filters: FilterConfig = {
      duration: { operator: ">=", value: 100 },
    };

    const result = filterRows(sampleData, filters);
    expect(result.length).toBe(0);
  });
});
