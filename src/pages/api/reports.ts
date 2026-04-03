/**
 * src/pages/api/reports.ts
 *
 * Endpoint para crear reportes ciudadanos como GitHub Issues.
 * Funciona tanto en modo SSR (output: 'server') como en modo híbrido.
 * En build SSG puro (output: 'static'), este archivo es ignorado —
 * los reportes se envían directamente desde el cliente vía ReportWidget.
 *
 * Requiere env var: GITHUB_ISSUES_TOKEN
 */
import type { APIRoute } from 'astro';


const GITHUB_OWNER = 'JULIANJUAREZMX01';
const GITHUB_REPO  = 'MueveCancun';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const { route_id, issue_type, description, location, lat, lng } = body;

    // Validaciones
    if (!issue_type || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: issue_type, description', code: 'INVALID_INPUT' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (description.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Description too long (max 500 chars)', code: 'TOO_LONG' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = import.meta.env.GITHUB_ISSUES_TOKEN;

    // Sin token: aceptar reporte pero no publicar a GitHub
    if (!token) {
      console.warn('[Reports API] GITHUB_ISSUES_TOKEN not set. Report accepted but not published.');
      return new Response(
        JSON.stringify({
          success: true,
          queued: true,
          message: 'Report accepted (queued — no GitHub token configured)',
          report_id: `rep_${Date.now()}`
        }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Construir Issue
    const titleSnippet = description.substring(0, 60);
    const issueTitle = `[${issue_type.toUpperCase()}]${route_id ? ` ${route_id}` : ''} — ${titleSnippet}${description.length > 60 ? '...' : ''}`;

    const issueParts = [
      `**Tipo:** ${issue_type}`,
      route_id   ? `**Ruta:** ${route_id}`          : null,
      `**Descripción:** ${description}`,
      location   ? `**Ubicación:** ${location}`      : null,
      (lat && lng) ? `**Coordenadas:** ${lat}, ${lng}` : null,
      `**Timestamp:** ${new Date().toISOString()}`,
    ].filter(Boolean);

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
          'Accept':        'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          title:  issueTitle,
          body:   issueParts.join('\n'),
          labels: ['citizen-report', issue_type],
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Reports API] GitHub error:', res.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to create GitHub issue', code: 'GITHUB_ERROR' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const issue = await res.json() as { number: number; html_url: string };

    return new Response(
      JSON.stringify({
        success:   true,
        message:   'Report submitted successfully',
        report_id: `gh_${issue.number}`,
        url:       issue.html_url,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Reports API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ status: 'Reports API operational', version: '3.4.0' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
