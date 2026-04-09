/**
 * jules-ci-fix.mjs — Payload builder para delegación de fallos CI a Jules.
 *
 * Invocado por el workflow jules-ci-fixer.yml cuando un run de CI falla.
 *
 * Variables de entorno requeridas:
 *   JULES_API_KEY      — Clave de API Jules
 *   FAILED_JOB_NAME    — Nombre del job fallido
 *   FAILED_LOG         — Logs del job fallido (truncados a 8KB)
 *   GIT_DIFF           — Diff del commit fallido obtenido vía GitHub API (texto plano, truncado a 12KB)
 *   WORKFLOW_NAME      — Nombre del workflow
 *   HEAD_BRANCH        — Rama donde falló el CI
 *   HEAD_SHA           — SHA del commit fallido
 *   RUN_URL            — URL del run de GitHub Actions
 */

import { createJulesSession, isDailyCapReached } from './jules-api.mjs';

// ── Token scrubbing ────────────────────────────────────────────────────────────
// Patterns that may appear in CI logs if a secret was accidentally echoed.
// Replace any such matches with a placeholder before sending to the external API.
const TOKEN_PATTERNS = [
  /ghp_[A-Za-z0-9]{36}/g,           // GitHub classic PATs (ghp_ + 36 chars)
  /ghs_[A-Za-z0-9]{36}/g,           // GitHub Actions tokens (ghs_ + 36 chars)
  /github_pat_[A-Za-z0-9_]{82}/g,   // Fine-grained PATs (github_pat_ + 82 chars)
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, // Bearer auth headers
  /token\s+[A-Za-z0-9\-._~+/]+=*/gi, // Generic "token …" lines
  /JULES_API_KEY\s*[:=]\s*\S+/gi,    // Jules key if somehow echoed
];

function scrubSecrets(text) {
  let result = text;
  for (const pattern of TOKEN_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}
// ──────────────────────────────────────────────────────────────────────────────

const failedJobName = process.env.FAILED_JOB_NAME || 'unknown job';
const failedLog = scrubSecrets((process.env.FAILED_LOG || '').slice(0, 8192));
const gitDiff = (process.env.GIT_DIFF || '').slice(0, 12288);
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
- **Always include \`[jules]\` in every commit message** so the CI loop-prevention guard can skip these commits.
- Use author mode CO_AUTHORED.

### Failing Job Logs
\`\`\`
${failedLog || '(no logs provided)'}
\`\`\`

### Commit Diff (fetched via GitHub API — read-only, not executed)
\`\`\`diff
${gitDiff || '(diff not available)'}
\`\`\`
`.trim();

console.log('Creating Jules CI fix session...');
console.log(`Branch: ${headBranch}`);
console.log(`Failed job: ${failedJobName}`);

// Daily rate-limit: skip if ≥ 3 auto-repair sessions were already created today
// for the same workflow + branch to prevent runaway repair loops.
const capReached = await isDailyCapReached({ workflowName, branch: headBranch, cap: 3 });
if (capReached) {
  console.warn(
    `⚠️ Daily repair cap (3) reached for workflow "${workflowName}" on branch "${headBranch}". Skipping Jules session.`
  );
  process.exit(0);
}

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
      headBranch,
      headSha,
      runUrl,
      gitDiff: gitDiff || undefined,
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
  console.error('❌ Failed to create Jules session:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}
