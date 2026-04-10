import { getAllRoutes } from '../../utils/routes';

export const prerender = true;

export async function GET() {
  const routes = await getAllRoutes();
  return new Response(JSON.stringify({
    version: "2.3.0-aggregated",
    rutas: routes
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
