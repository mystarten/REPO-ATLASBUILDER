'use client';

import { useEffect, useState } from 'react';
import { Download, CheckCircle, FileJson, FileText, ArrowLeft, Sparkles, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function DownloadPage() {
  const [docData, setDocData] = useState<any>(null);
  const [format, setFormat] = useState<string>('notes');
  const [originalFilename, setOriginalFilename] = useState<string>('documentation');

  useEffect(() => {
    const storedData = sessionStorage.getItem('generated_doc');
    const storedFormat = sessionStorage.getItem('doc_format');
    const storedFilename = sessionStorage.getItem('original_filename');
    
    if (storedData) {
      setDocData(JSON.parse(storedData));
    }
    
    if (storedFormat) {
      setFormat(storedFormat);
    }

    if (storedFilename) {
      setOriginalFilename(storedFilename);
    }
  }, []);

  const handleDownload = () => {
    if (!docData) return;

    // Si N8N renvoie une URL de téléchargement
    if (docData.download_url) {
      window.open(docData.download_url, '_blank');
      return;
    }

    // Si N8N renvoie directement les données
    if (docData.data) {
      const blob = new Blob([docData.data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${originalFilename}_atlas.${format === 'pdf' ? 'pdf' : 'txt'}`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Fallback : télécharger le JSON complet
    const blob = new Blob([JSON.stringify(docData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${originalFilename}_atlas.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!docData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#1A1F3A] to-[#0A0E27] flex items-center justify-center p-8">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white text-xl">Chargement de votre documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#1A1F3A] to-[#0A0E27] p-8 pt-28 relative overflow-hidden">
      {/* Effets lumineux */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header avec logo */}
        <div className="text-center mb-12">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <Image
                src="/images/logo.png"
                alt="ATLAS"
                width={80}
                height={80}
                className="drop-shadow-2xl animate-float"
              />
              <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full" />
            </div>
          </div>

          <div className="inline-flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-full px-6 py-3 mb-6">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <span className="text-green-400 font-semibold">Documentation générée avec succès !</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Votre documentation est prête ! 🎉
          </h1>
          <p className="text-gray-400 text-lg">
            Téléchargez votre documentation ATLAS et importez-la dans N8N
          </p>
        </div>

        {/* Card principale */}
        <div className="bg-gradient-to-br from-[#0f172a]/95 to-[#1e293b]/95 backdrop-blur-xl border-2 border-green-500/30 rounded-3xl p-8 shadow-2xl shadow-green-500/20 mb-8">
          {/* Informations */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
            {format === 'pdf' ? (
              <FileText className="w-16 h-16 text-green-400" />
            ) : (
              <FileJson className="w-16 h-16 text-green-400" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Documentation ATLAS
              </h2>
              <p className="text-gray-400">
                Format : {format === 'pdf' ? 'PDF' : 'Notes N8N'} • Généré le {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Message de succès */}
          {docData.message && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
              <p className="text-green-400 text-center">{docData.message}</p>
            </div>
          )}

          {/* Bouton de téléchargement principal */}
          <button
            onClick={handleDownload}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-xl py-6 px-8 rounded-2xl hover:shadow-2xl hover:shadow-green-500/50 transition-all transform hover:scale-105 flex items-center justify-center gap-3 mb-6"
          >
            <Download className="w-6 h-6" />
            Télécharger la documentation
          </button>

          {/* Lien externe si disponible */}
          {docData.download_url && (
            <a
              href={docData.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-white/5 text-white font-semibold py-4 px-6 rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2 border border-white/10"
            >
              <ExternalLink className="w-5 h-5" />
              Ouvrir dans un nouvel onglet
            </a>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-br from-[#0f172a]/95 to-[#1e293b]/95 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6 mb-8">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            Comment utiliser votre documentation
          </h3>
          <ol className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <span>Téléchargez le fichier généré</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <span>Ouvrez votre workflow dans N8N</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <span>Importez la documentation dans N8N ou consultez le PDF</span>
            </li>
          </ol>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/generate"
            className="flex-1 bg-white/5 text-white font-semibold py-4 px-6 rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2 border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
            Générer une nouvelle doc
          </Link>
          <Link
            href="/pricing"
            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-4 px-6 rounded-xl hover:shadow-xl hover:shadow-blue-500/50 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Upgrader mon plan
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
