export class WasmLoader {
  private static instance: WasmLoader;
  private wasmModule: any = null;
  private loading: Promise<any> | null = null;

  static async getModule() {
    if (!WasmLoader.instance) {
      WasmLoader.instance = new WasmLoader();
    }
    return WasmLoader.instance.ensureLoaded();
  }

  private async ensureLoaded() {
    if (this.wasmModule) return this.wasmModule;
    if (this.loading) return this.loading;

    this.loading = this.loadWasm();
    this.wasmModule = await this.loading;
    this.loading = null;
    return this.wasmModule;
  }

  private async loadWasm() {
    try {
        const wasmPath = new URL('/wasm/route-calculator/route_calculator.js', window.location.href).href;
        const module = await import(/* @vite-ignore */ wasmPath);
        await module.default();
        return module;
    } catch (e) {
        console.error("Failed to load WASM module", e);
        throw e;
    }
  }
}
