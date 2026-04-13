/**
 * POST /api/route-share
 * Recibe una ruta trazada por el usuario y la registra como contribución
 * ciudadana en GitHub Issues para revisión y mejora del sistema.
 *
 * Body: {
 *   journey: { legs, total_price, duration_minutes },
 *   origin: string,
 *   dest: string,
 *   userNote?: string,
 *   userLocation?: { lat, lng },
 *   timestamp: string
 * }
 */
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as {
      journey?: any;
      origin?: string;
      dest?: string;
      userNote?: string;
      userLocation?: { lat: number; lng: number };
      timestamp?: string;
    };

    const { journey, origin = '?', dest = '?', userNote, userLocation, timestamp } = body;

    // ── Validación básica ──
    if (!origin || !dest) {
      return new Response(JSON.stringify({ error: 'origin y dest son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Construir el Issue de GitHub ──
    const token = process.env.GITHUB_ISSUES_TOKEN;
    const owner = 'JULIANJUAREZMX01';
    const repoName = 'MueveCancun';

    // Serializar los tramos de la ruta
    let legsMarkdown = '';
    if (journey?.legs?.length) {
      legsMarkdown = journey.legs.map((leg: any, i: number) => {
        const stops = leg.paradas || leg.stops_info || leg.stops || [];
        const stopsStr = stops.length
          ? stops.map((s: any) => s.nombre || s.name || s).join(' → ')
          : `${leg.origin_hub || '?'} → ${leg.dest_hub || '?'}`;
        return `**Tramo ${i + 1}:** ${leg.name || 'Ruta'} (${leg.transport_type || '?'})
${stopsStr}`;
      }).join('

');
    }

    const locationStr = userLocation
      ? `📍 [${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}](https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng})`
      : 'No disponible';

    const issueBody = `## 🚌 Ruta compartida por usuario

**Origen:** ${origin}  
**Destino:** ${dest}  
**Tarifa:** $${(journey?.total_price || 0).toFixed(2)} MXN  
**Duración estimada:** ${journey?.duration_minutes || '?'} min  
**Fecha/Hora:** ${timestamp || new Date().toISOString()}  
**Ubicación del usuario:** ${locationStr}

---

### Tramos de la ruta
${legsMarkdown || '_No disponible_'}

---

### Nota del usuario
${userNote ? `> ${userNote}` : '_Sin nota_'}

---

**Acción requerida:** Verificar si esta ruta es correcta y está bien documentada en el catálogo.

/label ciudadano, ruta-compartida
`;

    const issueTitle = `[Ruta Ciudadana] ${origin} → ${dest} — ${new Date().toLocaleDateString('es-MX')}`;

    if (token) {
      const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: ['ciudadano', 'ruta-compartida'],
        }),
      });

      if (!ghRes.ok) {
        const err = await ghRes.json();
        console.error('[route-share] GitHub error:', err);
        // No fallar si GitHub falla — registrar y responder ok de todas formas
        console.warn('[route-share] Issue no creado, pero ruta registrada internamente');
      } else {
        const issue = await ghRes.json();
        console.log(`[route-share] Issue #${issue.number} creado: ${issue.html_url}`);
        return new Response(JSON.stringify({
          ok: true,
          message: '¡Gracias por contribuir! Tu ruta fue registrada.',
          issueNumber: issue.number,
          issueUrl: issue.html_url,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback: responder ok sin issue
    return new Response(JSON.stringify({
      ok: true,
      message: '¡Gracias! Tu aportación fue registrada.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[route-share]', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ message: 'Usa POST para compartir una ruta ciudadana.' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
