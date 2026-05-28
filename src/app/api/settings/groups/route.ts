import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    let apiKey = searchParams.get("api_key") || "";
    if (!apiKey) {
      apiKey = process.env.MPWA_API_KEY || process.env.WHATSAPP_API_KEY || "";
    }
    
    let sender = searchParams.get("sender") || "";
    if (!sender) {
      sender = process.env.MPWA_SENDER || process.env.WHATSAPP_PHONE_ID || "";
      const { data: settingData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "mpwa_sender")
        .maybeSingle();
      if (settingData?.value) {
        sender = settingData.value;
      }
    }

    if (!apiKey) {
      return NextResponse.json({ status: "error", message: "API Key MPWA tidak disetel." });
    }
    if (!sender) {
      return NextResponse.json({ status: "error", message: "Nomor pengirim (MPWA Sender) tidak disetel." });
    }

    let groups: { id: string; name: string }[] = [];

    // Query MPWA Gateway (wa.gusdin.my.id)
    try {
      const response = await fetch("https://wa.gusdin.my.id/get-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          sender: sender
        })
      });

      if (response.ok) {
        const json = await response.json();
        // MPWA typically returns { status: true, data: [ { id: "xxx@g.us", name: "Group Name" } ] }
        const data = json.data || json.groups || (Array.isArray(json) ? json : []);
        groups = data.map((g: { id?: string; jid?: string; name?: string; subject?: string }) => ({
          id: g.id || g.jid || "",
          name: g.name || g.subject || "Grup Tanpa Nama"
        }));
      } else {
        // Fallback to /groups endpoint if /get-groups fails
        const responseAlt = await fetch("https://wa.gusdin.my.id/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            sender: sender
          })
        });
        if (responseAlt.ok) {
          const jsonAlt = await responseAlt.json();
          const dataAlt = jsonAlt.data || jsonAlt.groups || (Array.isArray(jsonAlt) ? jsonAlt : []);
          groups = dataAlt.map((g: { id?: string; jid?: string; name?: string; subject?: string }) => ({
            id: g.id || g.jid || "",
            name: g.name || g.subject || "Grup Tanpa Nama"
          }));
        }
      }
    } catch (err) {
      console.error("MPWA Gateway group fetch error:", err);
    }

    // Filter out invalid items
    groups = groups.filter(g => g.id !== "");

    return NextResponse.json({ status: "success", groups });
  } catch (error: unknown) {
    console.error("GET /api/settings/groups error:", error);
    const errMessage = error instanceof Error ? error.message : "Gagal mendapatkan daftar grup MPWA.";
    return NextResponse.json({
      status: "error",
      message: errMessage,
      groups: []
    });
  }
}
