## 2025-05-22 - [Mapbox Lifecycle Optimization]
**Learning:** Initializing Mapbox GL JS in a React component's main useEffect with unstable dependencies (like inline arrays for center) causes the entire map to be destroyed and recreated on every parent re-render. This leads to massive performance drops and redundant network requests for map assets and data files.
**Action:** Separate map initialization (mount) from updates. Use a separate useEffect with jumpTo/setCenter for view updates and useRef to maintain and update a single instance of markers instead of creating new ones.
