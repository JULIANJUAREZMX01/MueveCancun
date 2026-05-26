/**
 * Nexus Prime WASM Loader - Singleton Pattern
 * Previene condiciones de carrera en la inicialización del motor de ruteo.
 */

export interface RouteCalculatorWasm {
  load_catalog_core(json: string): void;
  load_catalog(json: string): void;
  calculate_route(origin: string, dest: string): string;
  match_stop(query: string): string;
}

export class WasmLoader {
  private static instance: WasmLoader;
  private wasmModule: RouteCalculatorWasm | null = null;
  private loadingPromise: Promise<RouteCalculatorWasm> | null = null;

  private constructor() {}

  static async getModule(): Promise<RouteCalculatorWasm> {
    if (!WasmLoader.instance) {
      WasmLoader.instance = new WasmLoader();
    }
    return WasmLoader.instance.ensureLoaded();
  }

  private async ensureLoaded(): Promise<RouteCalculatorWasm> {
    if (this.wasmModule) return this.wasmModule;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this.loadWasm();
    try {
      this.wasmModule = await this.loadingPromise;
      return this.wasmModule;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async loadWasm(): Promise<RouteCalculatorWasm> {
    try {
      // Importamos el pegamento JS generado por wasm-pack
      const module = await import('/wasm/route-calculator/route_calculator.js');
      // Inicializamos el módulo WASM
      await module.default();
      return module as unknown as RouteCalculatorWasm;
    } catch (err) {
      console.error('[WasmLoader] Failed to load WASM module:', err);
      throw err;
    }
  }
}
