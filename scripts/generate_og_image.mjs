import sharp from 'sharp';

async function generateOgImage() {
    const width = 1200;
    const height = 630;

    // Background and base elements
    const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#0b0f19" />

        <!-- Decorative glowing lines (Simulated routes) -->
        <g opacity="0.4">
            <path d="M 0,200 Q 300,50 600,300 T 1200,100" fill="none" stroke="#00B4D8" stroke-width="4" />
            <path d="M 0,400 Q 400,600 800,200 T 1200,500" fill="none" stroke="#9d4edd" stroke-width="4" />
            <path d="M 200,0 Q 100,300 400,630" fill="none" stroke="#7b2cbf" stroke-width="2" />
        </g>

        <!-- Main Title -->
        <text x="80" y="120" font-family="Arial, sans-serif" font-weight="bold" font-size="80" fill="#ffffff">🚍 MueveCancún</text>
        <text x="80" y="200" font-family="Arial, sans-serif" font-weight="bold" font-size="45" fill="#00B4D8">¿Qué ruta me lleva?</text>

        <!-- Features -->
        <g font-family="Arial, sans-serif" font-size="28" fill="#ffffff">
            <text x="100" y="280">✓ Funciona sin internet (Offline-first)</text>
            <text x="100" y="330">✓ Rutas R1, R2, R10 y más</text>
            <text x="100" y="380">✓ Cálculo de rutas ultra rápido (WASM)</text>
            <text x="100" y="430">✓ 100% gratis y código abierto</text>
        </g>

        <!-- Bottom Bar -->
        <rect x="0" y="${height - 100}" width="${width}" height="100" fill="#161b22" />
        <text x="80" y="${height - 40}" font-family="Arial, sans-serif" font-size="24" fill="#ffffff">La guía oficial de transporte público de Cancún</text>
        <text x="${width - 450}" y="${height - 40}" font-family="Arial, sans-serif" font-weight="bold" font-size="24" fill="#00B4D8">querutamellevacancun.onrender.com</text>
    </svg>
    `;

    try {
        await sharp(Buffer.from(svg))
            .png()
            .toFile('public/og-image.png');
        console.log('Professional og-image.png generated successfully at public/og-image.png');
    } catch (error) {
        console.error('Error generating image:', error);
    }
}

generateOgImage();
