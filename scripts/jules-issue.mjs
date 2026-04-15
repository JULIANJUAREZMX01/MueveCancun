/**
 * jules-issue.mjs — Bridge GitHub Issue → Jules task.
 * Optimizado para el flujo de ramas dinámicas de MueveCancun.
 */

import { createJulesSession } from './jules-api.mjs';

const issueNumber = process.env.ISSUE_NUMBER || '0';
const issueTitle = process.env.ISSUE_TITLE || '(sin título)';
const issueBody = (process.env.ISSUE_BODY || '').slice(0, 8192);
const issueLabels = process.env.ISSUE_LABELS || '[]';
const issueUrl = process.env.ISSUE_URL || '';
const defaultBranch = process.env.DEFAULT_BRANCH || 'main';
// RECUPERAMOS LA RAMA CREADA POR EL WORKFLOW
const workingBranch = process.env.WORKING_BRANCH || `fix/issue-${issueNumber}`; 

const task = `
## Jules Nexus Engine — MueveCancun Issue Resolution

**Issue**: #${issueNumber} — ${issueTitle}
**URL**: ${issueUrl}
**Labels**: ${issueLabels}
**Target Branch**: ${workingBranch}

### Contexto de Ingeniería
- Estás trabajando en la rama específica: \`${workingBranch}\`.
- Esta rama ya fue inicializada por el workflow de CI.
- **Misión**: Analizar metadatos, verificar lógica Rust/WASM y optimizar UI.

### Constraints de Arquitectura
- **Ramas**: Realiza tus commits directamente en \`${workingBranch}\`.
- **Integridad**: No toques la rama \`${defaultBranch}\` directamente.
- **WASM**: Si el error es de lógica de ruteo, edita \`rust-wasm/route-calculator/src/lib.rs\`.
- **UI**: Usa CSS Scoped en componentes Astro.
- **Seguridad**: Escapado estricto de HTML y validación de tipos en TS.

### Issue Body & Metadata
${issueBody || '(cuerpo vacío)'}
`.trim();

console.log(`🚀 Invocando a Jules para resolver Issue #${issueNumber} en rama ${workingBranch}...`);

try {
  const session = await createJulesSession({
    task,
    // IMPORTANTE: Ahora la sesión inicia en la rama de trabajo creada por el CI
    branch: workingBranch, 
    authorMode: 'CO_AUTHORED',
    autoCommit: true,
    openPR: true, // Esto creará un PR desde workingBranch hacia defaultBranch
    context: {
      triggerType: 'issue_delegation',
      issueNumber,
      issueTitle,
      issueUrl,
      workingBranch
    },
  });

  console.log('✅ Jules session created and working on branch:', workingBranch);
  console.log(JSON.stringify(session, null, 2));
} catch (err) {
  console.error('❌ Failed to create Jules session:', err.message);
  process.exit(1);
}
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
