/**
 * POST /api/webhooks/stripe
 * Recibe eventos de Stripe y actualiza Neon DB.
 * URL: https://mueve-cancun.vercel.app/api/webhooks/stripe
 */
import type { APIRoute } from "astro";
import Stripe from "stripe";
import { saveGuardian, recordPayment } from "../../../lib/db-provider";

export const prerender = false;

const getStripe = () =>
  new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
    apiVersion: "2025-03-31.basil",
  });

export const POST: APIRoute = async ({ request }) => {
  const sig    = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return new Response(JSON.stringify({ error: "Firma Stripe requerida" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  const stripe = getStripe();
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    console.error("[webhook] Firma invalida:", err.message);
    return new Response(JSON.stringify({ error: "Firma invalida" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("[webhook] Evento:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email      = session.customer_details?.email ?? session.customer_email ?? "";
        const customerId = String(session.customer ?? "");
        const tier       = (session.metadata?.tier ?? "shield") as "shield" | "architect";
        const amount     = (session.amount_total ?? 0) / 100;
        await saveGuardian({ email, stripe_customer_id: customerId, tier, amount_monthly: amount, status: "active" });
        await recordPayment({ stripe_customer_id: customerId, event_type: "checkout.session.completed", amount, session_id: session.id });
        break;
      }
      case "customer.subscription.updated": {
        const sub  = event.data.object as Stripe.Subscription;
        const stat = sub.status === "active" ? "active" : "inactive";
        await saveGuardian({ stripe_customer_id: String(sub.customer), status: stat });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await saveGuardian({ stripe_customer_id: String(sub.customer), status: "cancelled" });
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        await saveGuardian({ stripe_customer_id: String(inv.customer), status: "past_due" });
        break;
      }
      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        await recordPayment({ stripe_customer_id: String(inv.customer), event_type: "invoice.payment_succeeded", amount: (inv.amount_paid ?? 0) / 100, invoice_id: inv.id });
        break;
      }
      default:
        console.log("[webhook] Evento no manejado:", event.type);
    }
  } catch (err: any) {
    console.error("[webhook] Error procesando evento:", err.message);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
