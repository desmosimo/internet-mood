"use client";

import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { useState, useMemo } from "react";

// Usa world-atlas stabile con ISO_A2
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Mappatura nome paese → codice ISO2 (completa)
const NAME_TO_ISO2: Record<string, string> = {
  // Europa
  Italy: "IT",
  France: "FR",
  Germany: "DE",
  Spain: "ES",
  Portugal: "PT",
  Switzerland: "CH",
  Austria: "AT",
  Belgium: "BE",
  Netherlands: "NL",
  "United Kingdom": "GB",
  Ireland: "IE",
  Norway: "NO",
  Sweden: "SE",
  Finland: "FI",
  Denmark: "DK",
  Poland: "PL",
  Greece: "GR",
  Turkey: "TR",
  Russia: "RU",
  Ukraine: "UA",
  Romania: "RO",
  "Czech Republic": "CZ",
  Czechia: "CZ",
  Hungary: "HU",
  Bulgaria: "BG",
  Croatia: "HR",
  Serbia: "RS",
  Slovakia: "SK",
  Slovenia: "SI",
  Lithuania: "LT",
  Latvia: "LV",
  Estonia: "EE",
  Belarus: "BY",
  Albania: "AL",
  Iceland: "IS",
  Luxembourg: "LU",
  Malta: "MT",
  Cyprus: "CY",
  Moldova: "MD",
  "North Macedonia": "MK",
  Macedonia: "MK",
  Montenegro: "ME",
  "Bosnia and Herzegovina": "BA",
  Kosovo: "XK",
  
  // America del Nord
  "United States of America": "US",
  "United States": "US",
  Canada: "CA",
  Mexico: "MX",
  
  // America Centrale e Caraibi
  Guatemala: "GT",
  Honduras: "HN",
  "El Salvador": "SV",
  Nicaragua: "NI",
  "Costa Rica": "CR",
  Panama: "PA",
  Cuba: "CU",
  Jamaica: "JM",
  Haiti: "HT",
  "Dominican Republic": "DO",
  "Dominican Rep.": "DO",
  "Puerto Rico": "PR",
  Belize: "BZ",
  
  // America del Sud
  Brazil: "BR",
  Argentina: "AR",
  Chile: "CL",
  Colombia: "CO",
  Peru: "PE",
  Venezuela: "VE",
  Ecuador: "EC",
  Bolivia: "BO",
  Paraguay: "PY",
  Uruguay: "UY",
  Guyana: "GY",
  Suriname: "SR",
  "French Guiana": "GF",
  
  // Asia
  China: "CN",
  India: "IN",
  Japan: "JP",
  "Republic of Korea": "KR",
  "South Korea": "KR",
  "Korea": "KR",
  "North Korea": "KP",
  "Dem. Rep. Korea": "KP",
  Indonesia: "ID",
  Thailand: "TH",
  Vietnam: "VN",
  "Viet Nam": "VN",
  Philippines: "PH",
  Malaysia: "MY",
  Singapore: "SG",
  Myanmar: "MM",
  Cambodia: "KH",
  Laos: "LA",
  "Lao PDR": "LA",
  Bangladesh: "BD",
  Pakistan: "PK",
  Afghanistan: "AF",
  Iran: "IR",
  Iraq: "IQ",
  Syria: "SY",
  Israel: "IL",
  Jordan: "JO",
  Lebanon: "LB",
  "Saudi Arabia": "SA",
  Yemen: "YE",
  Oman: "OM",
  "United Arab Emirates": "AE",
  Kuwait: "KW",
  Qatar: "QA",
  Bahrain: "BH",
  Nepal: "NP",
  "Sri Lanka": "LK",
  Mongolia: "MN",
  Kazakhstan: "KZ",
  Uzbekistan: "UZ",
  Turkmenistan: "TM",
  Tajikistan: "TJ",
  Kyrgyzstan: "KG",
  Georgia: "GE",
  Armenia: "AM",
  Azerbaijan: "AZ",
  
  // Africa
  "South Africa": "ZA",
  Egypt: "EG",
  Morocco: "MA",
  Algeria: "DZ",
  Tunisia: "TN",
  Libya: "LY",
  Sudan: "SD",
  "South Sudan": "SS",
  Ethiopia: "ET",
  Kenya: "KE",
  Tanzania: "TZ",
  Uganda: "UG",
  Nigeria: "NG",
  Ghana: "GH",
  "Côte d'Ivoire": "CI",
  "Ivory Coast": "CI",
  Senegal: "SN",
  Mali: "ML",
  Niger: "NE",
  Burkina: "BF",
  "Burkina Faso": "BF",
  Chad: "TD",
  Cameroon: "CM",
  "Central African Republic": "CF",
  "Central African Rep.": "CF",
  "Congo": "CG",
  "Republic of Congo": "CG",
  "Democratic Republic of the Congo": "CD",
  "Dem. Rep. Congo": "CD",
  Angola: "AO",
  Zambia: "ZM",
  Zimbabwe: "ZW",
  Mozambique: "MZ",
  Madagascar: "MG",
  Botswana: "BW",
  Namibia: "NA",
  Malawi: "MW",
  Rwanda: "RW",
  Burundi: "BI",
  Somalia: "SO",
  Eritrea: "ER",
  Djibouti: "DJ",
  Gabon: "GA",
  "Equatorial Guinea": "GQ",
  "Eq. Guinea": "GQ",
  Togo: "TG",
  Benin: "BJ",
  Guinea: "GN",
  "Guinea-Bissau": "GW",
  Liberia: "LR",
  "Sierra Leone": "SL",
  Mauritania: "MR",
  Gambia: "GM",
  Lesotho: "LS",
  Swaziland: "SZ",
  eSwatini: "SZ",
  
  // Oceania
  Australia: "AU",
  "New Zealand": "NZ",
  "Papua New Guinea": "PG",
  Fiji: "FJ",
  "Solomon Islands": "SB",
  "Solomon Is.": "SB",
  Vanuatu: "VU",
  "New Caledonia": "NC",
  "French Polynesia": "PF",
  Samoa: "WS",
  Kiribati: "KI",
  Tonga: "TO",
  
  // Altri territori
  Greenland: "GL",
  "Falkland Islands": "FK",
  "Falkland Is.": "FK",
  Antarctica: "AQ",
  "Western Sahara": "EH",
  "W. Sahara": "EH",
  Palestine: "PS",
  "West Bank": "PS",
  Taiwan: "TW"
};

export type WorldMapProps = {
  byCountry: Record<string, number>;
  byCountryMood: Record<string, Record<string, number>>;
  onSelectCountry?: (code: string, name: string) => void;
};

// Colori fissi per mood (emoji)
export const MOOD_COLORS: Record<string, string> = {
  "😀": "#fbbf24", // Felice
  "🙂": "#f59e0b", // Contento
  "😐": "#9ca3af", // Neutrale
  "😕": "#3b82f6", // Triste
  "😡": "#dc2626", // Arrabbiato
  "😴": "#6366f1", // Stanco
  "🤩": "#ec4899", // Entusiasta
  "😰": "#0ea5e9", // Ansioso
  "😎": "#10b981", // Rilassato
  "😄": "#fbbf24", // Variante Felice
};

// Fallback colore se mood non mappato
const DEFAULT_COLOR = "#E5E7EB";

function dominantMood(moods?: Record<string, number>): string | null {
  if (!moods) return null;
  let top: string | null = null;
  let max = -1;
  for (const [mood, count] of Object.entries(moods)) {
    if (count > max) {
      max = count;
      top = mood;
    }
  }
  return top;
}

export default function WorldMap({ byCountry, byCountryMood, onSelectCountry }: WorldMapProps) {
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Precompute dominant mood for each country
  const countryDominantMood = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of Object.keys(byCountry)) {
      const dom = dominantMood(byCountryMood[c]);
      if (dom) map[c] = dom;
    }
    return map;
  }, [byCountry, byCountryMood]);

  return (
    <div className="relative w-full h-full">
      <ComposableMap
        projectionConfig={{
          rotate: [-10, 0, 0],
          scale: 147
        }}
        className="w-full h-full"
      >
        <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryName = (geo.properties.name || geo.properties.NAME) as string | undefined;
                const countryCode = countryName ? (NAME_TO_ISO2[countryName] || geo.properties.ISO_A2) : undefined;
                const total = countryCode ? byCountry[countryCode] || 0 : 0;
                const moods = countryCode ? byCountryMood[countryCode] : undefined;
                const domMood = countryCode ? countryDominantMood[countryCode] : undefined;
                const fillColor = domMood ? MOOD_COLORS[domMood] || DEFAULT_COLOR : (total > 0 ? "#d1d5db" : DEFAULT_COLOR);
                const sortedMoods = moods ? Object.entries(moods).sort((a,b) => b[1]-a[1]) : [];
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke="#FFFFFF"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", cursor: "pointer", filter: "brightness(1.1)" },
                      pressed: { outline: "none" }
                    }}
                    onMouseEnter={(evt) => {
                      if (!countryName || !countryCode) {
                        setTooltipContent('(Paese sconosciuto)');
                      } else if (total === 0) {
                        setTooltipContent(`${countryName}: nessun mood`);
                      } else if (sortedMoods.length === 0) {
                        setTooltipContent(`${countryName} (${total})\n(dati mood non aggregati)`);
                      } else {
                        const lines = sortedMoods.map(([mood, count]) => `${mood} ${count}`).join(" | ");
                        setTooltipContent(`${countryName} (${total})\n${lines}`);
                      }
                      setTooltipPosition({ x: evt.clientX, y: evt.clientY });
                    }}
                    onMouseMove={(evt) => {
                      setTooltipPosition({ x: evt.clientX, y: evt.clientY });
                    }}
                    onMouseLeave={() => setTooltipContent("")}
                    onClick={() => {
                      if (countryCode && countryName && onSelectCountry) onSelectCountry(countryCode, countryName);
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      
      {tooltipContent && (
        <div
          className="absolute whitespace-pre-line bg-gray-900 text-white px-3 py-2 rounded-lg text-xs pointer-events-none z-50 shadow-lg max-w-xs"
          style={{ left: tooltipPosition.x + 10, top: tooltipPosition.y + 10 }}
        >
          {tooltipContent}
        </div>
      )}
      
      {/* Legenda mood - nascosta su mobile, visibile da sm (640px+) */}
      <div className="hidden sm:block absolute bottom-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
        <h3 className="text-sm font-semibold mb-2">Dominant mood by country</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(MOOD_COLORS).map(([mood, color]) => (
            <div key={mood} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: color }}></div>
              <span>{mood}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-gray-500">Gray = No data</div>
      </div>
    </div>
  );
}
