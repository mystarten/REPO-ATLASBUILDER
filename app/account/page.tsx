'use client';

import { useEffect, useState } from 'react';
import { Crown, Zap, CreditCard, LogOut, TrendingUp, AlertCircle, ArrowUpCircle, Sparkles, Building2, Clock, FileText, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import ManageSubscriptionButton from '@/components/ManageSubscriptionButton';


interface UsageData {
  allowed: boolean;
  current: number;
  limit: number;
  tier: string;
}

const getTierInfo = (tier: string) => {
  switch (tier) {
    case 'starter':
      return { name: 'Starter', color: 'from-blue-500 to-cyan-500', price: '9€', limit: 15 };
    case 'pro':
      return { name: 'Pro', color: 'from-purple-500 to-pink-500', price: '19€', limit: 40 };
    case 'enterprise':
      return { name: 'Enterprise', color: 'from-yellow-500 to-orange-500', price: '49€', limit: 65 };
    default:
      return { name: 'Gratuit', color: 'from-gray-500 to-gray-600', price: '0€', limit: 3 };
  }
};

export default function AccountPage() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();
  const supabase = supabaseBrowser;

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Récupérer l'utilisateur
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      setUserEmail(session.user.email || '');

      // Récupérer les données d'usage via API
      const resUsage = await fetch('/api/user/check_limit');
      const dataUsage = await resUsage.json();
      setUsageData(dataUsage);

      // Récupérer le profil depuis Supabase DIRECTEMENT
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', session.user.id)
        .single();

      if (profileData?.company_name) {
        setCompanyName(profileData.company_name);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompanyName = async () => {
    if (!companyName.trim()) {
      alert('⚠️ Veuillez entrer un nom de marque');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('⚠️ Session expirée. Reconnectez-vous.');
        router.push('/login');
        return;
      }

    


      // Sauvegarder DIRECTEMENT dans Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ company_name: companyName.trim() })
        .eq('id', session.user.id);

      if (error) {
        console.error('Erreur Supabase:', error);
        alert('❌ Erreur lors de la sauvegarde');
      } else {
        alert('✅ Nom de marque enregistré avec succès !');
      }
    } catch (err) {
      console.error('Erreur:', err);
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getTimesSaved = () => {
    if (!usageData) return '0h 0min';
    const minutesPerTemplate = 30; // Estimation
    const totalMinutes = usageData.current * minutesPerTemplate;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}min`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#1A1F3A] to-[#0A0E27] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
    );
  }

  const tierInfo = usageData ? getTierInfo(usageData.tier) : getTierInfo('free');
  const percentage = usageData ? Math.min((usageData.current / usageData.limit) * 100, 100) : 0;
  const isFree = usageData?.tier === 'free';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#1A1F3A] to-[#0A0E27] p-8 pt-28">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Mon compte</h1>
          <p className="text-gray-400 text-lg">Gérez votre abonnement et vos paramètres</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Colonne gauche - Plan actuel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Plan actuel */}
            <div className="bg-gradient-to-br from-[#0f172a]/95 to-[#1e293b]/95 backdrop-blur-xl border-2 border-blue-500/30 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Crown className="w-6 h-6 text-yellow-500" />
                  Plan actuel
                </h2>
                <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${tierInfo.color} text-white font-bold text-sm`}>
                  {tierInfo.name}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-400 mb-2">Prix</p>
                <p className="text-4xl font-bold text-white">{tierInfo.price}<span className="text-xl text-gray-400">/mois</span></p>
              </div>

              {/* Usage */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400">Templates utilisés</p>
                  <p className="text-white font-bold">{usageData?.current} / {usageData?.limit}</p>
                </div>
                <div className="bg-[#0A0E27] rounded-full h-3 overflow-hidden border border-blue-500/30">
                  <div
                    className={`bg-gradient-to-r ${tierInfo.color} h-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Stats rapides */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#0A0E27] rounded-xl p-4 border border-blue-500/30">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm">Temps économisé</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{getTimesSaved()}</p>
                </div>
                <div className="bg-[#0A0E27] rounded-xl p-4 border border-purple-500/30">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <FileText className="w-5 h-5" />
                    <span className="text-sm">Documentations</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-400">{usageData?.current || 0}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {!isFree && (
  <ManageSubscriptionButton />
)}

                <Link
                  href="/pricing"
                  className="w-full bg-white/5 border border-white/10 text-white font-bold py-3 px-6 rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2"
                >
                  {isFree ? (
                    <>
                      <ArrowUpCircle className="w-5 h-5" />
                      Upgrader mon plan
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5" />
                      Changer de plan
                    </>
                  )}
                </Link>
              </div>
            </div>

  {/* Card Branding - Toujours visible mais disabled si pas Enterprise */}
<div className={`bg-gradient-to-br from-[#0f172a]/95 to-[#1e293b]/95 backdrop-blur-xl border-2 rounded-3xl p-8 shadow-xl ${
  usageData?.tier === 'enterprise' 
    ? 'border-yellow-500/30' 
    : 'border-gray-500/20 opacity-60'
}`}>
  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
    <Building2 className="w-6 h-6 text-yellow-500" />
    Nom de marque (Branding PDF)
    {usageData?.tier !== 'enterprise' && (
      <span className="ml-auto text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full border border-yellow-500/30">
        Enterprise uniquement
      </span>
    )}
  </h2>
  <p className="text-gray-400 text-sm mb-4">
    Personnalisez vos exports PDF avec votre nom de marque. 
    {usageData?.tier !== 'enterprise' && (
      <span className="text-yellow-400 font-semibold"> Disponible avec le plan Enterprise.</span>
    )}
  </p>
  <div className="flex gap-3">
    <input
      type="text"
      placeholder="Ex: Mon Entreprise SAS"
      value={companyName}
      onChange={(e) => setCompanyName(e.target.value)}
      disabled={usageData?.tier !== 'enterprise'}
      className="flex-1 px-4 py-3 bg-[#0A0E27] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed"
    />
    <button
      onClick={handleSaveCompanyName}
      disabled={saving || usageData?.tier !== 'enterprise'}
      className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:shadow-xl hover:shadow-yellow-500/50 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
      Sauvegarder
    </button>
  </div>
  {usageData?.tier !== 'enterprise' && (
    <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
      <Sparkles className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-yellow-400 font-bold text-sm mb-1">Fonctionnalité Premium</p>
        <p className="text-gray-400 text-xs">
          Passez au plan Enterprise pour personnaliser vos exports PDF avec votre marque. <Link href="/pricing" className="underline font-semibold">Voir les tarifs</Link>
        </p>
      </div>
    </div>
  )}
</div>



            {/* Card Fonctionnalités */}
            <div className="bg-gradient-to-br from-[#0f172a]/95 to-[#1e293b]/95 backdrop-blur-xl border border-[#334155] rounded-3xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6 text-blue-400" />
                Fonctionnalités incluses
              </h2>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  {tierInfo.limit} templates par mois
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  Export Notes N8N
                </li>
                {usageData?.tier !== 'free' && (
                  <>
                    <li className="flex items-center gap-3 text-gray-300">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      Export PDF
                    </li>
                    <li className="flex items-center gap-3 text-gray-300">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      Branding personnalisé
                    </li>
                  </>
                )}
                {(usageData?.tier === 'pro' || usageData?.tier === 'enterprise') && (
                  <li className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    Sans watermark
                  </li>
                )}
                {usageData?.tier === 'enterprise' && (
                  <li className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    Templates illimités
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Colonne droite - Actions */}
          <div className="space-y-6">
            {/* Quick Links */}
            <div className="bg-gradient-to-br from-[#0f172a]/95 to-[#1e293b]/95 backdrop-blur-xl border border-[#334155] rounded-3xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Liens rapides</h3>
              <div className="space-y-2">
                <Link
                  href="/generate"
                  className="block w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition"
                >
                  📄 Générer une documentation
                </Link>
                <Link
                  href="/pricing"
                  className="block w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition"
                >
                  💎 Voir les tarifs
                </Link>
                <Link
                  href="/documentation"
                  className="block w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition"
                >
                  📚 Documentation
                </Link>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full bg-red-500/10 border border-red-500/50 text-red-400 font-bold py-3 px-6 rounded-xl hover:bg-red-500/20 transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Se déconnecter
            </button>

            {/* Info */}
            {usageData && usageData.current >= usageData.limit && (
              <div className="bg-orange-500/10 border border-orange-500/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-orange-400 font-bold text-sm mb-1">Limite atteinte</p>
                    <p className="text-gray-400 text-xs">
                      Vous avez utilisé tous vos templates ce mois-ci. Upgradez pour continuer.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
