/**
 * update-stats.mjs
 * Updates README.md with automated project statistics:
 *   - Total git commits
 *   - Lines of Rust code in rust-wasm/
 * Run: node scripts/update-stats.mjs
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Minimum commit baseline (preserve historical count even on shallow clones)
const COMMIT_BASELINE = 851;

function getCommitCount() {
  try {
    const result = execSync('git rev-list --count HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    const count = parseInt(result, 10);
    return Math.max(count, COMMIT_BASELINE);
  } catch {
    return COMMIT_BASELINE;
  }
}

function getRustLines() {
  try {
    const result = execSync(
      'find rust-wasm -name "*.rs" | xargs wc -l 2>/dev/null | tail -1',
      { cwd: ROOT, encoding: 'utf8' }
    ).trim();
    const match = result.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}

const commits = getCommitCount();
const rustLines = getRustLines();

const readmePath = join(ROOT, 'README.md');
let readme = readFileSync(readmePath, 'utf8');

// Update or append stats badge section between markers
const statsBlock = `<!-- STATS:START -->
> 📊 **${commits}+ commits** | ⚙️ **${rustLines}+ líneas de Rust/WASM**
<!-- STATS:END -->`;

if (readme.includes('<!-- STATS:START -->')) {
  readme = readme.replace(/<!-- STATS:START -->[\s\S]*?<!-- STATS:END -->/m, statsBlock);
} else if (/^# .+$/m.test(readme)) {
  readme = readme.replace(/^(# .+)$/m, `$1\n\n${statsBlock}`);
} else {
  readme = `${statsBlock}\n\n${readme}`;
}

writeFileSync(readmePath, readme, 'utf8');
console.log(`✅ README stats updated — ${commits}+ commits, ${rustLines}+ Rust lines`);
