import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sppg = searchParams.get("sppg")?.trim();

    let query = supabase
      .from("mbg_reports")
      .select("*")
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false });

    if (sppg) {
      // Cari laporan berdasarkan sppg_name di extracted_data
      query = query.ilike("extracted_data->>sppg_name", `%${sppg}%`);
    }

    const { data: reports, error } = await query.limit(1);

    if (error) throw error;

    if (!reports || reports.length === 0) {
      // Jika filter sppg spesifik tidak ditemukan, ambil laporan terbaru apapun yang ada
      const { data: fallbackReports } = await supabase
        .from("mbg_reports")
        .select("*")
        .order("tanggal", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (!fallbackReports || fallbackReports.length === 0) {
        return NextResponse.json({ status: "empty", message: "Belum ada laporan menu." }, { status: 404 });
      }
      return NextResponse.json({ status: "success", data: fallbackReports[0] });
    }

    return NextResponse.json({ status: "success", data: reports[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data menu.";
    console.error("GET /api/public/menu error:", error);
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
