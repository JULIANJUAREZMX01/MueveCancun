import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file: string) => fs.existsSync(path.join(root, file));
const config = JSON.parse(read('docs/recovery/capabilities.json')) as { capabilities: Capability[] };

type Status = 'verified' | 'degraded' | 'blocked';
type Capability = { id: string; name: string; promise: string; acceptance: string; owner: string; priority: string };
type Result = Capability & { status: Status; evidence: string; next: string };

const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
const mapSource = read('src/components/InteractiveMap.astro');
const baseMapSource = read('src/utils/baseMap.ts');
const trackingApi = read('src/pages/api/tracking.ts');
const tripTracker = read('src/lib/tripTracker.ts');
const workflow = read('.github/workflows/test.yml');
const catalog = JSON.parse(read('public/data/master_routes.json')) as { rutas?: Array<{ paradas?: Array<{ lat?: unknown; lng?: unknown }> }> };
const routes = catalog.rutas ?? [];
const drawableRoutes = routes.filter(route => (route.paradas ?? []).filter(stop =>
  Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lng)) &&
  Math.abs(Number(stop.lat)) > 0.0001 && Math.abs(Number(stop.lng)) > 0.0001
).length >= 2).length;

const byId = new Map(config.capabilities.map(capability => [capability.id, capability]));
const result = (id: string, status: Status, evidence: string, next: string): Result => ({
  ...byId.get(id)!, status, evidence, next,
});

const results: Result[] = [
  result('CAP-001', packageJson.scripts?.build?.includes('check:css') && exists('src/generated/buildInfo.ts') ? 'verified' : 'blocked',
    'El script build incluye el gate CSS y existe metadata de build.', 'Ejecutar pnpm build en cada PR.'),
  result('CAP-002', mapSource.includes('addBaseMap(L, map') && baseMapSource.includes('showFallback') ? 'degraded' : 'blocked',
    'Hay mapa base online y fallback local; el fallback offline no contiene calles.', 'Entregar tiles/vector base locales antes de prometer mapa de calles 100% offline.'),
  result('CAP-003', mapSource.includes('SHOW_ROUTE_ON_MAP') && mapSource.includes('drawRoute(map') && exists('e2e/verify_map.spec.ts') ? 'verified' : 'blocked',
    'El evento de selección llama al renderer y existe especificación E2E.', 'Mantener verify_map.spec.ts como gate obligatorio.'),
  result('CAP-004', trackingApi.includes("configured?.toLowerCase() === 'true'") && trackingApi.includes("source: 'live'") && trackingApi.includes("source: 'demo'") ? 'degraded' : 'blocked',
    'Los stubs requieren opt-in explícito y cada unidad declara su procedencia; no hay evidencia versionada de una unidad real conectada.', 'Conectar una unidad autorizada y conservar evidencia de source=live con actualización menor a cinco minutos.'),
  result('CAP-005', tripTracker.includes('sendTelemetry(point)') ? (process.env.DATABASE_URL ? 'verified' : 'degraded') : 'blocked',
    process.env.DATABASE_URL ? 'Telemetría inmediata implementada y DATABASE_URL presente.' : 'Telemetría inmediata implementada; DATABASE_URL no está presente en este entorno.',
    'Configurar DATABASE_URL y verificar inserciones/retención en staging.'),
  result('CAP-006', routes.length > 0 && drawableRoutes === routes.length ? 'verified' : 'blocked',
    `${drawableRoutes}/${routes.length} rutas tienen al menos dos coordenadas válidas.`, 'Validar en campo que la geometría corresponda al recorrido operativo real.'),
  result('CAP-007', workflow.includes('playwright install --with-deps chromium') && workflow.includes('e2e/verify_map.spec.ts') && workflow.includes('e2e/tracking-mobile.spec.ts') ? 'verified' : 'degraded',
    'CI instala Chromium; la cobertura crítica debe ejecutar mapa y tracking explícitamente.', 'Conservar capturas y trazas como evidencia de cada PR.'),
];

const symbols: Record<Status, string> = { verified: '✅', degraded: '⚠️', blocked: '❌' };
const counts = Object.fromEntries(['verified', 'degraded', 'blocked'].map(status => [status, results.filter(r => r.status === status).length]));
const markdown = `# Reporte de realidad funcional\n\n> Generado por \`pnpm audit:reality\`. No sustituye validación de campo.\n\n## Resumen\n\n- Verificadas: **${counts.verified}**\n- Degradadas: **${counts.degraded}**\n- Bloqueadas: **${counts.blocked}**\n- Catálogo: **${drawableRoutes}/${routes.length}** rutas con geometría dibujable\n\n## Matriz de capacidades\n\n| ID | Prioridad | Capacidad | Estado | Evidencia | Próximo entregable |\n|---|---|---|---|---|---|\n${results.map(r => `| ${r.id} | ${r.priority} | ${r.name} | ${symbols[r.status]} ${r.status} | ${r.evidence} | ${r.next} |`).join('\n')}\n\n## Regla de comunicación\n\nSolo las capacidades **verificadas** pueden anunciarse sin calificadores. Las degradadas deben explicar su límite y las bloqueadas no deben anunciarse como disponibles.\n`;

fs.writeFileSync(path.join(root, 'docs/recovery/REALITY_REPORT.md'), markdown);
console.log(markdown);
if (results.some(item => item.status === 'blocked')) process.exitCode = 1;
