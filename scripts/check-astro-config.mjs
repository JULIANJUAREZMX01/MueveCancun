import { readdir } from 'node:fs/promises';
import process from 'node:process';

const EXPECTED_CONFIG = 'astro.config.ts';
const entries = await readdir(process.cwd(), { withFileTypes: true });
const configs = entries
  .filter((entry) => entry.isFile() && entry.name.startsWith('astro.config.'))
  .map((entry) => entry.name)
  .sort();

if (configs.length !== 1 || configs[0] !== EXPECTED_CONFIG) {
  console.error(
    `[astro-config] Expected ${EXPECTED_CONFIG} to be the only Astro config, found: ${configs.join(', ') || 'none'}`,
  );
  process.exit(1);
}

console.log(`[astro-config] OK — using only ${EXPECTED_CONFIG}`);
