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

function replaceRegexExactlyOnce(content, searchPattern, replacementValue, description) {
  const matches = [...content.matchAll(searchPattern)];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one match for ${description}, found ${matches.length}.`);
  }
  return content.replace(searchPattern, replacementValue);
}

const filePath = 'src/pages/[lang]/rutas/index.astro';
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('LitBadge')) {
  content = replaceLiteralExactlyOnce(
    content,
    "import { getTransportLabel } from '../../../utils/transport';",
    "import { getTransportLabel } from '../../../utils/transport';\nimport '../../../components/ui/lit/LitBadge';",
    'LitBadge import insertion anchor'
  );
}

content = replaceRegexExactlyOnce(
  content,
  /<span class="px-2 py-0\.5 rounded-md bg-primary-100 text-primary-700 text-\[10px\] font-black uppercase tracking-widest" style=\{`view-transition-name: route-badge-\$\{safeId\}`\}>\s*\{route\.id\}\s*<\/span>/g,
  '<lit-badge variant="primary" style={`view-transition-name: route-badge-${safeId}`}>\n                      {route.id}\n                    </lit-badge>',
  'route badge span replacement'
);

fs.writeFileSync(filePath, content);
