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
  { emoji: "😄", label: "Happy" },
  { emoji: "🙂", label: "Content" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😕", label: "Sad" },
  { emoji: "😡", label: "Angry" },
  { emoji: "😴", label: "Tired" },
  { emoji: "🤩", label: "Excited" },
  { emoji: "😰", label: "Anxious" },
  { emoji: "😎", label: "Relaxed" },
];

export default function Home() {
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodCounts, setMoodCounts] = useState<Record<string, number>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShareButtons, setShowShareButtons] = useState(false);
  const [lastSubmittedMood, setLastSubmittedMood] = useState<string>('');
  const [streak, setStreak] = useState<number>(0);
  const [totalSubmits, setTotalSubmits] = useState<number>(0);
  const [liveStats, setLiveStats] = useState<{ totalToday: number; topTrending: { mood: string; pct: number } | null }>({ totalToday: 0, topTrending: null });

  // Utility per data (YYYY-MM-DD)
  function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  function yesterdayKey(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  // Genera device_id unico per questo browser se non esiste
  function getDeviceId(): string {
    try {
      let deviceId = localStorage.getItem('im_device_id');
      if (!deviceId) {
        // Genera UUID v4 semplice
        deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        localStorage.setItem('im_device_id', deviceId);
      }
      return deviceId;
    } catch {
      // Fallback se localStorage non disponibile
      return 'unknown-device';
    }
  }

  // Carica streak da localStorage all'avvio
  useEffect(() => {
    try {
      // Assicurati che device_id sia generato all'avvio
      getDeviceId();
      
      const storedStreak = localStorage.getItem('im_streak');
      const storedLast = localStorage.getItem('im_lastSubmitDate');
      const storedTotal = localStorage.getItem('im_totalSubmits');
      setStreak(storedStreak ? parseInt(storedStreak) : 0);
      setTotalSubmits(storedTotal ? parseInt(storedTotal) : 0);
      // Se ultimo submit era ieri manteniamo, se >1 giorno fa reset visivo ma lasciamo valori finché non c'è nuovo submit
      if (storedLast && storedLast !== todayKey() && storedLast !== yesterdayKey()) {
        // Mostriamo streak = 0 se rotto, ma manteniamo totalSubmits
        setStreak(0);
      }
    } catch {
      // ignore
    }
  }, []);

  // Aggiorna streak dopo submit riuscito
  function updateStreakAfterSubmit() {
    try {
      const last = localStorage.getItem('im_lastSubmitDate');
      const storedStreakRaw = localStorage.getItem('im_streak');
      const storedTotalRaw = localStorage.getItem('im_totalSubmits');
      let currentStreak = storedStreakRaw ? parseInt(storedStreakRaw) : 0;
      let total = storedTotalRaw ? parseInt(storedTotalRaw) : 0;
      const today = todayKey();
      const yesterday = yesterdayKey();

      if (last === today) {
        // Già inviato oggi: non incrementiamo streak, solo total
        total += 1;
      } else if (last === yesterday) {
        currentStreak += 1;
        total += 1;
      } else {
        // Reset oppure primo invio
        currentStreak = 1;
        total += 1;
      }

      localStorage.setItem('im_lastSubmitDate', today);
      localStorage.setItem('im_streak', currentStreak.toString());
      localStorage.setItem('im_totalSubmits', total.toString());
      setStreak(currentStreak);
      setTotalSubmits(total);
    } catch {
      // ignore localStorage errors
    }
  }

  // Carica i conteggi dei mood + live stats oggi
  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch('/api/stats?timeRange=day');
        const data = await res.json();
        setMoodCounts(data.byMood || {});
        const totalToday = data.total || 0;
        const topTrending = data.trending24h && data.trending24h[0] ? { mood: data.trending24h[0].mood, pct: data.trending24h[0].pct } : null;
        setLiveStats({ totalToday, topTrending });
      } catch {
        setMoodCounts({});
        setLiveStats({ totalToday: 0, topTrending: null });
      }
    }
    fetchCounts();
    // Refresh ogni 30 secondi per effetto live
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
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

    const reasonInput = (document.getElementById('reason-input') as HTMLInputElement | null);
    const rawReason = reasonInput?.value || '';

    const payload = {
      emoji: emoji.emoji,
      label: emoji.label,
      timestamp: new Date().toISOString(),
      country,
      region,
      latitude: lat,
      longitude: lon,
      reason: rawReason.trim().slice(0,30) || null,
      deviceId: getDeviceId(), // Aggiungi device_id per rate limiting
    };

    try {
      const resp = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        setStatus("✨ Thank you! Your mood has been recorded.");
        setShowConfetti(true);
          setShowShareButtons(true);
          setLastSubmittedMood(emoji.emoji);
          updateStreakAfterSubmit();
        if (reasonInput) reasonInput.value='';
        setTimeout(() => { setShowConfetti(false); }, 3000);
          setTimeout(() => { 
            setStatus(null); 
            setSelectedMood(null); 
          }, 6000);
      } else {
        // Rate limit o altro errore
        const data = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          // Rate limit: mostra messaggio specifico
          setStatus(`⏰ ${data.error || 'Daily limit reached. Try again tomorrow!'}`);
        } else {
          setStatus(`❌ ${data.error || 'Error sending mood. Please try again later.'}`);
        }
        setSelectedMood(null);
      }
    } catch (e) {
      setStatus("❌ Unable to contact the server.");
      setSelectedMood(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 font-sans overflow-y-auto">
      <main className="flex w-full max-w-5xl mx-auto flex-col items-center justify-center px-6 py-6 gap-6 min-h-screen">
        {/* Header */}
        <div className="text-center animate-fade-in w-full flex-shrink-0">
          <div className="inline-block mb-2 px-3 py-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full text-xs font-medium text-purple-600 dark:text-purple-400">
            🌍 Global Emotion Map
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 pb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-normal">
            How are you feeling today?
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
            Join thousands sharing their mood around the world
          </p>
          {/* Streak Badge */}
          {streak > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-semibold shadow-md animate-fade-in">
              <span>🔥 {streak} day streak</span>
              {streak >= 7 && streak < 30 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">🏅 7+ days!</span>
              )}
              {streak >= 30 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">🌟 30 Day Legend</span>
              )}
            </div>
          )}
          {streak === 0 && totalSubmits > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 text-white text-xs font-medium shadow-md animate-fade-in">
              <span>🔥 Restart your streak today!</span>
            </div>
          )}

          {/* Live Stats Banner */}
          {liveStats.totalToday > 0 && (
            <div className="mt-4 inline-flex items-center gap-4 px-5 py-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold shadow-lg animate-fade-in">
              <div className="flex items-center gap-1.5">
                <span className="animate-pulse">🔴</span>
                <span>LIVE</span>
              </div>
              <div className="w-px h-4 bg-white/30"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold">{liveStats.totalToday.toLocaleString()}</span>
                <span>moods today</span>
              </div>
              {liveStats.topTrending && (
                <>
                  <div className="w-px h-4 bg-white/30"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{liveStats.topTrending.mood}</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                      +{liveStats.topTrending.pct}%
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
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

          {/* Social Sharing Buttons */}
          {showShareButtons && (
            <div className="flex flex-col items-center gap-2 animate-fade-in flex-shrink-0">
              <p className="text-xs text-gray-600 dark:text-gray-400">Share your mood:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const text = `I just shared my ${lastSubmittedMood} mood on Internet Mood! Discover how the world is feeling today 🌍`;
                    const url = 'https://internet-mood.vercel.app';
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1DA1F2] text-white rounded-full text-xs font-semibold hover:bg-[#1a8cd8] transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Twitter
                </button>
                <button
                  onClick={() => {
                    const text = `I shared my ${lastSubmittedMood} mood! Discover how the world is feeling on Internet Mood`;
                    const url = 'https://internet-mood.vercel.app';
                    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-full text-xs font-semibold hover:bg-[#20ba5a] transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  WhatsApp
                </button>
                <button
                  onClick={() => {
                    const url = 'https://internet-mood.vercel.app';
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1877F2] text-white rounded-full text-xs font-semibold hover:bg-[#166fe5] transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </button>
              </div>
            </div>
          )}

        {/* Reason Input prominente */}
        <div className="w-full max-w-2xl flex-shrink-0">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-5 shadow-lg border border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💭</span>
              <label htmlFor="reason-input" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Tell us why you feel this way
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">(optional)</span>
            </div>
            <input
              id="reason-input"
              type="text"
              maxLength={30}
              placeholder="e.g. &quot;stressful work&quot;, &quot;sunny day&quot;, &quot;got good news&quot;..."
              className="w-full px-5 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all shadow-sm"
              disabled={submitting}
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ✨ Your words help understand the world
              </p>
              <span className="text-xs text-gray-400 dark:text-gray-500">max 30 characters</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center flex-shrink-0 w-full max-w-md">
          <Link 
            href="/stats" 
            className="group relative flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-full font-bold shadow-xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 overflow-hidden text-xs"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <span className="text-base">🗺️</span>
            <span>Explore the World Map</span>
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
              <div className="text-[9px] text-gray-600 dark:text-gray-400 font-medium">Moods today</div>
            </div>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {Object.keys(moodCounts).length}
              </div>
              <div className="text-[9px] text-gray-600 dark:text-gray-400 font-medium">Emotions</div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400 max-w-md">
          <p className="flex items-center justify-center gap-2">
            <span>🔒</span>
            <span>Completely anonymous • Privacy-first • Aggregated data</span>
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
