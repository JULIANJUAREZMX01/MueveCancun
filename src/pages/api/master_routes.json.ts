export const prerender = true;
import type { APIRoute } from 'astro';
import { getAllRoutes } from '../../utils/routes';

export const GET: APIRoute = async () => {
  const routes = await getAllRoutes();
  return new Response(
    JSON.stringify({ rutas: routes, metadata: { version: "3.7.0", generated: new Date().toISOString() } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
