import type { APIRoute } from 'astro';
import { createCheckoutSession } from '../../lib/stripe';

export const POST: APIRoute = async (context) => {
  try {
    const { tier, email } = await context.request.json();

    // Validations
    if (!tier || !email) {
      return new Response(
        JSON.stringify({
          error: 'Missing tier or email',
          code: 'INVALID_INPUT',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!['shield', 'architect'].includes(tier)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid tier',
          code: 'INVALID_TIER',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create session
    const session = await createCheckoutSession(tier, email);

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.sessionId,
        success: session.success,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Checkout failed',
        code: 'CHECKOUT_ERROR',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const GET: APIRoute = async () => {
    return new Response(
        JSON.stringify({ status: 'Checkout API is running' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
};
