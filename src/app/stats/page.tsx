"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MOOD_COLORS } from "../components/WorldMap";
import dynamic from "next/dynamic";

// Carica WorldMap solo lato client
const WorldMap = dynamic(() => import("../components/WorldMap"), { ssr: false });

type Stats = {
  total: number;
  byContinent: Record<string, number>;
  byCountry: Record<string, number>;
  byMood: Record<string, number>;
  byMoodAndContinent: Record<string, Record<string, number>>;
  byCountryMood: Record<string, Record<string, number>>;
  timeRange?: string;
  trending24h?: Array<{ mood: string; current: number; previous: number; delta: number; pct: number }>;
};

type ReasonsData = {
  global: Array<{ phrase: string; count: number }>;
  byCountry: Record<string, Array<{ phrase: string; count: number }>>;
  total: number;
};

type ActiveTab = 'map' | 'countries' | 'reasons' | 'trending';

// Mappatura ISO2 → Nome completo paese
const ISO2_TO_NAME: Record<string, string> = {
  IT: "Italy", FR: "France", DE: "Germany", ES: "Spain", PT: "Portugal",
  CH: "Switzerland", AT: "Austria", BE: "Belgium", NL: "Netherlands", GB: "United Kingdom",
  IE: "Ireland", NO: "Norway", SE: "Sweden", FI: "Finland", DK: "Denmark",
  PL: "Poland", GR: "Greece", TR: "Turkey", RU: "Russia", UA: "Ukraine",
  RO: "Romania", CZ: "Czech Republic", HU: "Hungary", BG: "Bulgaria", HR: "Croatia",
  RS: "Serbia", SK: "Slovakia", SI: "Slovenia", LT: "Lithuania", LV: "Latvia",
  EE: "Estonia", BY: "Belarus", AL: "Albania", IS: "Iceland", LU: "Luxembourg",
  MT: "Malta", CY: "Cyprus", MD: "Moldova", US: "United States", CA: "Canada",
  MX: "Mexico", BR: "Brazil", AR: "Argentina", CO: "Colombia", CL: "Chile",
  PE: "Peru", VE: "Venezuela", UY: "Uruguay", BO: "Bolivia", EC: "Ecuador",
  CR: "Costa Rica", PA: "Panama", GT: "Guatemala", HN: "Honduras", NI: "Nicaragua",
  SV: "El Salvador", DO: "Dominican Rep.", PR: "Puerto Rico", CU: "Cuba", JM: "Jamaica",
  CN: "China", JP: "Japan", KR: "South Korea", IN: "India", ID: "Indonesia",
  TH: "Thailand", VN: "Vietnam", PH: "Philippines", MY: "Malaysia", SG: "Singapore",
  TW: "Taiwan", HK: "Hong Kong", PK: "Pakistan", BD: "Bangladesh", UZ: "Uzbekistan",
  KZ: "Kazakhstan", SA: "Saudi Arabia", AE: "UAE", IL: "Israel",
  ZA: "South Africa", NG: "Nigeria", EG: "Egypt", KE: "Kenya", MA: "Morocco",
  DZ: "Algeria", TN: "Tunisia", GH: "Ghana", ET: "Ethiopia", UG: "Uganda",
  TZ: "Tanzania", SN: "Senegal", CI: "Ivory Coast", CM: "Cameroon", ZM: "Zambia",
  ZW: "Zimbabwe", BW: "Botswana", NA: "Namibia", RW: "Rwanda", SD: "Sudan",
  AU: "Australia", NZ: "New Zealand", FJ: "Fiji", PG: "Papua New Guinea",
  WS: "Samoa", TO: "Tonga", VU: "Vanuatu", NC: "New Caledonia", PF: "French Polynesia", GU: "Guam",
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reasons, setReasons] = useState<ReasonsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [debugMode, setDebugMode] = useState(false);
  const [timeRange, setTimeRange] = useState<'day'|'week'|'month'|'all'>('day');
  const [showLegendModal, setShowLegendModal] = useState(false);

  async function loadStats(force = false) {
    try {
      if (force) setLoading(true);
      const ts = Date.now();
      const tr = timeRange === 'all' ? '' : `&timeRange=${timeRange}`;
      const res = await fetch(`/api/stats?ts=${ts}${tr}`, { cache: 'no-store' });
      const data = await res.json();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadReasons() {
    try {
      setLoadingReasons(true);
      const ts = Date.now();
      const tr = timeRange === 'all' ? '' : `&timeRange=${timeRange}`;
      const res = await fetch(`/api/stats/reasons?ts=${ts}${tr}`, { cache: 'no-store' });
      const data = await res.json();
      setReasons(data);
    } catch {
      setReasons(null);
    } finally {
      setLoadingReasons(false);
    }
  }

  useEffect(() => { 
    loadStats(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  // Load reasons when switching to reasons tab
  useEffect(() => {
    if (activeTab === 'reasons' && !reasons) {
      loadReasons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Load reasons when country is selected (for modal)
  useEffect(() => {
    if (selectedCountry && !reasons) {
      loadReasons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading stats...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600">Unable to load statistics.</p>
          <Link href="/" className="mt-4 inline-block underline">← Back to homepage</Link>
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

  // Top 15 countries for ranking
  const topCountries = Object.entries(stats.byCountry)
    .sort((a,b) => b[1] - a[1])
    .slice(0,15)
    .map(([code, count]) => ({ code, count }));

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 overflow-y-auto">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1">
              <span>←</span> Home
            </Link>
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-purple-600">{stats.total.toLocaleString()}</span>
                <span className="text-gray-600 dark:text-gray-400">global moods</span>
              </div>
              <div className="w-px h-4 bg-gray-300"></div>
              <div className="text-center">
                <span className="font-bold text-lg text-blue-600">{Object.keys(stats.byCountry).length}</span>
                <span className="text-gray-600 dark:text-gray-400">active countries</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => loadStats(true)}
            className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '⟳' : '↻ Refresh'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-8">
        {/* Tabs - Compatti mobile, full desktop */}
        <div className="flex gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === 'map'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-sm sm:text-base">🗺️</span>
            <span className="hidden xs:inline sm:inline">World Map</span>
          </button>
          <button
            onClick={() => setActiveTab('countries')}
            className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === 'countries'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-sm sm:text-base">📊</span>
            <span className="hidden xs:inline sm:inline">Top Countries</span>
          </button>
          <button
            onClick={() => setActiveTab('reasons')}
            className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === 'reasons'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-sm sm:text-base">💭</span>
            <span className="hidden xs:inline sm:inline">Reasons</span>
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === 'trending'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-sm sm:text-base">🔥</span>
            <span className="hidden xs:inline sm:inline">Trending 24h</span>
          </button>
        </div>

        {/* Time range selector - Mobile ottimizzato */}
        <div className="mb-4 sm:mb-6 flex items-center gap-2 flex-wrap">
          <div className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-gray-300 w-full sm:w-auto mb-1 sm:mb-0">Time range:</div>
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            {['day','week','month','all'].map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r as any)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border transition-all ${timeRange === r ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                {r === 'day' && 'Today'}
                {r === 'week' && '7d'}
                {r === 'month' && '30d'}
                {r === 'all' && 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'map' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 sm:p-4">
            {/* Bottone legenda mobile */}
            <div className="sm:hidden mb-3 flex justify-center">
              <button
                onClick={() => setShowLegendModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-all shadow-md"
              >
                <span>🎨</span>
                <span>View Legend</span>
              </button>
            </div>
            
            <div className="w-full h-[280px] xs:h-[320px] sm:h-[350px] md:h-[450px] relative overflow-hidden">
              <WorldMap 
                byCountry={stats.byCountry} 
                byCountryMood={stats.byCountryMood} 
                onSelectCountry={(code, name) => {
                  const fullName = ISO2_TO_NAME[code] || name || code;
                  setSelectedCountry({ code, name: fullName });
                }}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-center text-gray-500 mt-2 sm:mt-3">Click on a country to see details</p>
          </div>
        )}

        {activeTab === 'countries' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {topCountries.map((item, idx) => {
              const topMood = stats.byCountryMood[item.code] 
                ? Object.entries(stats.byCountryMood[item.code]).sort((a,b) => b[1]-a[1])[0] 
                : null;
              const countryName = ISO2_TO_NAME[item.code] || item.code;
              return (
                <button
                  key={item.code}
                  onClick={() => setSelectedCountry({ code: item.code, name: countryName })}
                  className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow hover:shadow-lg transition-all hover:scale-105 text-left active:scale-95"
                >
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <span className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200">#{idx + 1}</span>
                    {topMood && <span className="text-2xl sm:text-3xl">{topMood[0]}</span>}
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-0.5 sm:mb-1 truncate">{countryName}</div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{item.count.toLocaleString()} mood</div>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'reasons' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
              <span>💭</span>
              <span className="text-sm sm:text-base">Why people feel this way</span>
            </h3>
            {loadingReasons ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : reasons && reasons.global.length > 0 ? (
              <div className="space-y-4">
                {/* Word Cloud Style Display */}
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center items-center min-h-[250px] sm:min-h-[300px] bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 sm:p-6">
                  {reasons.global.slice(0, 60).map((item, idx) => {
                    const maxCount = reasons.global[0]?.count || 1;
                    const minSize = 12;
                    const maxSize = 42;
                    const size = minSize + ((item.count / maxCount) * (maxSize - minSize));
                    const opacity = 0.6 + (item.count / maxCount) * 0.4;
                    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
                    const color = colors[idx % colors.length];
                    return (
                      <span
                        key={item.phrase}
                        className="inline-block px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition-all hover:scale-110 sm:hover:scale-125 cursor-default"
                        style={{
                          fontSize: `${size}px`,
                          color,
                          opacity,
                        }}
                        title={`${item.count} mentions`}
                      >
                        {item.phrase}
                      </span>
                    );
                  })}
                </div>
                
                {/* Top phrases list */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Top Reasons</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {reasons.global.slice(0, 10).map((item, idx) => (
                      <div key={item.phrase} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/40 px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">#{idx + 1}</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{item.phrase}</span>
                        </div>
                        <span className="text-xs text-gray-500">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <p className="text-[10px] sm:text-xs text-gray-500 mt-4 text-center">
                  Phrases are extracted from user-submitted reasons. Multi-word expressions like "good weather" are preserved.
                </p>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8 sm:py-12 text-sm">No reasons recorded yet</p>
            )}
          </div>
        )}

        {activeTab === 'trending' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
              <span>🔥</span> 
              <span className="text-sm sm:text-base">Growing moods (last 24h)</span>
            </h3>
            {stats.trending24h && stats.trending24h.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {stats.trending24h.map((t, idx) => {
                  const growthColor = t.delta > 0 ? 'text-green-600 dark:text-green-400' : t.delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400';
                  return (
                    <div key={t.mood} className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                      <div className="text-xl sm:text-2xl md:text-3xl">{t.mood}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-[10px] sm:text-xs mb-1">
                          <span className="font-semibold truncate">{t.current} today</span>
                          <span className="text-gray-500 truncate ml-1">{t.previous} yesterday</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 sm:h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600" style={{ width: `${Math.min(100, (t.current / Math.max(1, t.previous)) * 100)}%` }}></div>
                        </div>
                      </div>
                      <div className="text-right min-w-[50px] sm:min-w-[70px] flex-shrink-0">
                        <div className={`text-xs sm:text-sm font-bold ${growthColor}`}>{t.delta > 0 ? '+' + t.delta : t.delta}</div>
                        <div className="text-[9px] sm:text-[10px] text-gray-500">{t.pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-gray-500">No significant trend in the last 24 hours.</p>
            )}
            <p className="mt-3 sm:mt-4 text-[9px] sm:text-[10px] text-gray-500 leading-relaxed">Calculation: mood volume comparison in last 24h vs previous 24h.</p>
          </div>
        )}
      </div>

      {/* Modal laterale paese selezionato */}
      {selectedCountry && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => setSelectedCountry(null)}
          />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white dark:bg-gray-800 z-50 shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{selectedCountry.name}</h2>
              <button 
                onClick={() => setSelectedCountry(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {countryMoodData.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No moods recorded for this country</p>
              ) : (
                <>
                  {/* Stats card */}
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4">
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalCountryMood.toLocaleString()}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">moods recorded</div>
                  </div>

                  {/* Grafico compatto */}
                  <div>
                    <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Mood Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={countryMoodData} dataKey="value" nameKey="mood" cx="50%" cy="50%" outerRadius={70} label>
                          {countryMoodData.map((entry) => (
                            <Cell key={entry.mood} fill={MOOD_COLORS[entry.mood] || "#8884d8"} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top 3 mood */}
                  <div>
                    <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Top Mood</h3>
                    <div className="space-y-2">
                      {countryMoodData.slice(0,3).map((m, idx) => {
                        const perc = ((m.value / totalCountryMood) * 100).toFixed(1);
                        return (
                          <div key={m.mood} className="flex items-center gap-3">
                            <span className="text-3xl">{m.mood}</span>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium">{m.value} votes</span>
                                <span className="text-gray-500">{perc}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="h-2 rounded-full transition-all"
                                  style={{ width: `${perc}%`, backgroundColor: MOOD_COLORS[m.mood] || '#8884d8' }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Country-specific reasons */}
                  {reasons && reasons.byCountry[selectedCountry.code] && reasons.byCountry[selectedCountry.code].length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">💭 Local Reasons</h3>
                      <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 flex flex-wrap gap-2 justify-center min-h-[120px]">
                        {reasons.byCountry[selectedCountry.code].slice(0, 20).map((item, idx) => {
                          const maxCount = reasons.byCountry[selectedCountry.code][0]?.count || 1;
                          const minSize = 11;
                          const maxSize = 24;
                          const size = minSize + ((item.count / maxCount) * (maxSize - minSize));
                          const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
                          const color = colors[idx % colors.length];
                          return (
                            <span
                              key={item.phrase}
                              className="inline-block px-2 py-1 rounded font-semibold"
                              style={{ fontSize: `${size}px`, color }}
                              title={`${item.count} mentions`}
                            >
                              {item.phrase}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Legenda Mobile */}
      {showLegendModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowLegendModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">🎨 Map Legend</h3>
              <button
                onClick={() => setShowLegendModal(false)}
                className="text-2xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                ×
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Dominant mood by country
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-2xl">😊</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Happy</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-2xl">😢</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sad</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-2xl">😡</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Angry</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-2xl">😰</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Anxious</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-2xl">🤔</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Confused</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-2xl">😌</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Calm</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowLegendModal(false)}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </main>
  );
}
