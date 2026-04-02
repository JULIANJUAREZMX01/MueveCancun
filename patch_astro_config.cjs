const fs = require('fs');
const content = fs.readFileSync('astro.config.mjs', 'utf8');

let newContent = content.replace(
  'import tailwind from "@astrojs/tailwind"',
  'import tailwind from "@astrojs/tailwind"\nimport lit from "@astrojs/lit"'
);

newContent = newContent.replace(
  'tailwind({ applyBaseStyles: false })',
  'tailwind({ applyBaseStyles: false }),\n    lit()'
);

fs.writeFileSync('astro.config.mjs', newContent);
