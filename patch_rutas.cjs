const fs = require('fs');

const path = 'src/pages/[lang]/rutas/index.astro';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('LitBadge')) {
    content = content.replace(
        "import { getTransportLabel } from '../../utils/transport';",
        "import { getTransportLabel } from '../../utils/transport';\nimport '../../components/ui/lit/LitBadge';"
    );
}

content = content.replace(
    '<span class="px-2 py-0.5 rounded-md bg-primary-100 text-primary-700 text-[10px] font-black uppercase tracking-widest" style={`view-transition-name: route-badge-${safeId}`}>\n                      {route.id}\n                    </span>',
    '<lit-badge variant="primary" style={`view-transition-name: route-badge-${safeId}`}>\n                      {route.id}\n                    </lit-badge>'
);

fs.writeFileSync(path, content);
