/**
 * generate_og_image.ts
 * Generates public/og-image.png (1200×630) using Sharp + SVG.
 * Run: node --experimental-strip-types scripts/generate_og_image.ts
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

  <!-- Logo / Brand Mark -->
  <circle cx="110" cy="110" r="70" fill="#7c3aed" opacity="0.15"/>
  <circle cx="110" cy="110" r="50" fill="none" stroke="#7c3aed" stroke-width="2" opacity="0.4"/>
  <text x="110" y="128" font-family="Arial, sans-serif" font-size="52" font-weight="bold"
        fill="white" text-anchor="middle">🚌</text>

  <!-- Main Title -->
  <text x="200" y="100" font-family="Arial, sans-serif" font-size="60" font-weight="bold"
        fill="white">MueveCancún</text>
  <text x="200" y="150" font-family="Arial, sans-serif" font-size="26"
        fill="#a78bfa">Transporte Público · Offline-First · Gratis</text>

  <!-- Divider line -->
  <line x1="200" y1="175" x2="900" y2="175" stroke="#7c3aed" stroke-width="1.5" opacity="0.5"/>

  <!-- Description -->
  <text x="200" y="230" font-family="Arial, sans-serif" font-size="32" fill="#e2e8f0">
    Calcula tu ruta en Cancún y la Riviera Maya
  </text>
  <text x="200" y="280" font-family="Arial, sans-serif" font-size="32" fill="#e2e8f0">
    sin conexión a internet — con Rust/WebAssembly.
  </text>

  <!-- Feature badges -->
  <rect x="200" y="320" width="160" height="44" rx="8" fill="#7c3aed" opacity="0.3"/>
  <text x="280" y="348" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">🗺️ Sin internet</text>

  <rect x="380" y="320" width="160" height="44" rx="8" fill="#0077a8" opacity="0.3"/>
  <text x="460" y="348" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">⚡ WASM rápido</text>

  <rect x="560" y="320" width="160" height="44" rx="8" fill="#2d6a4f" opacity="0.3"/>
  <text x="640" y="348" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">💰 100% gratis</text>

  <!-- Site URL -->
  <text x="200" y="560" font-family="Arial, sans-serif" font-size="24" fill="#94a3b8">
    ${SITE_URL}
  </text>
</svg>`;

await sharp(Buffer.from(svg))
  .png()
  .toFile(outputPath);

console.log(`✅ OG image saved to ${outputPath}`);
