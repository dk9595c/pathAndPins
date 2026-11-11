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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var BASE_URL = "http://cs0320-apis.cs.brown.edu:3232/apis/fuzz-api/";
var MIN_DELAY_MS = 30;
var REQUEST_TIMEOUT_MS = 4000;
var MAX_RETRIES_429 = 1;
// Keep requests within the assigned API scope.
var PATHS = [
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
var lastRequestStartedAt = 0;
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
function isInScope(url) {
    var base = new URL(BASE_URL);
    return url.origin === base.origin && url.pathname.startsWith(base.pathname);
}
function waitForRequestSpacing() {
    return __awaiter(this, void 0, void 0, function () {
        var remaining;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    remaining = MIN_DELAY_MS - (Date.now() - lastRequestStartedAt);
                    if (!(remaining > 0)) return [3 /*break*/, 2];
                    return [4 /*yield*/, sleep(remaining)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    lastRequestStartedAt = Date.now();
                    return [2 /*return*/];
            }
        });
    });
}
function retryAfterMs(response) {
    var value = response.headers.get("retry-after");
    if (!value)
        return 2000;
    var seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.ceil(seconds * 1000);
    }
    var date = Date.parse(value);
    return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 2000;
}
function requestOnce(url) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, waitForRequestSpacing()];
                case 1:
                    _a.sent();
                    return [2 /*return*/, fetch(url, {
                            method: "GET",
                            redirect: "manual",
                            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                            headers: {
                                Accept: "application/json, text/plain;q=0.9, */*;q=0.1",
                                "User-Agent": "CS1340-TaskX-Authorized-Discovery/1.0",
                            },
                        })];
            }
        });
    });
}
function findFinanceRelatedFieldNames(body) {
    var financeFields = [];
    var fieldPattern = /"([^"]*(?:financial|finance|account|balance|payment|transaction|salary|income|card|bank)[^"]*)"\s*:/gi;
    var fieldMatch;
    while ((fieldMatch = fieldPattern.exec(body)) !== null) {
        var fieldName = fieldMatch[1];
        if (financeFields.indexOf(fieldName) === -1) {
            financeFields.push(fieldName);
        }
    }
    return financeFields;
}
function inspectPath(path) {
    return __awaiter(this, void 0, void 0, function () {
        var base, url, response, attempt, delay, error_1, message, contentType, contentLength, location, body, error_2, message, financeFields;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    base = new URL(BASE_URL);
                    url = new URL(path.replace(/^\/+/, ""), base);
                    if (!isInScope(url)) {
                        console.log("[SKIP] Out-of-scope path: ".concat(path));
                        return [2 /*return*/];
                    }
                    attempt = 0;
                    _d.label = 1;
                case 1:
                    if (!(attempt <= MAX_RETRIES_429)) return [3 /*break*/, 8];
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 6, , 7]);
                    return [4 /*yield*/, requestOnce(url)];
                case 3:
                    response = _d.sent();
                    if (response.status !== 429 || attempt === MAX_RETRIES_429) {
                        return [3 /*break*/, 8];
                    }
                    delay = retryAfterMs(response);
                    return [4 /*yield*/, ((_a = response.body) === null || _a === void 0 ? void 0 : _a.cancel())];
                case 4:
                    _d.sent();
                    console.log("[429] ".concat(url.pathname, " - waiting ").concat(delay, " ms before one retry"));
                    return [4 /*yield*/, sleep(delay)];
                case 5:
                    _d.sent();
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _d.sent();
                    message = error_1 instanceof Error ? error_1.message : "Unknown request error";
                    console.log("[ERROR] ".concat(url.pathname, " - ").concat(message));
                    return [2 /*return*/];
                case 7:
                    attempt++;
                    return [3 /*break*/, 1];
                case 8:
                    if (!response) {
                        console.log("[ERROR] ".concat(url.pathname, " - no response"));
                        return [2 /*return*/];
                    }
                    contentType = (_b = response.headers.get("content-type")) !== null && _b !== void 0 ? _b : "(not set)";
                    contentLength = (_c = response.headers.get("content-length")) !== null && _c !== void 0 ? _c : "(unknown)";
                    location = response.headers.get("location");
                    console.log([
                        "[".concat(response.status, "]"),
                        url.pathname || "/",
                        "type=".concat(contentType),
                        "length=".concat(contentLength),
                        location ? "redirect=".concat(location) : "",
                    ]
                        .filter(Boolean)
                        .join(" "));
                    _d.label = 9;
                case 9:
                    _d.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, response.text()];
                case 10:
                    body = _d.sent();
                    return [3 /*break*/, 12];
                case 11:
                    error_2 = _d.sent();
                    message = error_2 instanceof Error ? error_2.message : "Unknown body-read error";
                    console.log("[ERROR] Could not read response body for ".concat(url.pathname, ": ").concat(message));
                    return [2 /*return*/];
                case 12:
                    financeFields = findFinanceRelatedFieldNames(body);
                    console.log("[FINANCE-RELATED FIELD NAMES] ".concat(financeFields.length > 0
                        ? financeFields.join(", ")
                        : "None found"));
                    console.log("[RESPONSE BODY]", body.slice(0, 1500));
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var base, _i, PATHS_1, path;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    base = new URL(BASE_URL);
                    if (!isInScope(base)) {
                        throw new Error("Base URL is outside the permitted API scope.");
                    }
                    console.log("Scoped discovery: ".concat(base.origin).concat(base.pathname));
                    console.log("Minimum request spacing: ".concat(MIN_DELAY_MS, " ms"));
                    console.log("Response bodies are inspected for endpoint and schema clues.");
                    _i = 0, PATHS_1 = PATHS;
                    _a.label = 1;
                case 1:
                    if (!(_i < PATHS_1.length)) return [3 /*break*/, 4];
                    path = PATHS_1[_i];
                    return [4 /*yield*/, inspectPath(path)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log("Finished. Review the field names and choose the next course-approved test.");
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error("Fatal error:", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
});
