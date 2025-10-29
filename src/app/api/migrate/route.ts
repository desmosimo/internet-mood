import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { supabase } from "../../../lib/supabase";

// Reads local JSON file and bulk inserts into Supabase if table nearly empty.
export async function POST() {
  try {
    console.log('[migrate POST] supabase URL', process.env.NEXT_PUBLIC_SUPABASE_URL, 'keyLen', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);
    // Check existing count
    const { data: existingData, error: countError } = await supabase.from("moods").select("id");
    if (countError) {
      return NextResponse.json({ ok: false, error: `Supabase count error: ${countError.message}` }, { status: 500 });
    }
    const existingCount = existingData ? existingData.length : 0;
    if (existingCount > 0) {
      return NextResponse.json({ ok: false, skipped: true, reason: "Table already has data", existing: existingCount });
    }

    const CWD = process.cwd();
    const PROJECT_ROOT = path.basename(CWD) === "internet-mood" ? CWD : path.join(CWD, "internet-mood");
    const DATA_FILE = path.join(PROJECT_ROOT, "data", "moods.json");

    let raw: string = "[]";
    try { raw = await fs.readFile(DATA_FILE, "utf8"); } catch {}
    let arr: any[] = [];
    try { arr = JSON.parse(raw); if (!Array.isArray(arr)) arr = []; } catch { arr = []; }

    if (arr.length === 0) {
      return NextResponse.json({ ok: false, reason: "Local file empty", file: DATA_FILE });
    }

    // Normalize records
    const prepared = arr.map(e => ({
      emoji: e.emoji,
      label: e.label || null,
      timestamp: e.timestamp || new Date().toISOString(),
      country: e.country ? String(e.country).trim().toUpperCase() : null,
      region: e.region || null,
      latitude: e.latitude ?? null,
      longitude: e.longitude ?? null,
    }));

  const { error: insertError } = await supabase.from("moods").insert(prepared);
    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inserted: prepared.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// GET: show status or trigger migration with ?run=1
export async function GET(request: Request) {
  try {
    console.log('[migrate GET] supabase URL', process.env.NEXT_PUBLIC_SUPABASE_URL, 'keyLen', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);
    const url = new URL(request.url);
    const run = url.searchParams.get("run") === "1";
    const { data: existingData, error: countError } = await supabase.from("moods").select("id");
    if (countError) {
      return NextResponse.json({ ok: false, error: `Supabase count error: ${countError.message}` }, { status: 500 });
    }
    const existingCount = existingData ? existingData.length : 0;
    if (!run) {
      return NextResponse.json({ ok: true, existing: existingCount, hint: "Add ?run=1 to execute migration if table empty" });
    }
    if (existingCount > 0) {
      return NextResponse.json({ ok: false, skipped: true, reason: "Table already has data", existing: existingCount });
    }

    // Reuse logic from POST
    const CWD = process.cwd();
    const PROJECT_ROOT = path.basename(CWD) === "internet-mood" ? CWD : path.join(CWD, "internet-mood");
    const DATA_FILE = path.join(PROJECT_ROOT, "data", "moods.json");
    let raw: string = "[]";
    try { raw = await fs.readFile(DATA_FILE, "utf8"); } catch {}
    let arr: any[] = [];
    try { arr = JSON.parse(raw); if (!Array.isArray(arr)) arr = []; } catch { arr = []; }
    if (arr.length === 0) {
      return NextResponse.json({ ok: false, reason: "Local file empty", file: DATA_FILE });
    }
    const prepared = arr.map(e => ({
      emoji: e.emoji,
      label: e.label || null,
      timestamp: e.timestamp || new Date().toISOString(),
      country: e.country ? String(e.country).trim().toUpperCase() : null,
      region: e.region || null,
      latitude: e.latitude ?? null,
      longitude: e.longitude ?? null,
    }));
    const { error: insertError } = await supabase.from("moods").insert(prepared);
    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, inserted: prepared.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
