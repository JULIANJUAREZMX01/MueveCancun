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
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>

  <!-- Decorative Tropical Accents -->
  <circle cx="1100" cy="100" r="200" fill="#0284c7" opacity="0.1" filter="url(#glow)"/>
  <circle cx="100" cy="530" r="150" fill="#f97316" opacity="0.05" filter="url(#glow)"/>

  <!-- Mexican Pink Accent -->
  <path d="M 0 630 L 1200 630 L 1200 620 L 0 620 Z" fill="#e91e63" opacity="0.8"/>

  <!-- Brand Mark -->
  <rect x="100" y="80" width="100" height="100" rx="24" fill="#0284c7" />
  <text x="150" y="155" font-family="system-ui, sans-serif" font-size="70" font-weight="900"
        fill="white" text-anchor="middle">🚌</text>

  <!-- Title Section -->
  <text x="230" y="130" font-family="system-ui, sans-serif" font-size="80" font-weight="900"
        fill="white">MueveCancún</text>
  <text x="230" y="180" font-family="system-ui, sans-serif" font-size="30" font-weight="700"
        fill="#38bdf8" opacity="0.9">Nexus Transfer Engine v3.6.0 · Offline-First</text>

  <!-- Main Value Proposition -->
  <text x="100" y="320" font-family="system-ui, sans-serif" font-size="48" font-weight="800" fill="white">
    Tu guía definitiva de transporte
  </text>
  <text x="100" y="380" font-family="system-ui, sans-serif" font-size="48" font-weight="800" fill="white">
    en Cancún y la Riviera Maya.
  </text>

  <!-- Subtext -->
  <text x="100" y="450" font-family="system-ui, sans-serif" font-size="28" fill="#94a3b8" font-weight="500">
    Rutas actualizadas, mapas interactivos y billetera digital sin internet.
  </text>

  <!-- Badges -->
  <g transform="translate(100, 500)">
    <rect width="200" height="50" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="100" y="32" font-family="system-ui, sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="700">🇲🇽 Hecho en México</text>
  </g>

  <g transform="translate(320, 500)">
    <rect width="200" height="50" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="100" y="32" font-family="system-ui, sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="700">⚡ Rust/WASM</text>
  </g>

  <g transform="translate(540, 500)">
    <rect width="200" height="50" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="100" y="32" font-family="system-ui, sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="700">📶 100% Offline</text>
  </g>

  <!-- URL -->
  <text x="1100" y="580" font-family="system-ui, sans-serif" font-size="24" fill="#64748b" font-weight="800" text-anchor="end">
    ${SITE_URL.toUpperCase()}
  </text>
</svg>`;

await sharp(Buffer.from(svg))
  .png()
  .toFile(outputPath);

console.log(`✅ Professional OG image saved to ${outputPath}`);
