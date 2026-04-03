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
