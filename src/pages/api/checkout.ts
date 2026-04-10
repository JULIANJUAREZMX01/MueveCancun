/**
 * src/pages/api/checkout.ts
 *
 * Crea sesiones de pago Stripe.
 *
 * Astro v5 + output:'static': este endpoint se compila como SSG.
 * Para servir como endpoint dinámico en producción, Render debe
 * correr Node.js con output:'server' + @astrojs/node (migración futura).
 * Por ahora, las páginas de donate usan Stripe Checkout links directos.
 *
 * Requiere env vars: STRIPE_SECRET_KEY, PUBLIC_URL
 */
import type { APIRoute } from 'astro';
import { createCheckoutSession } from '../../lib/stripe';


export const POST: APIRoute = async (context) => {
  try {
    const { tier, email } = await context.request.json() as { tier?: string; email?: string };

    if (!tier || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing tier or email', code: 'INVALID_INPUT' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['shield', 'architect'].includes(tier)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier. Use: shield | architect', code: 'INVALID_TIER' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email básico validation
    if (!email.includes('@') || email.length > 254) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format', code: 'INVALID_EMAIL' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = await createCheckoutSession(tier as 'shield' | 'architect', email);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.sessionId, success: session.success }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Checkout failed';
    console.error('[Checkout API] Error:', error);
    return new Response(
      JSON.stringify({ error: msg, code: 'CHECKOUT_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ status: 'Checkout API operational', version: '3.4.0' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

export const prerender = false;
