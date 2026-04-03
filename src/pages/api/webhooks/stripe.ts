/**
 * src/pages/api/webhooks/stripe.ts
 *
 * Webhook de Stripe para eventos de suscripción y pagos.
 * Requiere `output: 'hybrid'` en astro.config.ts.
 *
 * Requiere env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 *
 * Configurar en Stripe Dashboard:
 *   Endpoint URL: https://querutamellevacancun.onrender.com/api/webhooks/stripe
 *   Eventos:
 *     - customer.subscription.created
 *     - customer.subscription.updated
 *     - customer.subscription.deleted
 *     - invoice.payment_succeeded
 *     - invoice.payment_failed
 */
import type { APIRoute } from 'astro';
import { handleStripeWebhook } from '../../../lib/stripe';
import { saveGuardian, recordPayment } from '../../../lib/guardians';


export const POST: APIRoute = async (context) => {
  const sig  = context.request.headers.get('stripe-signature');
  const body = await context.request.text();

  if (!sig) {
    return new Response(
      JSON.stringify({ error: 'Missing stripe-signature header' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let event: Awaited<ReturnType<typeof handleStripeWebhook>>;

  try {
    event = await handleStripeWebhook(body, sig);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook verification failed';
    console.error('[Stripe Webhook] Signature verification failed:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[Stripe Webhook] Event: ${event.type}`);

  try {
    switch (event.type) {

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Record<string, unknown>;
        const meta = (sub.metadata as Record<string, string>) ?? {};
        const priceUnit = (sub as any).items?.data?.[0]?.price?.unit_amount ?? 300;

        await saveGuardian({
          email:            meta.email ?? 'unknown',
          stripe_customer_id: String(sub.customer),
          tier:             (meta.tier as 'shield' | 'architect') ?? 'shield',
          amount_monthly:   priceUnit / 100,
          status:           (sub.status as string) === 'active' ? 'active' : 'failed',
        });
        console.log(`[Stripe Webhook] Guardian upserted: ${sub.customer}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Record<string, unknown>;
        await saveGuardian({
          stripe_customer_id: String(sub.customer),
          status: 'cancelled',
        });
        console.log(`[Stripe Webhook] Guardian cancelled: ${sub.customer}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Record<string, unknown>;
        await recordPayment({
          stripe_customer_id: String(invoice.customer),
          amount:             Number(invoice.amount_paid ?? 0) / 100,
          status:             'success',
          stripe_payment_id:  String(invoice.id),
        });
        console.log(`[Stripe Webhook] Payment succeeded: ${invoice.id} — $${Number(invoice.amount_paid ?? 0) / 100}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Record<string, unknown>;
        await recordPayment({
          stripe_customer_id: String(invoice.customer),
          amount:             Number(invoice.amount_due ?? 0) / 100,
          status:             'failed',
          stripe_payment_id:  String(invoice.id),
        });
        await saveGuardian({
          stripe_customer_id: String(invoice.customer),
          status: 'failed',
        });
        console.log(`[Stripe Webhook] Payment failed: ${invoice.id}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true, type: event.type }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Handler error';
    console.error(`[Stripe Webhook] Handler error for ${event.type}:`, err);
    // Return 200 to prevent Stripe retries for logic errors
    return new Response(
      JSON.stringify({ received: true, error: msg }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
