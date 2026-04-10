/**
 * src/pages/api/checkout.ts
 * Crea sesiones de pago Stripe — Vercel SSR
 * POST /api/checkout { tier, email }
 */
import type { APIRoute } from "astro";
import { createCheckoutSession } from "../../lib/stripe";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { tier?: string; email?: string };
    const { tier, email } = body;

    if (!tier) {
      return new Response(JSON.stringify({ error: "tier requerido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const session = await createCheckoutSession({ tier, email });

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[checkout] Error:", err?.message ?? err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Error interno" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
