import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const templatesOnly = searchParams.get("templates") === "true";
    const id = searchParams.get("id");

    if (id) {
      const { data, error } = await supabase
        .from("mbg_menus")
        .select("*, sppg_data(nama_sppg, porsi_besar, porsi_kecil, balita, bumil, busui)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return NextResponse.json({ status: "success", data });
    }

    let query = supabase
      .from("mbg_menus")
      .select("*, sppg_data(nama_sppg, porsi_besar, porsi_kecil, balita, bumil, busui)");

    if (templatesOnly) {
      query = query.eq("is_template", true).order("template_name", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ status: "success", data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data menu.";
    console.error("GET /api/menus error:", error);
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      nama_menu,
      tanggal = null,
      sppg_id = null,
      menu_data = {},
      status = "DRAFT",
      catatan = null,
      is_template = false,
      template_name = null,
    } = body;

    if (!nama_menu || !nama_menu.trim()) {
      return NextResponse.json(
        { status: "error", message: "Nama menu wajib diisi." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("mbg_menus")
      .insert({
        nama_menu: nama_menu.trim(),
        tanggal,
        sppg_id: sppg_id || null,
        menu_data,
        status,
        catatan: catatan?.trim() || null,
        is_template,
        template_name: template_name?.trim() || null,
      })
      .select("*, sppg_data(nama_sppg, porsi_besar, porsi_kecil, balita, bumil, busui)")
      .single();

    if (error) throw error;

    return NextResponse.json({ status: "success", data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan menu.";
    console.error("POST /api/menus error:", error);
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { status: "error", message: "ID menu wajib disertakan." },
        { status: 400 }
      );
    }

    // Add updated_at
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (updates.nama_menu !== undefined) updatePayload.nama_menu = updates.nama_menu.trim();
    if (updates.tanggal !== undefined) updatePayload.tanggal = updates.tanggal;
    if (updates.sppg_id !== undefined) updatePayload.sppg_id = updates.sppg_id || null;
    if (updates.menu_data !== undefined) updatePayload.menu_data = updates.menu_data;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.catatan !== undefined) updatePayload.catatan = updates.catatan?.trim() || null;
    if (updates.is_template !== undefined) updatePayload.is_template = updates.is_template;
    if (updates.template_name !== undefined) updatePayload.template_name = updates.template_name?.trim() || null;

    const { data, error } = await supabase
      .from("mbg_menus")
      .update(updatePayload)
      .eq("id", id)
      .select("*, sppg_data(nama_sppg, porsi_besar, porsi_kecil, balita, bumil, busui)")
      .single();

    if (error) throw error;

    return NextResponse.json({ status: "success", data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui menu.";
    console.error("PUT /api/menus error:", error);
    return NextResponse.json(
      { status: "error", message },
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
        { status: "error", message: "ID menu wajib disertakan." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("mbg_menus")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ status: "success", message: "Menu berhasil dihapus." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus menu.";
    console.error("DELETE /api/menus error:", error);
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
