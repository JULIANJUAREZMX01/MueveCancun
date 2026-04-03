import Stripe from 'stripe';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (typeof window !== 'undefined') throw new Error('Stripe must be initialized server-side. Ensure this function is called from an API route or server component.');
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('[Stripe] STRIPE_SECRET_KEY environment variable is not set. Ensure it is configured in your deployment environment.');
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export async function createCheckoutSession(
  tier: 'shield' | 'architect',
  email: string
) {
  const stripe = getStripe();
  try {
    const prices: any = {
      shield: 300,      // .00 en centavos
      architect: 1000,  // 0.00
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: tier === 'shield' ? 'Shield Guardian' : 'Nexus Architect',
              description: tier === 'shield'
                ? 'Monthly support for MueveCancún'
                : 'Architect tier with API access',
              images: ['https://querutamellevacancun.onrender.com/logo.png'],
            },
            unit_amount: prices[tier],
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      billing_cycle_anchor: Math.floor(Date.now() / 1000),
      subscription_data: {
        metadata: {
          tier, email,
          source: 'muevecancun-donate',
          city: 'cancun',
        },
      },
      success_url: `${import.meta.env.PUBLIC_URL}/donate?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${import.meta.env.PUBLIC_URL}/donate?canceled=true`,
      customer_email: email,
      locale: 'es',
    });

    return {
      url: session.url,
      sessionId: session.id,
      success: !!session.url,
    };
  } catch (error) {
    console.error('Stripe session creation failed:', error);
    throw error;
  }
}

export async function handleStripeWebhook(
  body: string,
  sig: string | undefined
) {
  const stripe = getStripe();
  if (!sig) {
    throw new Error('No signature provided');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock'
    );

    return event;
  } catch (error) {
    console.error('Webhook construction error:', error);
    throw error;
  }
}

export function getStripeProductIds() {
  return {
    shield: import.meta.env.STRIPE_SHIELD_PRICE_ID || 'price_shield_test',
    architect: import.meta.env.STRIPE_ARCHITECT_PRICE_ID || 'price_architect_test',
  };
}
