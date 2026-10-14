import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const JENIS_VALID = ["Sekolah", "Posyandu", "PKBM", "PES", "Lainnya"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sppgId = searchParams.get("sppg_id");

    let query = supabase.from("kelompok_penerima_manfaat").select("*");
    if (sppgId) query = query.eq("sppg_id", sppgId);
    const { data, error } = await query.order("nama_kelompok", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ status: "success", data });
  } catch (error: unknown) {
    const msg = (error as { message?: string })?.message;
    console.error("GET /api/kelompok-penerima-manfaat error:", error);
    return NextResponse.json(
      { status: "error", message: msg || "Gagal mengambil data kelompok penerima manfaat." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sppg_id = null,
      nama_kelompok,
      jenis = "Sekolah",
      kode = "",
      kategori = "",
      nama_kader = "",
      telepon = "",
      email = "",
      alamat = "",
      kontak = "",
      catatan = ""
    } = body;

    if (!nama_kelompok || !nama_kelompok.trim()) {
      return NextResponse.json({ status: "error", message: "Nama kelompok wajib diisi." }, { status: 400 });
    }
    if (!sppg_id) {
      return NextResponse.json({ status: "error", message: "SPPG wajib dipilih." }, { status: 400 });
    }
    if (!JENIS_VALID.includes(jenis)) {
      return NextResponse.json({ status: "error", message: "Jenis kelompok tidak valid." }, { status: 400 });
    }

    const payload = {
      sppg_id,
      nama_kelompok: nama_kelompok.trim(),
      jenis,
      kode: kode.trim(),
      kategori: kategori.trim(),
      nama_kader: nama_kader.trim(),
      telepon: telepon.trim(),
      email: email.trim(),
      alamat: alamat.trim(),
      kontak: kontak.trim(),
      catatan: catatan.trim()
    };

    const { data, error } = await supabase.from("kelompok_penerima_manfaat").insert(payload).select().single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ status: "error", message: "Nama kelompok ini sudah terdaftar di SPPG tersebut." }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ status: "success", data });
  } catch (error: unknown) {
    const msg = (error as { message?: string })?.message;
    console.error("POST /api/kelompok-penerima-manfaat error:", error);
    return NextResponse.json({ status: "error", message: msg || "Gagal menambahkan kelompok penerima manfaat." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      sppg_id = null,
      nama_kelompok,
      jenis = "Sekolah",
      kode = "",
      kategori = "",
      nama_kader = "",
      telepon = "",
      email = "",
      alamat = "",
      kontak = "",
      catatan = ""
    } = body;

    if (!id) return NextResponse.json({ status: "error", message: "ID kelompok wajib disertakan." }, { status: 400 });
    if (!nama_kelompok || !nama_kelompok.trim()) return NextResponse.json({ status: "error", message: "Nama kelompok wajib diisi." }, { status: 400 });
    if (!sppg_id) return NextResponse.json({ status: "error", message: "SPPG wajib dipilih." }, { status: 400 });
    if (!JENIS_VALID.includes(jenis)) return NextResponse.json({ status: "error", message: "Jenis kelompok tidak valid." }, { status: 400 });

    const payload = {
      sppg_id,
      nama_kelompok: nama_kelompok.trim(),
      jenis,
      kode: kode.trim(),
      kategori: kategori.trim(),
      nama_kader: nama_kader.trim(),
      telepon: telepon.trim(),
      email: email.trim(),
      alamat: alamat.trim(),
      kontak: kontak.trim(),
      catatan: catatan.trim(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from("kelompok_penerima_manfaat").update(payload).eq("id", id).select().single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ status: "error", message: "Nama kelompok ini sudah terdaftar di SPPG tersebut." }, { status: 400 });
      }
      throw error;
    }
    return NextResponse.json({ status: "success", data });
  } catch (error: unknown) {
    const msg = (error as { message?: string })?.message;
    console.error("PUT /api/kelompok-penerima-manfaat error:", error);
    return NextResponse.json({ status: "error", message: msg || "Gagal memperbarui kelompok penerima manfaat." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ status: "error", message: "ID kelompok wajib disertakan." }, { status: 400 });
    const { error } = await supabase.from("kelompok_penerima_manfaat").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ status: "success", message: "Kelompok penerima manfaat berhasil dihapus." });
  } catch (error: unknown) {
    const msg = (error as { message?: string })?.message;
    console.error("DELETE /api/kelompok-penerima-manfaat error:", error);
    return NextResponse.json({ status: "error", message: msg || "Gagal menghapus kelompok penerima manfaat." }, { status: 500 });
  }
}