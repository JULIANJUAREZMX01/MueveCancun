/**
 * stripe.ts — Cliente Stripe para MueveCancún
 *
 * Usa Price IDs reales de la cuenta live de Stripe.
 * Los Payment Links son la estrategia principal (funciona con output:static).
 * El checkout dinámico via API requiere output:server (Fase 2 / Sprint 2).
 *
 * PAYMENT LINKS ACTIVOS (Stripe Dashboard):
 *   shield:    https://buy.stripe.com/4gM5kw4ky1Ho12ccPp7AI02  → MXN $60/mes
 *   architect: https://buy.stripe.com/9B6fZaaIWfyefX62aL7AI03  → MXN $200/mes
 *
 * PRICE IDs (para checkout dinámico futuro):
 *   shield:    price_1THXsL2dM2f4HRxoguzdYtAA  → MXN $60/mes
 *   architect: price_1THXz62dM2f4HRxorlJHnhIA  → MXN $200/mes
 */

import Stripe from 'stripe';

// ─── Singleton del cliente ────────────────────────────────────────────────────

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (typeof window !== 'undefined') {
    throw new Error('[Stripe] Must be initialized server-side only.');
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('[Stripe] STRIPE_SECRET_KEY not set.');
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil',
    });
  }
  return _stripe;
}

// ─── Price IDs reales (live) ──────────────────────────────────────────────────

export const PRICE_IDS = {
  shield:    'price_1THXsL2dM2f4HRxoguzdYtAA',  // MXN $60/mes
  architect: 'price_1THXz62dM2f4HRxorlJHnhIA',  // MXN $200/mes
} as const;

// ─── Payment Links directos (funciona en output:static sin API) ───────────────

export const PAYMENT_LINKS = {
  shield:    'https://buy.stripe.com/4gM5kw4ky1Ho12ccPp7AI02',
  architect: 'https://buy.stripe.com/9B6fZaaIWfyefX62aL7AI03',
} as const;

export type Tier = keyof typeof PRICE_IDS;

// ─── Checkout dinámico (requiere output:server — Sprint 2) ────────────────────

export async function createCheckoutSession(tier: Tier, email: string) {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
    mode: 'subscription',
    subscription_data: {
      metadata: { tier, email, source: 'muevecancun-donate', city: 'cancun' },
    },
    success_url: `${process.env.PUBLIC_URL || 'https://querutamellevacancun.onrender.com'}/es/donate?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.PUBLIC_URL || 'https://querutamellevacancun.onrender.com'}/es/donate?canceled=true`,
    customer_email: email,
    locale: 'es',
  });

  return { url: session.url, sessionId: session.id, success: !!session.url };
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

export async function handleStripeWebhook(body: string, sig: string | undefined) {
  const stripe = getStripe();

  if (!sig) throw new Error('[Stripe Webhook] Missing stripe-signature header.');

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret === 'whsec_mock') {
    throw new Error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured.');
  }

  return stripe.webhooks.constructEvent(body, sig, webhookSecret);
}
