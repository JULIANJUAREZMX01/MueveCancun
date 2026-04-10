/**
 * src/pages/api/webhooks/stripe.ts
 * Webhook de Stripe para eventos de suscripción y pagos.
 */
import type { APIRoute } from 'astro';
import { handleStripeWebhook } from '../../../lib/stripe';
import { saveGuardian, recordPayment } from '../../../lib/guardians';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const sig  = context.request.headers.get('stripe-signature') ?? undefined;
  const body = await context.request.text();

  if (!sig) {
    return new Response(
      JSON.stringify({ error: 'Missing stripe-signature header' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let event;
  try {
    event = await handleStripeWebhook(body, sig);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook verification failed';
    console.error('[Stripe Webhook] Signature verification failed:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[Stripe Webhook] ✅ Event: ${event.type}`);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        const meta = sub.metadata ?? {};
        const priceUnit = sub.items?.data?.[0]?.price?.unit_amount ?? 6000;

        await saveGuardian({
          email:              meta.email ?? 'unknown',
          stripe_customer_id: String(sub.customer),
          tier:               (meta.tier as 'shield' | 'architect') ?? 'shield',
          amount_monthly:     priceUnit / 100,
          status:             sub.status === 'active' ? 'active' : 'failed',
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        await saveGuardian({
          stripe_customer_id: String(sub.customer),
          status: 'cancelled',
        });
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        await recordPayment({
          stripe_customer_id: String(invoice.customer),
          amount:             Number(invoice.amount_paid ?? 0) / 100,
          status:             'success',
          stripe_payment_id:  String(invoice.id),
        });
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true, type: event.type }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Handler error';
    console.error(`[Stripe Webhook] Handler error for ${event.type}:`, err);
    return new Response(
      JSON.stringify({ received: true, error: msg }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
