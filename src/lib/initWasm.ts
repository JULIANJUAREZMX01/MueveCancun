import { WasmLoader } from '../utils/WasmLoader';
import { logger } from '../utils/logger';
import { showToast } from '../utils/toast';

export async function initWasm() {
  try {
    logger.info('Initializing WASM Route Calculator...');

    // WasmLoader.getModule() now has a 5s timeout internally
    const wasmModule = await WasmLoader.getModule();

    // Fetch master routes catalog
    const response = await fetch('/data/master_routes.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch master_routes.json: ${response.statusText}`);
    }

    const catalogJson = await response.text();

    // Load catalog into WASM
    if (typeof wasmModule.load_catalog_core === 'function') {
        wasmModule.load_catalog_core(catalogJson);
    } else if (typeof (wasmModule as any).load_catalog === 'function') {
        (wasmModule as any).load_catalog(catalogJson);
    } else {
        throw new Error('WASM module does not have a load_catalog method');
    }

    logger.info('✅ WASM initialized with full catalog');
    window.dispatchEvent(new CustomEvent('wasm-ready', { detail: { success: true } }));
    return true;
  } catch (error) {
    logger.error('WASM initialization failed:', error);

    // Compatibility mode fallback
    showToast("Modo compatibilidad activado", "info");

    window.dispatchEvent(new CustomEvent('wasm-ready', { detail: { success: false, error } }));
    return false;
  }
}

// Auto-initialize when running in browser
if (typeof window !== 'undefined') {
  // Use 'page-load' for Astro View Transitions if applicable,
  // but initWasm should only run once ideally.
  // We keep DOMContentLoaded as it's the standard for static sites.
  window.addEventListener('DOMContentLoaded', () => {
    initWasm();
  });
}
