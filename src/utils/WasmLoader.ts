/**
 * Nexus Prime WASM Loader - Singleton Pattern
 * Previene condiciones de carrera en la inicialización del motor de ruteo.
 *
 * WASM exports reales (route_calculator.d.ts):
 *   - find_route(origin: string, dest: string): unknown
 *   - load_catalog(json_payload: string): void
 */

export interface RouteCalculatorWasm {
  find_route(origin: string, dest: string): unknown;
  load_catalog(json_payload: string): void;
  // Alias de compatibilidad (añadido en runtime por el loader)
  calculate_route?: (origin: string, dest: string) => string;
}

type WasmModuleRaw = RouteCalculatorWasm & {
  default?: () => Promise<void>;
  [key: string]: unknown;
};

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
      // Importar el glue JS generado por wasm-pack
      const module = await import('/wasm/route-calculator/route_calculator.js') as WasmModuleRaw;
      // Inicializar el módulo WASM (carga el .wasm binario)
      if (typeof module.default === 'function') {
        await module.default();
      }

      // Alias: calculate_route → find_route para compatibilidad con código legacy
      if (typeof module.find_route === 'function' && !module.calculate_route) {
        module.calculate_route = (origin: string, dest: string): string => {
          const result = module.find_route(origin, dest);
          return typeof result === 'string' ? result : JSON.stringify(result);
        };
      }

      return module;
    } catch (err) {
      console.error('[WasmLoader] Failed to load WASM module:', err);
      throw err;
    }
  }
}
