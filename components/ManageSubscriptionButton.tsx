'use client';

import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  async function handleManageSubscription() {
    setLoading(true);
    try {
      const res = await fetch('/api/create-portal-session', { method: 'POST' });
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Impossible d\'ouvrir le portail client: ' + (data.error || 'Erreur inconnue'));
        setLoading(false);
      }
    } catch (e) {
      alert('Erreur réseau, veuillez réessayer plus tard.');
      console.error(e);
      setLoading(false);
    }
  }

  return (
    <button 
      onClick={handleManageSubscription} 
      disabled={loading}
      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-3 px-6 rounded-xl hover:shadow-xl hover:shadow-blue-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      type="button"
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Chargement...
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5" />
          Gérer mon abonnement
        </>
      )}
    </button>
  );
}
