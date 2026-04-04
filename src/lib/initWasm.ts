import { WasmLoader } from '../utils/WasmLoader';

let _initPromise: Promise<boolean> | null = null;

export async function initWasm() {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      console.log('[initWasm] Engine initializing...');
      const wasmModule = await WasmLoader.getModule();

      const response = await fetch('/data/master_routes.optimized.json');
      if (!response.ok) throw new Error('Catalog missing');
      const catalogJson = await response.text();

      if (typeof wasmModule.load_catalog_core === 'function') {
          wasmModule.load_catalog_core(catalogJson);
      } else if (typeof (wasmModule as any).load_catalog === 'function') {
          (wasmModule as any).load_catalog(catalogJson);
      }

      console.log('[initWasm] ✅ ENGINE READY');
      (window as any).WASM_READY = true;
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
