import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const diagnostics: any = {
    hasUrl: !!url,
    hasKey: !!key,
    url,
    keyPrefix: key ? key.substring(0, 16) : null,
  };
  try {
    const { data, error } = await supabase.from("moods").select("emoji").limit(1);
    diagnostics.queryOk = !error;
    diagnostics.error = error?.message;
    diagnostics.sample = data;
    return NextResponse.json({ ok: true, diagnostics });
  } catch (e: any) {
    diagnostics.exception = String(e);
    return NextResponse.json({ ok: false, diagnostics });
  }
}
