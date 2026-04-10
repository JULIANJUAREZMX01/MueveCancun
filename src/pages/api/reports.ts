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
export const prerender = false;

import type { APIRoute } from 'astro';


const GITHUB_OWNER = 'JULIANJUAREZMX01';
const GITHUB_REPO  = 'MueveCancun';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const { route_id, issue_type, description, location, lat, lng } = body;

    // Validate and coerce required fields to strings
    if (typeof issue_type !== 'string' || !issue_type.trim() ||
        typeof description !== 'string' || !description.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: issue_type, description must be non-empty strings', code: 'INVALID_INPUT' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const issueType = issue_type.trim();
    const desc = description.trim();

    if (desc.length > 500) {
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
    const titleSnippet = desc.substring(0, 60);
    const issueTitle = `[${issueType.toUpperCase()}]${route_id ? ` ${route_id}` : ''} — ${titleSnippet}${desc.length > 60 ? '...' : ''}`;

    // Validate coordinates: use null/undefined checks and verify finite numbers
    const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
    const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
    const hasCoords = lat != null && lng != null && isFinite(latNum) && isFinite(lngNum);

    const issueParts = [
      `**Tipo:** ${issueType}`,
      route_id   ? `**Ruta:** ${route_id}`            : null,
      `**Descripción:** ${desc}`,
      location   ? `**Ubicación:** ${location}`        : null,
      hasCoords  ? `**Coordenadas:** ${latNum}, ${lngNum}` : null,
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
          labels: ['citizen-report', issueType],
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
