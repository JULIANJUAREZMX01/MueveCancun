export interface RouteCalculatorModule {
  default(): Promise<void>;
  load_catalog_core(json: string): void;
  find_route_rs(origin: string, dest: string): string;
}

export class WasmLoader {
  private static instance: WasmLoader;
  private wasmModule: RouteCalculatorModule | null = null;
  private loading: Promise<RouteCalculatorModule> | null = null;

  static async getModule(): Promise<RouteCalculatorModule> {
    if (!WasmLoader.instance) {
      WasmLoader.instance = new WasmLoader();
    }
    return WasmLoader.instance.ensureLoaded();
  }

  private async ensureLoaded(): Promise<RouteCalculatorModule> {
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

  private async loadWasm(): Promise<RouteCalculatorModule> {
    try {
        const wasmPath = new URL('/wasm/route-calculator/route_calculator.js', window.location.href).href;
        const module = await import(/* @vite-ignore */ wasmPath);
        await module.default();
        return module as RouteCalculatorModule;
    } catch (e) {
        console.error("Failed to load WASM module", e);
        throw e;
    }
  }
}
