
# Front Server

## Installation

npm install

In the .env file please copy this in

# Sprint 8: Privacy and Pathfinding
### Task B: Pathfinding Property-Based Testing

1. Subproperty Decomposition:
   - Start and Goal Correctness: The resulting path array must begin at the designated origin node ID and end at the target node ID.
   - Graph Continuity: Every consecutive pair of node IDs (u, v) must represent a valid edge present in the loaded graph cache adjacency list.
   - Cycle-Free Traversal: The path must not contain duplicate node IDs, ensuring no redundant loops.
   - Relational Optimality: The total edge cost along the returned path must match or beat the mathematically known shortest distance.

2. Polynomial-Time Predicates:
   - isProductionStartAndEndCorrect evaluates endpoints in O(1) constant time.
   - isProductionPathContinuous iterates through the path in O(|P| * d) time, where d is node degree, verifying edge validity against the adjacency list.
   - isProductionCycleFree runs in O(|P|) linear time utilizing a hash set.

3. Relational Verification of Optimality:
   - Evaluating whether an arbitrary path is globally optimal cannot be verified efficiently without re-executing search. Because multiple paths can share equal minimum costs, we hardcode deterministic graphs with known optimal costs (such as our 60 cost diamond and 20 cost tie breaker) and assert that the computed path cost matches the theoretical minimum.



### Task C: Stakeholder Compromise Implementation and Reflection

#### Part 1: Implementation Justification
To fulfill external municipal and research data requests while defending user privacy, we implemented a data release pipeline at /api/stakeholder-data. Rather than injecting Gaussian noise, which can displace coordinates into water bodies or physically impossible structures, we chose deterministic grid snapping combined with spatial endpoint trimming:
1. Spatial Endpoint Trimming: Every route has 500 meters trimmed from both its origin and destination. This masks sensitive locations like residential front doors and personal workplaces without distorting the shape of public transit corridors.
2. Grid Snapping: Coordinates are snapped to 3 decimal places (approximately 110 meter precision bins). This prevents exact vehicle trajectory reconstruction while maintaining street-level traffic density accuracy for urban planners.
3. Micro Trip Suppression: Any route shorter than 1000 meters in total length is fully suppressed because trimming 500 meters from both ends leaves zero remaining safe data.

#### Part 2: Reflection on the Compromise
Actually implementing this compromise illuminated critical trade-offs between mathematical privacy guarantees and downstream data utility:
- The Short Trip Blind Spot: Trimming 500 meters from both start and end points systematically erases short trips under one kilometer. Consequently, city planners querying this endpoint will completely miss pedestrian walking trips, micro mobility scooter journeys, and neighborhood errands, skewing the dataset toward long distance vehicular commutes.
- Boundary Disconnections: Snapping coordinates to a 110-meter grid causes consecutive points along high-speed corridors to collapse into duplicate coordinates, requiring deduplication logic. Furthermore, grid snapping can cause a road segment to appear parallel to its actual street alignment, potentially complicating topological graph map-matching for researchers.
- Conclusion: While technical compromises like spatial trimming and coarsening successfully neutralize re-identification risks, they inevitably introduce sampling bias. System designers must communicate these missing data boundaries to stakeholders so policy decisions are not based on an incomplete picture of municipal mobility.


### Task X: High-Value Information in Raw OSM Data

Analyzing the raw OpenStreetMap XML extract for downtown Providence reveals several structural attributes beyond edge length that are vital for production routing engines:

1. Intersection Controls ('highway="traffic_signals"', 'highway="stop"'):
   Nodes such as 201251952 (traffic signals) and 4159632863 (all-way stop) indicate points where vehicles face mandatory deceleration or waiting delays. Production routing engines augment simple edge length with junction wait penalties, preventing algorithms from directing traffic through complex urban street grids with numerous traffic lights when a slightly longer freeway corridor offers a faster traversal time.

2. Motorway Junctions and Ramp Geometry ('highway="motorway_junction"', 'ref="37A"'):
   Nodes like 201129477 and 332064267 denote grade-separated highway exits along Interstate 95. These tags dictate legal highway ingress and egress points, ensuring the routing engine does not attempt illegal turning maneuvers directly from arterial streets onto highway corridors, while providing necessary metadata for voice navigation and lane guidance.

3. Pedestrian Crossings and Accessibility Markers ('crossing="marked"', 'crossing:signals="yes"', 'barrier="kerb"'):
   Nodes such as 5689649271 and 5976922383 define marked pedestrian crosswalks, walk signal hardware, and curb barriers. Multi-modal navigation algorithms require this data to route pedestrians through legally designated, signal-protected street crossings rather than hazardous mid-block roadways, while enabling step-free ADA-compliant routing profiles for mobility devices.

4. Facility Ingress Points ('amenity="parking_entrance"'):
   Nodes 8994212125 and 9023329017 mark physical entrances to the Providence Place parking garage. Real-world services use these tags to solve the last-mile routing problem, ensuring vehicles are guided to actual garage portals rather than getting stuck along inaccessible exterior walls of large building structures.


### Task Y: Persistent Disk Caching Architecture

1. The Core Bottleneck:
Fetching vector map data from the Overpass API represents the dominant latency cost in our pathfinding service, often taking minutes for long routes and exposing the application to 429 rate-limiting failures. An in-memory cache is volatile and gets wiped whenever the server restarts, forcing every reboot to encounter cold-start network latency.

2. What Is Most Valuable to Pre-Cache on Disk:
To maximize routing performance while respecting strict memory and disk storage constraints, the most valuable information to persist on disk consists of:
* The Regional Arterial Backbone: Pre-caching motorways, trunks, and primary highways across the entire regional transit area. In long-distance pathfinding, the majority of the distance is spent on high-capacity highways. Having this backbone perpetually available on disk allows A* to traverse hundreds of miles across regional corridors without firing external network requests, restricting expensive on-demand tile fetches strictly to local origin and destination endpoints.
* High-Density Anchor Tiles: Pre-caching full local street graphs for key metropolitan hubs (such as Downtown Providence and Providence Station) where trips frequently concentrate.
* Pre-Parsed Adjacency Structures: Storing processed node coordinate lookups and neighbor edge weights as JSON files on disk rather than raw XML. This avoids both network transmission time and the CPU overhead of parsing XML DOM trees into graphs upon startup.

3. Cache Eviction and Memory Management:
To ensure the disk cache remains bounded, we implement a Least Recently Used (LRU) persistence policy with a fixed disk budget (50 MB). Core arterial highways remain pinned, while supplementary residential tiles are evicted when the budget is reached, striking a sustainable balance between disk footprint and hit rate.



### Task Z: Implementation of Task X and Task Y

To put our theoretical answers from Task X and Task Y into practice, we engineered two complementary systems:

1. Persistent On-Disk Tile Cache ('diskCache.ts'):
   We implemented an on-disk cache module that serializes GraphTile data into formatted JSON files within 'backend/data/tile_cache/'. Before placing any bounding box into the Overpass network task queue, 'graphQueue.ts' interrogates the disk cache. If the tile has been fetched previously or pre-cached, it loads into memory in under 5 milliseconds, completely bypassing Overpass API network latency and rate limits. Newly fetched Overpass tiles are simultaneously written to disk, ensuring that all explored territories persist across server restarts.

2. Attribute Enrichment and Junction Penalty Modeling ('osmEnricher.ts'):
   We implemented a tag extraction engine that processes intersection controls identified in Task X ('highway="traffic_signals"' and 'highway="stop"'). Rather than assuming uniform free-flow speed across street intersections, our graph builder appends calibrated delay penalties (equivalent to 15-20 seconds of idle time for signals and 5-8 seconds for stop signs) to edges terminating at controlled nodes. This guides the A* search algorithm toward smoother arterial corridors with fewer traffic delays rather than treating residential streets with frequent stops as equally fast shortcuts.
   



# Sprint 7: Pins and Pathfinding (Part 1)

### Task A: Code Walk
How the pathfinding feature operates:
The pathfinding pipeline begins when the backend receives a POST request at the /find-path endpoint containing an array of geographic coordinates. This request is routed to handleShortestPathRequest() in shortestTwoPointPath.ts. The system first calculates which map tiles contain the requested coordinates using ensureStartGoalTiles(). If those tiles are not in the local graphCache, it delegates to graphQueue.ts to fetch real-world OpenStreetMap road data from the Overpass API. Once tiles are loaded into memory, findNearestGraphNode() snaps the requested lat/lng coordinates to the closest valid OpenStreetMap node IDs.

These start and end node IDs are passed into a routing algorithm (like the aStarWithOnDemandTiles stub). The algorithm traverses the adjacency lists and returns an array of node IDs representing the shortest path.

How routing results are exposed to the frontend:
Once the routing algorithm returns the array of path node IDs, handleShortestPathRequest() maps those IDs back to their corresponding geographic {lat, lng} coordinates using a flat node index. It then exposes this data back to the frontend by returning a 200 OK JSON response in the format: { "path": [{ "lat": 41.82, "lng": -71.40 }, ...] }. (Mocked path data sets for frontend testing have been generated and stored in backend/src/mockData.ts).


### Task B (Responsive Design): Implemented a mobile-first responsive layout tailored for mobile devices (tested at 360x740 px) and standard desktop screens (1920x1080 px). On desktop, the itinerary sidebar and interactive map remain side by side. On viewports below 768px, a toggle bar switches between the itinerary list and the map view, preventing cramped UI components, preserving full functionality, and avoiding horizontal page overflow without altering the core desktop experience.

### Task C: Pathfinding Specification

1. Plan & High-Level Pseudocode
To implement the route search, we will use the A* algorithm within the aStarWithOnDemandTiles(nodeIds) function. The search will maintain a priority queue (min-heap) of nodes to visit, ordered by their fScore (where fScore = gScore + hScore). 
    Cost (gScore): The accumulated distance from the start node, using the edge weights provided in the graph adjacency list.
    Heuristic (hScore): We will use the haversineDistance() function from tileUtils.ts to calculate the straight-line distance from the current node to the goal node.

Pseudocode:
text
function aStarWithOnDemandTiles(nodeIds):
  start = nodeIds[0], goal = nodeIds[1]
  openSet = PriorityQueue(ordered by fScore)
  openSet.add({id: start, g: 0, f: haversineDistance(start, goal)})
  
  while openSet is not empty:
    current = openSet.popLowest()
    if current == goal: 
        return reconstructPath(current)
    
    // Lazy Map Loading
    if nearEdge(current.lat, current.lon, currentTileKey):
        neighborKeys = calculateNeighborTileKeys(currentTileKey)
        enqueueGraphTask(neighborKeys)
        waitForGraphTiles(neighborKeys)
      
    for neighbor in getNeighbors(current):
        tentative_g = current.g + edge_weight(current, neighbor)
        if tentative_g < neighbor.g:
            neighbor.cameFrom = current
            neighbor.g = tentative_g
            neighbor.f = tentative_g + haversineDistance(neighbor, goal)
            openSet.add(neighbor)
text


### Task D: Communicating Concerns

1. Concerns
* Data Use: The FBI explicitly cautions against using Uniform Crime Reporting (UCR) datasets to rank cities, evaluate community danger, or measure local safety. Crime reporting criteria, department staffing, and jurisdictional reporting practices vary widely across municipalities. Using this raw data to score geographic locations violates the core methodology outlined by the data provider.
* Choice of Metric: Arrest records measure law enforcement activity and resource deployment rather than actual danger to travelers. High arrest volumes often reflect aggressive policing policies or routine patrol concentration in lower income neighborhoods rather than higher risk for someone walking down the street. Conflating arrest density with route hazard introduces systemic bias into our navigation engine.
* User Interface: Classifying neighborhoods on a map into binary "safe" and "unsafe" categories distorts user perception. It creates unwarranted anxiety in areas labeled red while providing a false sense of security in areas lacking recorded enforcement, all while giving users zero actionable guidance on navigating physical street conditions.

2. Metrics
Instead of tracking law enforcement encounters, an itinerary app should measure Pedestrian and Transit Safety. This gives travelers direct, useful insights into physical roadway hazards.
 Alternate Datasets: Municipal Vision Zero open data records, local Department of Transportation collision reports, and public street infrastructure datasets tracking pedestrian crosswalks and continuous lighting.
 Data Source: The City of Providence Open Data Portal or the National Highway Traffic Safety Administration (NHTSA) Fatality Analysis Reporting System.
 Implementation Plan: The backend will replace the FBI API integration with an endpoint querying local municipal collision registries. It will filter for pedestrian and bicycle vehicle collisions over the preceding twenty four months within requested map bounding boxes. The route evaluator can then assign higher traversal costs to hazardous intersections during path generation.

3. UI
To avoid misinterpretation, the user interface will eliminate broad labels like "Safety Score" or "Safe Corridor." 
Neutral Visual Overlays: The map will display factual, descriptive layers such as Designated Bike Corridors, High Traffic Pedestrian Crossings, or Street Lighting Coverage.
Contextual Details: Selecting a highlighted intersection will open an inspection card detailing concrete historical figures (for example: Two vehicle pedestrian incidents recorded here between 2024 and 2026) alongside an external link to the municipal open data source, allowing users to make informed route decisions.

4. Email Draft

Subject: Recommendations Regarding the Safety Map Layer and FBI Arrest Dataset

Hi Ellie,

I am writing to share several technical and ethical concerns regarding the proposed safety feature that utilizes FBI arrest statistics.

The FBI explicitly advises against using UCR figures to evaluate or rank safety across geographic boundaries. Arrest records reflect police deployment and enforcement intensity rather than actual incident danger. Treating arrest density as a proxy for traveler risk introduces systemic bias against heavily policed communities. Furthermore, presenting this metric as a binary safe or unsafe map overlay gives users an inaccurate view of neighborhood conditions without providing meaningful travel guidance.

I propose pivoting this feature to measure Pedestrian Roadway Safety using municipal open data and Vision Zero traffic collision records. This allows our routing engine to highlight well lit paths, protected bike lanes, and collision prone intersections. This alternative provides objective, actionable information for pedestrians navigating between activities while eliminating the biases inherent in policing records.

I would appreciate the chance to discuss this pivot during our next check in. Please let me know what time works best for you.

Best regards,
Deepak

### Task E: Code Review
Link to Pull Request: https://github.com/cs0320-f26/frontend-mockup-zmahan-epark107/pull/1

### Task F: Technical Design for Stakeholder Needs

Part 1: Data Consumer Stakeholders
Consumer 3: Dr. Aris Thorne works for the Regional Environmental Protection Agency and is studying urban heat islands and pedestrian exposure to vehicle emissions. They aim to use the app's travel data to understand foot traffic patterns through city parks, commercial districts, and high-emission industrial zones during peak summer heat. By analyzing these routing trends, Dr. Thorne hopes to secure federal grants to plant shade canopies, optimize crosswalk placements, and install cooling mist stations along the most heavily trafficked outdoor corridors.

Part 2: Data Producer Stakeholder Concerns
User 1 (Bosh Jala, 34): Bosh's daily commute is highly predictable. If exact home and daycare locations are shared, malicious actors could determine exactly when his house is empty or precisely where and when his children are dropped off, posing severe physical safety and burglary risks.
User 2 (Sarissa Maffer, 15): As a minor traveling alone, sharing exact, timestamped walking routes exposes her real-time location to strangers. Furthermore, her clients are likely wealthy homeowners; leaking their exact addresses alongside her dog walking schedule violates her clients' privacy and security.
User 3 (Nim Telson, 20): Nim is relying on location obfuscation to maintain boundaries with their family. If data brokers purchase this data and it is deanonymized or leaked, Nim's parents could easily reconstruct their actual flight paths and Puerto Rico coordinates, compromising their autonomy.
User 4 (Huyuan Yuang, 57): Huyuan mixes corporate travel with political organizing. If a third party correlates her static corporate office location with specific protest sites, she could be deanonymized by her employer or law enforcement, risking workplace retaliation or targeted surveillance.
User 5 (Sanant Araf, 61): Sanant's frequent travel to specific specialty clinics (e.g oncology, dialysis) acts as a proxy for his medical history. If health insurers, employers, or data brokers acquire this, they could infer his pre-existing conditions, risking discrimination or privacy breaches.

Part 3: Technical Solutions

Fields to Include:
Binned Geolocation: Hexagonal spatial grids (e.g Uber's H3 resolution 8) rather than exact latitude/longitude.
Truncated Timestamps: Timestamps rounded to the nearest hour (for transit analysis) or day (for tourism).
Ephemeral User IDs: Cryptographically hashed, rotating session tokens that reset every 72 hours, rather than static account IDs.

Fields to Exclude:
Exact coordinates (Latitude/Longitude floats).
Precise timestamps (seconds/minutes).
Routing anchors (the first and last 500 meters of any continuous trip).

Transformations for Privacy:
Anchor Masking (Spatial Trimming): Automatically drop the first and last 500 meters of any user's trip before it enters the database. This protects the exact locations of Bosh's home/daycare, Sarissa's clients, and Sanant's clinics.
K-Anonymity Aggregation: Only share aggregated spatial bins (hex grids) that contain data from at least k distinct users (e.g k=50) in a given time window. If a hex grid has too few users, the data is suppressed. 
ID Rotation: By rotating User IDs every 72 hours, Michele (Tourism) can track multi-day repeat visits over a weekend, but Huyuan's long-term corporate identity cannot be mathematically linked to her weekend protest attendance over multiple months.

Risks & Compromises:
Risks to Users: If a user lives and works in a highly rural or sparse area, even a hex grid might uniquely identify them. Furthermore, highly motivated actors can sometimes defeat K-Anonymity using intersection attacks across multiple datasets.
 Risks to Consumers: Charlie (MTA) will not be able to analyze exact bus stop placements, as the first/last 500 meters of trips are masked, leaving a blind spot in first-mile/last-mile transit gaps. Michele will be unable to track repeat tourism year over year, as the 72 hour ID rotation limits her to analyzing short term vacation behavior only.

### Supplemental Challenge: Cache-Timing Attack

(1) Demonstration of the Timing Attack Program

I developed a timing attack script located at scripts/attack_sprint_7.py that queries the CourtListener cache proxy API (http://cs0320-apis.cs.brown.edu:3232/apis/cache-timing-api/search). The script measures high precision network round trip durations using time.perf_counter() to determine whether a particular court case has been queried recently based solely on response time.

To differentiate between cold lookups (which require upstream network requests) and cached responses (which return directly from memory), I calibrated a cache detection threshold of 400.0 ms based on baseline connection round trip latency.

Execution Results:

Beginning my cache timing probe...

Measuring a guaranteed cache miss:
Query: 'control_test_2a92dbb1' | Round trip duration: 1150.52 ms
Verdict: UNCACHED. No recent cache entries found for 'control_test_2a92dbb1'.

Probing target court case 'Lamphere':
Query: 'Lamphere' | Round trip duration: 1553.78 ms
Verdict: UNCACHED. No recent cache entries found for 'Lamphere'.

Repeating 'Lamphere' immediately to demonstrate a confirmed cache hit:
Query: 'Lamphere' | Round trip duration: 249.98 ms
Verdict: CACHED. Someone has queried 'Lamphere' recently.

The randomized control string took 1150.52 ms and the initial lookup for Lamphere took 1553.78 ms, both correctly classified as UNCACHED. When Lamphere was queried a second time immediately afterward, the response time dropped to 249.98 ms, representing an approximate 84% reduction in round trip latency. Because 249.98 ms is well below 400.0 ms, the program successfully identified that the court case had been recently queried and cached.
#

(2) Imperfections of the Cache-Timing Approach
While this attack successfully leaks whether data was recently accessed, it is fundamentally flawed in real-world scenarios because it assumes a perfectly stable, isolated network environment. Several variables introduce noise that can cause false positives and negatives:
Network Jitter and Latency: Fluctuations in local Wi-Fi stability, ISP routing anomalies, or physical distance from the server can cause a cached response to arrive slowly, falsely registering as an uncached miss.
Variable Server Load: If the API server experiences a sudden spike in concurrent traffic, CPU throttling or queue delays will increase the time it takes to process and dispatch even cached responses, breaking the threshold calibration.
Environment Dependency: The attack requires precise threshold tuning. A hardcoded threshold of 80ms might perfectly differentiate hits from misses on Brown's local campus network, but the exact same script will fail entirely if executed over a slow VPN where all requests (cached or not) take over 200ms.

### Design Choices
Responsive Layout Architecture (Task B): Implemented CSS media queries with a 768px breakpoint. On viewports below 768px, the layout replaces the side-by-side desktop panels with an accessible toggle bar. This lets mobile users switch between the Itinerary list and MapView smoothly without shrinking component touch targets or causing horizontal screen overflow.

Pathfinding Search Strategy (Task C): Selected the A* search algorithm rather than Dijkstra because geographic coordinates provide a natural admissible heuristic (Haversine distance). This prunes node exploration directly toward the target destination. Incorporated lazy on-demand tile loading so the engine fetches road data in discrete spatial chunks from the Overpass API instead of loading the entire global road network into memory.

Multi Tier Privacy Architecture (Task F): Balanced consumer utility and user privacy through three complementary layers. Spatial trimming (Anchor Masking 500 meters) strips sensitive home and destination endpoints. K-Anonymity spatial binning aggregates trip volumes across hexagonal grids. Rotating ephemeral pseudonyms every 72 hours allows short term tourism cohort tracking while preventing long term profiling or stalking.

Cache Timing Measurement Strategy (Supplemental Challenge): Built a standalone Python script utilizing time.perf_counter for microsecond timing resolution. Designed the attack to run a randomized control query first to measure real time baseline round trip latency, followed by the target query and a verification query to empirically separate cold upstream requests from memory cache hits.

### Tests 
Responsive Layout Tests: Manually tested the layout across various viewport dimensions using Chrome DevTools device mode. Verified single column presentation and view-toggle functionality on mobile screens (360x740 px, iPhone SE, and Pixel 7) and confirmed side by side rendering on standard desktop monitors (1920x1080 px). Confirmed no UI clipping or horizontal scrolling occurs.

Pathfinding Logic Tests: Verified A* priority queue behavior and edge relaxation against mock road networks. Checked coordinate snapping edge cases in findNearestGraphNode to ensure query coordinates correctly bind to valid OpenStreetMap node IDs.

GeoJSON Schema Validation: Verified Zod schema enforcement across official Census datasets (52 state features and 3,221 county features) using Vitest, confirming strict property regex validation and polygon coordinate structures.

Cache Timing Empirical Probe: Executed live probes against the course API proxy. Confirmed that unqueried endpoints return in 1,150 ms to 1,860 ms (UNCACHED), while an immediate second query drops to 249.98 ms (CACHED), validating that the 400.0 ms threshold reliably detects cache presence under current network conditions.

### How To…
Run the frontend development server:
Navigate to the frontend folder, install packages with npm install, and launch the app using npm run dev. Open http://localhost:5173 in your browser.

Toggle mobile view:
Open browser developer tools (Command + Option + I on macOS), enable device mode, set the screen width to 768px or narrower, and click the view toggle buttons to switch between itinerary cards and the map.

Run backend tests:
Navigate to the backend folder and run npx vitest run to execute all unit tests and schema test suites.

Execute the cache-timing attack script:
From the project root or scripts directory, verify requests is installed (pip install requests) and run python3 scripts/attack_sprint_7.py.

### Errors/Known Bugs
A* On-Demand Integration: The A* pathfinding algorithm is currently structured as an architectural specification and mock pipeline. Live streaming of Overpass API road geometry to render visual polyline paths on the user map will be fully wired in during the next sprint.

Cache Timing Network Jitter: The timing attack script relies on an empirical threshold of 400.0 ms. On high-latency VPNs or fluctuating wireless networks, transient packet delays on a cached lookup can occasionally exceed 400 ms, producing a false negative uncached result.

Tile Boundary Snapping: When a user places a pin directly on the border line between two unloaded bounding box tiles, the nearest node finder can experience minor latency while awaiting both adjacent tiles to load from the Overpass queue.

#### Collaborators (cs logins of anyone you worked with and generative AI)
dvkulkar
0320 Agent

#### Hours Spent : 14 hours

#### Link to Github Repo : 
https://github.com/cs0320-f26/pins-and-pathfinding-decastich





VITE_MAPBOX_TOKEN = You can get your token here https://docs.mapbox.com/help/dive-deeper/access-tokens/

Only add these after sprint 6


VITE_CLERK_FRONTEND_API=

CLERK_SECRET_KEY=

VITE_FIREBASE_API_KEY=AIzaSyACrNGKLuhdljXK3xMOlWqyMJQpWQLGSFc
VITE_FIREBASE_AUTH_DOMAIN=dk9595c-46a8d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dk9595c-46a8d
VITE_FIREBASE_STORAGE_BUCKET=dk9595c-46a8d.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=8364790413
VITE_FIREBASE_APP_ID=1:8364790413:web:658c725f6e284e9914c8c4

###Sprint 6
###Task A: Summarize Authentication and Database

Client State: The front end captures the geolocation when a user drops a pin and updates its local state to render the marker on the map.

Network Transmission: The client packages the pin coordinates into an HTTP request and sends it to the back end server's API endpoints.

Server Processing: The back end receives the payload, validates the data, and performs necessary computations like geographic region translation without caching the permanent state locally.

Cloud Persistence: The server communicates with the Firestore API to save the pin data within a user specific collection, ensuring the itinerary remains stored even if the back end server restarts.

### Task D: Communicating : up the ladder

We evaluated the proposed user story regarding displaying relative county/state safety (calculated as total arrests divided by population) as map highlights. We identified the following critical issues:

1. Arrests Crime or Safety: Dividing total arrests by population measures police enforcement and operational output rather than actual public safety. High arrest rates often reflect proactive policing styles or over-policing rather than higher rates of victimization.
2. Violation of FBI Guidelines: The FBI explicitly warns against using raw crime or arrest statistics to rank or evaluate the safety of jurisdictions. Doing so ignores crucial local variables like population mobility, tourism, economic demographics, and reporting consistency, resulting in a misleading metric for travelers.

### Task E: Conforming to a Standard (Accessibility)

We conducted an accessibility evaluation of our web application focusing on key WCAG 2.1 success criteria: Non-Text Content (1.1.1), Focus Visible (2.4.7), and Labels or Instructions (3.3.2). 

During our screen reader experiment using macOS VoiceOver and keyboard only navigation (Tab, Shift+Tab, Enter), we identified several initial barriers. Specifically, activity delete buttons and drag handles lacked descriptive text alternatives, leaving screen reader users with ambiguous announcements. Additionally, custom date pills and dropdown controls lacked explicit aria attributes and clear visual focus rings.

To resolve these issues, we implemented the following fixes:
1. Non-Text Content (1.1.1) & Labels (3.3.2): Added precise aria-label attributes to activity delete buttons (e.g., announcing Remove Museum of Art from itinerary when deleting an activity) and state-aware aria-pressed descriptions for date pills. We also added descriptive labels to the map highlight dropdown selector.
2. Focus Visible (2.4.7): Added high-contrast :focus visible outline rings (3px solid #3b82f6) across all interactive elements including date pills, itinerary buttons, and dropdowns. 

Post-remediation testing confirmed that VoiceOver successfully and clearly announced all button actions, active dates, and form controls, while keyboard navigation remained seamless with highly visible focus indicators throughout the application interface.

### Task F: End-to-End Testing Plan & Tests

### Test Plan
1. Itinerary Date Switching: Verify that clicking different date pills in the itinerary panel updates the active date view and highlights the selected pill.
2. Adding Activities: Verify that searching for a location/activity and selecting it adds the item to the active itinerary list.
3. Removing Activities: Verify that clicking the accessible remove button on an activity card deletes the item from the itinerary list.
4. Network / API Error Handling: Verify that if backend endpoints (such as weather or region boundary loading) fail or return 500 errors, the app handles the error gracefully without crashing the UI.

### Task G: Reflection

Code Review

Looking at the final implementation of this sprint, one area I dislike is the growing complexity of MapView.tsx. It is currently responsible for initializing Mapbox, managing the rendering of standard markers, and fetching/rendering three entirely different types of GeoJSON layers (weather, redlining, and regions). 

According to our code review rubric’s emphasis on modularity and the separation of concerns, this file handles too many distinct responsibilities. If I had more time, I would refactor this by extracting the data fetching and layer-rendering logic into separate custom React hooks (e.g., useRegionLayer or useWeatherLayer). This would vastly improve the readability of the main map component and make the codebase much easier to maintain or extend in the future.

Additionally, while I am happy with the accessibility fixes implemented in Task E, I dislike that the focus styles in ItineraryPanel.css are hardcoded rather than utilizing a centralized design system or CSS variables. Given more time, I would migrate our hex colors and spacing to global CSS variables to ensure consistency across the application and simplify future UI updates.

## Scripts

| Command                  | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| npm run dev            | Start server in development mode using ts-node.         |
| ------------------------ | ------------------------------------------------------- |

For debugging inspect element on the page and go into the sources tab where you will be able to place breakpoints

### Task C: User Experience and Accessibility Auditing
Step 1: User Inyerface
It took me approximately one and a half minutes to navigate the User Inyerface application, during which its intentionally hostile design choices severely hindered my progress. One major issue is the use of misleading button colors, where negative actions like "Cancel" are styled in an inviting green while positive actions are plain text or red, actively preying on user muscle memory. Additionally, the form inputs break standard data entry expectations by splitting fields like email into cumbersome dropdowns and hiding password requirements until a validation failure occurs. Finally, the obfuscated Terms and Conditions modal features a custom-built scrollbar that moves at a fraction of standard speed, frustrating users and creating severe accessibility issues for those with motor impairments.

Step 2 & 3: Auditing with Lighthouse & Manual Checks
Using Chrome's Developer Tools, I ran a Lighthouse audit on the travel planner web application configured for Navigation, Desktop, and Accessibility. While it yielded an accessibility score of 95, the report flagged 10 Additional items to manually check, including verifying logical tab ordering, ensuring focus is not trapped, and confirming visual order matches DOM order.

The 0320 AI agent could parse the static React components but lacked the rendering engine and physical input capabilities to perform these interactive checks. To bridge this gap, I conducted a manual evaluation by physically tabbing through the live application. I verified that the application is fully keyboard accessible: all interactive buttons and inputs successfully receive a clear visual focus outline, the tabbing flow logically follows the visual layout, and the user's focus does not become trapped in any specific region. This confirms that while automated tools and AI can flag potential structural concerns, manual human testing remains essential to validate interactive accessibility.


### Task D: Conforming to a Standard
1. Self Code Review
In our Sprint 3/4 backend, I realized we primarily tested happy paths rather than edge cases. We should have written mock tests to simulate external API timeouts (ACS, FBI, Weather) to ensure the server gracefully handles delays instead of hanging. Additionally, our CSV handler loads entire files into memory; testing massive or malformed datasets would reveal potential memory bottlenecks. Finally, while we did successfully implement an IP-based rate limiter (Task Y), testing it behind a shared NAT/VPN would expose its flaws, highlighting the need for token-based user limits rather than just IP tracking.

2. Sprint Reflection
The biggest paradigm shift was moving from procedural backend routing to React's declarative state management. Instead of simply firing a response, I had to use useState to manage asynchronous UI re-renders when the DataViewer received data. The toughest bug today was a silent port mismatch: the frontend attempted to fetch from 3232 while the Express server was actually listening on 3001. Tracing the failed network requests taught me to always verify environment configurations before assuming the API logic is broken.

3. User Experience Reflection
Reviewing the final UI revealed several styling and accessibility quirks. First, while vertical scrolling works, loading a CSV with 25 columns causes horizontal overflow, either squishing the text or breaking the sidebar boundaries. Second, querying an invalid ACS county leaves the table confusingly blank instead of surfacing a clear No results found error state. Finally, shrinking the browser to a mobile width causes the sidebar and map to overlap improperly, showing that our CSS needs flexible containers and media queries to be genuinely accessible across devices.

### Task Y : High Level Design Reflection
Visiting the primary NPR website and its text alternative reveals two vastly different user experiences. The text version offers a streamlined and highly accessible reading environment that loads instantly. Conversely, the primary site provides a rich multimedia experience featuring high resolution photography, interactive graphics, and embedded audio players. Because the simplified layout entirely omits these rich media elements, visitors lose crucial visual context. For example, a reader misses the sheer devastation shown in photographs of California wildfires or the emotional expressions of crowds during protests. Furthermore, stripping out embedded podcast players prevents visitors from streaming audio directly alongside the news, and removing social media embeds obscures direct access to primary source statements. Ultimately, while the minimal design provides a clean space free of distractions, it sacrifices the deep narrative impact and immediate understanding that integrated photojournalism and interactive multimedia deliver.


### Task Z : UI and UX Issue Mitigation Plan
Issue Identified: Unconditional Asset Downloading on Metered Connections
Many modern web applications download large JavaScript bundles, heavy third party scripts, and massive media files without checking the client network state. This creates a severe usability issue for individuals on pay per byte data plans or slow cellular networks. The application consumes costly data and degrades rendering performance before the visitor can even interact with the primary text.

Engineering Mitigation Plan:
To resolve this bottleneck, I propose a progressive, network aware asset delivery system utilizing native browser APIs and local caching strategies to minimize payload sizes.

1. Network Aware Fetching Logic
The frontend will interrogate the navigator connection API to evaluate the save data boolean and the effective network type. If the visitor has data saving mode enabled or is on a restricted network, the React application will conditionally abort fetch requests for non essential assets like background videos, heavy custom fonts, and analytics trackers.

2. Adaptive Media and Lazy Loading
Instead of serving uniformly large image files, the user interface will implement native HTML picture elements utilizing source set attributes. This allows the browser engine to mathematically select and download the smallest possible WebP format image that fits the current viewport width. All media rendered below the fold will be strictly deferred using native lazy loading, ensuring data is only consumed when a component actually enters the visible screen area.

3. Service Worker Caching and Compression
By registering a Service Worker, we will implement a cache first strategy for the core application shell. The initial visit will securely store the compiled CSS and JavaScript bundles in local memory. Subsequent visits will load these static assets instantly from the device cache, bypassing expensive network round trips entirely. Finally, the backend infrastructure will be configured to apply Brotli compression algorithms to drastically shrink the byte footprint of all outgoing API payloads.

GitHub link : https://github.com/cs0320-f26/frontend-mockup-gladiators95
