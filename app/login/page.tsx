'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
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
        if (password !== confirmPassword) {
          throw new Error('Les mots de passe ne correspondent pas');
        }

        const { data, error } = await supabaseBrowser.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}`,
          },
        });

        if (error) throw error;

        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('Cet email est déjà utilisé. Veuillez vous connecter.');
        }

        if (data.user) {
          if (data.session) {
            console.log('✅ Inscription réussie, redirection...');
            await new Promise(resolve => setTimeout(resolve, 500));
            window.location.href = next;
          } else {
            console.log('📧 Email de confirmation envoyé');
            setSent(true);
          }
        }
      } else {
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

  const transition = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-[#0A0E27] via-[#0f1729] to-[#0A0E27]" />

      {/* 🎯 NAVBAR CORRIGÉE - Avec grille à 3 colonnes */}
      <nav className="relative z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto grid grid-cols-3 items-center gap-4">
          {/* Colonne 1 : Logo (aligné à gauche) */}
          <div className="flex justify-start">
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/images/logo.png"
                alt="ATLAS"
                width={40}
                height={40}
                className="transition-transform group-hover:scale-110"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                ATLAS
              </span>
            </Link>
          </div>

          {/* Colonne 2 : Menu de navigation (centré) */}
          <div className="hidden md:flex items-center justify-center">
            <div className="flex items-center gap-1 bg-white/5 backdrop-blur-lg rounded-full px-2 py-1.5 border border-white/10">
              <Link href="/" className="px-3 py-1 text-sm text-gray-300 rounded-full transition-all duration-200 hover:bg-white/10 hover:text-white font-medium">
                Accueil
              </Link>
              <Link href="/documentation" className="px-3 py-1 text-sm text-gray-300 rounded-full transition-all duration-200 hover:bg-white/10 hover:text-white font-medium">
                Documentation
              </Link>
              <Link href="/generate" className="px-3 py-1 text-sm text-gray-300 rounded-full transition-all duration-200 hover:bg-white/10 hover:text-white font-medium">
                Générer
              </Link>
              <Link href="/blog" className="px-3 py-1 text-sm text-gray-300 rounded-full transition-all duration-200 hover:bg-white/10 hover:text-white font-medium">
                Blog
              </Link>
              <Link href="/pricing" className="px-3 py-1 text-sm text-gray-300 rounded-full transition-all duration-200 hover:bg-white/10 hover:text-white font-medium">
                Tarifs
              </Link>
            </div>
          </div>

          {/* Colonne 3 : Vide (pour équilibrer) */}
          <div className="flex justify-end">
            {/* Mobile menu button */}
            <button className="md:hidden text-white p-2 bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 rounded-lg transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Container principal avec animation */}
      <div className="relative flex-1 flex">
        {/* 🎨 PANNEAU FORMULAIRE - Slide de gauche à droite */}
        <motion.div
          initial={false}
          animate={{
            left: isSignUp ? '60%' : '0%',
          }}
          transition={transition}
          className="absolute top-0 w-full lg:w-[40%] h-full flex items-center justify-center p-6 lg:p-12 z-20"
        >
          <div className="w-full max-w-md">
            {/* Logo mobile uniquement */}
            <div className="lg:hidden mb-6 text-center">
              <Image
                src="/images/logo.png"
                alt="ATLAS"
                width={50}
                height={50}
                className="mx-auto mb-3 drop-shadow-2xl"
              />
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                ATLAS
              </h1>
            </div>

            {!sent ? (
              <>
                {/* Titre animé */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isSignUp ? 'signup' : 'signin'}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                      {isSignUp ? 'Créer un compte' : 'Bienvenue'}
                    </h2>
                    <p className="text-gray-400 text-sm lg:text-base mb-6">
                      {isSignUp
                        ? 'Rejoignez ATLAS pour documenter vos workflows'
                        : 'Connectez-vous à votre compte ATLAS'}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Google OAuth */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white text-gray-800 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-3 mb-5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm lg:text-base"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continuer avec Google
                </button>

                <div className="relative mb-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[#0A0E27] text-gray-500">Ou</span>
                  </div>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Email
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition" />
                      <input
                        id="email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-[#1e293b]/80 border border-[#334155] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Mot de passe
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition" />
                      <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-[#1e293b]/80 border border-[#334155] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition text-sm"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {/* Champ Confirmer mot de passe */}
                  <AnimatePresence>
                    {isSignUp && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: '1rem' }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
                          Confirmer le mot de passe
                        </label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition" />
                          <input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-[#1e293b]/80 border border-[#334155] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition text-sm"
                            required
                            minLength={6}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-2.5 rounded-xl text-xs flex items-center gap-2"
                    >
                      <span className="flex-shrink-0">⚠️</span>
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 relative overflow-hidden group text-sm lg:text-base"
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
              </>
            ) : (
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/50 rounded-2xl p-6 text-center backdrop-blur-xl">
                  <div className="inline-block p-3 bg-green-500/20 rounded-full mb-3">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Email envoyé !</h3>
                  <p className="text-green-400 text-sm">
                    Vérifiez vos emails (et vos spams) pour confirmer votre inscription.
                  </p>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 backdrop-blur-xl">
                  <p className="text-gray-300 text-xs mb-3 text-center">
                    Vous n'avez pas reçu l'email ?
                  </p>
                  
                  {resendSuccess && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-3 py-2 rounded-xl text-xs flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Email renvoyé avec succès !</span>
                    </div>
                  )}
                  
                  <button
                    onClick={handleResendEmail}
                    disabled={resendLoading}
                    className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-semibold py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    <RefreshCw className={`w-4 h-4 ${resendLoading ? 'animate-spin' : ''}`} />
                    {resendLoading ? 'Envoi en cours...' : 'Renvoyer l\'email'}
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
                  className="w-full text-gray-400 hover:text-white text-xs transition font-medium"
                >
                  ← Retour au formulaire
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* 🎨 PANNEAU VISUEL - Slide de droite à gauche */}
        <motion.div
          initial={false}
          animate={{
            left: isSignUp ? '0%' : '40%',
          }}
          transition={transition}
          className="hidden lg:flex absolute top-0 w-[60%] h-full items-center justify-center p-8 overflow-hidden z-10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b3a] via-[#1a2f5a] to-[#0A0E27]" />
          
          {/* Blobs animés */}
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/15 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-cyan-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s', animationDuration: '4s' }} />

          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? 'signup-visual' : 'signin-visual'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="relative z-10 text-center max-w-3xl px-4"
            >
              {/* Logo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1,
                }}
                className="mb-6"
              >
                <Image
                  src="/images/logo.png"
                  alt="ATLAS"
                  width={80}
                  height={80}
                  className="mx-auto drop-shadow-2xl animate-float"
                />
              </motion.div>

              {/* Titre principal */}
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl xl:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent drop-shadow-2xl leading-tight"
              >
                {isSignUp ? 'Content de faire votre rencontre !' : 'Content de vous revoir !'}
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg xl:text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed font-medium"
              >
                {isSignUp
                  ? 'Rejoignez-nous pour automatiser et documenter vos workflows N8N avec l\'IA'
                  : 'Documentez vos workflows N8N en quelques secondes avec l\'IA'}
              </motion.p>

              {/* Cartes features */}
              <div className="grid grid-cols-3 gap-4 xl:gap-6 max-w-4xl mx-auto mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="group bg-white/5 backdrop-blur-xl rounded-xl p-5 xl:p-6 border border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                >
                  <div className="w-12 h-12 xl:w-14 xl:h-14 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6 xl:w-7 xl:h-7 text-blue-400" />
                  </div>
                  <p className="text-white font-bold text-base xl:text-lg mb-1">IA Avancée</p>
                  <p className="text-gray-400 text-xs xl:text-sm">Documentation automatique intelligente</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="group bg-white/5 backdrop-blur-xl rounded-xl p-5 xl:p-6 border border-white/10 hover:border-cyan-400/50 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                >
                  <div className="w-12 h-12 xl:w-14 xl:h-14 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 xl:w-7 xl:h-7 text-cyan-400" />
                  </div>
                  <p className="text-white font-bold text-base xl:text-lg mb-1">Instantané</p>
                  <p className="text-gray-400 text-xs xl:text-sm">Résultats en quelques secondes</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="group bg-white/5 backdrop-blur-xl rounded-xl p-5 xl:p-6 border border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                >
                  <div className="w-12 h-12 xl:w-14 xl:h-14 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <ArrowRight className="w-6 h-6 xl:w-7 xl:h-7 text-blue-400" />
                  </div>
                  <p className="text-white font-bold text-base xl:text-lg mb-1">Simple</p>
                  <p className="text-gray-400 text-xs xl:text-sm">Interface intuitive et moderne</p>
                </motion.div>
              </div>

              {/* Bouton toggle */}
              <motion.button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setConfirmPassword('');
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="px-6 py-2.5 bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-full font-semibold text-white hover:bg-white hover:text-purple-600 transition-all text-sm"
              >
                {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
              </motion.button>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
