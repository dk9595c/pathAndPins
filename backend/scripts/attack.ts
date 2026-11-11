/**
 * CS1340 Task X: scoped mock API discovery harness
 *
 * Sends well-formed GET requests only to the assigned mock API.
 * Respects request spacing and Retry-After; handles timeouts.
 * Scans response bodies for finance-related FIELD NAMES only.
 *
 * Run:
 *   npx tsc scripts/attack.ts
 *   node scripts/attack.js
 */

const BASE_URL = "http://cs0320-apis.cs.brown.edu:3232/apis/fuzz-api/";
const MIN_DELAY_MS = 30;
const REQUEST_TIMEOUT_MS = 4_000;
const MAX_RETRIES_429 = 1;

// Keep requests within the assigned API scope.
const PATHS = [
  "",
  "health",
  "meta",

  "books",
  "authors",
  "subjects",
  "branches",

  "copies",
  "patrons",
  "loans",
  "fines",
  "reviews",
  "staff",

  "search?q=Diego",
  "search?q=Smith",
  "search?q=business",
];

let lastRequestStartedAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isInScope(url: URL): boolean {
  const base = new URL(BASE_URL);
  return url.origin === base.origin && url.pathname.startsWith(base.pathname);
}

async function waitForRequestSpacing(): Promise<void> {
  const remaining = MIN_DELAY_MS - (Date.now() - lastRequestStartedAt);
  if (remaining > 0) {
    await sleep(remaining);
  }
  lastRequestStartedAt = Date.now();
}

function retryAfterMs(response: Response): number {
  const value = response.headers.get("retry-after");
  if (!value) return 2_000;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1_000);
  }

  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 2_000;
}

async function requestOnce(url: URL): Promise<Response> {
  await waitForRequestSpacing();

  return fetch(url, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Accept: "application/json, text/plain;q=0.9, */*;q=0.1",
      "User-Agent": "CS1340-TaskX-Authorized-Discovery/1.0",
    },
  });
}

function findFinanceRelatedFieldNames(body: string): string[] {
  const financeFields: string[] = [];
  const fieldPattern =
    /"([^"]*(?:financial|finance|account|balance|payment|transaction|salary|income|card|bank)[^"]*)"\s*:/gi;

  let fieldMatch: RegExpExecArray | null;

  while ((fieldMatch = fieldPattern.exec(body)) !== null) {
    const fieldName = fieldMatch[1];
    if (financeFields.indexOf(fieldName) === -1) {
      financeFields.push(fieldName);
    }
  }

  return financeFields;
}

async function inspectPath(path: string): Promise<void> {
  const base = new URL(BASE_URL);
  const url = new URL(path.replace(/^\/+/, ""), base);

  if (!isInScope(url)) {
    console.log(`[SKIP] Out-of-scope path: ${path}`);
    return;
  }

  let response: Response | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
    try {
      response = await requestOnce(url);

      if (response.status !== 429 || attempt === MAX_RETRIES_429) {
        break;
      }

      const delay = retryAfterMs(response);
      await response.body?.cancel();
      console.log(
        `[429] ${url.pathname} - waiting ${delay} ms before one retry`,
      );
      await sleep(delay);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown request error";
      console.log(`[ERROR] ${url.pathname} - ${message}`);
      return;
    }
  }

  if (!response) {
    console.log(`[ERROR] ${url.pathname} - no response`);
    return;
  }

  const contentType =
    response.headers.get("content-type") ?? "(not set)";
  const contentLength =
    response.headers.get("content-length") ?? "(unknown)";
  const location = response.headers.get("location");

  console.log(
    [
      `[${response.status}]`,
      url.pathname || "/",
      `type=${contentType}`,
      `length=${contentLength}`,
      location ? `redirect=${location}` : "",
    ]
      .filter(Boolean)
      .join(" "),
  );

  let body: string;
  try {
    body = await response.text();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown body-read error";
    console.log(`[ERROR] Could not read response body for ${url.pathname}: ${message}`);
    return;
  }

  const financeFields = findFinanceRelatedFieldNames(body);

  console.log(
    `[FINANCE-RELATED FIELD NAMES] ${
      financeFields.length > 0
        ? financeFields.join(", ")
        : "None found"
    }`,
  );
    console.log("[RESPONSE BODY]", body.slice(0, 1500));
}

async function main(): Promise<void> {
  const base = new URL(BASE_URL);
  if (!isInScope(base)) {
    throw new Error("Base URL is outside the permitted API scope.");
  }

  console.log(`Scoped discovery: ${base.origin}${base.pathname}`);
  console.log(`Minimum request spacing: ${MIN_DELAY_MS} ms`);
    console.log("Response bodies are inspected for endpoint and schema clues.");

  for (const path of PATHS) {
    await inspectPath(path);
  }

  console.log("Finished. Review the field names and choose the next course-approved test.");
}

main().catch((error: unknown) => {
  console.error(
    "Fatal error:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
