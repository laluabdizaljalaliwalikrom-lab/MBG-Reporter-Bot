import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** GET /api/settings?key=mpwa_sender — Read a setting value */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Parameter 'key' diperlukan." }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      const msg = error.message || error.details || JSON.stringify(error);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ key, value: data?.value ?? null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/settings — Upsert a setting value
 *  Body: { key: string, value: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json() as { key?: string; value?: string };
    const { key, value } = body;

    if (!key || value === undefined || value === null) {
      return NextResponse.json({ error: "Field 'key' dan 'value' diperlukan." }, { status: 400 });
    }

    const { error } = await supabase
      .from("system_settings")
      .upsert({ key, value }, { onConflict: "key" });

    if (error) {
      const msg = error.message || error.details || error.hint || JSON.stringify(error);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ success: true, key, value });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
