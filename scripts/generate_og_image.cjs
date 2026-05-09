/**
 * generate_og_image.cjs
 * 
 * NOTA: La og-image.png real (1200×630px) ya está generada en public/og-image.png.
 * Para regenerar con Sharp, usar:
 *   node --experimental-strip-types scripts/generate_og_image.ts
 * 
 * Este archivo se mantiene como fallback que NO sobreescribe la imagen real.
 */
const fs = require('fs');
const path = require('path');

const outPath = path.join(__dirname, '..', 'public', 'og-image.png');

if (fs.existsSync(outPath)) {
  const size = fs.statSync(outPath).size;
  if (size > 10000) {
    console.log(`og-image.png ya existe (${(size/1024).toFixed(1)} KB) — no se sobreescribe.`);
    process.exit(0);
  }
}

console.error('og-image.png no existe o es un placeholder. Ejecuta: node --experimental-strip-types scripts/generate_og_image.ts');
process.exit(1);
