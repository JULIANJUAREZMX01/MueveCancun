// Mock WASM implementation to allow the app to run without Rust compiler
export default async function init() {
  console.log("Mock WASM initialized");
  return Promise.resolve();
}

export function calculate_route(from, to) {
  console.log(`Mock routing from ${from} to ${to}`);
  return {
    route_id: "R1",
    total_time: 25,
    total_cost: 13.0,
    steps: [
      {
        instruction: `Toma la ruta R1 desde ${from}`,
        route: "R1",
        duration: 25
      }
    ]
  };
}

export function find_nearest_stop(lat, lng, stops) {
  console.log("Mock finding nearest stop");
  if (!stops || stops.length === 0) return null;
  return {
    stop: stops[0],
    distance_meters: 500
  };
}
