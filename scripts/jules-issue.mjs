/**
 * jules-issue.mjs — Bridge GitHub Issue → Jules task.
 *
 * Invocado por el workflow jules-issue-handler.yml cuando se asigna
 * la etiqueta "jules" a un Issue.
 *
 * Variables de entorno requeridas:
 *   JULES_API_KEY   — Clave de API Jules
 *   ISSUE_NUMBER    — Número del issue
 *   ISSUE_TITLE     — Título del issue
 *   ISSUE_BODY      — Cuerpo del issue (truncado a 8KB)
 *   ISSUE_LABELS    — Labels del issue (JSON array string)
 *   ISSUE_URL       — URL del issue en GitHub
 *   DEFAULT_BRANCH  — Rama base del repositorio (default: main)
 */

import { createJulesSession } from './jules-api.mjs';

const issueNumber = process.env.ISSUE_NUMBER || '0';
const issueTitle = process.env.ISSUE_TITLE || '(sin título)';
const issueBody = (process.env.ISSUE_BODY || '').slice(0, 8192);
const issueLabels = process.env.ISSUE_LABELS || '[]';
const issueUrl = process.env.ISSUE_URL || '';
const defaultBranch = process.env.DEFAULT_BRANCH || 'main';

const task = `
## Jules Issue Handler — MueveCancun

**Issue**: #${issueNumber} — ${issueTitle}
**URL**: ${issueUrl}
**Labels**: ${issueLabels}

### Task
Read the GitHub Issue described below and implement the requested changes or fix.

### Project Context
- PWA offline-first para transporte público en Cancún.
- Stack: Astro SSG + Rust/WASM + Leaflet + IndexedDB.
- Motor de ruteo en \`rust-wasm/route-calculator/src/lib.rs\` (compilado a WASM).
- Datos de rutas en \`public/data/master_routes.json\`.
- UI en \`src/components/\` y \`src/pages/\`.
- Seguridad: usar \`escapeHtml()\` para toda interpolación en innerHTML.

### Constraints
- Create a new branch named \`jules/issue-${issueNumber}-<short-slug>\`.
- Open a Pull Request targeting \`${defaultBranch}\` that closes Issue #${issueNumber}.
- Include tests for any logic changes (Vitest for TS, \`#[cfg(test)]\` for Rust).
- Use author mode CO_AUTHORED.

### Issue Body
${issueBody || '(cuerpo vacío)'}
`.trim();

console.log(`Creating Jules session for Issue #${issueNumber}...`);

try {
  const session = await createJulesSession({
    task,
    branch: defaultBranch,
    authorMode: 'CO_AUTHORED',
    autoCommit: true,
    openPR: true,
    context: {
      triggerType: 'issue_label',
      issueNumber,
      issueTitle,
      issueUrl,
    },
  });

  console.log('✅ Jules issue session created:');
  console.log(JSON.stringify(session, null, 2));
} catch (err) {
  console.error('❌ Failed to create Jules session:', err.message);
  process.exit(1);
}
