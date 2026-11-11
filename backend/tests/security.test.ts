import { describe, it, expect } from "vitest";
import path from "path";

// 1. The Mitigation Implementation
// This function resolves the path and strictly enforces the containment boundary
function resolveSafeDataPath(unsafeFilename: string): string {
  const baseDir = path.resolve(process.cwd(), "data");
  
  // Reject explicit navigation characters early
  if (unsafeFilename.includes("..") || unsafeFilename.includes("/")) {
    throw new Error("Access denied: Invalid directory traversal characters");
  }
  
  const normalizedPath = path.resolve(baseDir, unsafeFilename);
  
  // Enforce absolute containment boundary
  if (!normalizedPath.startsWith(baseDir)) {
    throw new Error("Access denied: Path escapes safe directory");
  }
  
  return normalizedPath;
}

// 2. The Security Tests
describe("Task Y: Directory Traversal Mitigation", () => {
  it("rejects relative path traversal attempts", () => {
    expect(() => {
      resolveSafeDataPath("../../../etc/passwd");
    }).toThrow("Access denied");
  });

  it("rejects explicit absolute path injections", () => {
    expect(() => {
      resolveSafeDataPath("/Users/Tim/cs32/grades/grades.csv");
    }).toThrow("Access denied");
  });

  it("allows valid local filenames within the boundary", () => {
    const safePath = resolveSafeDataPath("mockData.csv");
    expect(safePath.includes("mockData.csv")).toBe(true);
  });
});
