import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CWD = process.cwd();
const PROJECT_ROOT = path.basename(CWD) === "internet-mood" ? CWD : path.join(CWD, "internet-mood");
const DATA_FILE = path.join(PROJECT_ROOT, "data", "moods.json");

async function readData() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const countryToContinent: Record<string, string> = {
  US: "North America",
  CA: "North America",
  MX: "North America",
  BR: "South America",
  AR: "South America",
  GB: "Europe",
  FR: "Europe",
  DE: "Europe",
  IT: "Europe",
  ES: "Europe",
  RU: "Europe/Asia",
  CN: "Asia",
  JP: "Asia",
  IN: "Asia",
  AU: "Oceania",
  NZ: "Oceania",
  ZA: "Africa",
  EG: "Africa",
};

function countryCodeToContinent(code?: string | null) {
  if (!code) return "Unknown";
  const up = code.toUpperCase();
  return countryToContinent[up] || "Other";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const debug = url.searchParams.get("debug") === "1";
  const arr = await readData();

  const byContinent: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byMood: Record<string, number> = {};
  const byMoodAndContinent: Record<string, Record<string, number>> = {};
  const byCountryMood: Record<string, Record<string, number>> = {};

    for (const e of arr) {
      const rawCountry: string | null = e.country || null;
      const country = rawCountry ? rawCountry.toString().trim().toUpperCase() : "Unknown";
      const cont = countryCodeToContinent(country);
      const mood = e.emoji || e.label || "Unknown";
      
      // Conteggi generali
      byContinent[cont] = (byContinent[cont] || 0) + 1;
      byCountry[country] = (byCountry[country] || 0) + 1;
      // Mood per paese
      if (!byCountryMood[country]) {
        byCountryMood[country] = {};
      }
      byCountryMood[country][mood] = (byCountryMood[country][mood] || 0) + 1;
      byMood[mood] = (byMood[mood] || 0) + 1;
      
      // Mood per continente
      if (!byMoodAndContinent[cont]) {
        byMoodAndContinent[cont] = {};
      }
      byMoodAndContinent[cont][mood] = (byMoodAndContinent[cont][mood] || 0) + 1;
    }

    const payload: any = { 
      total: arr.length, 
      byContinent, 
      byCountry, 
      byMood,
      byMoodAndContinent,
      byCountryMood
    };
    if (debug) {
      payload.__debug = {
        dataFile: DATA_FILE,
        exists: arr.length > 0,
        countriesPresent: Object.keys(byCountry),
        sampleFirst: arr.slice(0,3)
      };
    }
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json({ 
      total: 0, 
      byContinent: {}, 
      byCountry: {}, 
      byMood: {},
      byMoodAndContinent: {},
      byCountryMood: {},
      error: String(err) 
    }, { status: 500 });
  }
}
