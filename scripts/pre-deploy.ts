#!/usr/bin/env node
/**
 * Pre-Deploy Verification Script
 * Ensures app is ready for production deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

interface Check {
  name: string;
  run: () => Promise<boolean>;
  critical: boolean;
}

const checks: Check[] = [];
let passed = 0;
let failed = 0;
let criticalFailed = 0;

function addCheck(name: string, critical: boolean, run: () => Promise<boolean>) {
  checks.push({ name, critical, run });
}

// ========== CHECKS ==========

// Check 1: Critical files exist
addCheck('Critical Files Exist', true, async () => {
  const requiredFiles = [
    'src/components/InteractiveMap.astro',
    'src/components/RouteCalculator.astro',
    'src/utils/WasmLoader.ts',
    'src/utils/CoordinatesStore.ts',
    'src/utils/AppInitializer.ts',
    'src/layouts/MainLayout.astro',
    'public/data/master_routes.json',
    'public/manifest.json',
    'astro.config.ts',
    'package.json'
  ];

  const missing = requiredFiles.filter(file => !fs.existsSync(path.join(rootDir, file)));

  if (missing.length > 0) {
    console.error(`  Missing files: ${missing.join(', ')}`);
    return false;
  }

  return true;
});

// Check 2: WASM files present
addCheck('WASM Files Present', true, async () => {
  const wasmFiles = [
    'public/wasm/route-calculator/route_calculator.js',
    'public/wasm/route-calculator/route_calculator_bg.wasm',
    'public/wasm/spatial-index/spatial_index.js',
    'public/wasm/spatial-index/spatial_index_bg.wasm'
  ];

  const missing = wasmFiles.filter(file => !fs.existsSync(path.join(rootDir, file)));

  if (missing.length > 0) {
    console.error(`  Missing WASM files: ${missing.join(', ')}`);
    console.error(`  Run: pnpm run build:wasm`);
    return false;
  }

  return true;
});

// Check 3: Route data files not empty
addCheck('Route Data Valid', true, async () => {
  const dataFile = path.join(rootDir, 'public/data/master_routes.json');

  if (!fs.existsSync(dataFile)) {
    console.error('  master_routes.json not found');
    return false;
  }

  const stats = fs.statSync(dataFile);
  if (stats.size < 1000) {
    console.error(`  master_routes.json too small (${stats.size} bytes)`);
    return false;
  }

  try {
    const content = fs.readFileSync(dataFile, 'utf-8');
    const data = JSON.parse(content);

    if (!data.rutas || !Array.isArray(data.rutas)) {
      console.error('  Invalid data structure: missing rutas array');
      return false;
    }

    if (data.rutas.length === 0) {
      console.error('  No routes found in data');
      return false;
    }

    console.log(`  ✓ ${data.rutas.length} routes loaded`);
    return true;
  } catch (e) {
    console.error('  Failed to parse master_routes.json:', e);
    return false;
  }
});

// Check 4: No invalid imports
addCheck('No Invalid Imports', true, async () => {
  const { stdout } = await execAsync(
    'grep -r "from \\"astro:i18n\\"" src/ || true',
    { cwd: rootDir }
  );

  if (stdout.trim()) {
    console.error('  Found invalid astro:i18n imports:');
    console.error(stdout);
    return false;
  }

  return true;
});

// Check 5: TypeScript compiles
addCheck('TypeScript Compiles', true, async () => {
  try {
    await execAsync('npx tsc --noEmit', { cwd: rootDir });
    return true;
  } catch (e: any) {
    console.error('  TypeScript compilation failed:');
    console.error(e.stdout || e.message);
    return false;
  }
});

// Check 6: Environment variables documented
addCheck('Environment Variables Documented', false, async () => {
  const envExample = path.join(rootDir, '.env.example');

  if (!fs.existsSync(envExample)) {
    console.error('  .env.example not found');
    return false;
  }

  const content = fs.readFileSync(envExample, 'utf-8');
  const requiredVars = [
    'DATABASE_URL',
    'NEON_DATABASE_URL',
    'STRIPE_SECRET_KEY'
  ];

  const missing = requiredVars.filter(v => !content.includes(v));

  if (missing.length > 0) {
    console.error(`  Missing env vars in .env.example: ${missing.join(', ')}`);
    return false;
  }

  return true;
});

// Check 7: Service Worker version updated
addCheck('Service Worker Versioned', false, async () => {
  const swFile = path.join(rootDir, 'src/sw.ts');

  if (!fs.existsSync(swFile)) {
    console.warn('  Service worker not found');
    return true; // Non-critical
  }

  const content = fs.readFileSync(swFile, 'utf-8');
  const versionMatch = content.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);

  if (!versionMatch) {
    console.warn('  Could not find CACHE_VERSION in sw.ts');
    return true; // Non-critical
  }

  console.log(`  ✓ SW version: ${versionMatch[1]}`);
  return true;
});

// Check 8: Public assets present
addCheck('Public Assets Present', false, async () => {
  const assets = [
    'public/logo.png',
    'public/robots.txt',
    'public/icons/pwa-192x192.png',
    'public/icons/pwa-512x512.png'
  ];

  const missing = assets.filter(file => !fs.existsSync(path.join(rootDir, file)));

  if (missing.length > 0) {
    console.warn(`  Missing assets: ${missing.join(', ')}`);
    return false;
  }

  return true;
});

// Check 9: OG image exists and is not placeholder
addCheck('OG Image Valid', false, async () => {
  const ogImage = path.join(rootDir, 'public/og-image.png');

  if (!fs.existsSync(ogImage)) {
    console.warn('  og-image.png not found');
    return false;
  }

  const stats = fs.statSync(ogImage);
  if (stats.size < 1000) {
    console.warn(`  og-image.png is too small (${stats.size} bytes) - likely a placeholder`);
    return false;
  }

  console.log(`  ✓ OG image: ${(stats.size / 1024).toFixed(1)}KB`);
  return true;
});

// Check 10: No console.log in production code
addCheck('No Debug Logs in Critical Paths', false, async () => {
  const { stdout } = await execAsync(
    'grep -n "console.log" src/components/RouteCalculator.astro src/components/InteractiveMap.astro || true',
    { cwd: rootDir }
  );

  if (stdout.trim()) {
    console.warn('  Found console.log in critical components (consider removing for production)');
    // Not a failure, just a warning
  }

  return true;
});

// ========== RUN CHECKS ==========

async function runAllChecks() {
  console.log('🚀 Pre-Deploy Verification\n');
  console.log('='.repeat(60));

  for (const check of checks) {
    process.stdout.write(`${check.critical ? '🔴' : '🟡'} ${check.name}... `);

    try {
      const result = await check.run();

      if (result) {
        console.log('✅ PASS');
        passed++;
      } else {
        console.log('❌ FAIL');
        failed++;
        if (check.critical) criticalFailed++;
      }
    } catch (error) {
      console.log('❌ ERROR');
      console.error(`  ${error}`);
      failed++;
      if (check.critical) criticalFailed++;
    }
  }

  console.log('='.repeat(60));
  console.log(`\n📊 Results: ${passed}/${checks.length} passed`);

  if (criticalFailed > 0) {
    console.error(`\n❌ ${criticalFailed} CRITICAL check(s) failed!`);
    console.error('⛔ DEPLOYMENT BLOCKED\n');
    process.exit(1);
  }

  if (failed > 0) {
    console.warn(`\n⚠️  ${failed} non-critical check(s) failed`);
    console.warn('⚠️  Deployment allowed but issues should be addressed\n');
    process.exit(0);
  }

  console.log('\n✅ ALL CHECKS PASSED');
  console.log('🚀 Ready for deployment!\n');
  process.exit(0);
}

runAllChecks();
