import type { APIRoute } from 'astro';

export const prerender = false;

const TIPO_TITLES: Record<string, string> = {
  precio:     'Precio incorrecto',
  ruta:       'Ruta / destino mal',
  nueva:      'Ruta nueva no listada',
  cancelada:  'Ruta cancelada o fuera de servicio',
  comentario: 'Información importante',
};

const TIPO_LABELS: Record<string, string[]> = {
  precio:     ['reporte:precio',    'estado:pendiente'],
  ruta:       ['reporte:ruta',      'estado:pendiente'],
  nueva:      ['reporte:nueva-ruta','estado:pendiente'],
  cancelada:  ['reporte:cancelada', 'estado:pendiente'],
  comentario: ['reporte:info',      'estado:pendiente'],
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { tipo, ruta, descripcion, lat, lng, repoOwner: propRepoOwner, repoName: propRepoName, userAgent, url } = data;

    if (!tipo || !TIPO_TITLES[tipo]) {
      return new Response(JSON.stringify({ error: 'Tipo de reporte inválido.' }), { status: 400 });
    }

    if (!descripcion || descripcion.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'La descripción es muy corta.' }), { status: 400 });
    }

    const repoOwner = propRepoOwner ?? import.meta.env.GITHUB_REPO_OWNER ?? 'JULIANJUAREZMX01';
    const repoName  = propRepoName  ?? import.meta.env.GITHUB_REPO_NAME  ?? 'MueveCancun';
    const githubToken = import.meta.env.GITHUB_ISSUES_TOKEN;

    if (!githubToken) {
      console.error('[API/report] GITHUB_ISSUES_TOKEN is not configured.');
      return new Response(JSON.stringify({ error: 'Error de configuración en el servidor.' }), { status: 500 });
    }

    const geoSection = lat && lng
      ? `\n## 📍 Ubicación del reporte\n\`${lat}, ${lng}\`\n[Ver en mapa](https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng})\n`
      : '';

    const body = `## 📋 Reporte ciudadano — MueveCancun

**Tipo:** ${TIPO_TITLES[tipo] ?? tipo}
**Ruta afectada:** ${ruta || '_No especificada_'}
**Fecha:** ${new Date().toLocaleString('es-MX', { timeZone: 'America/Cancun' })} (Hora Cancún)

## 📝 Descripción

${descripcion}
${geoSection}
---
_Reportado desde: ${url}_
_Dispositivo: ${userAgent}_
_Versión: Nexus Protocol 1.1_
`;

    const issuePayload = {
      title:  `[REPORTE] ${TIPO_TITLES[tipo] ?? tipo}${ruta ? ` — ${ruta}` : ''}`,
      body,
      labels: TIPO_LABELS[tipo] ?? ['reporte', 'estado:pendiente'],
    };

    const res = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
      {
        method: 'POST',
        headers: {
          'Accept':               'application/vnd.github+json',
          'Authorization':        `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type':         'application/json',
          'User-Agent':           'MueveCancun-Report-Widget',
        },
        body: JSON.stringify(issuePayload),
      }
    );

    if (res.ok) {
      const issue = await res.json();
      return new Response(JSON.stringify({ number: issue.number }), { status: 200 });
    } else {
      const errData = await res.json().catch(() => ({}));
      console.error('[API/report] GitHub API error:', res.status, errData);
      return new Response(JSON.stringify({ error: `Error de GitHub: ${res.status}` }), { status: res.status });
    }
  } catch (err) {
    console.error('[API/report] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
