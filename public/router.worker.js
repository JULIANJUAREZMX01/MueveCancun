/**
 * Mueve Reparto — Router WebWorker
 * Ejecuta el motor Rust/WASM en un hilo separado para no bloquear la UI.
 *
 * Mensajes entrantes:
 *   { type: 'OPTIMIZE_ROUTE', stops: Stop[], origin: { lat, lng } }
 *
 * Mensajes salientes:
 *   { type: 'OPTIMIZATION_COMPLETE', indices: number[], distanceKm: number, timeMin: number }
 *   { type: 'OPTIMIZATION_ERROR', error: string }
 */

let wasmReady = false;
let RouteOptimizer = null;

async function loadWasm() {
  if (wasmReady) return;
  try {
    // El modulo WASM ya existe en public/wasm/route-calculator/
    const { default: init, RouteOptimizer: Optimizer } =
      await import('/wasm/route-calculator/route_calculator.js');
    await init();
    RouteOptimizer = Optimizer;
    wasmReady = true;
  } catch (err) {
    throw new Error(`WASM load failed: ${err.message}`);
  }
}

self.onmessage = async (event) => {
  const { type, stops, origin } = event.data;

  if (type !== 'OPTIMIZE_ROUTE') return;

  try {
    await loadWasm();

    const optimizer = new RouteOptimizer();
    for (const stop of stops) {
      optimizer.add_stop(stop.id, stop.lat, stop.lng);
    }

    const result = optimizer.optimize_route(origin.lat, origin.lng);

    // result esperado: { indices: number[], distance_km: number, time_min: number }
    self.postMessage({
      type: 'OPTIMIZATION_COMPLETE',
      indices: result.indices ?? result,
      distanceKm: result.distance_km ?? 0,
      timeMin: result.time_min ?? 0,
    });
  } catch (err) {
    self.postMessage({
      type: 'OPTIMIZATION_ERROR',
      error: err.message,
    });
  }
};
