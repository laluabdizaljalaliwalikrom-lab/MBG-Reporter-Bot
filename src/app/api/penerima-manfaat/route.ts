import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function validateIdentity(type: string, code: string): boolean {
  if (!type || !code) return false;
  const len = code.trim().length;
  if (type === "nik") return len === 16 && /^\d+$/.test(code.trim());
  if (type === "nisn") return len === 10 && /^\d+$/.test(code.trim());
  if (type === "student-id") return len === 18;
  return true;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sppgId = searchParams.get("sppg_id");
    const kelompokId = searchParams.get("kelompok_id");
    const kategori = searchParams.get("kategori");
    const status = searchParams.get("status");
    const q = searchParams.get("q");

    let query = supabase
      .from("penerima_manfaat")
      .select("*, kelompok:kelompok_penerima_manfaat(id,nama_kelompok,jenis)");

    if (sppgId) query = query.eq("sppg_id", sppgId);
    if (kelompokId) query = query.eq("kelompok_id", kelompokId);
    if (kategori) query = query.eq("kategori", kategori);
    if (status) query = query.eq("status", status);
    if (q) query = query.ilike("nama_lengkap", `%${q}%`);

    const { data, error } = await query
      .order("nama_lengkap", { ascending: true })
      .limit(5000);

    if (error) throw error;

    const formatted = (data || []).map((item: any) => ({
      ...item,
      kelompok_nama:
        item.kelompok?.nama_kelompok ||
        (Array.isArray(item.kelompok) ? item.kelompok[0]?.nama_kelompok : null) ||
        null
    }));

    return NextResponse.json({ status: "success", data: formatted });
  } catch (error: unknown) {
    console.error("GET /api/penerima-manfaat error:", error);
    return NextResponse.json(
      { status: "error", message: (error as { message?: string })?.message || "Gagal mengambil data penerima manfaat." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sppg_id = null,
      kelompok_id = null,
      nama_lengkap,
      tanggal_lahir = null,
      gender = "",
      nik = "",
      identity_type = "nik",
      identity_code = "",
      kategori = "",
      sub_kategori = "",
      status = "Aktif",
      tanggal_mulai = null,
      tanggal_berhenti = null,
      catatan = ""
    } = body;

    if (!nama_lengkap || !nama_lengkap.trim()) {
      return NextResponse.json({ status: "error", message: "Nama lengkap wajib diisi." }, { status: 400 });
    }
    if (!sppg_id) {
      return NextResponse.json({ status: "error", message: "SPPG wajib dipilih." }, { status: 400 });
    }
    if (!kategori || !kategori.trim()) {
      return NextResponse.json({ status: "error", message: "Kategori wajib diisi." }, { status: 400 });
    }
    if (!sub_kategori || !sub_kategori.trim()) {
      return NextResponse.json({ status: "error", message: "Sub kategori wajib diisi." }, { status: 400 });
    }
    if (gender && !["L", "P"].includes(gender)) {
      return NextResponse.json({ status: "error", message: "Gender harus L atau P." }, { status: 400 });
    }
    if (nik && !/^\d{16}$/.test(nik.trim())) {
      return NextResponse.json({ status: "error", message: "NIK harus 16 digit angka." }, { status: 400 });
    }
    if (identity_code && !validateIdentity(identity_type, identity_code)) {
      return NextResponse.json({ status: "error", message: "Nomor identitas tidak sesuai format type." }, { status: 400 });
    }

    const payload = {
      sppg_id,
      kelompok_id,
      nama_lengkap: nama_lengkap.trim(),
      tanggal_lahir,
      gender: (gender || "").trim(),
      nik: (nik || "").trim(),
      identity_type: identity_type || "nik",
      identity_code: (identity_code || "").trim(),
      kategori: kategori.trim(),
      sub_kategori: sub_kategori.trim(),
      status: status || "Aktif",
      tanggal_mulai,
      tanggal_berhenti,
      catatan: (catatan || "").trim()
    };

    const { data, error } = await supabase
      .from("penerima_manfaat")
      .insert(payload)
      .select("*, kelompok:kelompok_penerima_manfaat(id,nama_kelompok,jenis)")
      .single();

    if (error) throw error;
    const formatted = data
      ? {
          ...data,
          kelompok_nama:
            (data as any).kelompok?.nama_kelompok ||
            (Array.isArray((data as any).kelompok) ? (data as any).kelompok[0]?.nama_kelompok : null) ||
            null
        }
      : data;
    return NextResponse.json({ status: "success", data: formatted });
  } catch (error: unknown) {
    console.error("POST /api/penerima-manfaat error:", error);
    return NextResponse.json(
      { status: "error", message: (error as { message?: string })?.message || "Gagal menambahkan penerima manfaat." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ status: "error", message: "ID penerima manfaat wajib disertakan." }, { status: 400 });
    }

    const {
      sppg_id = null,
      kelompok_id = null,
      nama_lengkap,
      tanggal_lahir = null,
      gender = "",
      nik = "",
      identity_type = "nik",
      identity_code = "",
      kategori = "",
      sub_kategori = "",
      status = "Aktif",
      tanggal_mulai = null,
      tanggal_berhenti = null,
      catatan = ""
    } = rest;

    if (!nama_lengkap || !nama_lengkap.trim()) {
      return NextResponse.json({ status: "error", message: "Nama lengkap wajib diisi." }, { status: 400 });
    }
    if (!sppg_id) {
      return NextResponse.json({ status: "error", message: "SPPG wajib dipilih." }, { status: 400 });
    }
    if (!kategori || !kategori.trim()) {
      return NextResponse.json({ status: "error", message: "Kategori wajib diisi." }, { status: 400 });
    }
    if (!sub_kategori || !sub_kategori.trim()) {
      return NextResponse.json({ status: "error", message: "Sub kategori wajib diisi." }, { status: 400 });
    }
    if (gender && !["L", "P"].includes(gender)) {
      return NextResponse.json({ status: "error", message: "Gender harus L atau P." }, { status: 400 });
    }
    if (nik && !/^\d{16}$/.test(nik.trim())) {
      return NextResponse.json({ status: "error", message: "NIK harus 16 digit angka." }, { status: 400 });
    }
    if (identity_code && !validateIdentity(identity_type, identity_code)) {
      return NextResponse.json({ status: "error", message: "Nomor identitas tidak sesuai format type." }, { status: 400 });
    }

    const payload = {
      sppg_id,
      kelompok_id,
      nama_lengkap: nama_lengkap.trim(),
      tanggal_lahir,
      gender: (gender || "").trim(),
      nik: (nik || "").trim(),
      identity_type: identity_type || "nik",
      identity_code: (identity_code || "").trim(),
      kategori: kategori.trim(),
      sub_kategori: sub_kategori.trim(),
      status: status || "Aktif",
      tanggal_mulai,
      tanggal_berhenti,
      catatan: (catatan || "").trim(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("penerima_manfaat")
      .update(payload)
      .eq("id", id)
      .select("*, kelompok:kelompok_penerima_manfaat(id,nama_kelompok,jenis)")
      .single();

    if (error) throw error;
    const formatted = data
      ? {
          ...data,
          kelompok_nama:
            (data as any).kelompok?.nama_kelompok ||
            (Array.isArray((data as any).kelompok) ? (data as any).kelompok[0]?.nama_kelompok : null) ||
            null
        }
      : data;
    return NextResponse.json({ status: "success", data: formatted });
  } catch (error: unknown) {
    console.error("PUT /api/penerima-manfaat error:", error);
    return NextResponse.json(
      { status: "error", message: (error as { message?: string })?.message || "Gagal memperbarui penerima manfaat." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ status: "error", message: "ID penerima manfaat wajib disertakan." }, { status: 400 });
    }
    const { error } = await supabase.from("penerima_manfaat").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ status: "success", message: "Penerima manfaat berhasil dihapus." });
  } catch (error: unknown) {
    console.error("DELETE /api/penerima-manfaat error:", error);
    return NextResponse.json(
      { status: "error", message: (error as { message?: string })?.message || "Gagal menghapus penerima manfaat." },
      { status: 500 }
    );
  }
}
