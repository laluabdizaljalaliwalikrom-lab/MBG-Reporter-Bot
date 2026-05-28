import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generatePoster } from "@/lib/poster-service";
import { sendWhatsAppMedia } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

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

    // Validate essential fields
    if (!tanggal || !menu) {
      return NextResponse.json(
        { status: "error", message: "Tanggal dan Menu Makanan wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Insert initial record with status DRAFT
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

    // 2. Handle photo upload if bufferImage is provided
    let uploadedPhotoUrl = "";
    if (bufferImage) {
      try {
        uploadedPhotoUrl = await uploadPhotoToStorage(bufferImage, newReport.id);
        // Update report with photo URL
        await supabase
          .from("mbg_reports")
          .update({ photo_url: uploadedPhotoUrl })
          .eq("id", newReport.id);
      } catch (err) {
        console.error("Photo upload failed:", err);
      }
    }

    // 3. Generate poster
    let posterUrl = "";
    try {
      posterUrl = await generatePoster(newReport.id);
    } catch (err) {
      console.error("Poster generation failed:", err);
      return NextResponse.json(
        { status: "error", message: "Laporan disimpan tetapi pembuatan poster gagal." },
        { status: 500 }
      );
    }

    // 4. Update status to SENT
    await supabase
      .from("mbg_reports")
      .update({ status: "SENT" })
      .eq("id", newReport.id);

    // 5. Construct official report caption
    const caption =
      `📢 *LAPORAN HARIAN MBG (MAKANAN BERGIZI GRATIS)*\n\n` +
      `🏫 *SPPG:* ${sppgName || "SPPG Wilayah"}\n` +
      `📅 *Tanggal:* ${tanggal || "-"}\n` +
      `🍴 *Menu:* ${menu || "-"}\n` +
      `👥 *Jumlah Penerima:* ${totalPenerima} Orang\n` +
      `   - Porsi Besar (SD-SMP): ${porsiBesar} Anak\n` +
      `   - Porsi Kecil (PAUD-TK): ${porsiKecil} Anak\n` +
      `   - PMT B3 Balita: ${balita} Anak\n` +
      `   - PMT B3 Bumil: ${bumil} Ibu\n` +
      `   - PMT B3 Busui: ${busui} Ibu\n\n` +
      `🍱 *Nilai Gizi Porsi Besar (SD-SMP):*\n` +
      `   - Energi: ${giziBesar.Energi || 0} kcal\n` +
      `   - Protein: ${giziBesar.Protein || 0} g\n` +
      `   - Lemak: ${giziBesar.Lemak || 0} g\n` +
      `   - Karbohidrat: ${giziBesar.Karbohidrat || 0} g\n` +
      `   - Serat: ${giziBesar.Serat || 0} g\n\n` +
      `🍱 *Nilai Gizi Porsi Kecil (PAUD-TK):*\n` +
      `   - Energi: ${giziKecil.Energi || 0} kcal\n` +
      `   - Protein: ${giziKecil.Protein || 0} g\n` +
      `   - Lemak: ${giziKecil.Lemak || 0} g\n` +
      `   - Karbohidrat: ${giziKecil.Karbohidrat || 0} g\n` +
      `   - Serat: ${giziKecil.Serat || 0} g\n\n` +
      `✅ Laporan telah disetujui dan dikirim via Dashboard.`;

    // 6. Send WhatsApp poster + message to WhatsApp group or target
    const whatsappDestination = targetNumber || process.env.WHATSAPP_GROUP_ID || "";
    if (whatsappDestination) {
      try {
        await sendWhatsAppMedia(whatsappDestination, posterUrl, caption);
      } catch (err) {
        console.error("WhatsApp dispatch failed:", err);
        return NextResponse.json({
          status: "success",
          message: "Laporan tersimpan di database dan poster terbuat, tetapi gagal terkirim ke WhatsApp.",
          reportId: newReport.id,
          posterUrl
        });
      }
    }

    return NextResponse.json({
      status: "success",
      message: "Laporan berhasil disimpan, poster terbuat, dan dikirim ke WhatsApp!",
      reportId: newReport.id,
      posterUrl
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
