#!/usr/bin/env node
// Build estatico para GitHub Pages (ADR-2026-005, fase 1).
//
// El proyecto es SSR. Este script aparta temporalmente lo que necesita runtime
// (endpoints, middleware y el endpoint de salud), construye con
// config/astro.pages.mjs y lo devuelve a su sitio pase lo que pase.
//
// No borra nada: mueve a .pages-stash/ y restaura en `finally`.
//
// Ademas reporta la cobertura real: que paginas quedaron prerenderizadas y
// cuantas siguen necesitando servidor. Publicar sin ese dato seria servir un
// sitio incompleto sin avisar.

import { spawnSync } from 'node:child_process';
import { access, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import process from 'node:process';

const STASH = '.pages-stash';
const BASE = (process.env.PAGES_BASE ?? '/MueveCancun').replace(/\/+$/, '');

const EXCLUIDOS = [
  { ruta: 'src/pages/api', motivo: 'endpoints que escriben en Supabase' },
  { ruta: 'src/middleware.ts', motivo: 'redirecciones de idioma en servidor' },
  { ruta: 'src/pages/healthz.ts', motivo: 'salud del proceso' },
];

// Rutas que el sitio publico deberia tener. Si falta alguna, el despliegue no
// se da por bueno.
const CLAVE = ['index.html', 'es/home/index.html', 'es/rutas/index.html'];

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
  if (!(await existe(dir))) return [];
  const salida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const ruta = `${dir}/${e.name}`;
    if (e.isDirectory()) salida.push(...await htmls(ruta));
    else if (e.name.endsWith('.html')) salida.push(ruta);
  }
  return salida;
}

// Con adaptador, Astro separa el sitio publicable en dist/client.
async function dirPublicable() {
  if (await existe('dist/client/index.html')) return 'dist/client';
  if (await existe('dist/index.html')) return 'dist';
  return 'dist/client';
}

async function auditar(dir) {
  const archivos = await htmls(dir);
  const relativos = archivos.map((a) => a.slice(dir.length + 1));
  const absolutos = new Map();
  for (const archivo of archivos) {
    const html = await readFile(archivo, 'utf8');
    for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      const destino = m[1].split('?')[0];
      if (destino.startsWith(`${BASE}/`) || destino === BASE) continue;
      const entrada = absolutos.get(destino) ?? { veces: 0, archivos: new Set() };
      entrada.veces += 1;
      entrada.archivos.add(archivo.slice(dir.length + 1));
      absolutos.set(destino, entrada);
    }
  }
  return {
    paginas: relativos.length,
    clave: Object.fromEntries(CLAVE.map((r) => [r, relativos.includes(r)])),
    enlaces_absolutos: absolutos.size,
    ejemplos: [...absolutos.entries()]
      .sort((a, b) => b[1].veces - a[1].veces)
      .slice(0, 10)
      .map(([ruta, v]) => [ruta, v.veces, [...v.archivos].slice(0, 3)]),
    muestra: relativos.slice(0, 20),
  };
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

const dir = await dirPublicable();
const reporte = { base: BASE, dir, ...await auditar(dir) };
await writeFile(`${dir}/.pages-report.json`, JSON.stringify(reporte, null, 2));

console.log('');
console.log(`[pages] sitio publicable: ${dir} (${reporte.paginas} paginas)`);
for (const [ruta, hay] of Object.entries(reporte.clave)) {
  console.log(`[pages] ${hay ? 'OK   ' : 'FALTA'} ${ruta}`);
}
if (reporte.enlaces_absolutos > 0) {
  console.warn(`[pages] ${reporte.enlaces_absolutos} enlaces absolutos a raiz no contemplan el base ${BASE}`);
  for (const [ruta, veces, archivos] of reporte.ejemplos) console.warn(`[pages]   ${ruta} (${veces}) en ${archivos.join(', ')}`);
}
