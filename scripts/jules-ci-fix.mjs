/**
 * jules-ci-fix.mjs — Payload builder para delegación de fallos CI a Jules.
 *
 * Invocado por el workflow jules-ci-fixer.yml cuando un run de CI falla.
 *
 * Variables de entorno requeridas:
 *   JULES_API_KEY      — Clave de API Jules
 *   FAILED_JOB_NAME    — Nombre del job fallido
 *   FAILED_LOG         — Logs del job fallido (truncados a 8KB)
 *   WORKFLOW_NAME      — Nombre del workflow
 *   HEAD_BRANCH        — Rama donde falló el CI
 *   HEAD_SHA           — SHA del commit fallido
 *   RUN_URL            — URL del run de GitHub Actions
 */

import { createJulesSession } from './jules-api.mjs';

const failedJobName = process.env.FAILED_JOB_NAME || 'unknown job';
const failedLog = (process.env.FAILED_LOG || '').slice(0, 8192);
const workflowName = process.env.WORKFLOW_NAME || 'CI';
const headBranch = process.env.HEAD_BRANCH || 'main';
const headSha = process.env.HEAD_SHA || '';
const runUrl = process.env.RUN_URL || '';

const task = `
## CI Fixer Request — MueveCancun

**Workflow**: ${workflowName}
**Failed Job**: ${failedJobName}
**Branch**: ${headBranch}
**Commit**: ${headSha}
**Run URL**: ${runUrl}

### Task
Analyze the failing CI job logs below and apply the minimal code fix required to make the tests pass.

### Constraints
- Do NOT modify unrelated files.
- Run only the tests mentioned in the failing logs to verify the fix.
- If it's a Rust test failure (\`cargo test --lib\`): fix src in \`rust-wasm/route-calculator/src/\`
- If it's a TypeScript/Vitest failure: fix src in \`src/\`
- If it's a route data validation failure: fix \`public/data/master_routes.json\` or the validate script.
- After applying the fix, run the appropriate test command to confirm it passes.
- Open a Pull Request targeting branch \`${headBranch}\` with the fix.
- If the failing branch is \`main\`, create a new branch \`jules/fix-ci-${headSha.slice(0, 7)}\` and open the PR against \`main\`.
- Use author mode CO_AUTHORED.

### Failing Job Logs
\`\`\`
${failedLog || '(no logs provided)'}
\`\`\`
`.trim();

console.log('Creating Jules CI fix session...');
console.log(`Branch: ${headBranch}`);
console.log(`Failed job: ${failedJobName}`);

try {
  const session = await createJulesSession({
    task,
    branch: headBranch,
    authorMode: 'CO_AUTHORED',
    autoCommit: true,
    openPR: true,
    fileFilter: [
      'rust-wasm/route-calculator/src/**',
      'src/**',
      'scripts/**',
      'public/data/**',
    ],
    context: {
      triggerType: 'ci_failure',
      workflowName,
      failedJobName,
      headSha,
      runUrl,
    },
  });

  console.log('✅ Jules CI fix session created successfully:');
  console.log(JSON.stringify(session, null, 2));

  if (session.name) {
    console.log(`\nSession ID: ${session.name}`);
  }
  if (session.pullRequestUrl || session.pullRequest?.url) {
    console.log(`PR URL: ${session.pullRequestUrl || session.pullRequest?.url}`);
  }
} catch (err) {
  console.error('❌ Failed to create Jules session:', err.message);
  process.exit(1);
}
