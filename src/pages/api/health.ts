import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      version: '2.0.0', // MueveReparto version
      timestamp: Date.now(),
      message: 'MueveCancun API is healthy',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
};
