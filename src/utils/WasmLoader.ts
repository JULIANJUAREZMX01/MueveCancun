/** Minimal interface for the route-calculator WASM module exports. */
export interface RouteCalculatorWasm {
  default(): Promise<void>;
  validate_operator_funds(balance: number): boolean;
  load_catalog(json_payload: string): void;
  get_route_by_id(id: string): string;
  get_all_routes(): string;
  find_route(origin: string, dest: string): string;
}

export class WasmLoader {
  private static instance: WasmLoader;
  private wasmModule: RouteCalculatorWasm | null = null;
  private loading: Promise<RouteCalculatorWasm> | null = null;

  static async getModule(): Promise<RouteCalculatorWasm> {
    if (!WasmLoader.instance) {
      WasmLoader.instance = new WasmLoader();
    }
    return WasmLoader.instance.ensureLoaded();
  }

  private async ensureLoaded(): Promise<RouteCalculatorWasm> {
    if (this.wasmModule) return this.wasmModule;
    if (this.loading) return this.loading;

    this.loading = this.loadWasm();
    try {
      const module = await this.loading;
      this.wasmModule = module;
      return this.wasmModule;
    } finally {
      this.loading = null;
    }
  }

  private async loadWasm(): Promise<RouteCalculatorWasm> {
    try {
        const wasmPath = new URL('/wasm/route-calculator/route_calculator.js', window.location.href).href;
        const module = await import(/* @vite-ignore */ wasmPath) as RouteCalculatorWasm;
        await module.default();
        return module;
    } catch (e) {
        console.error("Failed to load WASM module", e);
        throw e;
    }
  }
}
