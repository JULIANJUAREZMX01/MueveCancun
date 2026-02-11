
import fs from 'node:fs';
import path from 'node:path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

function verifyFile(filepath, checks) {
    console.log(`Verifying ${filepath}...`);
    try {
        const content = fs.readFileSync(filepath, 'utf-8');
        let allPassed = true;
        for (const check of checks) {
            if (content.includes(check.search)) {
                console.log(`${GREEN}PASS:${RESET} Found "${check.description}"`);
            } else {
                console.log(`${RED}FAIL:${RESET} Missing "${check.description}"`);
                console.log(`Expected to find: ${check.search}`);
                allPassed = false;
            }
        }
        return allPassed;
    } catch (e) {
        console.error(`${RED}ERROR:${RESET} Could not read file ${filepath}`, e);
        return false;
    }
}

let success = true;

// Verify src/pages/ruta/[id].astro
// Note: We need to escape backslashes in the search string for JS string literal parsing.
// File content: .replace(/</g, '\\u003c')  <-- Two backslashes
// JS String:    ".replace(/</g, '\\\\u003c')" <-- Four backslashes to represent two
success &= verifyFile('src/pages/ruta/[id].astro', [
    {
        search: ".replace(/</g, '\\\\u003c')",
        description: "JSON-LD sanitization"
    }
]);

// Verify src/components/InteractiveMap.astro
success &= verifyFile('src/components/InteractiveMap.astro', [
    {
        search: "function escapeHtml(unsafe)",
        description: "escapeHtml helper function definition"
    },
    {
        search: "bindPopup(`<b>Inicio:</b> ${escapeHtml(start.name)}`)",
        description: "Sanitized Start Marker Popup"
    },
    {
        search: "bindPopup(`<b>Fin:</b> ${escapeHtml(end.name)}`)",
        description: "Sanitized End Marker Popup"
    },
    {
        search: "bindPopup(`<b>Transbordo:</b> ${escapeHtml(end.name)}`)",
        description: "Sanitized Transfer Marker Popup"
    }
]);

if (success) {
    console.log(`${GREEN}ALL CHECKS PASSED: Codebase is hardened against identified XSS vectors.${RESET}`);
    process.exit(0);
} else {
    console.error(`${RED}SOME CHECKS FAILED.${RESET}`);
    process.exit(1);
}
