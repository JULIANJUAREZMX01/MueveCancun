const fs = require('fs');
const path = require('path');

const files = [
    'src/pages/ruta/[id].astro',
    'src/pages/ruta/[slug].astro'
];

files.forEach(file => {
    const filePath = path.resolve(file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');

        // Remove existing prerender config to avoid duplicates
        content = content.replace(/export const prerender = true;\s*/g, '');

        // Remove double frontmatter blocks if I created them
        // Pattern: --- ... --- ... imports ...
        // This is hard to regex reliably without parsing.
        // Let's just strip the first line if it matches '---' and checks if we have multiple.

        // Simplest approach: Read everything, identify imports, reconstruct.

        // Split by ---
        const parts = content.split('---');
        // parts[0] is usually empty (before first ---)
        // parts[1] is the frontmatter
        // parts[2] is the body

        if (parts.length >= 3) {
            let frontmatter = parts[1];
            // Add prerender to top of frontmatter
            frontmatter = '\nexport const prerender = true;\n' + frontmatter.trim();

            // Reconstruct
            const newContent = '---' + frontmatter + '\n---\n' + parts.slice(2).join('---');
            fs.writeFileSync(filePath, newContent);
            console.log(`Fixed ${file}`);
        }
    }
});
