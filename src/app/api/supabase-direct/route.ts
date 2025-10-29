import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Missing env vars" });
  }

  const testUrl = `${url}/rest/v1/moods?select=emoji&limit=1`;
  
  try {
    const response = await fetch(testUrl, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    
    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      testUrl,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      message: err.message,
      cause: err.cause?.toString(),
    });
  }
}
