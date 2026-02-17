# Technical Debt & Future Optimizations

## 1. Route Merging Performance Optimization
- **File:** `src/lib/routes.ts:63`
- **Issue:** O(N^2) Route Merging Complexity
- **Description:** The current route merging logic iterates through `masterData.rutas` and performs a `find` operation on `allRoutes` for each route, resulting in O(N*M) complexity (effectively O(N^2)).
- **Impact:** As the number of routes grows, this will become a performance bottleneck during server start and data ingestion.
- **Proposed Solution:** Utilize a `Set<string>` or `Map<string, Route>` to track existing route IDs for O(1) lookups, reducing the overall complexity to O(N).
- **Status:** Deprioritized (2025-02-11). Current focus is on data completeness and triple balance storage bugs.
