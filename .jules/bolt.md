## 2025-05-15 - [Mapbox Re-initialization Bottleneck]
**Learning:** Re-initializing Mapbox GL on every render (triggered by parent state changes or unstable array literals for coordinates) causes significant performance degradation and visual flickering.
**Action:** Always initialize Mapbox only once using an empty dependency array in `useEffect`. Update map state (center, markers) using imperative Mapbox API calls in separate, targeted effects. Use `React.memo` and stable prop references (constants outside components) to shield the Map component from unnecessary parent re-renders.
