/**
 * jules-delegate.mjs — Script para delegación manual de tareas a Jules.
 *
 * Invocado por el workflow jules-delegation.yml.
 *
 * Variables de entorno requeridas:
 *   JULES_API_KEY    — Clave de API Jules
 *   JULES_TASK       — Descripción de la tarea a ejecutar
 *   TARGET_BRANCH    — Rama base (default: main)
 *   AUTHOR_MODE      — CO_AUTHORED | JULES | USER_ONLY (default: CO_AUTHORED)
 *   OPEN_PR          — "true" | "false" (default: true)
 *   FILE_FILTER      — Glob patterns separados por coma (opcional)
 *   TRIGGERED_BY     — Actor de GitHub que disparó el workflow
 *   RUN_ID           — ID del run de GitHub Actions
 */

import { createJulesSession } from './jules-api.mjs';

const rawTask = process.env.JULES_TASK || '';
const branch = process.env.TARGET_BRANCH || 'main';
const authorMode = process.env.AUTHOR_MODE || 'CO_AUTHORED';
const openPR = process.env.OPEN_PR !== 'false';
const filterStr = process.env.FILE_FILTER || '';
const fileFilter = filterStr
  ? filterStr.split(',').map((s) => s.trim()).filter(Boolean)
  : [];
const triggeredBy = process.env.TRIGGERED_BY || 'workflow_dispatch';
const runId = process.env.RUN_ID || '';

if (!rawTask) {
  console.error('❌ JULES_TASK is required');
  process.exit(1);
}

const task = `
## Jules Delegation — MueveCancun

### Task
${rawTask}

### Project Context
- PWA offline-first para transporte público en Cancún.
- Stack: Astro SSG + Rust/WASM + Leaflet + IndexedDB.
- Motor de ruteo: \`rust-wasm/route-calculator/src/lib.rs\` (compilado a WASM).
- Datos de rutas: \`public/data/master_routes.json\`.
- UI: \`src/components/\` y \`src/pages/\`.
- Tests: Vitest para TS (\`pnpm test\`), cargo test para Rust.
- Seguridad: usar \`escapeHtml()\` para interpolación en innerHTML.
- Límites WASM: max 5000 rutas, 500 paradas por ruta, 10M ops, 10MB payload.

### Constraints
- Do NOT push directly to \`main\`.
- Use branch \`${branch}\` as base; create a new feature branch if needed.
- Include tests for any logic changes.
- Author mode: ${authorMode}.
`.trim();

console.log('Creating Jules delegation session...');
console.log(`Branch: ${branch}`);
console.log(`Author mode: ${authorMode}`);
console.log(`Open PR: ${openPR}`);
if (fileFilter.length > 0) console.log(`File filter: ${fileFilter.join(', ')}`);

try {
  const session = await createJulesSession({
    task,
    branch,
    authorMode,
    autoCommit: true,
    openPR,
    fileFilter,
    context: {
      triggerType: 'manual_delegation',
      triggeredBy,
      runId,
    },
  });

  console.log('✅ Jules session created:');
  console.log(JSON.stringify(session, null, 2));

  if (session.pullRequestUrl || session.pullRequest?.url) {
    console.log(`\n🔗 PR: ${session.pullRequestUrl || session.pullRequest?.url}`);
  }
  if (session.name) {
    console.log(`Session ID: ${session.name}`);
  }
} catch (err) {
  console.error('❌ Failed to create Jules session:', err.message);
  process.exit(1);
}
