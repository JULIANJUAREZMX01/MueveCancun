import { WasmLoader } from '../utils/WasmLoader';
import { logger } from '../utils/logger';

export async function initWasm() {
  try {
    logger.info('Initializing WASM Route Calculator...');
    const wasmModule = await WasmLoader.getModule();

    // Fetch master routes catalog
    const response = await fetch('/data/master_routes.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch master_routes.json: ${response.statusText}`);
    }

    const catalogJson = await response.text();

    // Load catalog into WASM
    // Note: The specific method name might vary depending on the WASM interface
    // Based on memory, it's load_catalog_core or load_catalog
    if (typeof wasmModule.load_catalog_core === 'function') {
        wasmModule.load_catalog_core(catalogJson);
    } else if (typeof (wasmModule as any).load_catalog === 'function') {
        (wasmModule as any).load_catalog(catalogJson);
    } else {
        throw new Error('WASM module does not have a load_catalog method');
    }

    logger.info('✅ WASM initialized with full catalog');
    window.dispatchEvent(new CustomEvent('wasm-ready'));
    return true;
  } catch (error) {
    logger.error('WASM initialization failed:', error);
    return false;
  }
}

// Auto-initialize when running in browser
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initWasm();
  });
}
