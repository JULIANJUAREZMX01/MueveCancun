export const prerender = true;
import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

export const GET: APIRoute = async () => {
  try {
    // Servir master_routes.json directamente — tiene 78/78 rutas con colores
    const masterPath = path.resolve('./public/data/master_routes.json');
    const content = await fs.readFile(masterPath, 'utf-8');
    return new Response(content, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
    });
  } catch {
    return new Response(JSON.stringify({ rutas: [], metadata: { version: "3.9.0", error: "master_routes not found" } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
