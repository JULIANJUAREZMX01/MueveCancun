/**
 * MueveCancún - App Initialization System
 * Ensures WASM + Data + UI are ready before user interaction
 */

import { WasmLoader } from './WasmLoader';
import { coordinatesStore } from './CoordinatesStore';

interface InitStatus {
  wasm: boolean;
  data: boolean;
  ui: boolean;
  error?: string;
}

class AppInitializer {
  private static status: InitStatus = {
    wasm: false,
    data: false,
    ui: false
  };

  private static listeners: Array<(status: InitStatus) => void> = [];

  /**
   * Initialize complete app stack
   */
  static async init(): Promise<void> {
    console.log('🚀 MueveCancún initializing...');

    try {
      // 1. Load WASM engine
      await this.initWasm();

      // 2. Load route data
      await this.initData();

      // 3. Setup UI
      await this.initUI();

      console.log('✅ MueveCancún ready!');
      this.notifyListeners();
    } catch (error) {
      const err = error as Error;
      console.error('❌ Initialization failed:', err);
      this.status.error = err.message;
      this.notifyListeners();
      throw error;
    }
  }

  private static async initWasm(): Promise<void> {
    console.log('📦 Loading WASM engine...');
    const startTime = performance.now();

    try {
      const module = await WasmLoader.getModule();

      // Verify critical functions
      if (typeof module.find_route !== 'function') {
        throw new Error('WASM module missing find_route function');
      }
      if (typeof module.load_catalog !== 'function') {
        throw new Error('WASM module missing load_catalog function');
      }

      this.status.wasm = true;
      const duration = performance.now() - startTime;
      console.log(`✅ WASM loaded in ${duration.toFixed(0)}ms`);
    } catch (error) {
      console.error('Failed to load WASM:', error);
      throw error;
    }
  }

  private static async initData(): Promise<void> {
    console.log('📊 Loading route data...');
    const startTime = performance.now();

    try {
      const module = await WasmLoader.getModule();
      const { text: catalogString } = await coordinatesStore.init();

      if (!catalogString || catalogString.length === 0) {
        throw new Error('Empty catalog data');
      }

      module.load_catalog(catalogString);

      this.status.data = true;
      const duration = performance.now() - startTime;
      const sizeMB = (catalogString.length / 1024 / 1024).toFixed(2);
      console.log(`✅ Data loaded in ${duration.toFixed(0)}ms (${sizeMB}MB)`);
    } catch (error) {
      console.error('Failed to load data:', error);
      throw error;
    }
  }

  private static async initUI(): Promise<void> {
    console.log('🎨 Initializing UI...');

    try {
      // Wait for DOM ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Enable calculator button
      const searchBtn = document.getElementById('search-btn');
      if (searchBtn) {
        searchBtn.removeAttribute('disabled');
        (searchBtn as HTMLButtonElement).disabled = false;
      }

      // Update status text
      const btnText = document.getElementById('btn-text');
      if (btnText) {
        btnText.textContent = 'CALCULAR RUTA';
      }

      // Hide loading overlay
      const loader = document.querySelector('.app-loader');
      if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => loader.remove(), 300);
      }

      this.status.ui = true;
      console.log('✅ UI ready');
    } catch (error) {
      console.error('Failed to initialize UI:', error);
      throw error;
    }
  }

  /**
   * Check if app is ready
   */
  static isReady(): boolean {
    return this.status.wasm && this.status.data && this.status.ui;
  }

  /**
   * Get initialization status
   */
  static getStatus(): InitStatus {
    return { ...this.status };
  }

  /**
   * Subscribe to status changes
   */
  static onStatusChange(callback: (status: InitStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private static notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.getStatus()));
  }

  /**
   * Reset initialization state (for dev/testing)
   */
  static reset(): void {
    this.status = { wasm: false, data: false, ui: false };
    WasmLoader.reset();
  }
}

// Auto-initialize on page load
if (typeof window !== 'undefined') {
  // Start initialization immediately
  AppInitializer.init().catch(error => {
    console.error('App initialization failed:', error);

    // Show user-friendly error
    const errorDiv = document.createElement('div');
    errorDiv.className = 'init-error';
    errorDiv.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                  background: #fee; border: 2px solid #c00; border-radius: 12px;
                  padding: 2rem; max-width: 400px; text-align: center; z-index: 9999;">
        <h2 style="color: #c00; margin: 0 0 1rem;">⚠️ Error de Inicialización</h2>
        <p style="margin: 0 0 1rem; color: #333;">No se pudo cargar la aplicación. Por favor recarga la página.</p>
        <button onclick="location.reload()"
                style="background: #c00; color: white; border: none; padding: 0.75rem 1.5rem;
                       border-radius: 8px; font-weight: bold; cursor: pointer;">
          Recargar Página
        </button>
      </div>
    `;
    document.body.appendChild(errorDiv);
  });
}

export { AppInitializer };
export type { InitStatus };
