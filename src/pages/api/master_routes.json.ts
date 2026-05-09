import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

export const GET: APIRoute = async () => {
  try {
    // In Vercel SSR, public/ files are available at process.cwd()/public/data/
    // Try multiple paths for robustness
    const candidates = [
      path.resolve('./public/data/master_routes.json'),
      path.resolve(process.cwd(), 'public/data/master_routes.json'),
      path.resolve('/var/task/public/data/master_routes.json'),
    ];

    let content: string | null = null;
    for (const p of candidates) {
      try {
        content = await fs.readFile(p, 'utf-8');
        break;
      } catch {
        continue;
      }
    }

    if (content) {
      return new Response(content, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600, s-maxage=7200',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Fallback: empty routes
    return new Response(
      JSON.stringify({ rutas: [], metadata: { version: "3.9.0", error: "master_routes not found" } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[api/master_routes] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
