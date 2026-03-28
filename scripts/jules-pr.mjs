/**
 * jules-pr.mjs — Bridge comentario PR → Jules task.
 *
 * Invocado por el workflow jules-pr-assistant.yml cuando un comentario
 * en un PR comienza con "/jules".
 *
 * Variables de entorno requeridas:
 *   JULES_API_KEY      — Clave de API Jules
 *   PR_NUMBER          — Número del PR
 *   PR_TITLE           — Título del PR
 *   PR_BODY            — Descripción del PR (truncado a 4KB)
 *   PR_HEAD_BRANCH     — Rama del PR
 *   PR_BASE_BRANCH     — Rama destino del PR
 *   PR_URL             — URL del PR
 *   COMMENT_BODY       — Cuerpo completo del comentario (truncado a 4KB)
 *   COMMENT_AUTHOR     — Autor del comentario
 */

import { createJulesSession } from './jules-api.mjs';

const prNumber = process.env.PR_NUMBER || '0';
const prTitle = process.env.PR_TITLE || '(sin título)';
const prBody = (process.env.PR_BODY || '').slice(0, 4096);
const prHeadBranch = process.env.PR_HEAD_BRANCH || 'main';
const prBaseBranch = process.env.PR_BASE_BRANCH || 'main';
const prUrl = process.env.PR_URL || '';
const commentBody = (process.env.COMMENT_BODY || '').slice(0, 4096);
const commentAuthor = process.env.COMMENT_AUTHOR || 'unknown';

// Extraer instrucción después del comando /jules
const julesInstruction = commentBody
  .replace(/^\/jules\s*/i, '')
  .trim() || 'Review this PR and apply any suggested improvements from the conversation.';

const task = `
## Jules PR Assistant — MueveCancun

**PR**: #${prNumber} — ${prTitle}
**PR URL**: ${prUrl}
**Branch**: \`${prHeadBranch}\` → \`${prBaseBranch}\`
**Requested by**: @${commentAuthor}

### Task Requested
${julesInstruction}

### PR Description
${prBody || '(sin descripción)'}

### Project Context
- PWA offline-first para transporte público en Cancún.
- Stack: Astro SSG + Rust/WASM + Leaflet + IndexedDB.
- Motor de ruteo en \`rust-wasm/route-calculator/src/lib.rs\`.
- UI en \`src/components/\` y \`src/pages/\`.
- Seguridad: usar \`escapeHtml()\` para interpolación en innerHTML.

### Constraints
- Work on the existing PR branch \`${prHeadBranch}\`.
- Commit changes directly to \`${prHeadBranch}\` (the PR will update automatically).
- Use author mode CO_AUTHORED.
- If tests are needed, add them to \`src/tests/\` (Vitest) or \`rust-wasm/route-calculator/src/lib.rs\` (#[cfg(test)]).
`.trim();

console.log(`Creating Jules PR assistant session for PR #${prNumber}...`);
console.log(`Instruction: ${julesInstruction.slice(0, 100)}...`);

try {
  const session = await createJulesSession({
    task,
    branch: prHeadBranch,
    authorMode: 'CO_AUTHORED',
    autoCommit: true,
    openPR: false,
    context: {
      triggerType: 'pr_comment',
      prNumber,
      prTitle,
      prUrl,
      commentAuthor,
    },
  });

  console.log('✅ Jules PR assistant session created:');
  console.log(JSON.stringify(session, null, 2));
} catch (err) {
  console.error('❌ Failed to create Jules session:', err.message);
  process.exit(1);
}
