import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
const cssFiles = fs.readdirSync(path.join(root, 'src'), { recursive: true })
  .filter((file) => typeof file === 'string' && file.endsWith('.css'));
const hasTailwindDirective = cssFiles.some((file) => /@tailwind\b/.test(fs.readFileSync(path.join(root, 'src', file), 'utf8')));
const hasTailwindPipeline = Boolean(dependencies.tailwindcss || dependencies['@tailwindcss/vite'] || dependencies['@astrojs/tailwind'] || hasTailwindDirective);

if (hasTailwindPipeline) {
  console.log('CSS pipeline check skipped: Tailwind pipeline is active.');
  process.exit(0);
}

const migrationSurfaces = [
  'src/pages/[lang]/guess.astro',
  'src/pages/[lang]/ruta/[id].astro',
  'src/pages/[lang]/contribuir.astro',
  'src/pages/[lang]/suscripcion.astro',
  'src/pages/[lang]/rutas/index.astro',
];
const tailwindToken = /^(?:dark:|sm:|md:|lg:|xl:|2xl:|hover:|focus:|active:|group-hover:|disabled:)|^(?:flex|grid|block|hidden|relative|absolute|items-|justify-|gap-|space-y-|grid-cols-|col-span-|[wh]-|[mp][trblxy]?-|text-(?:xs|sm|lg|xl|[2-9]xl|\[|slate|white|black|teal|primary|orange|emerald)|bg-(?:slate|white|black|teal|primary|orange|emerald|gradient)|border(?:-|$)|rounded(?:-|$)|font-(?:bold|black|medium|mono)|tracking-|leading-|shadow-|overflow-|object-|aspect-|opacity-|z-|top-|right-|bottom-|left-|transition-|uppercase$|truncate$|shrink-)/;
const violations = [];

for (const relativePath of migrationSurfaces) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const candidates = [];
  for (const match of source.matchAll(/class="([^"]*)"/g)) {
    candidates.push(...match[1].split(/\s+/).map((token) => ({ token, offset: match.index })));
  }
  for (const call of source.matchAll(/classList\.(?:add|remove|toggle)\(([^)]*)\)/g)) {
    for (const literal of call[1].matchAll(/['"]([^'"]+)['"]/g)) {
      candidates.push({ token: literal[1], offset: call.index });
    }
  }
  for (const icon of source.matchAll(/<(?:svg|Icon)\b([^>]*)>/g)) {
    const attributes = icon[1];
    const hasAttributes = /\bwidth=/.test(attributes) && /\bheight=/.test(attributes);
    const hasProjectSize = /class="[^"]*\bu-w-/.test(attributes) && /class="[^"]*\bu-h-/.test(attributes);
    if (!hasAttributes && !hasProjectSize) {
      const line = source.slice(0, icon.index).split('\n').length;
      violations.push(`${relativePath}:${line} -> SVG/Icon without explicit width and height`);
    }
  }
  for (const { token, offset } of candidates) {
    if (!token.startsWith('u-') && tailwindToken.test(token)) {
      const line = source.slice(0, offset).split('\n').length;
      violations.push(`${relativePath}:${line} -> ${token}`);
    }
  }
}

if (violations.length) {
  console.error('Tailwind-like classes found while no Tailwind pipeline is active:\n' + violations.map((item) => `  - ${item}`).join('\n'));
  process.exit(1);
}
console.log(`CSS pipeline check passed: ${migrationSurfaces.length} migrated views use dependency-free project CSS.`);
