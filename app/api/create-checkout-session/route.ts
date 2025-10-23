import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(req: Request) {
  try {
    const { priceId } = await req.json();

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    console.log('✅ Création session Stripe pour:', user.email, 'UUID:', user.id);

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      client_reference_id: user.id, // TRÈS IMPORTANT pour le lien webhook
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://atlasbuilder.app'}/generate?success=true`,
cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://atlasbuilder.app'}/pricing?canceled=true`,

      
      // 👇 LIGNE AJOUTÉE : Active les codes promotionnels
      allow_promotion_codes: true,
      
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
    });

    console.log('🟢 Session Stripe créée, url:', session.url);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('❌ Erreur Stripe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
