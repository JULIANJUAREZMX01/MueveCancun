#!/usr/bin/env node
// Build estatico para GitHub Pages (ADR-2026-005, fase 1).
//
// El proyecto es SSR: si se le pasa la configuracion actual a Pages, el
// resultado son entradas de servidor y el sitio no se puede publicar. Este
// script aparta temporalmente lo que necesita runtime, construye con
// config/astro.pages.mjs y lo devuelve a su sitio pase lo que pase.
//
// No borra nada: mueve a .pages-stash/ y restaura en `finally`, incluso si el
// build falla o el proceso se interrumpe.

import { spawnSync } from 'node:child_process';
import { access, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import process from 'node:process';

const RAIZ = process.cwd();
const STASH = '.pages-stash';
const BASE = process.env.PAGES_BASE ?? '/MueveCancun';

// Rutas que el build estatico no puede incluir. Cada una tiene su motivo.
const EXCLUIDOS = [
  { ruta: 'src/pages/api', motivo: 'endpoints que escriben en Supabase (reports, tracking, community, init-tables, route-share)' },
  { ruta: 'src/middleware.ts', motivo: 'redirecciones de idioma en servidor: en estatico no hay middleware' },
  { ruta: 'src/pages/healthz.ts', motivo: 'salud del proceso: no existe proceso en Pages' },
];

const existe = async (ruta) => {
  try { await access(ruta, constants.F_OK); return true; } catch { return false; }
};

async function apartar() {
  await mkdir(STASH, { recursive: true });
  const movidos = [];
  for (const item of EXCLUIDOS) {
    if (!(await existe(item.ruta))) continue;
    const destino = `${STASH}/${item.ruta.replaceAll('/', '__')}`;
    await rm(destino, { recursive: true, force: true });
    await rename(item.ruta, destino);
    movidos.push({ ...item, destino });
    console.log(`[pages] apartado ${item.ruta} (${item.motivo})`);
  }
  return movidos;
}

async function restaurar(movidos) {
  for (const item of movidos.reverse()) {
    await rm(item.ruta, { recursive: true, force: true });
    await rename(item.destino, item.ruta);
    console.log(`[pages] restaurado ${item.ruta}`);
  }
  await rm(STASH, { recursive: true, force: true });
}

async function htmls(dir) {
  const salida = [];
  const entradas = await readdir(dir, { withFileTypes: true });
  for (const e of entradas) {
    const ruta = `${dir}/${e.name}`;
    if (e.isDirectory()) salida.push(...await htmls(ruta));
    else if (e.name.endsWith('.html')) salida.push(ruta);
  }
  return salida;
}

// Los enlaces absolutos a raiz ("/es/home") se salen del subdirectorio del
// proyecto en Pages. No rompen el build, pero dejan el sitio roto al navegar.
// Se cuentan y se muestran: es el trabajo real que falta, no un detalle.
async function auditarEnlaces() {
  const archivos = await htmls('dist');
  const absolutos = new Map();
  for (const archivo of archivos) {
    const html = await readFile(archivo, 'utf8');
    for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      const destino = m[1];
      if (destino.startsWith(`${BASE}/`) || destino === BASE) continue;
      absolutos.set(destino.split('?')[0], (absolutos.get(destino.split('?')[0]) ?? 0) + 1);
    }
  }
  const top = [...absolutos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return { total: archivos.length, absolutos: absolutos.size, ejemplos: top };
}

const movidos = await apartar();
let codigo = 0;
try {
  console.log(`[pages] construyendo con base ${BASE}`);
  const r = spawnSync('pnpm', ['exec', 'astro', 'build', '--config', 'config/astro.pages.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, PAGES_BASE: BASE },
  });
  codigo = r.status ?? 1;
} finally {
  await restaurar(movidos);
}

if (codigo !== 0) {
  console.error(`[pages] el build fallo con codigo ${codigo}`);
  process.exit(codigo);
}

const reporte = await auditarEnlaces();
await writeFile('dist/.pages-report.json', JSON.stringify({ base: BASE, ...reporte }, null, 2));

console.log('');
console.log('[pages] build estatico listo');
console.log(`[pages] paginas generadas: ${reporte.total}`);
if (reporte.absolutos > 0) {
  console.warn(`[pages] AVISO: ${reporte.absolutos} enlaces absolutos a raiz no contemplan el base ${BASE}`);
  for (const [ruta, veces] of reporte.ejemplos) console.warn(`[pages]   ${ruta} (${veces})`);
  console.warn('[pages] el sitio publica, pero la navegacion interna necesita import.meta.env.BASE_URL');
} else {
  console.log('[pages] sin enlaces absolutos fuera del base');
}
