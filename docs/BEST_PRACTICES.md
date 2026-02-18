# Best Practices Guide - Rust/WASM + TypeScript + Astro

**For:** MueveCancun PWA Development  
**Date:** 2026-02-18  
**Audience:** Developers working with Rust/WASM in Astro projects

---

## Table of Contents

1. [WASM Integration](#wasm-integration)
2. [TypeScript Quality](#typescript-quality)
3. [File Organization](#file-organization)
4. [Testing Strategy](#testing-strategy)
5. [Git Hygiene](#git-hygiene)
6. [Build Process](#build-process)
7. [Common Pitfalls](#common-pitfalls)

---

## WASM Integration

### ✅ Correct Pattern: Public Directory for WASM

**DO:**
```
/public/wasm/
├── route-calculator/
│   ├── route_calculator.js
│   ├── route_calculator.d.ts
│   └── route_calculator_bg.wasm
└── spatial-index/
    ├── spatial_index.js
    ├── spatial_index.d.ts
    └── spatial_index_bg.wasm
```

**In Components:**
```typescript
// ✅ Correct: Load from /wasm/ (served from public/)
const wasmPath = new URL('/wasm/route-calculator/route_calculator.js', window.location.href).href;
const module = await import(wasmPath);
await module.default();
```

**DON'T:**
```
❌ /src/wasm/  <- Don't duplicate WASM here
❌ import from '../wasm/...'  <- Won't work in production
❌ import from '@/wasm/...'  <- Vite won't bundle WASM from src
```

**Why:**
- Vite/Astro serves static assets from `public/`
- WASM files are binary and should be served, not bundled
- TypeScript definitions can live anywhere, but binaries must be in `public/`

---

### Singleton WASM Loader Pattern

To prevent race conditions when multiple components load WASM:

```typescript
// src/utils/WasmLoader.ts
class WasmLoader {
  private static routeCalculator: any = null;
  private static loading: Promise<any> | null = null;

  static async getRouteCalculator() {
    // Return cached instance
    if (this.routeCalculator) {
      return this.routeCalculator;
    }

    // Return existing loading promise
    if (this.loading) {
      return this.loading;
    }

    // Start loading
    this.loading = this.loadModule();
    this.routeCalculator = await this.loading;
    this.loading = null;
    
    return this.routeCalculator;
  }

  private static async loadModule() {
    try {
      const module = await import('/wasm/route-calculator/route_calculator.js');
      await module.default(); // Initialize WASM
      return module;
    } catch (error) {
      console.error('Failed to load WASM module:', error);
      throw error;
    }
  }
}

// Usage in components
const calculator = await WasmLoader.getRouteCalculator();
const result = calculator.calculate_route(from, to, routesData);
```

**Benefits:**
- Single initialization across all components
- No race conditions
- Error handling in one place
- Easy to add retry logic

---

## TypeScript Quality

### Strict Typing Over `any`

**DON'T:**
```typescript
❌ function processRoute(data: any) { ... }
❌ const routes: any[] = JSON.parse(...);
❌ let result: any;
```

**DO:**
```typescript
// Define interfaces for all data structures
interface Stop {
  nombre: string;
  lat: number;
  lng: number;
  orden: number;
}

interface Route {
  id: string;
  nombre: string;
  tarifa: number;
  paradas: Stop[];
  tipo: TransportType;
}

interface RouteData {
  version: string;
  metadata: {
    last_updated: string;
    source: string;
  };
  routes: Route[];
}

// Use strict typing
function processRoute(data: RouteData): Route[] {
  return data.routes.filter(r => r.tarifa > 0);
}

// For JSON parsing, validate with Zod or type guards
import { z } from 'zod';

const RouteSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  tarifa: z.number(),
  paradas: z.array(StopSchema),
});

const parsedRoute = RouteSchema.parse(jsonData);
```

**Benefits:**
- Catch errors at compile time
- Better IDE autocomplete
- Self-documenting code
- Refactoring safety

---

### Type Guard Pattern for WASM Responses

```typescript
// WASM returns JsValue which needs validation
interface WasmRouteResult {
  success: boolean;
  route?: {
    steps: string[];
    distance: number;
    cost: number;
  };
  error?: string;
}

function isWasmRouteResult(value: unknown): value is WasmRouteResult {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as any;
  return typeof obj.success === 'boolean';
}

// Usage
const rawResult = calculator.calculate_route(from, to, data);
if (!isWasmRouteResult(rawResult)) {
  throw new Error('Invalid WASM response');
}

if (rawResult.success && rawResult.route) {
  displayRoute(rawResult.route);
}
```

---

## File Organization

### Recommended Structure

```
/
├── public/               # Static assets
│   ├── wasm/            # WASM binaries (served directly)
│   ├── data/            # JSON data files
│   └── assets/          # Images, fonts, etc.
│
├── src/
│   ├── components/      # Astro/UI components
│   ├── layouts/         # Page layouts
│   ├── pages/          # Astro pages (routes)
│   ├── utils/          # Utilities (pure functions)
│   │   ├── geometry.ts     # Spatial calculations
│   │   ├── format.ts       # Formatting helpers
│   │   ├── validation.ts   # Input validation
│   │   ├── WasmLoader.ts   # WASM singleton
│   │   └── i18n.ts         # Internationalization
│   ├── lib/            # Business logic
│   │   ├── CoordinatesStore.ts
│   │   └── SpatialHash.ts
│   ├── tests/          # Unit tests (colocated with src)
│   └── types.ts        # Shared TypeScript types
│
├── tests/              # Integration & verification tests
│   ├── integration/    # Integration tests
│   │   ├── smoke_test.mjs
│   │   └── test-wasm.mjs
│   └── verification/   # UI verification scripts
│       └── verify_*.py
│
├── scripts/            # Build and utility scripts
│   ├── build-wasm.mjs      # WASM compilation
│   ├── check-wasm.cjs      # WASM verification
│   └── listener/           # Data listener scripts
│
├── docs/               # Documentation
│   ├── ARCHITECTURE.md
│   ├── CLEANUP_REPORT.md
│   └── BEST_PRACTICES.md (this file)
│
└── rust-wasm/          # Rust source code
    ├── route-calculator/
    ├── spatial-index/
    └── shared-types/
```

**Guidelines:**
- `/src/utils/`: Pure functions, no side effects
- `/src/lib/`: Stateful logic, classes, stores
- `/tests/`: All tests outside src (except unit tests)
- `/docs/`: All documentation in one place
- `/public/`: Only static assets that are served directly

---

## Testing Strategy

### Three-Tier Testing

1. **Unit Tests** (`/src/tests/`)
   - Test individual functions
   - Fast, no external dependencies
   - Run with: `npm test`

2. **Integration Tests** (`/tests/integration/`)
   - Test WASM integration
   - Test API endpoints
   - Test data processing
   - Run with: `node tests/integration/test-wasm.mjs`

3. **Verification Tests** (`/tests/verification/`)
   - Visual UI verification (Playwright/Selenium)
   - User flow testing
   - Run with: `python tests/verification/verify_home.py`

### WASM Testing Example

```javascript
// tests/integration/test-wasm.mjs
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testWasmCalculator() {
  // Load WASM module
  const modulePath = path.resolve(__dirname, '../../public/wasm/route-calculator/route_calculator.js');
  const module = await import(modulePath);
  await module.default();

  // Test with sample data
  const testRoute = {
    routes: [
      { id: "R1", paradas: [/* ... */] }
    ]
  };

  const result = module.calculate_route(
    "Plaza Las Américas",
    "Zona Hotelera",
    testRoute
  );

  console.assert(result.success, 'Route calculation should succeed');
  console.assert(result.route.steps.length > 0, 'Should return route steps');
  
  console.log('✅ WASM tests passed');
}

testWasmCalculator().catch(console.error);
```

---

## Git Hygiene

### .gitignore Best Practices

**Use Patterns, Not Specific Files:**

```gitignore
# ✅ Good: Patterns
*_snapshot.html
*_content.md
snapshot_*.png
*.log

# ❌ Bad: Specific files
home_snapshot.html
mapa_snapshot.html
server_log.txt
```

**Comprehensive Categories:**

```gitignore
# AI Agent Artifacts
.agent
.agent_context
.Jules
.cursor
.copilot

# Development Artifacts
*_snapshot.*
*_content.*
*.tmp
tmp/

# Logs
*.log
logs/
server_log.txt
preview_output.txt

# WASM Duplication Prevention
/src/wasm/

# Build Outputs
dist/
.astro/
target/
```

### Commit Message Convention

```bash
# ✅ Good commits
git commit -m "fix: Remove duplicate WASM binaries from src/wasm"
git commit -m "refactor: Organize test files into tests/ directory"
git commit -m "docs: Add comprehensive cleanup report"

# ❌ Bad commits
git commit -m "fixed stuff"
git commit -m "updates"
git commit -m "WIP"
```

**Format:** `<type>: <description>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `docs`: Documentation
- `test`: Adding tests
- `chore`: Maintenance tasks
- `perf`: Performance improvement

---

## Build Process

### WASM Build Script Structure

```javascript
// scripts/build-wasm.mjs
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const modules = ['route-calculator', 'spatial-index'];

modules.forEach(mod => {
  const sourceDir = path.join(rootDir, 'rust-wasm', mod);
  const outputDir = path.join(rootDir, 'public', 'wasm', mod);

  // Clean output directory
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  // Build with wasm-pack
  execSync(`wasm-pack build --target web --out-dir ${outputDir}`, {
    cwd: sourceDir,
    stdio: 'inherit'
  });

  // Clean up unnecessary files
  const gitignorePath = path.join(outputDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    fs.unlinkSync(gitignorePath);
  }

  console.log(`✅ ${mod} built successfully`);
});
```

**Key Points:**
- Build to **ONE** location: `/public/wasm/`
- Clean before building
- Remove wasm-pack's .gitignore (conflicts with ours)
- Use `--target web` for browser compatibility
- Check for wasm-pack availability with graceful fallback

---

## Common Pitfalls

### 1. ❌ Duplicating WASM Binaries

**Problem:**
```
❌ /src/wasm/route_calculator.wasm    (122 KB)
❌ /public/wasm/route_calculator.wasm (122 KB)
   = 244 KB wasted
```

**Solution:**
- Only build to `/public/wasm/`
- Add `/src/wasm/` to `.gitignore`

---

### 2. ❌ Hardcoded Strings

**Problem:**
```typescript
❌ <h1>Encuentra tu Ruta</h1>
❌ return "No route found";
```

**Solution:**
```typescript
✅ import { t } from '@/utils/i18n';
✅ <h1>{t('route.find_your_route')}</h1>
✅ return t('route.not_found');
```

---

### 3. ❌ Multiple WASM Initializations

**Problem:**
```typescript
// Component A
const module = await import('/wasm/...');
await module.default(); // Init 1

// Component B
const module = await import('/wasm/...');
await module.default(); // Init 2 (race!)
```

**Solution:**
```typescript
✅ Use WasmLoader singleton (see above)
```

---

### 4. ❌ Untyped JSON Data

**Problem:**
```typescript
❌ const routes = await fetch('/data/routes.json').then(r => r.json());
   // routes is 'any'
```

**Solution:**
```typescript
✅ interface RoutesData { ... }
✅ const response = await fetch('/data/routes.json');
✅ const routes: RoutesData = await response.json();
✅ // Or validate with Zod
```

---

### 5. ❌ Test Files in Root

**Problem:**
```
❌ /test-wasm.mjs
❌ /verify_ui.mjs
❌ /smoke_test.mjs
```

**Solution:**
```
✅ /tests/integration/test-wasm.mjs
✅ /tests/verification/verify_ui.mjs
✅ /tests/integration/smoke_test.mjs
```

---

## Quick Reference Checklist

Before committing:

- [ ] No `any` types added
- [ ] No hardcoded strings (use i18n)
- [ ] WASM only in `/public/wasm/`
- [ ] Tests in `/tests/` directory
- [ ] No snapshot/log files committed
- [ ] `.gitignore` updated if new temp files created
- [ ] Build script tested (`npm run build`)
- [ ] Commit message follows convention

---

## Resources

- **Astro Docs:** https://docs.astro.build
- **wasm-pack Guide:** https://rustwasm.github.io/wasm-pack/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **This Project's Docs:**
  - `README.md` - Project overview
  - `docs/ARCHITECTURE.md` - System architecture
  - `docs/CLEANUP_REPORT.md` - Repository cleanup analysis
  - `TECH_DEBT.md` - Current technical debt

---

**Last Updated:** 2026-02-18  
**Maintainer:** Development Team
