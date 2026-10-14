import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function validateIdentity(type: string, code: string): boolean {
  const t = (type || "").trim();
  const c = (code || "").trim();
  if (!t || !c) return true;
  const len = c.length;
  if (t === "nik") return len === 16 && /^\d+$/.test(c);
  if (t === "nisn") return len === 10 && /^\d+$/.test(c);
  if (t === "student-id") return len === 18;
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sppg_id,
      kelompok_id = null,
      auto_create_group = false,
      rows = []
    } = body;

    if (!sppg_id) {
      return NextResponse.json({ status: "error", message: "SPPG wajib disertakan." }, { status: 400 });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ status: "error", message: "Data import kosong." }, { status: 400 });
    }

    // cache nama_kelompok -> id
    const groupMap = new Map<string, string>();
    const pendingPenerimaKeys = new Set<string>();
    // preload existing penerima identifiers (global)
    const existingPenerimaKeys = new Set<string>();
    const { data: existingPenerima } = await supabase
      .from("penerima_manfaat")
      .select("nik,identity_type,identity_code,nama_lengkap,tanggal_lahir")
      .limit(5000);
    (existingPenerima || []).forEach((r: any) => {
      if (r?.nik?.trim()) existingPenerimaKeys.add(`nik:${r.nik.trim()}`);
      if (r?.identity_code?.trim()) existingPenerimaKeys.add(`id:${r.identity_type || ""}:${r.identity_code.trim()}`);
      if (r?.nama_lengkap?.trim() && r?.tanggal_lahir) existingPenerimaKeys.add(`name:${r.nama_lengkap.trim().toLowerCase()}:${r.tanggal_lahir}`);
    });
    // preload existing groups for this sppg
    const { data: existingGroups } = await supabase
      .from("kelompok_penerima_manfaat")
      .select("id,nama_kelompok")
      .eq("sppg_id", sppg_id);
    (existingGroups || []).forEach((g: { id: string; nama_kelompok: string }) => groupMap.set(String(g.nama_kelompok).toLowerCase(), g.id));

    const validRows: Record<string, unknown>[] = [];
    const errors: { row: number; reason: string }[] = [];
    const skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const rowNum = i + 1;

      const nama = String(r.nama_lengkap || r.fullname || r.nama || "").trim();
      const tanggal = r.tanggal_lahir || r.date_of_birth || r.dob || null;
      const gender = String(r.gender || "").trim().toUpperCase();
      const nik = String(r.nik || "").trim();
      const identity_type = String(r.type || r.identity_type || r.jenis_identitas || "nik").trim() || "nik";
      const identity_code = String(r.identity_code || r.nisn || r.nomor_identitas || r.identity || "").trim();
      const kategori = String(r.kategori || r.category || "").trim();
      const sub_kategori = String(r.sub_kategori || r.subcategory || r.subCategory || "").trim();
      const status = String(r.status || "Aktif").trim() || "Aktif";
      const tanggal_mulai = r.tanggal_mulai || r.start_date || null;
      const tanggal_berhenti = r.tanggal_berhenti || r.end_date || null;
      const catatan = String(r.catatan || r.notes || "").trim();
      const groupName = String(r.nama_kpm || r.nama_kelompok || r.nama_posyandu || r.kelompok || r.group || r["Nama KPM"] || "").trim();

      if (!nama) { errors.push({ row: rowNum, reason: "Nama lengkap wajib diisi." }); continue; }
      if (!kategori) { errors.push({ row: rowNum, reason: "Kategori wajib diisi." }); continue; }
      if (!sub_kategori) { errors.push({ row: rowNum, reason: "Sub kategori wajib diisi." }); continue; }
      if (gender && !["L", "P"].includes(gender)) { errors.push({ row: rowNum, reason: "Gender harus L atau P." }); continue; }
      if (nik && !/^\d{16}$/.test(nik)) { errors.push({ row: rowNum, reason: "NIK harus 16 digit angka." }); continue; }
      if (identity_code && !validateIdentity(identity_type, identity_code)) {
        errors.push({ row: rowNum, reason: "Nomor identitas tidak sesuai format type." }); continue;
      }

      // resolve kelompok_id
      let resolvedKelompokId = kelompok_id;
      if (groupName) {
        const key = groupName.toLowerCase();
        if (groupMap.has(key)) {
          resolvedKelompokId = groupMap.get(key)!;
        } else if (auto_create_group) {
          // create group
          const { data: newGroup, error: gErr } = await supabase
            .from("kelompok_penerima_manfaat")
            .insert({ sppg_id, nama_kelompok: groupName, jenis: "Sekolah" })
            .select("id,nama_kelompok")
            .single();
          if (gErr || !newGroup) {
            errors.push({ row: rowNum, reason: "Gagal membuat kelompok otomatis." }); continue;
          }
          groupMap.set(key, newGroup.id);
          resolvedKelompokId = newGroup.id;
        } else {
          errors.push({ row: rowNum, reason: `KPM tidak ditemukan: ${groupName}` });
          continue;
        }
      }

      const dupKey = nik.trim()
        ? `nik:${nik.trim()}`
        : (identity_code.trim()
            ? `id:${identity_type}:${identity_code.trim()}`
            : (nama.trim() && tanggal
                ? `name:${nama.trim().toLowerCase()}:${tanggal}`
                : ""));
      if (dupKey) {
        if (existingPenerimaKeys.has(dupKey) || pendingPenerimaKeys.has(dupKey)) {
          errors.push({ row: rowNum, reason: `Data duplikat (NIK/identitas/nama+tgl lahir) sudah ada.` });
          continue;
        }
        pendingPenerimaKeys.add(dupKey);
      }

      validRows.push({
        sppg_id,
        kelompok_id: resolvedKelompokId,
        nama_lengkap: nama,
        tanggal_lahir: tanggal || null,
        gender,
        nik,
        identity_type,
        identity_code,
        kategori,
        sub_kategori,
        status,
        tanggal_mulai: tanggal_mulai || null,
        tanggal_berhenti: tanggal_berhenti || null,
        catatan
      });
    }

    // batch insert
    const inserted: { id: string }[] = [];
    const chunkSize = 500;
    for (let i = 0; i < validRows.length; i += chunkSize) {
      const chunk = validRows.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from("penerima_manfaat")
        .insert(chunk).select("id");
      if (error) throw error;
      if (data) inserted.push(...data);
    }

    return NextResponse.json({
      status: "success",
      inserted: inserted.length,
      skipped,
      errors
    });
  } catch (error: unknown) {
    console.error("POST /api/penerima-manfaat/import error:", error);
    return NextResponse.json(
      { status: "error", message: (error as { message?: string })?.message || "Gagal import penerima manfaat." },
      { status: 500 }
    );
  }
}
