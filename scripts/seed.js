/*
  Seed script for generating synthetic mood data.
  Usage (PowerShell): node scripts/seed.js --count=600
*/

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local manually (simple parser)
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf-8');
  raw.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      let val = m[2];
      // Remove optional wrapping quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CONTINENT_DIST = {
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

const COUNTRIES = {
  Europe: ['IT','FR','DE','ES','GB','NL','SE','PL','GR','PT','RO','HU','CZ','BE','DK','FI','IE','AT','CH','NO'],
  Americas: ['US','CA','MX','BR','AR','CO','CL','PE','VE','UY','BO','EC','CR','PA','GT','HN','NI','SV','DO','PR'],
  Asia: ['CN','JP','KR','IN','ID','TH','VN','PH','MY','SG','TW','HK','PK','BD','UZ','KZ','SA','AE','IL','TR'],
  Africa: ['ZA','NG','EG','KE','MA','DZ','TN','GH','ET','UG','TZ','SN','CI','CM','ZM','ZW','BW','NA','RW','SD'],
  Oceania: ['AU','NZ','FJ','PG','WS','TO','VU','NC','PF','GU'],
};

function pickWeighted(arr) {
  const total = arr.reduce((s,a)=>s+a.w,0);
  let r = Math.random()*total;
  for (const el of arr) { if (r < el.w) return el; r -= el.w; }
  return arr[arr.length-1];
}

function randomTimestamp() {
  const bucketRand = Math.random();
  let dayOffset;
  if (bucketRand < 0.35) {
    dayOffset = Math.floor(Math.random()*2); // 0-1
  } else if (bucketRand < 0.75) {
    dayOffset = 2 + Math.floor(Math.random()*5); // 2-6
  } else {
    dayOffset = 7 + Math.floor(Math.random()*7); // 7-13
  }
  const now = Date.now();
  const ts = now - dayOffset*24*60*60*1000 - Math.floor(Math.random()* (6*60*60*1000));
  return new Date(ts).toISOString();
}

function buildSeed(count) {
  const records = [];
  const continentCounts = {};
  Object.entries(CONTINENT_DIST).forEach(([c, pct]) => {
    continentCounts[c] = Math.round(count * pct);
  });
  let diff = count - Object.values(continentCounts).reduce((s,a)=>s+a,0);
  if (diff !== 0) continentCounts['Europe'] += diff;

  for (const [continent, target] of Object.entries(continentCounts)) {
    const pool = COUNTRIES[continent];
    for (let i=0;i<target;i++) {
      const emoji = pickWeighted(MOODS).emoji;
      const country = pool[Math.floor(Math.random()*pool.length)];
      const timestamp = randomTimestamp();
      // label uguale all'emoji per ora; region = continente; lat/long null
      records.push({ emoji, label: emoji, timestamp, country, region: continent, latitude: null, longitude: null });
    }
  }
  return records;
}

async function insertBatch(all) {
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
  fs.writeFileSync(path.join('scripts','seed-preview.json'), JSON.stringify(seed.slice(0,25), null, 2));
  console.log('Preview (first 25) saved to scripts/seed-preview.json');
  await insertBatch(seed);
  console.log('Seed completed.');
}

main().catch(e=>{ console.error(e); process.exit(1); });
