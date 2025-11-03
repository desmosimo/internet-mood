/*
  Seed script for generating synthetic mood data.
  Usage (PowerShell): node --loader ts-node/esm scripts/seed.ts --count=600
  Or transpile with tsc and run with node.
*/

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

interface SeedOptions {
  count: number;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Distribution parameters
const CONTINENT_DIST: Record<string, number> = {
  Europe: 0.30,
  Americas: 0.30,
  Asia: 0.25,
  Africa: 0.10,
  Oceania: 0.05,
};

const MOODS = [
  { emoji: '😄', w: 22 },
  { emoji: '🙂', w: 15 },
  { emoji: '😐', w: 12 },
  { emoji: '🤔', w: 10 },
  { emoji: '🤩', w: 8 },
  { emoji: '😎', w: 8 },
  { emoji: '😢', w: 10 },
  { emoji: '😴', w: 5 },
  { emoji: '😡', w: 5 },
  { emoji: '😭', w: 5 },
];

// Basic country sets per continent (sample, can be expanded)
const COUNTRIES: Record<string, string[]> = {
  Europe: ['IT','FR','DE','ES','GB','NL','SE','PL','GR','PT','RO','HU','CZ','BE','DK','FI','IE','AT','CH','NO'],
  Americas: ['US','CA','MX','BR','AR','CO','CL','PE','VE','UY','BO','EC','CR','PA','GT','HN','NI','SV','DO','PR'],
  Asia: ['CN','JP','KR','IN','ID','TH','VN','PH','MY','SG','TW','HK','PK','BD','UZ','KZ','SA','AE','IL','TR'],
  Africa: ['ZA','NG','EG','KE','MA','DZ','TN','GH','ET','UG','TZ','SN','CI','CM','ZM','ZW','BW','NA','RW','SD'],
  Oceania: ['AU','NZ','FJ','PG','WS','TO','VU','NC','PF','GU'],
};

function pickWeighted<T extends { w: number }>(arr: T[]): T {
  const total = arr.reduce((s,a)=>s+a.w,0);
  let r = Math.random()*total;
  for (const el of arr) { if (r < el.w) return el; r -= el.w; }
  return arr[arr.length-1];
}

function randomTimestamp(lastNDays = 14): string {
  // Weighted recentness: 35% last 2 days, 40% days 3-7, 25% days 8-14
  const bucketRand = Math.random();
  let dayOffset: number;
  if (bucketRand < 0.35) {
    dayOffset = Math.floor(Math.random()*2); // 0-1
  } else if (bucketRand < 0.75) {
    dayOffset = 2 + Math.floor(Math.random()*5); // 2-6
  } else {
    dayOffset = 7 + Math.floor(Math.random()*7); // 7-13
  }
  const now = Date.now();
  const ts = now - dayOffset*24*60*60*1000 - Math.floor(Math.random()* (6*60*60*1000)); // subtract up to 6h for spread
  return new Date(ts).toISOString();
}

function buildSeed(count: number) {
  const records: any[] = [];
  // Determine counts per continent
  const continentCounts: Record<string, number> = {};
  Object.entries(CONTINENT_DIST).forEach(([c, pct]) => {
    continentCounts[c] = Math.round(count * pct);
  });
  // Adjust rounding difference
  let diff = count - Object.values(continentCounts).reduce((s,a)=>s+a,0);
  if (diff !== 0) continentCounts['Europe'] += diff; // adjust Europe arbitrarily

  for (const [continent, target] of Object.entries(continentCounts)) {
    const pool = COUNTRIES[continent];
    for (let i=0;i<target;i++) {
      const mood = pickWeighted(MOODS).emoji;
      const country = pool[Math.floor(Math.random()*pool.length)];
      records.push({ mood, country, continent, created_at: randomTimestamp() });
    }
  }
  return records;
}

async function insertBatch(all: any[]) {
  const chunkSize = 150;
  for (let i=0; i<all.length; i += chunkSize) {
    const chunk = all.slice(i, i+chunkSize);
    const { error } = await supabase.from('moods').insert(chunk);
    if (error) { throw new Error('Insert error: '+ error.message); }
    console.log(`Inserted ${i+chunk.length}/${all.length}`);
  }
}

async function main() {
  const argCount = process.argv.find(a=>a.startsWith('--count='));
  const count = argCount ? parseInt(argCount.split('=')[1],10) : 600;
  if (!Number.isFinite(count) || count <= 0) {
    console.error('Invalid --count value');
    process.exit(1);
  }
  console.log(`Generating ${count} synthetic mood records...`);
  const seed = buildSeed(count);
  // Optional local preview
  fs.writeFileSync('scripts/seed-preview.json', JSON.stringify(seed.slice(0,25), null, 2));
  console.log('Preview (first 25) saved to scripts/seed-preview.json');
  await insertBatch(seed);
  console.log('Seed completed.');
}

main().catch(e=>{ console.error(e); process.exit(1); });
