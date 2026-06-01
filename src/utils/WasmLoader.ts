/**
 * Nexus Prime WASM Loader - Singleton Pattern
 * Previene condiciones de carrera en la inicialización del motor de ruteo.
 * 
 * WASM exports reales (route_calculator.d.ts):
 *   - find_route(origin: string, dest: string): any
 *   - load_catalog(json_payload: string): void
 */

export interface RouteCalculatorWasm {
  find_route(origin: string, dest: string): any;
  load_catalog(json_payload: string): void;
  // Aliases para compatibilidad con código legacy
  calculate_route?: (origin: string, dest: string) => string;
  load_catalog_core?: (json: string) => void;
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
      // Importar el glue JS generado por wasm-pack
      const module = await import('/wasm/route-calculator/route_calculator.js');
      // Inicializar el módulo WASM (carga el .wasm binario)
      await module.default();
      
      // Crear proxy con aliases para compatibilidad
      const wasmModule = module as unknown as RouteCalculatorWasm;
      
      // Alias: calculate_route → find_route (el nombre real del export WASM)
      if (typeof wasmModule.find_route === 'function' && !wasmModule.calculate_route) {
        (wasmModule as any).calculate_route = (origin: string, dest: string) => {
          const result = wasmModule.find_route(origin, dest);
          // find_route retorna objeto JS directamente (externref), no string
          return typeof result === 'string' ? result : JSON.stringify(result);
        };
      }
      
      return wasmModule;
    } catch (err) {
      console.error('[WasmLoader] Failed to load WASM module:', err);
      throw err;
    }
  }
}
