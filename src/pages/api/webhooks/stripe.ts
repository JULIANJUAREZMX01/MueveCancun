/**
 * src/pages/api/webhooks/stripe.ts
 * Recibe eventos de Stripe y actualiza Neon DB
 * POST /api/webhooks/stripe
 *
 * Configurar en Stripe Dashboard:
 *   Endpoint: https://mueve-cancun.vercel.app/api/webhooks/stripe
 *   Eventos:  checkout.session.completed
 *             customer.subscription.updated
 *             customer.subscription.deleted
 *             invoice.payment_failed
 */
import type { APIRoute } from "astro";
import Stripe from "stripe";
import { saveGuardian, recordPayment } from "../../../lib/db-provider";

export const prerender = false;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-01-27.acacia",
});

export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return new Response(JSON.stringify({ error: "Firma Stripe requerida" }), {
      status: 400,
    });
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    console.error("[webhook] Firma inválida:", err.message);
    return new Response(JSON.stringify({ error: "Firma inválida" }), {
      status: 400,
    });
  }

  console.log(`[webhook] Evento: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_details?.email ?? session.customer_email ?? "";
        const customerId = String(session.customer ?? "");
        const tier = (session.metadata?.tier ?? "shield") as "shield" | "architect";
        const amount = (session.amount_total ?? 0) / 100;

        await saveGuardian({
          email,
          stripe_customer_id: customerId,
          tier,
          amount_monthly: amount,
          status: "active",
        });

        await recordPayment({
          stripe_customer_id: customerId,
          amount,
          status: "success",
          stripe_payment_id: session.payment_intent as string,
        });

        console.log(`[webhook] ✅ Guardián activado: ${email} | tier:${tier}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = String(sub.customer);
        const status = sub.status === "active" ? "active" : "cancelled";
        await saveGuardian({
          stripe_customer_id: customerId,
          email: "",
          status,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await saveGuardian({
          stripe_customer_id: String(sub.customer),
          email: "",
          status: "cancelled",
        });
        console.log(`[webhook] ❌ Suscripción cancelada: ${sub.customer}`);
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        await recordPayment({
          stripe_customer_id: String(inv.customer),
          amount: (inv.amount_due ?? 0) / 100,
          status: "failed",
          stripe_payment_id: String(inv.payment_intent ?? ""),
        });
        break;
      }

      default:
        console.log(`[webhook] Evento ignorado: ${event.type}`);
    }
  } catch (err: any) {
    console.error("[webhook] Error procesando evento:", err.message);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
