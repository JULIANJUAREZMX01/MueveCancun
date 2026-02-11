import { getAllRoutes } from '../../lib/routes';

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

// In SSG mode (output: static), this file will be generated as /api/master_routes.json
export async function getStaticPaths() {
    return [];
}
