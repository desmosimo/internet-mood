import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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
  await ensureFile();
  try {
    const body = (await request.json()) as MoodPayload;

  const raw = await fs.readFile(DATA_FILE, "utf8").catch(() => "[]");
  const arr = JSON.parse(raw || "[]");
    const sanitizedCountry = body.country ? body.country.toString().trim().toUpperCase() : null;
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      ...body,
      country: sanitizedCountry,
    };
    arr.push(entry);
    try { await fs.writeFile(DATA_FILE, JSON.stringify(arr, null, 2), "utf8"); } catch {}
    return NextResponse.json({ ok: true, total: arr.length });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
