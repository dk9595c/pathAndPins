import time
import uuid
import requests

# Target proxy endpoint provided by the course server
API_URL = "http://cs0320-apis.cs.brown.edu:3232/apis/cache-timing-api/search"

# I set this threshold in milliseconds based on my local Wi-Fi latency.
# Cached responses skip external database lookups and resolve in under 80 ms.
# Cold lookups that trigger upstream requests take noticeably longer (often 180 ms or more).
CACHE_THRESHOLD_MS = 400.0


def query_api_and_measure_time(search_term: str) -> float:
    """
    I dispatch a GET request for a court case and calculate the round-trip
    latency in milliseconds using high-precision performance counters.
    """
    params = {"q": search_term}

    # Record timestamp immediately before the network packet is sent
    start_time = time.perf_counter()
    response = requests.get(API_URL, params=params)

    # I parse the JSON body to ensure the entire network payload has transferred
    response.json()
    end_time = time.perf_counter()

    elapsed_ms = (end_time - start_time) * 1000.0
    return elapsed_ms


def probe_court_case(search_term: str):
    """
    Evaluates whether a case was queried recently by comparing the response
    time against my empirical cache threshold.
    """
    elapsed_ms = query_api_and_measure_time(search_term)
    print(f"Query: '{search_term}' | Round-trip duration: {elapsed_ms:.2f} ms")

    # If the response returns significantly faster than my threshold, it came from memory
    if elapsed_ms < CACHE_THRESHOLD_MS:
        print(f"Verdict: CACHED. Someone has queried '{search_term}' recently.\n")
    else:
        print(f"Verdict: UNCACHED. No recent cache entries found for '{search_term}'.\n")


def main():
    print("Beginning my cache timing probe...\n")

    # Step 1: Baseline cold query.
    # I generate a unique random string that has never been searched before.
    # This gives me a real-time measurement of a guaranteed cache miss.
    unique_cold_query = f"control_test_{uuid.uuid4().hex[:8]}"
    print("1. Measuring a guaranteed cache miss:")
    probe_court_case(unique_cold_query)

    # Step 2: Testing the target court case.
    # Here I probe whether another student or the instructor queried Lamphere recently.
    target_case = "Lamphere"
    print(f"2. Probing target court case '{target_case}':")
    probe_court_case(target_case)

    # Step 3: Immediate follow-up probe.
    # Since Step 2 just forced the server to cache Lamphere, querying it again
    # right away shows what an active cache hit looks like on my current connection.
    print(f"3. Repeating '{target_case}' immediately to demonstrate a confirmed cache hit:")
    probe_court_case(target_case)


if __name__ == "__main__":
    main()
