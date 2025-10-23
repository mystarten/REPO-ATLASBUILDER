'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, Sparkles, ArrowRight, CheckCircle, Zap, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') || '/generate';

    try {
      if (isSignUp) {
        // Validation des mots de passe
        if (password !== confirmPassword) {
          throw new Error('Les mots de passe ne correspondent pas');
        }

        // Inscription
        const { data, error } = await supabaseBrowser.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}`,
          },
        });

        if (error) throw error;

        // Vérifier si l'email est déjà utilisé
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('Cet email est déjà utilisé. Veuillez vous connecter.');
        }

        // Gérer la redirection
        if (data.user) {
          if (data.session) {
            // Session créée immédiatement = confirmation email désactivée
            console.log('✅ Inscription réussie, redirection...');
            
            // Attendre que le trigger crée le profil
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Redirection forcée (reload complet)
            window.location.href = next;
          } else {
            // Email de confirmation requis
            console.log('📧 Email de confirmation envoyé');
            setSent(true);
          }
        }
      } else {
        // Connexion
        const { error } = await supabaseBrowser.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(next);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    setResendLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      const { error } = await supabaseBrowser.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/generate`,
        },
      });

      if (error) throw error;

      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du renvoi de l\'email');
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || '/generate';

      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion Google');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-[#0A0E27] via-[#0f1729] to-[#0A0E27]" />

      {/* Partie gauche - Formulaire */}
      <div className="relative z-10 w-full lg:w-1/3 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Image
              src="/images/logo.png"
              alt="ATLAS"
              width={60}
              height={60}
              className="mx-auto mb-4 drop-shadow-2xl"
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              ATLAS
            </h1>
          </div>

          {!sent ? (
            <>
              <h2 className="text-4xl font-bold text-white mb-2">
                {isSignUp ? 'Créer un compte' : 'Bienvenue'}
              </h2>
              <p className="text-gray-400 mb-8">
                {isSignUp
                  ? 'Rejoignez ATLAS pour documenter vos workflows'
                  : 'Connectez-vous à votre compte ATLAS'}
              </p>

              {/* Google OAuth */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white text-gray-800 font-semibold py-3.5 px-6 rounded-xl hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-3 mb-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuer avec Google
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#0A0E27] text-gray-500">Ou</span>
                </div>
              </div>

              {/* Formulaire */}
              <form onSubmit={handleAuth} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition" />
                    <input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-[#1e293b]/80 border border-[#334155] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Mot de passe
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition" />
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-[#1e293b]/80 border border-[#334155] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {isSignUp && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition" />
                      <input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-[#1e293b]/80 border border-[#334155] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <span className="flex-shrink-0">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 text-white font-semibold py-3.5 px-6 rounded-xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 relative overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center gap-2">
                    {loading ? 'Chargement...' : (
                      <>
                        {isSignUp ? 'Créer mon compte' : 'Se connecter'}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setConfirmPassword('');
                  }}
                  className="text-blue-400 hover:text-cyan-400 text-sm transition font-medium"
                >
                  {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/50 rounded-2xl p-8 text-center backdrop-blur-xl">
                <div className="inline-block p-4 bg-green-500/20 rounded-full mb-4">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Email envoyé !</h3>
                <p className="text-green-400 mb-6">
                  Vérifiez vos emails (et vos spams) pour confirmer votre inscription.
                </p>
              </div>

              {/* Bouton Renvoyer l'email */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-xl">
                <p className="text-gray-300 text-sm mb-4 text-center">
                  Vous n'avez pas reçu l'email ?
                </p>
                
                {resendSuccess && (
                  <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>Email renvoyé avec succès !</span>
                  </div>
                )}
                
                <button
                  onClick={handleResendEmail}
                  disabled={resendLoading}
                  className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-5 h-5 ${resendLoading ? 'animate-spin' : ''}`} />
                  {resendLoading ? 'Envoi en cours...' : 'Renvoyer l\'email de confirmation'}
                </button>
              </div>

              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setError(null);
                }}
                className="w-full text-gray-400 hover:text-white text-sm transition font-medium"
              >
                ← Retour au formulaire
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Partie droite - Visuel */}
      <div className="hidden lg:flex lg:w-2/3 relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b3a] via-[#1a2f5a] to-[#0A0E27]" />
        
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s', animationDuration: '4s' }} />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s', animationDuration: '5s' }} />

        <div className="relative z-10 text-center max-w-3xl">
          <div className="mb-8">
            <Image
              src="/images/logo.png"
              alt="ATLAS"
              width={150}
              height={150}
              className="mx-auto drop-shadow-2xl animate-float"
            />
          </div>

          <h1 className="text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent drop-shadow-2xl">
            ATLAS
          </h1>

          <p className="text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Documentez vos workflows N8N en quelques secondes avec l'IA
          </p>

          <div className="grid grid-cols-3 gap-6">
            <div className="group bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-white font-bold text-lg mb-2">IA Avancée</p>
              <p className="text-gray-400 text-sm">Documentation automatique intelligente</p>
            </div>

            <div className="group bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-cyan-400/50 hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-cyan-400" />
              </div>
              <p className="text-white font-bold text-lg mb-2">Instantané</p>
              <p className="text-gray-400 text-sm">Résultats en quelques secondes</p>
            </div>

            <div className="group bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <ArrowRight className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-white font-bold text-lg mb-2">Simple</p>
              <p className="text-gray-400 text-sm">Interface intuitive et moderne</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-25px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
