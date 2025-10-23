import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getPlanFromPriceId(priceId: string): { plan: string; limit: number } {
  const prices = {
    starter: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
    pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE,
  };

  console.log('🔍 Price ID reçu:', priceId);
  console.log('📋 Prix configurés:', prices);

  if (priceId === prices.starter) return { plan: 'starter', limit: 15 };
  if (priceId === prices.pro) return { plan: 'pro', limit: 40 };
  if (priceId === prices.enterprise) return { plan: 'enterprise', limit: 65 };
  
  console.warn('⚠️ Price ID non reconnu');
  return { plan: 'free', limit: 3 };
}

export async function POST(req: Request) {
  console.log('🔵 === WEBHOOK STRIPE REÇU ===');
  
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('❌ Pas de signature Stripe');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      console.log('✅ Event Stripe vérifié:', event.type);
    } catch (err: any) {
      console.error('❌ Erreur vérification signature:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('💳 Checkout completed pour:', session.customer_email);
        console.log('🆔 Client reference ID:', session.client_reference_id);
        console.log('🆔 Metadata user_id:', session.metadata?.user_id);

        const userId = session.client_reference_id || session.metadata?.user_id;
        if (!userId) {
          console.error('❌ User ID manquant');
          return NextResponse.json({ error: 'No user ID' }, { status: 400 });
        }

        const subscriptionId = session.subscription as string;
        if (!subscriptionId) {
          console.error('❌ Subscription ID manquant');
          return NextResponse.json({ error: 'No subscription ID' }, { status: 400 });
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;
        const customerId = subscription.customer as string;
        const { plan, limit } = getPlanFromPriceId(priceId);

        console.log(`🎯 Plan: ${plan}, Limite: ${limit}`);

        // Update profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: plan,
            templates_limit: limit,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (profileError) {
          console.error('❌ Erreur update profile:', profileError);
        } else {
          console.log('✅ Profile mis à jour');
        }

        // Create/update subscription
        const { error: subError } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            id: subscriptionId,
            user_id: userId,
            stripe_customer_id: customerId,
            status: subscription.status,
            price_id: priceId,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (subError) {
          console.error('❌ Erreur subscription:', subError);
        } else {
          console.log('✅ Subscription créée');
        }

        console.log('🎉 CHECKOUT TRAITÉ AVEC SUCCÈS');
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        console.log(`📨 Event ${event.type} reçu`);
        // Ajoute la logique si nécessaire
        break;

      default:
        console.log(`⚠️ Event non géré: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Erreur globale webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
