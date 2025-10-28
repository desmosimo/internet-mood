"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MOOD_COLORS } from "../components/WorldMap";
import dynamic from "next/dynamic";

// Carica WorldMap solo lato client
const WorldMap = dynamic(() => import("../components/WorldMap"), { ssr: false });

type Stats = {
  total: number;
  byContinent: Record<string, number>; // kept for potential future use
  byCountry: Record<string, number>;
  byMood: Record<string, number>; // global mood summary (optional)
  byMoodAndContinent: Record<string, Record<string, number>>; // not used now
  byCountryMood: Record<string, Record<string, number>>; // per-country mood breakdown
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string } | null>(null);
  const [debugMode, setDebugMode] = useState(false);

  async function loadStats(force = false) {
    try {
      if (force) setLoading(true);
      const ts = Date.now();
      const debug = typeof window !== 'undefined' && window.location.search.includes('debug=1');
      const res = await fetch(`/api/stats?ts=${ts}${debug ? '&debug=1' : ''}`, { cache: 'no-store' });
      const data = await res.json();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    setDebugMode(window.location.search.includes('debug=1'));
    loadStats(); 
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Caricamento statistiche...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600">Impossibile caricare le statistiche.</p>
          <Link href="/" className="mt-4 inline-block underline">← Torna alla homepage</Link>
        </div>
      </div>
    );
  }

  // Dati mood del paese selezionato
  const countryMoodData = selectedCountry && stats.byCountryMood[selectedCountry.code]
    ? Object.entries(stats.byCountryMood[selectedCountry.code])
        .sort((a,b) => b[1]-a[1])
        .map(([mood, value]) => ({ mood, value }))
    : [];

  const totalCountryMood = countryMoodData.reduce((acc, m) => acc + m.value, 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2">
              <span className="mr-2">←</span> Home
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Mappa dei Mood</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Passa il mouse per vedere la distribuzione dei mood. Clicca su un paese per maggiori dettagli.</p>
          </div>
          <div className="flex items-center gap-2">
          <button
              onClick={() => loadStats(true)}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Aggiorno…' : 'Aggiorna dati'}
            </button>
          {selectedCountry && (
            <button
              onClick={() => setSelectedCountry(null)}
              className="px-4 py-2 text-sm rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Deseleziona
            </button>
          )}
          </div>
        </div>

        {/* Mappa */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="w-full h-[520px] relative">
            <WorldMap 
              byCountry={stats.byCountry} 
              byCountryMood={stats.byCountryMood} 
              onSelectCountry={(code, name) => setSelectedCountry({ code, name })}
            />
          </div>
        </div>

        {debugMode && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-xs mb-6 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-100">
            <h3 className="font-semibold mb-2">DEBUG STATS</h3>
            <pre className="overflow-auto max-h-64 whitespace-pre-wrap">{JSON.stringify({
              total: stats.total,
              countries: Object.keys(stats.byCountry),
              sampleFirst: stats.byCountryMood && Object.entries(stats.byCountryMood).slice(0,3)
            }, null, 2)}</pre>
          </div>
        )}

        {/* Dettaglio paese selezionato */}
        {selectedCountry && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-10">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">Dettaglio: <span>{selectedCountry.name}</span></h2>
            {countryMoodData.length === 0 ? (
              <p className="text-gray-500">Nessun mood registrato per questo paese.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Grafico a torta distribuzione mood del paese */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Distribuzione</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={countryMoodData} dataKey="value" nameKey="mood" cx="50%" cy="50%" outerRadius={80} label>
                        {countryMoodData.map((entry) => (
                          <Cell key={entry.mood} fill={MOOD_COLORS[entry.mood] || "#8884d8"} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Lista mood con barre */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Dettaglio Mood</h3>
                  <div className="space-y-3">
                    {countryMoodData.map((m, idx) => {
                      const perc = ((m.value / totalCountryMood) * 100).toFixed(1);
                      return (
                        <div key={m.mood} className="flex items-center gap-3">
                          <div className="text-2xl w-10">{m.mood}</div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1 text-xs">
                              <span>{m.value} registrazioni</span>
                              <span>{perc}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full transition-all" 
                                style={{ width: `${perc}%`, backgroundColor: MOOD_COLORS[m.mood] || '#8884d8' }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
