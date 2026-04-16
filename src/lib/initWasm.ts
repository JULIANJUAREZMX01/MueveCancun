import { WasmLoader, type RouteCalculatorWasm } from '../utils/WasmLoader';

let _initPromise: Promise<boolean> | null = null;

export async function initWasm(): Promise<boolean> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      console.log('[initWasm] Engine initializing...');
      const wasmModule = (await WasmLoader.getModule()) as unknown as RouteCalculatorWasm;

      const response = await fetch('/data/master_routes.optimized.json');
      if (!response.ok) throw new Error('Catalog missing');
      const catalogJson = await response.text();

      if (typeof wasmModule.load_catalog_core === 'function') {
          wasmModule.load_catalog_core(catalogJson);
      } else if (typeof (wasmModule as unknown as Record<string, unknown>).load_catalog === 'function') {
          (wasmModule as unknown as { load_catalog: (j: string) => void }).load_catalog(catalogJson);
      }

      console.log('[initWasm] ✅ ENGINE READY');
      if (typeof window !== 'undefined') {
          (window as unknown as Record<string, boolean>).WASM_READY = true;
      }
      return true;
    } catch (error) {
      console.error('[initWasm] ❌ ERROR:', error);
      _initPromise = null;
      return false;
    }
  })();

  return _initPromise;
}

if (typeof window !== 'undefined') {
    initWasm().catch(() => {});
}
