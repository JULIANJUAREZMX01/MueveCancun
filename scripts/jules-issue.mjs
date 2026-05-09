/* eslint-disable */
/**
 * jules-issue.mjs — Bridge GitHub Issue → Jules task.
 * Optimizado para el flujo de ramas dinámicas de MueveCancun.
 */

import { createJulesSession } from './jules-api.mjs';

const issueNumber = process.env.ISSUE_NUMBER || '0';
const issueTitle  = process.env.ISSUE_TITLE  || '(sin título)';
const issueBody   = (process.env.ISSUE_BODY  || '').slice(0, 8192);
const issueLabels = process.env.ISSUE_LABELS || '[]';
const issueUrl    = process.env.ISSUE_URL    || '';
const defaultBranch  = process.env.DEFAULT_BRANCH  || 'main';
const workingBranch  = process.env.WORKING_BRANCH  || `fix/issue-${issueNumber}`;

const task = `
Resuelve el siguiente issue de GitHub en el repositorio MueveCancun.

## Issue #${issueNumber}: ${issueTitle}

${issueBody}

## Labels
${issueLabels}

## URL
${issueUrl}

## Instrucciones
1. Analiza el problema descrito en el issue.
2. Implementa la solución mínima necesaria en la rama \`${workingBranch}\`.
3. Sigue las convenciones del proyecto (TypeScript estricto, tokens CSS v4, sin \`any\`).
4. Actualiza los tests relevantes si aplica.
5. Añade un comentario en el PR explicando el fix.
`;

try {
  const session = await createJulesSession({
    task,
    branch: workingBranch,
    authorMode: 'CO_AUTHORED',
    autoCommit: true,
    openPR: true,
    context: { issueNumber, issueTitle, issueUrl },
  });
  console.log('[jules-issue] Sesión creada:', JSON.stringify(session, null, 2));
} catch (err) {
  console.error('[jules-issue] Error al crear sesión Jules:', err.message);
  process.exit(1);
}
