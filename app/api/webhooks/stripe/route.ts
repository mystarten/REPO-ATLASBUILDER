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

  if (priceId === prices.starter) return { plan: 'starter', limit: 20 };
  if (priceId === prices.pro) return { plan: 'pro', limit: 40 };
  if (priceId === prices.enterprise) return { plan: 'enterprise', limit: 999999 };
  
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
        
        console.log('💳 === CHECKOUT COMPLETED ===');
        console.log('📧 Email:', session.customer_email);
        console.log('🆔 Client reference ID:', session.client_reference_id);
        console.log('🆔 Metadata user_id:', session.metadata?.user_id);

        // AMÉLIORATION 1 : Trouver l'utilisateur de plusieurs façons
        let userId = session.client_reference_id || session.metadata?.user_id;
        
        // Si pas d'user_id, chercher par email dans Supabase
        if (!userId && session.customer_email) {
          console.log('⚠️ Pas d\'user_id trouvé, recherche par email...');
          
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', session.customer_email)
            .single();
          
          if (profile && !profileError) {
            userId = profile.id;
            console.log('✅ User trouvé par email:', userId);
          } else {
            console.error('❌ User non trouvé par email:', profileError);
            return NextResponse.json({ error: 'User not found' }, { status: 400 });
          }
        }

        if (!userId) {
          console.error('❌ Impossible de trouver l\'utilisateur');
          return NextResponse.json({ error: 'No user identification' }, { status: 400 });
        }

        const subscriptionId = session.subscription as string;
        if (!subscriptionId) {
          console.error('❌ Subscription ID manquant');
          return NextResponse.json({ error: 'No subscription ID' }, { status: 400 });
        }

        // Récupérer les détails de l'abonnement depuis Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;
        const customerId = subscription.customer as string;
        const { plan, limit } = getPlanFromPriceId(priceId);

        console.log(`🎯 Plan identifié: ${plan}`);
        console.log(`📊 Limite: ${limit} templates`);

        // AMÉLIORATION 2 : Update profile avec plus de détails
        const { data: updatedProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: plan,
            templates_limit: limit,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select();

        if (profileError) {
          console.error('❌ Erreur update profile:', profileError);
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        } else {
          console.log('✅ Profile mis à jour:', updatedProfile);
        }

        // AMÉLIORATION 3 : Create/update subscription
        const { data: createdSub, error: subError } = await supabaseAdmin
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
          })
          .select();

        if (subError) {
          console.error('❌ Erreur subscription:', subError);
        } else {
          console.log('✅ Subscription créée/mise à jour:', createdSub);
        }

        console.log('🎉 === CHECKOUT TRAITÉ AVEC SUCCÈS ===');
        break;
      }

      // AMÉLIORATION 4 : Gérer les mises à jour d'abonnement (renouvellements, changements de plan)
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log('🔄 === SUBSCRIPTION UPDATED ===');
        console.log('🆔 Subscription ID:', subscription.id);
        console.log('📊 Statut:', subscription.status);

        const priceId = subscription.items.data[0].price.id;
        const { plan, limit } = getPlanFromPriceId(priceId);

        // Trouver l'utilisateur via stripe_customer_id
        const { data: profile, error: findError } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (!profile || findError) {
          console.error('❌ Profil non trouvé pour customer:', subscription.customer);
          return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
        }

        console.log('✅ User trouvé:', profile.email);

        // Mettre à jour le profil (passer à "free" si annulé)
        const newPlan = subscription.status === 'active' ? plan : 'free';
        const newLimit = subscription.status === 'active' ? limit : 3;

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: newPlan,
            templates_limit: newLimit,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error('❌ Erreur update profile:', updateError);
        } else {
          console.log(`✅ Profile mis à jour: ${newPlan} (${newLimit} templates)`);
        }

        // Mettre à jour la subscription
        const { error: subUpdateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status,
            price_id: priceId,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        if (subUpdateError) {
          console.error('❌ Erreur update subscription:', subUpdateError);
        } else {
          console.log('✅ Subscription mise à jour');
        }

        console.log('🎉 === SUBSCRIPTION UPDATE TRAITÉE ===');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log('🗑️ === SUBSCRIPTION DELETED ===');

        // Trouver l'utilisateur
        const { data: profile, error: findError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (profile && !findError) {
          // Remettre en plan gratuit
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_tier: 'free',
              templates_limit: 3,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);

          console.log('✅ User remis en plan gratuit');
        }

        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        console.log(`📨 Event ${event.type} reçu`);
        break;

      default:
        console.log(`⚠️ Event non géré: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('❌ === ERREUR GLOBALE WEBHOOK ===');
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
