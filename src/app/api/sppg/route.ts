import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("sppg_data")
      .select("*")
      .order("nama_sppg", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ status: "success", data });
  } catch (error: any) {
    console.error("GET /api/sppg error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal mengambil data SPPG." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      nama_sppg,
      porsi_kecil = 0,
      porsi_besar = 0,
      balita = 0,
      bumil = 0,
      busui = 0,
      kepala_sppg = "",
      pengawas_gizi = "",
      kontak_pengaduan = "",
      tiktok = "",
      instagram = "",
      sub_wilayah = ""
    } = body;

    if (!nama_sppg || !nama_sppg.trim()) {
      return NextResponse.json(
        { status: "error", message: "Nama SPPG wajib diisi." },
        { status: 400 }
      );
    }

    let insertPayload: Record<string, any> = {
      nama_sppg: nama_sppg.trim(),
      porsi_kecil: Number(porsi_kecil),
      porsi_besar: Number(porsi_besar),
      balita: Number(balita),
      bumil: Number(bumil),
      busui: Number(busui),
      kepala_sppg: kepala_sppg.trim(),
      pengawas_gizi: pengawas_gizi.trim(),
      kontak_pengaduan: kontak_pengaduan.trim(),
      tiktok: tiktok.trim(),
      instagram: instagram.trim(),
      sub_wilayah: sub_wilayah.trim()
    };

    let { data, error } = await supabase
      .from("sppg_data")
      .insert(insertPayload)
      .select()
      .single();

    // Fallback jika kolom baru belum ditambahkan di database Supabase user
    if (error && error.message && error.message.includes("schema cache")) {
      const basicPayload = {
        nama_sppg: nama_sppg.trim(),
        porsi_kecil: Number(porsi_kecil),
        porsi_besar: Number(porsi_besar),
        balita: Number(balita),
        bumil: Number(bumil),
        busui: Number(busui),
        kepala_sppg: kepala_sppg.trim(),
        pengawas_gizi: pengawas_gizi.trim()
      };
      const retry = await supabase
        .from("sppg_data")
        .insert(basicPayload)
        .select()
        .single();
      
      if (!retry.error) {
        return NextResponse.json({
          status: "success",
          data: retry.data,
          warning: "Kolom tambahan (instagram, tiktok, kontak_pengaduan, sub_wilayah) belum dibuat di Supabase. Jalankan query schema.sql di SQL Editor Supabase."
        });
      }
    }

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { status: "error", message: "Nama SPPG ini sudah terdaftar." },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ status: "success", data });
  } catch (error: any) {
    console.error("POST /api/sppg error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal menambahkan data SPPG." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      nama_sppg,
      porsi_kecil = 0,
      porsi_besar = 0,
      balita = 0,
      bumil = 0,
      busui = 0,
      kepala_sppg = "",
      pengawas_gizi = "",
      kontak_pengaduan = "",
      tiktok = "",
      instagram = "",
      sub_wilayah = ""
    } = body;

    if (!id) {
      return NextResponse.json(
        { status: "error", message: "ID SPPG wajib disertakan." },
        { status: 400 }
      );
    }

    if (!nama_sppg || !nama_sppg.trim()) {
      return NextResponse.json(
        { status: "error", message: "Nama SPPG wajib diisi." },
        { status: 400 }
      );
    }

    let updatePayload: Record<string, any> = {
      nama_sppg: nama_sppg.trim(),
      porsi_kecil: Number(porsi_kecil),
      porsi_besar: Number(porsi_besar),
      balita: Number(balita),
      bumil: Number(bumil),
      busui: Number(busui),
      kepala_sppg: kepala_sppg.trim(),
      pengawas_gizi: pengawas_gizi.trim(),
      kontak_pengaduan: kontak_pengaduan.trim(),
      tiktok: tiktok.trim(),
      instagram: instagram.trim(),
      sub_wilayah: sub_wilayah.trim()
    };

    let { data, error } = await supabase
      .from("sppg_data")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    // Fallback jika kolom baru belum ada di Supabase
    if (error && error.message && error.message.includes("schema cache")) {
      const basicPayload = {
        nama_sppg: nama_sppg.trim(),
        porsi_kecil: Number(porsi_kecil),
        porsi_besar: Number(porsi_besar),
        balita: Number(balita),
        bumil: Number(bumil),
        busui: Number(busui),
        kepala_sppg: kepala_sppg.trim(),
        pengawas_gizi: pengawas_gizi.trim()
      };
      const retry = await supabase
        .from("sppg_data")
        .update(basicPayload)
        .eq("id", id)
        .select()
        .single();

      if (!retry.error) {
        return NextResponse.json({
          status: "success",
          data: retry.data,
          warning: "Kolom tambahan belum ada di Supabase. Jalankan query schema.sql di SQL Editor Supabase."
        });
      }
    }

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { status: "error", message: "Nama SPPG ini sudah terdaftar." },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ status: "success", data });
  } catch (error: any) {
    console.error("PUT /api/sppg error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memperbarui data SPPG." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { status: "error", message: "ID SPPG wajib disertakan." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("sppg_data")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ status: "success", message: "Data SPPG berhasil dihapus." });
  } catch (error: any) {
    console.error("DELETE /api/sppg error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal menghapus data SPPG." },
      { status: 500 }
    );
  }
}
