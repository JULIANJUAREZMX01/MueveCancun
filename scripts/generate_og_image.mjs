/**
 * generate_og_image.mjs
 * Generates public/og-image.png (1200×630) using Sharp + SVG.
 * Run: node scripts/generate_og_image.mjs
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '..', 'public', 'og-image.png');

const SITE_URL = process.env.PUBLIC_SITE_URL ?? 'querutamellevacancun.onrender.com';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d0e1a"/>
      <stop offset="100%" stop-color="#111224"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>

  <!-- Decorative curves (right side) -->
  <path d="M 640 -30 C 900 120, 1320 180, 1100 520" fill="none" stroke="#6b21a8" stroke-width="3" opacity="0.7"/>
  <path d="M 690 -30 C 970 100, 1370 260, 1180 600" fill="none" stroke="#7c3aed" stroke-width="3" opacity="0.5"/>
  <path d="M 820 80 C 1100 280, 920 480, 1200 630" fill="none" stroke="#0077a8" stroke-width="3" opacity="0.6"/>
  <path d="M 870 30  C 1160 260, 960 460, 1200 570" fill="none" stroke="#0090c0" stroke-width="3" opacity="0.5"/>

  <!-- Bus icon (white) -->
  <rect x="55" y="50" width="70" height="58" rx="10" fill="#ffffff"/>
  <rect x="63" y="58" width="20" height="20" rx="3" fill="#0d0e1a"/>
  <rect x="93" y="58" width="20" height="20" rx="3" fill="#0d0e1a"/>
  <circle cx="69"  cy="112" r="7" fill="#0d0e1a" stroke="#ffffff" stroke-width="2"/>
  <circle cx="111" cy="112" r="7" fill="#0d0e1a" stroke="#ffffff" stroke-width="2"/>

  <!-- Brand name -->
  <text x="145" y="103" font-family="DejaVu Sans, Arial, sans-serif" font-weight="bold" font-size="72" fill="#ffffff">MueveCancún</text>

  <!-- Subtitle -->
  <text x="55" y="198" font-family="DejaVu Sans, Arial, sans-serif" font-weight="bold" font-size="50" fill="#00cfc1">¿Qué ruta me lleva?</text>

  <!-- Feature list -->
  <text x="55"  y="272" font-family="DejaVu Sans, Arial, sans-serif" font-size="32" fill="#00cfc1">✓</text>
  <text x="100" y="272" font-family="DejaVu Sans, Arial, sans-serif" font-size="32" fill="#ffffff">Funciona sin internet (Offline-first)</text>

  <text x="55"  y="328" font-family="DejaVu Sans, Arial, sans-serif" font-size="32" fill="#00cfc1">✓</text>
  <text x="100" y="328" font-family="DejaVu Sans, Arial, sans-serif" font-size="32" fill="#ffffff">Rutas R1, R2, R10 y más</text>

  <text x="55"  y="384" font-family="DejaVu Sans, Arial, sans-serif" font-size="32" fill="#00cfc1">✓</text>
  <text x="100" y="384" font-family="DejaVu Sans, Arial, sans-serif" font-size="32" fill="#ffffff">Cálculo de rutas ultra rápido (WASM)</text>

  <text x="55"  y="440" font-family="DejaVu Sans, Arial, sans-serif" font-size="32" fill="#00cfc1">✓</text>
  <text x="100" y="440" font-family="DejaVu Sans, Arial, sans-serif" font-size="32" fill="#ffffff">100% gratis y código abierto</text>

  <!-- Bottom bar -->
  <rect x="0" y="555" width="1200" height="75" fill="#08090d"/>
  <text x="55"  y="600" font-family="DejaVu Sans, Arial, sans-serif" font-size="25" fill="#a0a8b9">La guía oficial de transporte público de Cancún</text>
  <text x="830" y="600" font-family="DejaVu Sans, Arial, sans-serif" font-weight="bold" font-size="25" fill="#00cfc1">${SITE_URL}</text>
</svg>`;

await sharp(Buffer.from(svg))
  .png()
  .toFile(outputPath);

console.log(`✅ og-image.png generated at ${outputPath}`);
