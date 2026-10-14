import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sppg_id, rows = [] } = body;

    if (!sppg_id) {
      return NextResponse.json({ status: "error", message: "SPPG wajib disertakan." }, { status: 400 });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ status: "error", message: "Data import kosong." }, { status: 400 });
    }

    const validRows: Record<string, unknown>[] = [];
    const errors: { row: number; reason: string }[] = [];
    const pendingGroupNames = new Set<string>();
    const { data: existingGroups } = await supabase
      .from("kelompok_penerima_manfaat")
      .select("nama_kelompok")
      .eq("sppg_id", sppg_id);
    (existingGroups || []).forEach((g: any) => {
      if (g?.nama_kelompok) pendingGroupNames.add(String(g.nama_kelompok).trim().toLowerCase());
    });

    for (let i = 0; i < rows.length; i++) {
      const r = (rows[i] || {}) as Record<string, unknown>;
      const rowNum = i + 1;
      const nama = String(r.nama_kelompok || r.nama_kpm || r.nama || "").trim();
      if (!nama) { errors.push({ row: rowNum, reason: "Nama KPM wajib diisi." }); continue; }
      if (pendingGroupNames.has(nama.toLowerCase())) {
        errors.push({ row: rowNum, reason: `KPM duplikat (nama kelompok sama) sudah ada: ${nama}` });
        continue;
      }
      pendingGroupNames.add(nama.toLowerCase());

      const jenis = String(r.jenis || r["Jenis KPM"] || "Posyandu").trim() || "Posyandu";
      const kode = String(r.kode || r["Kode"] || "").trim();
      const kategori = String(r.kategori || r["Kategori"] || "").trim();
      const nama_kader = String(r.nama_kader || r["Nama PIC"] || r["Nama Kader"] || r.nama_pic || r.pic || r.kader || "").trim();
      const telepon = String(r.telepon || r["No. Telpon"] || r.no_telpon || r.telpon || "").trim();
      const email = String(r.email || r["Email"] || "").trim();
      const alamat = String(r.alamat || r["Alamat"] || "").trim();
      const kontak = String(r.kontak || "").trim();
      const catatan = String(r.catatan || "").trim();

      validRows.push({
        sppg_id,
        nama_kelompok: nama,
        jenis,
        kode,
        kategori,
        nama_kader,
        telepon,
        email,
        alamat,
        kontak,
        catatan
      });
    }

    const inserted: { id: string }[] = [];
    const chunkSize = 500;
    for (let i = 0; i < validRows.length; i += chunkSize) {
      const chunk = validRows.slice(i, i + chunkSize);
      const { data, error } = await supabase.from("kelompok_penerima_manfaat").insert(chunk).select("id");
      if (error) throw error;
      if (data) inserted.push(...data);
    }

    return NextResponse.json({ status: "success", inserted: inserted.length, errors });
  } catch (error: unknown) {
    const msg = (error as { message?: string })?.message;
    console.error("POST /api/kelompok-penerima-manfaat/import error:", error);
    return NextResponse.json({ status: "error", message: msg || "Gagal import kelompok penerima manfaat." }, { status: 500 });
  }
}