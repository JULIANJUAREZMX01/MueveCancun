const fs = require('fs');

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
