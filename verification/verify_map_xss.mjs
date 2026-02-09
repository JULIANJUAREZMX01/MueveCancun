// verification/verify_map_xss.mjs
// Simulates the FIXED logic from InteractiveMap.astro

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

const name = "' - alert(1) - '";
const isRoute = true;

// Fixed logic
const popupContent = `
    <div class="p-1">
        <p class="font-bold text-gray-900">${escapeHtml(name)}</p>
        <p class="text-xs text-gray-500">${isRoute ? '🚌 Ruta Detectada' : '📍 Punto de Interés'}</p>
        <button onclick="window.location.href='/rutas?search=${encodeURIComponent(name).replace(/'/g, '%27')}'" class="mt-2 w-full text-xs bg-primary-600 text-white rounded py-1 font-bold">Ver Detalles</button>
    </div>
`;

console.log("Popup Content:", popupContent);

if (popupContent.includes("window.location.href='/rutas?search=' - alert(1) - ''")) {
    console.error("VULNERABILITY DETECTED: Single quote injection possible in onclick.");
    process.exit(1);
}

// Expected: window.location.href='/rutas?search=%27%20-%20alert(1)%20-%20%27'
if (popupContent.includes("search=%27%20-%20alert(1)%20-%20%27'")) {
    console.log("SUCCESS: Onclick is correctly escaped.");
} else {
    console.warn("WARNING: Output does not match expected escaped string.");
}
