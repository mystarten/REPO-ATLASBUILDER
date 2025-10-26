'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileJson, CheckCircle, XCircle, Sparkles, Zap, Clock, Brain, ArrowRight, AlertTriangle, Crown, FileText, Download, Building2, Star, Rocket, Shield } from 'lucide-react';
import Link from 'next/link';
import UpgradeModal from '@/components/UpgradeModal';

interface Profile {
  subscription_tier: string;
  templates_used: number;
  templates_limit: number;
  company_name?: string;
}

interface GenerateClientProps {
  userEmail: string;
  profile: Profile | null;
  companyName: string;
}

const getTierInfo = (tier: string) => {
  switch (tier) {
    case 'starter':
      return { name: 'Starter', color: 'from-blue-500 to-cyan-500', limit: 20 };
    case 'pro':
      return { name: 'Pro', color: 'from-purple-500 to-pink-500', limit: 40 };
    case 'enterprise':
      return { name: 'Enterprise', color: 'from-yellow-500 to-orange-500', limit: 65 };
    default:
      return { name: 'Gratuit', color: 'from-gray-500 to-gray-600', limit: 3 };
  }
};

export default function GenerateClient({ userEmail, profile, companyName }: GenerateClientProps) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [format, setFormat] = useState<'notes' | 'pdf'>('notes');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [usageData, setUsageData] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [customBrandName, setCustomBrandName] = useState(companyName);

  useEffect(() => {
    if (companyName) {
      setCustomBrandName(companyName);
    }
  }, [companyName]);

  const fetchUsageLimits = async () => {
    try {
      const res = await fetch('/api/user/check_limit');
      if (!res.ok) {
        setUsageData({
          allowed: true,
          current: 0,
          limit: 3,
          tier: 'free',
        });
        return;
      }
      const data = await res.json();
      setUsageData(data);
    } catch (err) {
      setUsageData({
        allowed: true,
        current: 0,
        limit: 3,
        tier: 'free',
      });
    }
  };

  useEffect(() => {
    fetchUsageLimits();
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setSuccess(true);
      window.history.replaceState({}, '', '/generate');
    }
  }, []);

  useEffect(() => {
    if (loading) {
      setLoadingProgress(0);
      setLoadingMessage('Initialisation...');
      
      const totalDuration = 50000;
      const intervalTime = 100;
      const incrementPerInterval = 100 / (totalDuration / intervalTime);
      
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          const next = Math.min(prev + incrementPerInterval, 99);
          
          if (next < 10) {
            setLoadingMessage('Analyse de votre workflow N8N...');
          } else if (next < 25) {
            setLoadingMessage('Extraction des nœuds et connexions...');
          } else if (next < 40) {
            setLoadingMessage('Génération des annotations IA...');
          } else if (next < 55) {
            setLoadingMessage('Optimisation de la structure...');
          } else if (next < 70) {
            setLoadingMessage('Enrichissement de la documentation...');
          } else if (next < 85) {
            setLoadingMessage('Mise en forme professionnelle...');
          } else if (next < 95) {
            setLoadingMessage('Vérification de la qualité...');
          } else {
            setLoadingMessage('Finalisation...');
          }
          
          return next;
        });
      }, intervalTime);
      
      return () => clearInterval(progressInterval);
    }
  }, [loading]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const jsonFile = acceptedFiles[0];
    if (jsonFile && jsonFile.type === 'application/json') {
      setFile(jsonFile);
      setError(null);
      setSuccess(false);
    } else {
      setError('Veuillez uploader un fichier JSON valide');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/json': ['.json'] },
    maxFiles: 1,
  });

  const handleGenerate = async () => {
  if (!file) {
    setError('Veuillez uploader un fichier JSON');
    return;
  }

  if (usageData && !usageData.allowed) {
    setShowUpgradeModal(true);
    return;
  }

  if (format === 'pdf' && usageData?.tier === 'free') {
    setError('Le format PDF nécessite le plan Starter ou supérieur.');
    return;
  }

  setLoading(true);
  setLoadingProgress(0);
  setLoadingMessage('Initialisation...');
  setError(null);
  setSuccess(false);

  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonContent = JSON.parse(e.target?.result as string);

        const response = await fetch('/api/generate-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflowJson: jsonContent,
            notes,
            format,
            customBrandName: customBrandName.trim() || null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la génération');
        }

        // ✅ VÉRIFIER LE TYPE DE CONTENU
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/pdf')) {
          // 📄 C'est un PDF binaire, le télécharger directement
          console.log('📄 PDF binaire détecté');
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          // Extraire le nom du fichier sans l'extension
          const fileName = file.name.replace('.json', '');
          a.download = `${fileName}_atlas.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          // Incrémenter l'usage
          await fetch('/api/increment-usage', { method: 'POST' });
          await fetchUsageLimits();

          setLoadingProgress(100);
          setLoadingMessage('Terminé !');
          setSuccess(true);
          setFile(null);
          setNotes('');
        } else {
          // 📝 C'est du JSON
          const result = await response.json();

          await fetch('/api/increment-usage', { method: 'POST' });
          await fetchUsageLimits();

          setLoadingProgress(100);
          setLoadingMessage('Terminé !');

          if (result.data) {
            sessionStorage.setItem('generated_doc', JSON.stringify(result.data));
            sessionStorage.setItem('doc_format', format);
            sessionStorage.setItem('original_filename', file.name.replace('.json', ''));
            window.location.href = '/download';
          } else {
            setSuccess(true);
            setFile(null);
            setNotes('');
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  } catch (err: any) {
    setError(err.message);
    setLoading(false);
  }
};


  const tierInfo = usageData ? getTierInfo(usageData.tier) : getTierInfo('free');
  const isLimitReached = usageData && !usageData.allowed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#1A1F3A] to-[#0A0E27] relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/30 via-cyan-500/20 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
              <div className="text-center mb-16">
                 

                  {usageData && (
                      <div className="inline-flex items-center gap-6 px-8 py-4 mb-8 bg-gradient-to-br from-[#0f172a]/95 to-[#1e293b]/95 backdrop-blur-2xl border-2 border-blue-500/30 rounded-2xl shadow-2xl">
                          <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${usageData.tier === 'enterprise' ? 'from-yellow-500 to-orange-500' :
                                  usageData.tier === 'pro' ? 'from-purple-500 to-pink-500' :
                                      usageData.tier === 'starter' ? 'from-blue-500 to-cyan-500' :
                                          'from-gray-500 to-gray-600'} animate-pulse`} />
                              <span className="text-gray-400 text-sm">Plan</span>
                              <span className={`font-bold text-lg bg-gradient-to-r ${usageData.tier === 'enterprise' ? 'from-yellow-400 to-orange-400' :
                                  usageData.tier === 'pro' ? 'from-purple-400 to-pink-400' :
                                      usageData.tier === 'starter' ? 'from-blue-400 to-cyan-400' :
                                          'from-gray-400 to-gray-500'} bg-clip-text text-transparent`}>
                                  {usageData.tier === 'enterprise' ? 'Enterprise' :
                                      usageData.tier === 'pro' ? 'Pro' :
                                          usageData.tier === 'starter' ? 'Starter' :
                                              'Gratuit'}
                              </span>
                          </div>

                          <div className="w-px h-8 bg-gray-700" />

                          <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-blue-400" />
                              <div className="flex flex-col">
                                  <span className="text-gray-400 text-xs">Templates utilisés</span>
                                  <div className="flex items-baseline gap-1">
                                      <span className={`font-bold text-xl ${usageData.tier === 'enterprise' || usageData.current < usageData.limit
                                          ? 'text-white'
                                          : 'text-red-400'}`}>
                                          {usageData.current}
                                      </span>
                                      <span className="text-gray-500 text-sm">/</span>
                                      <span className="text-gray-400 text-sm">
                                          {usageData.tier === 'enterprise' ? '65' : usageData.limit}
                                      </span>
                                  </div>
                              </div>
                          </div>

                          {usageData.tier !== 'enterprise' && (
                              <>
                                  <div className="w-px h-8 bg-gray-700" />
                                  <div className="flex flex-col gap-2">
                                      <span className="text-gray-400 text-xs">Progression</span>
                                      <div className="w-32 bg-gray-700/50 rounded-full h-2 overflow-hidden">
                                          <div
                                              className={`h-full rounded-full transition-all duration-500 ${usageData.current >= usageData.limit
                                                  ? 'bg-gradient-to-r from-red-500 to-orange-500'
                                                  : usageData.current / usageData.limit > 0.8
                                                      ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
                                                      : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}
                                              style={{ width: `${Math.min((usageData.current / usageData.limit) * 100, 100)}%` }} />
                                      </div>
                                  </div>
                              </>
                          )}

                          {usageData.tier !== 'enterprise' && usageData.current >= usageData.limit && (
                              <>
                                  <div className="w-px h-8 bg-gray-700" />
                                  <Link
                                      href="/pricing"
                                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-sm rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center gap-2"
                                  >
                                      <Zap className="w-4 h-4" />
                                      Upgrader
                                  </Link>
                              </>
                          )}
                      </div>
                  )}

                  <h1 className="text-5xl md:text-6xl font-bold mb-6">
                      <span className="block text-white mb-2">Découvrez la technologie</span>
                      <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                          derrière ATLAS
                      </span>
                  </h1>

                  <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                      Comment ATLAS transforme vos templates N8N en documentation professionnelle en quelques secondes
                  </p>

                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500/10 border border-blue-500/30 rounded-full backdrop-blur-xl">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      <span className="text-gray-300">Propulsé par <strong className="text-white">Claude Sonnet 4.5</strong> avec modèles adaptatifs</span>
                  </div>
              </div>

             {loading ? (
  <div className="bg-gradient-to-br from-[#0f172a]/80 to-[#1e293b]/80 backdrop-blur-2xl border border-blue-500/20 rounded-3xl p-12 text-center shadow-2xl max-w-4xl mx-auto">
    <div className="relative w-48 h-48 mx-auto mb-12">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
        <circle
          cx="96"
          cy="96"
          r="88"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-gray-700"
        />
        <circle
          cx="96"
          cy="96"
          r="88"
          stroke="url(#gradient)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 88}
          strokeDashoffset={2 * Math.PI * 88 * (1 - loadingProgress / 100)}
          className="transition-all duration-300 drop-shadow-lg"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          {Math.round(loadingProgress)}%
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>

    <h3 className="text-3xl font-bold text-white mb-4">Génération en cours...</h3>
    <p className="text-xl text-blue-400 mb-12 animate-pulse min-h-[32px]">
      {loadingMessage}
    </p>

    <div className="max-w-2xl mx-auto mb-10">
      <div className="bg-gray-700/50 rounded-full h-3 overflow-hidden border border-blue-500/20">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 transition-all duration-300 relative overflow-hidden"
          style={{ width: `${loadingProgress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <Clock className="w-8 h-8 text-blue-400 mx-auto mb-3" />
        <p className="text-gray-400 text-sm mb-1">Temps écoulé</p>
        <p className="text-white font-bold text-xl">{Math.round((loadingProgress / 100) * 50)}s / 50s</p>
      </div>
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
        <Brain className="w-8 h-8 text-purple-400 mx-auto mb-3" />
        <p className="text-gray-400 text-sm mb-1">Modèle IA</p>
        <p className="text-white font-bold text-xl">Claude 4.5</p>
      </div>
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-6">
        <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
        <p className="text-gray-400 text-sm mb-1">Qualité</p>
        <p className="text-white font-bold text-xl">Premium</p>
      </div>
    </div>

    <div className="mt-10 text-gray-400 text-sm max-w-2xl mx-auto">
      <p>Notre IA analyse chaque nœud de votre workflow pour générer une documentation précise et détaillée.</p>
    </div>
  </div>

) : (          // ✅ BON
  <div className="space-y-12">

    <div className="bg-gradient-to-br from-[#0f172a]/80 to-[#1e293b]/80 backdrop-blur-2xl border border-blue-500/20 rounded-3xl p-10 shadow-2xl">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-20 text-center cursor-pointer transition-all ${isDragActive
          ? 'border-blue-500 bg-blue-500/10'
          : file
          ? 'border-green-500 bg-green-500/5'
          : 'border-gray-600 hover:border-blue-500/50 hover:bg-blue-500/5'}`}
      >
        <input {...getInputProps()} />
        {file ? (
          <>
            <FileJson className="w-24 h-24 mx-auto mb-6 text-green-400" />
            <p className="text-white font-bold text-3xl mb-3">{file.name}</p>
            <p className="text-gray-400 text-lg mb-6">{(file.size / 1024).toFixed(2)} KB</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="text-red-400 hover:text-red-300 underline text-lg"
            >
              Changer de fichier
            </button>
          </>
        ) : (
          <>
            <Upload className="w-24 h-24 mx-auto mb-6 text-blue-400" />
            <p className="text-white font-bold text-3xl mb-4">
              {isDragActive ? 'Déposez le fichier ici' : 'Glissez-déposez votre fichier JSON'}
            </p>
            <p className="text-gray-400 text-lg mb-8">ou cliquez pour sélectionner un fichier</p>
            <div className="inline-block px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-blue-500/50 transition">
              Choisir un fichier
            </div>
          </>
        )}
      </div>
    </div>

    <div className="bg-gradient-to-br from-[#0f172a]/80 to-[#1e293b]/80 backdrop-blur-2xl border border-blue-500/20 rounded-3xl p-10 shadow-2xl">
      <label className="block text-2xl font-bold text-white mb-4">
        Notes complémentaires (optionnel)
      </label>
      <p className="text-gray-400 mb-6">
        Ajoutez du contexte sur votre workflow pour une documentation plus précise et personnalisée
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ex: Ce workflow automatise l'envoi d'emails de bienvenue aux nouveaux clients..."
        className="w-full px-6 py-5 bg-[#1e293b]/60 border border-blue-500/20 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
        rows={5}
      />
    </div>

    <div className="bg-gradient-to-br from-[#0f172a]/80 to-[#1e293b]/80 backdrop-blur-2xl border border-blue-500/20 rounded-3xl p-10 shadow-2xl">
      <h2 className="text-3xl font-bold text-white mb-8 text-center">Choisissez votre format de sortie</h2>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Bouton Notes N8N */}
        <button
          onClick={() => setFormat('notes')}
          className={`relative p-8 rounded-2xl text-left transition-all transform hover:scale-105 ${format === 'notes'
            ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-blue-500 shadow-2xl shadow-blue-500/50'
            : 'bg-[#1e293b]/60 border-2 border-gray-700 hover:border-blue-500/50'}`}
        >
          {format === 'notes' && (
            <div className="absolute top-4 right-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          )}
          <FileText className={`w-12 h-12 mb-4 ${format === 'notes' ? 'text-blue-400' : 'text-gray-500'}`} />
          <h3 className="text-2xl font-bold text-white mb-3">Notes N8N</h3>
          <p className="text-gray-300 mb-4">Format natif pour une intégration directe dans votre workflow</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              Documentation vivante et éditable
            </li>
            <li className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              Synchronisation automatique
            </li>
            <li className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              Idéal pour usage interne
            </li>
            <li className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              Gratuit sur tous les plans
            </li>
          </ul>
        </button>

        {/* Bouton PDF */}
        <button
          onClick={() => {
            if (usageData?.tier === 'free') {
              setError('Le format PDF nécessite le plan Starter ou supérieur.');
            } else {
              setFormat('pdf');
              setError(null);
            }
          }}
          disabled={usageData?.tier === 'free'}
          className={`relative p-8 rounded-2xl text-left transition-all transform hover:scale-105 ${format === 'pdf'
            ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500 shadow-2xl shadow-purple-500/50'
            : usageData?.tier === 'free'
            ? 'bg-[#1e293b]/30 border-2 border-gray-800 opacity-60 cursor-not-allowed'
            : 'bg-[#1e293b]/60 border-2 border-gray-700 hover:border-purple-500/50'}`}
        >
          {format === 'pdf' && (
            <div className="absolute top-4 right-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          )}
          {usageData?.tier === 'free' && (
            <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold px-4 py-2 rounded-full">
              Starter+
            </div>
          )}
          <Download className={`w-12 h-12 mb-4 ${format === 'pdf' ? 'text-purple-400' : usageData?.tier === 'free' ? 'text-gray-600' : 'text-gray-500'}`} />
          <h3 className="text-2xl font-bold text-white mb-3">PDF Professionnel</h3>
          <p className="text-gray-300 mb-4">Documentation élégante pour présenter à vos clients et équipes</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              Design professionnel et moderne
            </li>
            <li className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              Partage externe facilité
            </li>
            <li className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              Format universel (imprimable)
            </li>
            <li className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              Branding personnalisé (Enterprise)
            </li>
          </ul>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6 text-center">
          <Rocket className="w-10 h-10 text-blue-400 mx-auto mb-3" />
          <h4 className="text-white font-bold mb-2">Génération rapide</h4>
          <p className="text-gray-400 text-sm">Documentation générée en moins de 50 secondes</p>
        </div>
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-6 text-center">
          <Brain className="w-10 h-10 text-purple-400 mx-auto mb-3" />
          <h4 className="text-white font-bold mb-2">IA de pointe</h4>
          <p className="text-gray-400 text-sm">Propulsé par Claude Sonnet 4.5 pour une qualité optimale</p>
        </div>
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-6 text-center">
          <Shield className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
          <h4 className="text-white font-bold mb-2">Sécurisé</h4>
          <p className="text-gray-400 text-sm">Vos données ne sont jamais stockées ni partagées</p>
        </div>
      </div>
    </div>

    {usageData?.tier === 'enterprise' && (
      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-2xl border-2 border-yellow-500/30 rounded-3xl p-10 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-8 h-8 text-yellow-400" />
          <h3 className="text-2xl font-bold text-white">Branding personnalisé</h3>
          <span className="ml-auto text-sm bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full border border-yellow-500/30 font-bold">
            EXCLUSIF ENTERPRISE
          </span>
        </div>
        <p className="text-gray-300 mb-6 text-lg">
          Remplacez &quot;Généré par ATLAS&quot; par le nom de votre entreprise dans toutes les documentations PDF. Idéal pour les présentations clients et la documentation interne.
        </p>
        <input
          type="text"
          value={customBrandName}
          onChange={(e) => setCustomBrandName(e.target.value)}
          placeholder="Nom de votre entreprise (ex: Acme Corp)"
          className="w-full px-6 py-5 bg-[#1e293b]/60 border-2 border-yellow-500/30 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
        />
        <div className="mt-4 flex items-center gap-3 text-gray-400">
          <Star className="w-5 h-5 text-yellow-400" />
          <span className="text-sm">Ce nom apparaîtra en pied de page de tous vos PDF exportés</span>
        </div>
      </div>
    )}

    {error && (
      <div className="bg-red-500/10 border-2 border-red-500/50 rounded-2xl p-6 flex items-center gap-4">
        <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    )}

    {success && (
      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-2xl border-2 border-green-500/50 rounded-3xl p-12 text-center shadow-2xl max-w-4xl mx-auto">
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-green-500/30 blur-2xl rounded-full animate-pulse" />
          <div className="relative bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-8 rounded-full border-2 border-green-500/50">
            <CheckCircle className="w-24 h-24 text-green-400" />
          </div>
        </div>

        <h3 className="text-4xl font-bold text-white mb-4">
          Documentation générée avec succès !
        </h3>
        <p className="text-xl text-green-400 mb-8">
          Votre documentation professionnelle est prête à être téléchargée
        </p>

        <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mb-10">
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6">
            <FileText className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-1">Format</p>
            <p className="text-white font-bold">{format === 'notes' ? 'Notes N8N' : 'PDF'}</p>
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6">
            <Clock className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-1">Temps</p>
            <p className="text-white font-bold">~50 secondes</p>
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6">
            <Star className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-1">Qualité</p>
            <p className="text-white font-bold">Premium</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => window.location.href = '/download'}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg rounded-xl hover:shadow-2xl hover:shadow-green-500/50 transition-all transform hover:scale-105 flex items-center gap-3"
          >
            <Download className="w-6 h-6" />
            Télécharger maintenant
          </button>
          <button
            onClick={() => {
              setSuccess(false);
              setFile(null);
              setNotes('');
            }}
            className="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold text-lg rounded-xl hover:bg-white/10 transition"
          >
            Générer un autre workflow
          </button>
        </div>

        <div className="mt-10 bg-blue-500/5 border border-blue-500/20 rounded-xl p-6 max-w-2xl mx-auto">
          <p className="text-gray-300">
            <strong className="text-white">🎉 Félicitations !</strong> Votre documentation a été générée avec succès. Elle contient toutes les informations nécessaires pour comprendre et maintenir votre workflow.
          </p>
        </div>
      </div>
    )}

    <button
      onClick={handleGenerate}
      disabled={loading || !file || isLimitReached}
      className="w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 text-white font-bold text-2xl py-8 rounded-2xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-4 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-shimmer" />
      <Zap className="w-8 h-8 relative z-10" />
      <span className="relative z-10">
        {isLimitReached ? 'Limite atteinte - Upgrader mon plan' : 'Générer la documentation'}
      </span>
      <ArrowRight className="w-8 h-8 relative z-10 group-hover:translate-x-2 transition-transform" />
    </button>
  </div>
)}
</div>

<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  currentPlan={usageData?.tier || 'free'}
  usedTemplates={usageData?.current || 0}
  limitTemplates={usageData?.limit || 3}
/>
</div>
);
}
