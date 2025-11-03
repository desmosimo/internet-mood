import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { supabase } from "../../../lib/supabase";

type MoodPayload = {
  emoji: string;
  label?: string;
  timestamp?: string;
  country?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  reason?: string | null; // nuova motivazione opzionale (max 30 char)
  deviceId?: string; // device_id per rate limiting multi-device
};

// Rate limiting (5 submit per IP+deviceId per giorno - DEV in-memory, NON persistente in serverless)
// Permette più dispositivi sulla stessa rete (es. ufficio) mantenendo protezione anti-spam
const DAILY_LIMIT = 5;
type DailyRecord = { date: string; count: number };
const rateLimitMap = new Map<string, DailyRecord>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0,10); // YYYY-MM-DD
}

// Usa un path deterministico basato sulla posizione del file (project root)
const CWD = process.cwd();
const PROJECT_ROOT = path.basename(CWD) === "internet-mood" ? CWD : path.join(CWD, "internet-mood");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "moods.json");

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try { await fs.access(DATA_FILE); } catch { await fs.writeFile(DATA_FILE, "[]", "utf8"); }
  } catch {}
}

function sanitizeReason(raw?: string | null): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (s.length === 0) return null;
  if (s.length > 30) s = s.slice(0, 30); // hard cap
  // rimuovi caratteri di controllo
  s = s.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return s;
}

export async function POST(request: Request) {
  // Parse payload first per ottenere deviceId
  let body: MoodPayload;
  try {
    body = (await request.json()) as MoodPayload;
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  // Rate limit check (in-memory IP + deviceId). In produzione usare Redis / DB per persistenza.
  const ip = getClientIp(request);
  const deviceId = body.deviceId || 'unknown';
  const rateLimitKey = `${ip}:${deviceId}`; // Chiave combinata IP + device
  const today = dayKey();
  
  const rec = rateLimitMap.get(rateLimitKey);
  if (!rec || rec.date !== today) {
    rateLimitMap.set(rateLimitKey, { date: today, count: 0 });
  }
  const current = rateLimitMap.get(rateLimitKey)!;
  if (current.count >= DAILY_LIMIT) {
    const remaining = (current.count + 1) - DAILY_LIMIT; // mostra quanti tentativi oltre il limite
    return NextResponse.json(
      { 
        ok: false, 
        error: `You've already shared ${DAILY_LIMIT} mood${DAILY_LIMIT > 1 ? 's' : ''} today from this device. Please try again tomorrow! 🌅`,
        message: `Daily limit: ${DAILY_LIMIT} moods per device. Come back in 24 hours to share more.`,
        limit: DAILY_LIMIT,
        current: current.count,
        resetIn: '24 hours'
      },
      { status: 429, headers: { 'Retry-After': '86400', 'X-RateLimit-Limit': DAILY_LIMIT.toString(), 'X-RateLimit-Remaining': '0' } }
    );
  }

  const sanitizedCountry = body.country ? body.country.toString().trim().toUpperCase() : null;
  const reason = sanitizeReason(body.reason);
  const record: any = {
    emoji: body.emoji,
    label: body.label || null,
    timestamp: body.timestamp || new Date().toISOString(),
    country: sanitizedCountry,
    region: body.region || null,
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    reason, // sarà ignorato dal DB se la colonna non esiste (meglio aggiungerla prima)
  };

  // Try Supabase first
  try {
    const { error } = await supabase.from("moods").insert(record);
    if (error) throw error;
    // increment rate counter only on success DB insert
    current.count += 1;
    return NextResponse.json({ ok: true, source: "supabase" });
  } catch (dbErr: any) {
    // Fallback a file locale in dev
    await ensureFile();
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8").catch(() => "[]");
      const arr = JSON.parse(raw || "[]");
      const fileEntry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), ...record };
      arr.push(fileEntry);
      await fs.writeFile(DATA_FILE, JSON.stringify(arr, null, 2), "utf8");
      current.count += 1; // anche su fallback consideriamo il submit valido
      return NextResponse.json({ ok: true, source: "file", warning: "Supabase insert failed", error: String(dbErr) });
    } catch (fileErr) {
      return NextResponse.json({ ok: false, error: `DB+File failure: ${dbErr} / ${fileErr}` }, { status: 500 });
    }
  }
}
