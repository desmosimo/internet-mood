"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Mood = {
  id?: string;
  emoji: string;
  label: string;
  timestamp?: string;
  country?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const EMOTICONS: Mood[] = [
  { emoji: "😄", label: "Felice" },
  { emoji: "🙂", label: "Contento" },
  { emoji: "😐", label: "Neutrale" },
  { emoji: "😕", label: "Triste" },
  { emoji: "😡", label: "Arrabbiato" },
  { emoji: "😴", label: "Stanco" },
  { emoji: "🤩", label: "Entusiasta" },
  { emoji: "😰", label: "Ansioso" },
  { emoji: "😎", label: "Rilassato" },
];

export default function Home() {
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodCounts, setMoodCounts] = useState<Record<string, number>>({});
  const [showConfetti, setShowConfetti] = useState(false);

  // Carica i conteggi dei mood
  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        setMoodCounts(data.byMood || {});
      } catch {
        setMoodCounts({});
      }
    }
    fetchCounts();
  }, []);

  async function submitMood(emoji: Mood) {
    setSubmitting(true);
    setStatus(null);
    setSelectedMood(emoji.emoji);

    let lat: number | null = null;
    let lon: number | null = null;
    let country: string | null = null;
    let region: string | null = null;

    // Try browser geolocation first
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch (e) {
        // ignore
      }
    }

    // If no country info yet, try IP-based lookup as fallback
    if (!country) {
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (res.ok) {
          const data = await res.json();
          country = data.country_code || data.country || null;
          region = data.region || data.region_code || data.city || null;
          if (!lat && data.latitude) lat = Number(data.latitude);
          if (!lon && data.longitude) lon = Number(data.longitude);
        }
      } catch (e) {
        // ignore network errors
      }
    }

    const payload = {
      emoji: emoji.emoji,
      label: emoji.label,
      timestamp: new Date().toISOString(),
      country,
      region,
      latitude: lat,
      longitude: lon,
    };

    try {
      const resp = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        setStatus("✨ Grazie! Il tuo mood è stato registrato.");
        setShowConfetti(true);
        setTimeout(() => {
          setShowConfetti(false);
        }, 3000);
        setTimeout(() => {
          setStatus(null);
          setSelectedMood(null);
        }, 4000);
      } else {
        setStatus("❌ Errore durante l'invio. Riprova più tardi.");
        setSelectedMood(null);
      }
    } catch (e) {
      setStatus("❌ Impossibile contattare il server.");
      setSelectedMood(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen max-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 font-sans">
      <main className="flex w-full max-w-5xl mx-auto flex-col items-center justify-center px-6 py-6 gap-6">
        {/* Header */}
        <div className="text-center animate-fade-in w-full flex-shrink-0">
          <div className="inline-block mb-2 px-3 py-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full text-xs font-medium text-purple-600 dark:text-purple-400">
            🌍 Mappa Globale delle Emozioni
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 pb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-normal">
            Come ti senti oggi?
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
            Unisciti a migliaia di persone che condividono il proprio mood
          </p>
        </div>

        {/* Mood Grid - Card 3D con counter */}
        <div className="grid grid-cols-3 gap-2.5 md:gap-3 w-full max-w-2xl flex-shrink-0">
          {EMOTICONS.map((m, index) => {
            const count = moodCounts[m.emoji] || 0;
            const isSelected = selectedMood === m.emoji;
            return (
              <button
                key={m.label}
                onClick={() => submitMood(m)}
                disabled={submitting}
                className={`
                  group relative flex flex-col items-center justify-center rounded-xl 
                  bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900
                  shadow-lg border border-gray-200 dark:border-gray-700
                  transition-all duration-500 
                  ${submitting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95'}
                  ${isSelected ? 'ring-4 ring-purple-500 scale-105 -translate-y-1' : ''}
                  animate-slide-up overflow-hidden
                  p-2 h-20 md:h-24
                `}
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  transform: isSelected ? 'perspective(1000px) rotateY(10deg)' : ''
                }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-blue-500/0 group-hover:from-purple-500/10 group-hover:to-blue-500/10 transition-all duration-500 rounded-xl"></div>
                
                {/* Content */}
                <div className="relative z-10 text-center">
                  <div className="text-2xl md:text-3xl mb-0.5 group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">
                    {m.emoji}
                  </div>
                  <div className="text-[10px] md:text-xs font-semibold text-gray-800 dark:text-gray-200 mb-0.5">
                    {m.label}
                  </div>
                  {count > 0 && (
                    <div className="text-[9px] font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-1 py-0.5 rounded-full inline-block">
                      {count.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Pulse effect when selected */}
                {isSelected && (
                  <>
                    <div className="absolute inset-0 rounded-xl bg-purple-500 opacity-20 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-xl border-4 border-purple-500 animate-ping opacity-75"></div>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Confetti Celebration */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              >
                <div
                  className="w-2 h-2 md:w-3 md:h-3 rounded-full"
                  style={{
                    backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][Math.floor(Math.random() * 5)]
                  }}
                />
              </div>
            ))}
          </div>
        )}

                {/* Status Message */}
        {status && (
          <div className={`
            px-6 py-2.5 rounded-xl font-semibold text-center animate-bounce-in shadow-lg text-xs flex-shrink-0
            ${status.includes('✨') ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' : 'bg-gradient-to-r from-red-400 to-rose-500 text-white'}
          `}>
            {status}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-center flex-shrink-0">
          <Link 
            href="/stats" 
            className="group relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-full font-bold shadow-xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 overflow-hidden text-xs"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <span className="text-base">🗺️</span>
            <span>Esplora la Mappa Mondiale</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {/* Stats Preview */}
        <div className="text-center flex-shrink-0">
          <div className="inline-flex items-center gap-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md px-5 py-2 rounded-lg shadow-md">
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {Object.values(moodCounts).reduce((a, b) => a + b, 0).toLocaleString()}
              </div>
              <div className="text-[9px] text-gray-600 dark:text-gray-400 font-medium">Mood oggi</div>
            </div>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {Object.keys(moodCounts).length}
              </div>
              <div className="text-[9px] text-gray-600 dark:text-gray-400 font-medium">Emozioni</div>
            </div>
          </div>
        </div>
        {/* Stats Preview */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md px-8 py-4 rounded-2xl shadow-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {Object.values(moodCounts).reduce((a, b) => a + b, 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Mood oggi</div>
            </div>
            <div className="w-px h-12 bg-gray-300 dark:bg-gray-600"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {Object.keys(moodCounts).length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Emozioni diverse</div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400 max-w-md">
          <p className="flex items-center justify-center gap-2">
            <span>🔒</span>
            <span>Completamente anonimo • Privacy-first • Dati aggregati</span>
          </p>
        </div>
      </main>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(-100px);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
          animation-fill-mode: both;
        }

        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}
