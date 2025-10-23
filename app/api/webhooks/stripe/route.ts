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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getPlanFromPriceId(priceId: string): { plan: string; limit: number } {
  const starter = process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER;
  const pro = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO;
  const enterprise = process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE;

  console.log('🔍 Checking price:', priceId);
  console.log('📋 Starter:', starter);
  console.log('📋 Pro:', pro);
  console.log('📋 Enterprise:', enterprise);

  if (priceId === starter) {
    return { plan: 'starter', limit: 15 };
  } else if (priceId === pro) {
    return { plan: 'pro', limit: 40 };
  } else if (priceId === enterprise) {
    return { plan: 'enterprise', limit: 65 };
  }
  
  console.warn('⚠️ Price ID inconnu, retour à free');
  return { plan: 'free', limit: 3 };
}

export async function POST(req: Request) {
  console.log('🔵 === WEBHOOK STRIPE APPELÉ ===');
  
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('❌ Signature Stripe manquante');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('✅ Event vérifié:', event.type);
  } catch (err: any) {
    console.error('❌ Verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Checkout session completed');
        console.log('📧 Customer email:', session.customer_email);
        console.log('🆔 Client reference ID:', session.client_reference_id);

        const userId = session.client_reference_id || session.metadata?.user_id;
        if (!userId) {
          console.error('❌ User ID manquant dans session');
          break;
        }

        const subscriptionId = session.subscription as string;
        if (!subscriptionId) {
          console.error('❌ Subscription ID manquant');
          break;
        }

        console.log('📥 Récupération subscription Stripe:', subscriptionId);
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;
        const customerId = subscription.customer as string;
        const { plan, limit } = getPlanFromPriceId(priceId);

        console.log(`🎯 Plan détecté: ${plan} avec limite ${limit}`);

        // Mise à jour du profil
        console.log('📝 Mise à jour profile pour user:', userId);
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: plan,
            templates_limit: limit,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Erreur update profile:', updateError);
        } else {
          console.log('✅ Profile mis à jour');
        }

        // Création subscription
        console.log('📝 Création/update subscription dans Supabase');
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
          console.error('❌ Erreur create subscription:', subError);
        } else {
          console.log('✅ Subscription créée dans Supabase');
        }

        console.log('🎉 CHECKOUT COMPLETED TRAITÉ AVEC SUCCÈS');
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0].price.id;
        const { plan, limit } = getPlanFromPriceId(priceId);

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status,
            price_id: priceId,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        const { data: subData } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('id', subscription.id)
          .single();

        if (subData) {
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_tier: plan,
              templates_limit: limit,
              updated_at: new Date().toISOString(),
            })
            .eq('id', subData.user_id);
        }

        console.log('✅ Subscription updated');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await supabaseAdmin
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        const { data: subData } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('id', subscription.id)
          .single();

        if (subData) {
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_tier: 'free',
              templates_limit: 3,
              updated_at: new Date().toISOString(),
            })
            .eq('id', subData.user_id);
        }

        console.log('✅ Subscription canceled');
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_end: new Date((invoice.period_end || 0) * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId);
          console.log('✅ Invoice paid');
        }
        break;
      }

      default:
        console.log(`⚠️ Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Erreur webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
