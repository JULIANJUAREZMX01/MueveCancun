import type { APIRoute } from 'astro';
import { handleStripeWebhook } from '../../../lib/stripe';
import { saveGuardian, recordPayment } from '../../../lib/guardians';

export const POST: APIRoute = async (context) => {
  const sig = context.request.headers.get('stripe-signature');
  const body = await context.request.text();

  if (!sig) {
    return new Response(
      JSON.stringify({ error: 'No signature provided' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const event = await handleStripeWebhook(body, sig);

    console.log(`[Webhook] Received event: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
        const subscription = event.data.object as any;
        await saveGuardian({
          email: subscription.metadata?.email || 'unknown',
          stripe_customer_id: subscription.customer,
          tier: subscription.metadata?.tier || 'shield',
          amount_monthly: (subscription.items?.data[0]?.price?.unit_amount || 300) / 100,
          status: 'active',
        });
        console.log('✅ Guardian created:', subscription.customer);
        break;

      case 'customer.subscription.deleted':
        await saveGuardian({
          stripe_customer_id: (event.data.object as any).customer,
          status: 'cancelled',
        });
        console.log('❌ Guardian cancelled:', (event.data.object as any).customer);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as any;
        await recordPayment({
          stripe_customer_id: invoice.customer,
          amount: invoice.amount_paid / 100,
          status: 'success',
          stripe_payment_id: invoice.id,
        });
        console.log('💳 Payment succeeded:', invoice.id);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as any;
        await recordPayment({
          stripe_customer_id: failedInvoice.customer,
          status: 'failed',
          stripe_payment_id: failedInvoice.id,
        });
        console.log('❌ Payment failed:', failedInvoice.id);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Webhook] Error:', error.message);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
