'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { User, LogOut, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = supabaseBrowser;

  // Vérifier si on est sur la page de login
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/documentation', label: 'Documentation' },
    { href: '/generate', label: 'Générer' },
    { href: '/blog', label: 'Blog' },
    { href: '/pricing', label: 'Tarifs' },
  ];

  const getInitials = () => {
    if (!user) return 'U';
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name.charAt(0).toUpperCase();
    }
    return user.email?.charAt(0).toUpperCase() || 'U';
  };

  const getAvatarUrl = () => {
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    return null;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center h-16">
          {/* Logo - Position absolue à gauche */}
          <div className="absolute left-0">
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/images/logo.png"
                alt="ATLAS Logo"
                width={40}
                height={40}
                className="transition-transform group-hover:scale-110"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent hidden sm:block">
                ATLAS
              </span>
            </Link>
          </div>

          {/* Desktop Navigation - Centré au milieu de l'écran */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 backdrop-blur-lg rounded-full px-2 py-1.5 border border-white/10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1 text-sm text-gray-300 rounded-full transition-all duration-200 hover:bg-white/10 hover:text-white font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Actions - Position absolue à droite */}
          {/* ✅ Masqué sur la page de login */}
          {!isLoginPage && (
            <div className="absolute right-0 hidden md:flex items-center gap-2">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-1.5 bg-white/5 backdrop-blur-lg border border-white/10 rounded-full px-2.5 py-1.5 hover:bg-white/10 transition"
                  >
                    {getAvatarUrl() ? (
                      <Image
                        src={getAvatarUrl()!}
                        alt="Avatar"
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                        {getInitials()}
                      </div>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                        <div className="p-3 border-b border-white/10 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                          <p className="text-white font-semibold truncate text-sm">
                            {user.email}
                          </p>
                          <p className="text-gray-400 text-xs">Compte ATLAS</p>
                        </div>
                        <div className="py-1">
                          <Link
                            href="/account"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition"
                          >
                            <User className="w-4 h-4" />
                            <span>Mon compte</span>
                          </Link>
                        </div>
                        <div className="border-t border-white/10">
                          <button
                            onClick={() => {
                              handleLogout();
                              setIsDropdownOpen(false);
                            }}
                            className="flex items-center gap-2 px-3 py-2 w-full text-sm text-red-400 hover:bg-red-500/10 transition"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Se déconnecter</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-1.5 text-sm text-gray-300 bg-white/5 backdrop-blur-lg border border-white/10 rounded-full transition-all duration-200 hover:bg-white/10 hover:text-white font-medium"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/generate"
                    className="px-4 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 transition-all duration-200 font-semibold"
                  >
                    Essayer gratuitement
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          <div className="absolute right-0 md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white p-1.5 bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 rounded-lg transition"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-3 bg-[#0a0f1e]/95 backdrop-blur-xl rounded-b-xl border border-white/10 mt-1 shadow-xl">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2 px-3 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition mx-2"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!isLoginPage && (
              <>
                {user ? (
                  <>
                    <Link
                      href="/account"
                      className="block py-2 px-3 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition mx-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Mon compte
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="block w-full text-left py-2 px-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition mx-2"
                    >
                      Se déconnecter
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="block py-2 px-3 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition mx-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/generate"
                      className="block py-2 px-3 mx-2 mt-2 text-center text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg transition font-semibold hover:shadow-lg"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Essayer gratuitement
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
