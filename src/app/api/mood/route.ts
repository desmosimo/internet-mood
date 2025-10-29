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
};

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

export async function POST(request: Request) {
  // Parse payload
  let body: MoodPayload;
  try {
    body = (await request.json()) as MoodPayload;
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const sanitizedCountry = body.country ? body.country.toString().trim().toUpperCase() : null;
  const record = {
    emoji: body.emoji,
    label: body.label || null,
    timestamp: body.timestamp || new Date().toISOString(),
    country: sanitizedCountry,
    region: body.region || null,
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
  };

  // Try Supabase first
  try {
    const { error } = await supabase.from("moods").insert(record);
    if (error) throw error;
    return NextResponse.json({ ok: true, source: "supabase" });
  } catch (dbErr: any) {
    // Fallback to local file so we don't lose data in dev
    await ensureFile();
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8").catch(() => "[]");
      const arr = JSON.parse(raw || "[]");
      const fileEntry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), ...record };
      arr.push(fileEntry);
      await fs.writeFile(DATA_FILE, JSON.stringify(arr, null, 2), "utf8");
      return NextResponse.json({ ok: true, source: "file", warning: "Supabase insert failed", error: String(dbErr) });
    } catch (fileErr) {
      return NextResponse.json({ ok: false, error: `DB+File failure: ${dbErr} / ${fileErr}` }, { status: 500 });
    }
  }
}
