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

        // Trouver l'utilisateur de plusieurs façons
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

        // Update profile
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

        // Create/update subscription
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

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log('🔄 === SUBSCRIPTION UPDATED ===');
        console.log('🆔 Subscription ID:', subscription.id);
        console.log('📊 Statut:', subscription.status);
        console.log('🆔 Customer ID:', subscription.customer);

        const priceId = subscription.items.data[0].price.id;
        const { plan, limit } = getPlanFromPriceId(priceId);

        // Trouver l'utilisateur de plusieurs façons
        let profile = null;

        // Méthode 1 : Chercher par stripe_customer_id
        const { data: profileByCustomerId, error: errorById } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (profileByCustomerId && !errorById) {
          profile = profileByCustomerId;
          console.log('✅ User trouvé par stripe_customer_id:', profile.email);
        } else {
          console.warn('⚠️ Pas trouvé par stripe_customer_id, recherche par email...');
          
          // Méthode 2 : Récupérer l'email depuis Stripe et chercher dans Supabase
          try {
            const customer = await stripe.customers.retrieve(subscription.customer as string);
            
            if (customer && !customer.deleted && customer.email) {
              console.log('📧 Email récupéré depuis Stripe:', customer.email);
              
              const { data: profileByEmail, error: errorByEmail } = await supabaseAdmin
                .from('profiles')
                .select('id, email')
                .eq('email', customer.email)
                .single();
              
              if (profileByEmail && !errorByEmail) {
                profile = profileByEmail;
                console.log('✅ User trouvé par email:', profile.email);
                
                // Mettre à jour le stripe_customer_id manquant
                await supabaseAdmin
                  .from('profiles')
                  .update({ stripe_customer_id: subscription.customer })
                  .eq('id', profile.id);
                
                console.log('✅ stripe_customer_id mis à jour');
              }
            }
          } catch (stripeError: any) {
            console.error('❌ Erreur récupération customer Stripe:', stripeError.message);
          }
        }

        if (!profile) {
          console.error('❌ Profil non trouvé pour customer:', subscription.customer);
          // Ne pas retourner d'erreur pour éviter que Stripe réessaie en boucle
          return NextResponse.json({ 
            received: true, 
            warning: 'Profile not found but acknowledged' 
          }, { status: 200 });
        }

        // Mettre à jour le profil (passer à "free" si annulé)
        const newPlan = subscription.status === 'active' ? plan : 'free';
        const newLimit = subscription.status === 'active' ? limit : 3;

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: newPlan,
            templates_limit: newLimit,
            stripe_customer_id: subscription.customer,
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
          .upsert({
            id: subscription.id,
            user_id: profile.id,
            stripe_customer_id: subscription.customer,
            status: subscription.status,
            price_id: priceId,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          });

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
