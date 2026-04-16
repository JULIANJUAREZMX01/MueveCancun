/**
 * Runtime Integrity Checker
 * Verifies critical app state during execution
 */

interface IntegrityCheck {
  name: string;
  check: () => boolean | Promise<boolean>;
  critical: boolean;
  fix?: () => void | Promise<void>;
}

class RuntimeIntegrity {
  private static checks: IntegrityCheck[] = [];
  private static results = new Map<string, boolean>();
  private static lastRun: number = 0;
  private static readonly CHECK_INTERVAL = 60000; // 1 minute

  /**
   * Register an integrity check
   */
  static register(check: IntegrityCheck): void {
    this.checks.push(check);
  }

  /**
   * Run all integrity checks
   */
  static async runChecks(): Promise<{ passed: number; failed: number; critical: number }> {
    console.group('🔍 Runtime Integrity Check');

    let passed = 0;
    let failed = 0;
    let critical = 0;

    for (const check of this.checks) {
      try {
        const result = await check.check();
        this.results.set(check.name, result);

        if (result) {
          passed++;
          console.log(`✅ ${check.name}`);
        } else {
          failed++;
          if (check.critical) critical++;
          console.error(`❌ ${check.name} ${check.critical ? '(CRITICAL)' : ''}`);

          // Try to fix if possible
          if (check.fix) {
            console.log(`🔧 Attempting auto-fix for ${check.name}...`);
            try {
              await check.fix();
              // Re-check
              const fixResult = await check.check();
              if (fixResult) {
                console.log(`✅ ${check.name} fixed!`);
                this.results.set(check.name, true);
                passed++;
                failed--;
                if (check.critical) critical--;
              }
            } catch (fixError) {
              console.error(`Failed to fix ${check.name}:`, fixError);
            }
          }
        }
      } catch (error) {
        failed++;
        if (check.critical) critical++;
        console.error(`❌ ${check.name} threw error:`, error);
        this.results.set(check.name, false);
      }
    }

    this.lastRun = Date.now();

    console.log(`\n📊 Summary: ${passed}/${this.checks.length} passed`);
    if (critical > 0) {
      console.error(`⚠️  ${critical} CRITICAL failures detected!`);
    }
    console.groupEnd();

    return { passed, failed, critical };
  }

  /**
   * Get check results
   */
  static getResults(): Map<string, boolean> {
    return new Map(this.results);
  }

  /**
   * Start periodic monitoring
   */
  static startMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Initial check
    this.runChecks();

    // Periodic checks
    setInterval(() => {
      this.runChecks();
    }, this.CHECK_INTERVAL);

    // Check on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - this.lastRun > this.CHECK_INTERVAL) {
        this.runChecks();
      }
    });
  }

  /**
   * Get health score (0-100)
   */
  static getHealthScore(): number {
    if (this.checks.length === 0) return 100;
    const passed = Array.from(this.results.values()).filter(v => v).length;
    return Math.round((passed / this.checks.length) * 100);
  }
}

// Register default checks
if (typeof window !== 'undefined') {
  // Check 1: WASM module loaded
  RuntimeIntegrity.register({
    name: 'WASM Module',
    critical: true,
    check: async () => {
      try {
        const { WasmLoader } = await import('./WasmLoader');
        const module = await WasmLoader.getModule();
        return typeof module.find_route === 'function';
      } catch {
        return false;
      }
    }
  });

  // Check 2: Route data loaded
  RuntimeIntegrity.register({
    name: 'Route Data',
    critical: true,
    check: async () => {
      try {
        const { coordinatesStore } = await import('./CoordinatesStore');
        const db = coordinatesStore.getDB();
        return db !== null && db.size > 0;
      } catch {
        return false;
      }
    }
  });

  // Check 3: Service Worker active
  RuntimeIntegrity.register({
    name: 'Service Worker',
    critical: false,
    check: async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registration = await navigator.serviceWorker.getRegistration();
      return registration !== undefined && registration.active !== null;
    }
  });

  // Check 4: IndexedDB available
  RuntimeIntegrity.register({
    name: 'IndexedDB',
    critical: false,
    check: () => {
      return 'indexedDB' in window;
    }
  });

  // Check 5: LocalStorage available
  RuntimeIntegrity.register({
    name: 'LocalStorage',
    critical: false,
    check: () => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    }
  });

  // Check 6: Geolocation available
  RuntimeIntegrity.register({
    name: 'Geolocation API',
    critical: false,
    check: () => {
      return 'geolocation' in navigator;
    }
  });

  // Check 7: Fetch API available
  RuntimeIntegrity.register({
    name: 'Fetch API',
    critical: true,
    check: () => {
      return typeof fetch === 'function';
    }
  });

  // Check 8: Critical DOM elements
  RuntimeIntegrity.register({
    name: 'Critical DOM',
    critical: false,
    check: () => {
      const requiredElements = [
        'search-btn',
        'origin-input',
        'destination-input'
      ];
      return requiredElements.every(id => document.getElementById(id) !== null);
    }
  });

  // Check 9: Leaflet loaded (for map)
  RuntimeIntegrity.register({
    name: 'Leaflet Library',
    critical: false,
    check: () => {
      return typeof (window as any).L !== 'undefined';
    }
  });

  // Check 10: Network connectivity
  RuntimeIntegrity.register({
    name: 'Network Status',
    critical: false,
    check: () => {
      return navigator.onLine;
    }
  });
}

export { RuntimeIntegrity };
