import type { APIRoute } from 'astro';

const TILE_PATTERN = /^\d+$/;
const MAX_ZOOM = 19;

export const GET: APIRoute = async ({ params }) => {
  const z = params.z ?? '';
  const x = params.x ?? '';
  const y = params.y ?? '';
  if (![z, x, y].every(value => TILE_PATTERN.test(value)) || Number(z) > MAX_ZOOM) {
    return new Response('Invalid tile coordinates', { status: 400 });
  }

  const maxCoordinate = 2 ** Number(z);
  if (Number(x) >= maxCoordinate || Number(y) >= maxCoordinate) {
    return new Response('Tile outside zoom bounds', { status: 400 });
  }

  try {
    const upstream = await fetch(`https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`, {
      headers: { 'User-Agent': 'MueveCancun/4.0 map tile proxy' },
    });
    if (!upstream.ok || !upstream.body) return new Response(null, { status: 502 });

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
        'X-Map-Source': 'carto-voyager-proxy',
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
};
