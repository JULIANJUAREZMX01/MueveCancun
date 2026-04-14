export const prerender = true;
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ status: 'Operational', mode: 'Static' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
