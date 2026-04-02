const fs = require('fs');
const content = fs.readFileSync('astro.config.mjs', 'utf8');

let newContent = content;

// Add Lit import after the Tailwind import, if not already present.
if (!newContent.includes('import lit from "@astrojs/lit"')) {
  newContent = newContent.replace(
    /import\s+tailwind\s+from\s+["']@astrojs\/tailwind["'];?/,
    (match) => `${match}\nimport lit from "@astrojs/lit";`
  );
}

// Add lit() to the integrations list after the tailwind(...) entry, if not already present.
if (!newContent.includes('lit()')) {
  newContent = newContent.replace(
    /tailwind\(\s*{[^}]*applyBaseStyles\s*:\s*false[^}]*}\s*\)/,
    (match) => `${match},\n    lit()`
  );
}

fs.writeFileSync('astro.config.mjs', newContent);
