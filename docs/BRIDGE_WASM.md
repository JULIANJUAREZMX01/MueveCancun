# WASM Bridge Documentation - MOVICUN 3.0

This document details how the React frontend interacts with the Rust-based WebAssembly routing engine.

## Core Functions

### 1. `calculate_route`
Calculates the optimal path between two points using Dijkstra's algorithm.

**Signature:**
```typescript
calculate_route(
  origin_lat: number,
  origin_lng: number,
  dest_lat: number,
  dest_lng: number,
  routes_data: any
): RouteResponse
```

### 2. `calculate_trip_cost`
Calculates the financial cost of a trip based on distance, occupancy, and user profile.

**Signature:**
```typescript
calculate_trip_cost(
  distance: number,
  seats: number,
  is_tourist: boolean
): CostResponse
```

**Output Schema:**
```json
{
  "cost_mxn": 58.0,
  "base_price": 29.0,
  "currency": "MXN",
  "gatekeeper_pass": true,
  "seats": 2
}
```

## Financial Logic (2026 Model)

| Profile | Base Price (MXN) | Condition |
| :--- | :--- | :--- |
| **Local** | $20.00 | distance <= 15km |
| **Zone B** | $25.00 | distance > 15km |
| **Tourist** | $29.00 | is_tourist = true |

## Gatekeeper Protocol

The engine returns a `gatekeeper_pass` flag. However, the UI must also verify the local wallet balance using `src/utils/db.ts`.

- **Minimum for Operation:** $5.00 USD.
- **Initial Development Balance:** $10.00 USD (Automatically initialized in IndexedDB).

## Integration Example (React)

```tsx
import init, { calculate_trip_cost } from '/wasm/route-calculator/route_calculator.js';

const handleCalculation = async (dist, seats, tourist) => {
  await init();
  const result = calculate_trip_cost(dist, seats, tourist);
  console.log(`Total: ${result.cost_mxn} MXN`);
};
```
