const fs = require('fs');

function findAstroConfigPath() {
  const candidates = [
    'astro.config.ts',
    'astro.config.mjs',
    'astro.config.js',
    'astro.config.mts',
    'astro.config.cjs'
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to find an Astro config file. Checked: ${candidates.join(', ')}`
  );
}

const astroConfigPath = findAstroConfigPath();
const content = fs.readFileSync(astroConfigPath, 'utf8');

let newContent = content;

if (!newContent.includes('import lit from "@astrojs/lit"')) {
  newContent = newContent.replace(
    'import tailwind from "@astrojs/tailwind"',
    'import tailwind from "@astrojs/tailwind"\nimport lit from "@astrojs/lit"'
  );
}

if (!newContent.includes('lit()')) {
  newContent = newContent.replace(
    'tailwind({ applyBaseStyles: false })',
    'tailwind({ applyBaseStyles: false }),\n    lit()'
  );
}

if (newContent !== content) {
  fs.writeFileSync(astroConfigPath, newContent);
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceLiteralExactlyOnce(content, searchValue, replacementValue, description) {
  const matches = content.match(new RegExp(escapeRegExp(searchValue), 'g')) || [];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one match for ${description}, found ${matches.length}.`);
  }
  return content.replace(searchValue, replacementValue);
}

const configPath = 'astro.config.ts';
let content = fs.readFileSync(configPath, 'utf8');

content = replaceLiteralExactlyOnce(
  content,
  'import tailwind from "@astrojs/tailwind"',
  'import tailwind from "@astrojs/tailwind"\nimport lit from "@astrojs/lit"',
  'lit import insertion anchor'
);

content = replaceLiteralExactlyOnce(
  content,
  'tailwind({ applyBaseStyles: false })',
  'tailwind({ applyBaseStyles: false }),\n    lit()',
  'lit integration registration'
);

fs.writeFileSync(configPath, content);
