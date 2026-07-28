import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generatePoster } from "@/lib/poster-service";

export const dynamic = "force-dynamic";

const hariIndonesia = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const bulanIndonesia = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function formatTanggal(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return `${hariIndonesia[d.getDay()]} ${d.getDate()} ${bulanIndonesia[d.getMonth()]} ${d.getFullYear()}`;
}

async function uploadPhotoToStorage(base64Data: string, reportId: string): Promise<string> {
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  const fileName = `photo-${reportId}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("posters")
    .upload(fileName, buffer, {
      contentType: "image/jpeg",
      upsert: true
    });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from("posters").getPublicUrl(fileName);

  return publicUrl;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action = "preview",
      reportId,
      sppgName,
      tanggal,
      menu,
      porsiBesar = 0,
      porsiKecil = 0,
      balita = 0,
      bumil = 0,
      busui = 0,
      giziBesar = {},
      giziKecil = {},
      bufferImage,
      targetNumber
    } = body;

    // --- ACTION: CANCEL ---
    if (action === "cancel") {
      if (!reportId) {
        return NextResponse.json({ status: "error", message: "Report ID wajib disertakan untuk pembatalan." }, { status: 400 });
      }
      await supabase
        .from("mbg_reports")
        .update({ status: "CANCELLED" })
        .eq("id", reportId);

      return NextResponse.json({ status: "success", message: "Laporan berhasil dibatalkan." });
    }

    // --- ACTION: CONFIRM (MARK AS SENT) ---
    if (action === "confirm") {
      if (!reportId) {
        return NextResponse.json({ status: "error", message: "Report ID wajib disertakan untuk konfirmasi." }, { status: 400 });
      }

      // Fetch the draft report
      const { data: report, error: fetchError } = await supabase
        .from("mbg_reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (fetchError || !report) {
        return NextResponse.json({ status: "error", message: "Laporan tidak ditemukan." }, { status: 404 });
      }

      let posterUrl = report.poster_url;
      if (!posterUrl) {
        posterUrl = await generatePoster(report.id);
      }

      // Parse nested gizi & B3 from extracted_data
      const ext = report.extracted_data || {};
      const besar = ext["Porsi Besar"] || {};
      const kecil = ext["Porsi Kecil"] || {};
      const b3 = ext["B3"] || {};

      const balitaVal = b3.Balita || 0;
      const bumilVal = b3.Bumil || 0;
      const busuiVal = b3.Busui || 0;
      const totalPenerima = (report.porsi_besar || 0) + (report.porsi_kecil || 0) + balitaVal + bumilVal + busuiVal;

      // Construct official caption
      const caption =
        `📢 *LAPORAN HARIAN MBG (MAKANAN BERGIZI GRATIS)*\n\n` +
        `🏫 *SPPG:* ${ext.sppg_name || "SPPG Wilayah"}\n` +
        `📅 *Tanggal:* ${formatTanggal(report.tanggal)}\n` +
        `🍴 *Menu:* ${report.menu || "-"}\n` +
        `👥 *Jumlah Penerima:* ${totalPenerima} Orang\n` +
        `   - Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru/Tendik): ${report.porsi_besar || 0} Orang\n` +
        `   - Porsi Kecil (PAUD-TK, SD Kelas 1-3): ${report.porsi_kecil || 0} Orang\n` +
        `   - PMT B3 Balita: ${balitaVal} Anak\n` +
        `   - PMT B3 Bumil: ${bumilVal} Ibu\n` +
        `   - PMT B3 Busui: ${busuiVal} Ibu\n\n` +
        `🍱 *Nilai Gizi Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru/Tendik):*\n` +
        `   - Energi: ${besar.Energi || report.energi || 0} kcal\n` +
        `   - Protein: ${besar.Protein || report.protein || 0} g\n` +
        `   - Lemak: ${besar.Lemak || report.lemak || 0} g\n` +
        `   - Karbohidrat: ${besar.Karbohidrat || report.karbohidrat || 0} g\n` +
        `   - Serat: ${besar.Serat || report.serat || 0} g\n\n` +
        `🍱 *Nilai Gizi Porsi Kecil (PAUD-TK, SD Kelas 1-3):*\n` +
        `   - Energi: ${kecil.Energi || 0} kcal\n` +
        `   - Protein: ${kecil.Protein || 0} g\n` +
        `   - Lemak: ${kecil.Lemak || 0} g\n` +
        `   - Karbohidrat: ${kecil.Karbohidrat || 0} g\n` +
        `   - Serat: ${kecil.Serat || 0} g\n\n` +
        `Dikirim dengan hormat untuk mewujudkan Generasi Emas Indonesia 2045.`;

      // Update status to SENT
      await supabase
        .from("mbg_reports")
        .update({ status: "SENT" })
        .eq("id", report.id);

      return NextResponse.json({
        status: "success",
        message: "Laporan berhasil disetujui dan ditandai sebagai terkirim!",
        reportId: report.id,
        posterUrl,
        caption
      });
    }

    // --- ACTION: PREVIEW (DEFAULT) ---
    if (!tanggal || !menu) {
      return NextResponse.json(
        { status: "error", message: "Tanggal dan Menu Makanan wajib diisi." },
        { status: 400 }
      );
    }

    const totalPenerima = Number(porsiBesar) + Number(porsiKecil) + Number(balita) + Number(bumil) + Number(busui);

    const extractedData = {
      sppg_name: sppgName,
      "Porsi Besar": giziBesar,
      "Porsi Kecil": giziKecil,
      "B3": {
        Balita: Number(balita),
        Bumil: Number(bumil),
        Busui: Number(busui)
      }
    };

    // Insert as DRAFT
    const { data: newReport, error: insertError } = await supabase
      .from("mbg_reports")
      .insert({
        tanggal,
        menu,
        porsi_besar: Number(porsiBesar),
        porsi_kecil: Number(porsiKecil),
        energi: Number(giziBesar.Energi || 0),
        protein: Number(giziBesar.Protein || 0),
        lemak: Number(giziBesar.Lemak || 0),
        karbohidrat: Number(giziBesar.Karbohidrat || 0),
        serat: Number(giziBesar.Serat || 0),
        extracted_data: extractedData,
        whatsapp_from: targetNumber || "Dashboard",
        status: "DRAFT"
      })
      .select()
      .single();

    if (insertError || !newReport) {
      console.error("Error inserting report:", insertError);
      return NextResponse.json(
        { status: "error", message: "Gagal menyimpan laporan ke database." },
        { status: 500 }
      );
    }

    // Upload photo
    let uploadedPhotoUrl = "";
    if (bufferImage) {
      try {
        uploadedPhotoUrl = await uploadPhotoToStorage(bufferImage, newReport.id);
        await supabase
          .from("mbg_reports")
          .update({ photo_url: uploadedPhotoUrl })
          .eq("id", newReport.id);
      } catch (err) {
        console.error("Photo upload failed:", err);
      }
    }

    // Generate poster preview
    let posterUrl = "";
    try {
      posterUrl = await generatePoster(newReport.id);
    } catch (err) {
      console.error("Poster generation failed:", err);
      return NextResponse.json(
        { status: "error", message: "Gagal membuat draf poster laporan harian." },
        { status: 500 }
      );
    }

    // Construct caption preview
    const previewCaption =
      `📢 *LAPORAN HARIAN MBG (MAKANAN BERGIZI GRATIS)*\n\n` +
      `🏫 *SPPG:* ${sppgName || "SPPG Wilayah"}\n` +
      `📅 *Tanggal:* ${formatTanggal(tanggal)}\n` +
      `🍴 *Menu:* ${menu || "-"}\n` +
      `👥 *Jumlah Penerima:* ${totalPenerima} Orang\n` +
      `   - Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru/Tendik): ${porsiBesar} Orang\n` +
      `   - Porsi Kecil (PAUD-TK, SD Kelas 1-3): ${porsiKecil} Orang\n` +
      `   - PMT B3 Balita: ${balita} Anak\n` +
      `   - PMT B3 Bumil: ${bumil} Ibu\n` +
      `   - PMT B3 Busui: ${busui} Ibu\n\n` +
      `🍱 *Nilai Gizi Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru/Tendik):*\n` +
      `   - Energi: ${giziBesar.Energi || 0} kcal\n` +
      `   - Protein: ${giziBesar.Protein || 0} g\n` +
      `   - Lemak: ${giziBesar.Lemak || 0} g\n` +
      `   - Karbohidrat: ${giziBesar.Karbohidrat || 0} g\n` +
      `   - Serat: ${giziBesar.Serat || 0} g\n\n` +
      `🍱 *Nilai Gizi Porsi Kecil (PAUD-TK, SD Kelas 1-3):*\n` +
      `   - Energi: ${giziKecil.Energi || 0} kcal\n` +
      `   - Protein: ${giziKecil.Protein || 0} g\n` +
      `   - Lemak: ${giziKecil.Lemak || 0} g\n` +
      `   - Karbohidrat: ${giziKecil.Karbohidrat || 0} g\n` +
      `   - Serat: ${giziKecil.Serat || 0} g\n\n` +
      `Dikirim dengan hormat untuk mewujudkan Generasi Emas Indonesia 2045.`;

    return NextResponse.json({
      status: "success",
      action: "preview_ready",
      reportId: newReport.id,
      posterUrl,
      caption: previewCaption
    });
  } catch (error: unknown) {
    console.error("Error processing dashboard report:", error);
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan internal server.";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      reportId,
      sppgName,
      tanggal,
      menu,
      porsiBesar = 0,
      porsiKecil = 0,
      balita = 0,
      bumil = 0,
      busui = 0,
      giziBesar = {},
      giziKecil = {}
    } = body;

    if (!reportId) {
      return NextResponse.json({ status: "error", message: "Report ID wajib disertakan untuk edit." }, { status: 400 });
    }

    if (!tanggal || !menu) {
      return NextResponse.json({ status: "error", message: "Tanggal dan Menu Makanan wajib diisi." }, { status: 400 });
    }

    const extractedData = {
      sppg_name: sppgName,
      "Porsi Besar": giziBesar,
      "Porsi Kecil": giziKecil,
      "B3": {
        Balita: Number(balita),
        Bumil: Number(bumil),
        Busui: Number(busui)
      }
    };

    const { data: updated, error: updateError } = await supabase
      .from("mbg_reports")
      .update({
        tanggal,
        menu,
        porsi_besar: Number(porsiBesar),
        porsi_kecil: Number(porsiKecil),
        energi: Number(giziBesar.Energi || 0),
        protein: Number(giziBesar.Protein || 0),
        lemak: Number(giziBesar.Lemak || 0),
        karbohidrat: Number(giziBesar.Karbohidrat || 0),
        serat: Number(giziBesar.Serat || 0),
        extracted_data: extractedData
      })
      .eq("id", reportId)
      .select()
      .single();

    if (updateError || !updated) {
      console.error("Error updating report:", updateError);
      return NextResponse.json({ status: "error", message: "Gagal memperbarui laporan." }, { status: 500 });
    }

    // Regenerate poster
    let posterUrl = updated.poster_url || "";
    try {
      posterUrl = await generatePoster(reportId);
      await supabase
        .from("mbg_reports")
        .update({ poster_url: posterUrl })
        .eq("id", reportId);
    } catch (err) {
      console.error("Poster regeneration failed:", err);
    }

    // Rebuild caption
    const ext = updated.extracted_data || {};
    const besar = ext["Porsi Besar"] || {};
    const kecil = ext["Porsi Kecil"] || {};
    const b3 = ext["B3"] || {};
    const totalPenerima = Number(porsiBesar) + Number(porsiKecil) + Number(balita) + Number(bumil) + Number(busui);

    const caption =
      `📢 *LAPORAN HARIAN MBG (MAKANAN BERGIZI GRATIS)*\n\n` +
      `🏫 *SPPG:* ${sppgName || "SPPG Wilayah"}\n` +
      `📅 *Tanggal:* ${formatTanggal(tanggal)}\n` +
      `🍴 *Menu:* ${menu || "-"}\n` +
      `👥 *Jumlah Penerima:* ${totalPenerima} Orang\n` +
      `   - Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru/Tendik): ${porsiBesar} Orang\n` +
      `   - Porsi Kecil (PAUD-TK, SD Kelas 1-3): ${porsiKecil} Orang\n` +
      `   - PMT B3 Balita: ${b3.Balita || 0} Anak\n` +
      `   - PMT B3 Bumil: ${b3.Bumil || 0} Ibu\n` +
      `   - PMT B3 Busui: ${b3.Busui || 0} Ibu\n\n` +
      `🍱 *Nilai Gizi Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru/Tendik):*\n` +
      `   - Energi: ${besar.Energi || 0} kcal\n` +
      `   - Protein: ${besar.Protein || 0} g\n` +
      `   - Lemak: ${besar.Lemak || 0} g\n` +
      `   - Karbohidrat: ${besar.Karbohidrat || 0} g\n` +
      `   - Serat: ${besar.Serat || 0} g\n\n` +
      `🍱 *Nilai Gizi Porsi Kecil (PAUD-TK, SD Kelas 1-3):*\n` +
      `   - Energi: ${kecil.Energi || 0} kcal\n` +
      `   - Protein: ${kecil.Protein || 0} g\n` +
      `   - Lemak: ${kecil.Lemak || 0} g\n` +
      `   - Karbohidrat: ${kecil.Karbohidrat || 0} g\n` +
      `   - Serat: ${kecil.Serat || 0} g\n\n` +
      `Dikirim dengan hormat untuk mewujudkan Generasi Emas Indonesia 2045.`;

    return NextResponse.json({
      status: "success",
      message: "Laporan berhasil diperbarui!",
      reportId: updated.id,
      posterUrl,
      caption
    });
  } catch (error: unknown) {
    console.error("Error updating report:", error);
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan internal server.";
    return NextResponse.json({ status: "error", message: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ status: "error", message: "Report ID wajib disertakan." }, { status: 400 });
    }

    // Fetch report to get storage file URLs
    const { data: report, error: fetchError } = await supabase
      .from("mbg_reports")
      .select("poster_url, photo_url")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching report for delete:", fetchError);
    }

    // Cleanup storage files (non-fatal — DB delete must proceed even if storage fails)
    if (report) {
      const filesToDelete: string[] = [];
      if (report.poster_url) {
        const fileName = report.poster_url.split("/").pop();
        if (fileName) filesToDelete.push(fileName);
      }
      if (report.photo_url) {
        const fileName = report.photo_url.split("/").pop();
        if (fileName) filesToDelete.push(fileName);
      }
      if (filesToDelete.length > 0) {
        try {
          await supabase.storage.from("posters").remove(filesToDelete);
        } catch (storageErr) {
          console.error("Storage cleanup failed (non-fatal):", storageErr);
        }
      }
    }

    const { error: deleteError } = await supabase
      .from("mbg_reports")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    // Verify deletion by checking if row still exists
    const { data: remaining } = await supabase
      .from("mbg_reports")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (remaining) {
      return NextResponse.json({
        status: "error",
        message: "Gagal menghapus: kemungkinan RLS (Row Level Security) aktif di tabel mbg_reports. Nonaktifkan RLS atau tambah policy DELETE untuk role anon di Supabase Dashboard."
      }, { status: 403 });
    }

    return NextResponse.json({ status: "success", message: "Laporan berhasil dihapus." });
  } catch (error: unknown) {
    console.error("Error deleting report:", error);
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan internal server.";
    return NextResponse.json({ status: "error", message: errorMessage }, { status: 500 });
  }
}
