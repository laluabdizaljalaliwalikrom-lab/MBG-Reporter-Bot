import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generatePoster } from "@/lib/poster-service";
import { sendWhatsAppMessage, sendWhatsAppMedia } from "@/lib/whatsapp";
import { parseManualInput, type MBGReportData } from "@/lib/parseManualInput";

export const dynamic = "force-dynamic";

// Webhook payload interface to support strict type-checking
interface WebhookPayload {
  messages?: Array<{
    from: string;
    type: string;
    text?: { body: string };
    image?: { link: string; caption: string };
  }>;
  message?: string;
  sender?: string;
  url?: string;
  text?: string;
  from?: string;
  imageUrl?: string;
  mediaUrl?: string;
}

// Database schema matching interface
interface MBGReportRow {
  id: string;
  created_at: string;
  whatsapp_from: string | null;
  raw_message: string | null;
  extracted_data: Record<string, unknown> | null;
  status: string;
  tanggal: string | null;
  porsi_besar: number | null;
  porsi_kecil: number | null;
  menu: string | null;
  energi: number | null;
  protein: number | null;
  lemak: number | null;
  karbohidrat: number | null;
  serat: number | null;
  photo_url: string | null;
  poster_url: string | null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Full MPWA Payload:', JSON.stringify(body, null, 2));

    // 1. Extract message, sender, and media
    let messageText = "";
    let senderRaw = "";
    let imageUrl = "";

    // Parse Whapi.cloud Format
    if (body.messages && body.messages[0]) {
      const msg = body.messages[0];
      senderRaw = msg.from;
      if (msg.type === "text") {
        messageText = msg.text?.body || "";
      } else if (msg.type === "image") {
        imageUrl = msg.image?.link || "";
        messageText = msg.image?.caption || "";
      }
    }
    // Parse Fontee / MPWA / Generic / Multi-device Format
    else {
      messageText = body.message || body.text || "";
      senderRaw = body.sender || 
                  body.from || 
                  body.participant || 
                  (body.data && body.data.key && body.data.key.remoteJid) ||
                  (body.key && body.key.remoteJid) ||
                  (body.key && body.key.participant) ||
                  body.pushName ||
                  "unknown";
      imageUrl = body.url || body.imageUrl || body.mediaUrl || "";
    }

    if (!senderRaw || senderRaw === "unknown") {
      senderRaw = "6287818383876";
    }

    // Clean sender string using Regex to keep only digits
    let sender = senderRaw.replace(/\D/g, "");

    // Fallback: If sender is empty or doesn't start with '62', use the test number for testing
    if (!sender || !sender.startsWith("62")) {
      sender = "6287818383876";
    }

    // 2. State Machine: Fetch the latest active DRAFT for this sender
    const { data: existingDraftData, error: draftError } = await supabase
      .from("mbg_reports")
      .select("*")
      .eq("whatsapp_from", sender)
      .eq("status", "DRAFT")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (draftError) {
      console.error("Database query error:", draftError);
    }

    const existingDraft = existingDraftData as MBGReportRow | null;

    // --- CONDITION C: PERSETUJUAN 'YA' ---
    if (existingDraft && messageText.trim().toUpperCase() === "YA") {
      const groupId = process.env.WHATSAPP_GROUP_ID || sender;

      // Check if poster exists, otherwise generate it
      let posterUrl = existingDraft.poster_url;
      if (!posterUrl) {
        posterUrl = await generatePoster(existingDraft.id);
      }

      // Construct official report caption
      const caption =
        `📢 *LAPORAN RESMI MBG (MAKANAN BERGIZI GRATIS)*\n\n` +
        `📅 *Tanggal:* ${existingDraft.tanggal || "-"}\n` +
        `🍴 *Menu:* ${existingDraft.menu || "-"}\n` +
        `👥 *Jumlah Penerima:* ${(existingDraft.porsi_besar || 0) + (existingDraft.porsi_kecil || 0)} Anak\n` +
        `   - Porsi Besar (SD-SMP): ${existingDraft.porsi_besar || 0}\n` +
        `   - Porsi Kecil (PAUD-TK): ${existingDraft.porsi_kecil || 0}\n\n` +
        `🔥 *Energi:* ${existingDraft.energi || 0} kcal\n` +
        `🥩 *Protein:* ${existingDraft.protein || 0} g\n` +
        `🧈 *Lemak:* ${existingDraft.lemak || 0} g\n` +
        `🍚 *Karbohidrat:* ${existingDraft.karbohidrat || 0} g\n` +
        `🥦 *Serat:* ${existingDraft.serat || 0} g\n\n` +
        `✅ Laporan telah disetujui oleh Kepala SPPG.`;

      // Send poster to the Stakeholder Group via MPWA sendWhatsAppMedia
      await sendWhatsAppMedia(groupId, posterUrl, caption);

      // Update status in the database to 'SENT'
      await supabase
        .from("mbg_reports")
        .update({ status: "SENT" })
        .eq("id", existingDraft.id);

      // Send success confirmation back to the sender
      await sendWhatsAppMessage(
        sender,
        "✅ Laporan telah dikirim ke grup pemangku kepentingan. Terima kasih!"
      );

      return NextResponse.json({ status: "success", action: "confirmed" });
    }

    // --- CONDITION D: PEMBATALAN 'REVISI' ---
    if (existingDraft && messageText.trim().toUpperCase() === "REVISI") {
      // Mark active draft as CANCELLED
      await supabase
        .from("mbg_reports")
        .update({ status: "CANCELLED" })
        .eq("id", existingDraft.id);

      await sendWhatsAppMessage(
        sender,
        "❌ Draf laporan Anda telah dibatalkan. Silakan kirimkan kembali teks laporan baru."
      );

      return NextResponse.json({ status: "success", action: "cancelled" });
    }

    // --- CONDITION B: INPUT FOTO (MEDIA UPLOAD) ---
    if (imageUrl) {
      if (!existingDraft) {
        await sendWhatsAppMessage(
          sender,
          "⚠️ Silakan kirimkan teks laporan terlebih dahulu sebelum mengirimkan foto makanan."
        );
        return NextResponse.json({ status: "error", reason: "no_active_draft_for_photo" });
      }

      await sendWhatsAppMessage(sender, "📸 Foto diterima. Sedang mengunggah ke penyimpanan...");

      // 1. Download image from webhook and save to Supabase Storage posters bucket
      const uploadedUrl = await uploadPhotoToStorage(imageUrl, existingDraft.id);

      // 2. Update existing draft photo_url in database
      await supabase
        .from("mbg_reports")
        .update({ photo_url: uploadedUrl })
        .eq("id", existingDraft.id);

      await sendWhatsAppMessage(sender, "🎨 Membuat draf poster laporan...");

      // 3. Generate poster dynamically via Satori service
      const posterUrl = await generatePoster(existingDraft.id);

      // 4. Send poster preview back to user using sendWhatsAppMedia
      await sendWhatsAppMedia(
        sender,
        posterUrl,
        "Ini draf laporan Anda. Ketik *YA* untuk kirim ke Grup, atau *REVISI* untuk batal."
      );

      return NextResponse.json({ status: "success", action: "image_processed" });
    }

    // --- CONDITION A: INPUT DATA BARU (TEXT EXTRACTION) ---
    const isManualMBG = messageText.trim().startsWith("MANUAL_MBG");
    const isReportKeyword =
      isManualMBG ||
      messageText.toUpperCase().includes("MBG") ||
      messageText.toUpperCase().includes("LAPORAN");

    if (isReportKeyword) {
      let extractedData: Partial<MBGReportData>;

      if (isManualMBG) {
        await sendWhatsAppMessage(sender, "📝 Memproses data laporan manual...");
        extractedData = parseManualInput(messageText);
      } else {
        await sendWhatsAppMessage(sender, "📝 Menganalisis data laporan...");

        try {
          extractedData = await extractDataWithAI(messageText);
          if (extractedData.error) {
            throw new Error(extractedData.error);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error("Gemini invocation failed, falling back to manual template:", errorMessage);

          const manualTemplate =
            `⚠️ *Gagal Menganalisis Laporan*\n` +
            `Kami tidak dapat memproses laporan Anda secara otomatis menggunakan AI.\n\n` +
            `Silakan salin teks di bawah ini, isi data dengan benar, dan kirimkan kembali:\n\n` +
            `MANUAL_MBG\n` +
            `Tanggal: YYYY-MM-DD\n` +
            `Porsi Besar: \n` +
            `Porsi Kecil: \n` +
            `Menu: \n` +
            `Energi: \n` +
            `Protein: \n` +
            `Lemak: \n` +
            `Karbohidrat: \n` +
            `Serat: `;

          await sendWhatsAppMessage(sender, manualTemplate);
          return NextResponse.json({
            status: "error",
            reason: "ai_extraction_failed_manual_sent",
            details: errorMessage
          });
        }
      }

      // 2. Insert new draft row to Supabase mbg_reports table
      const { data: newReport, error: insertError } = await supabase
        .from("mbg_reports")
        .insert({
          whatsapp_from: sender,
          raw_message: messageText,
          extracted_data: extractedData as Record<string, unknown>,
          status: "DRAFT",
          ...mapExtractedToColumns(extractedData)
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to insert report:", insertError);
        await sendWhatsAppMessage(sender, "❌ Terjadi kesalahan saat menyimpan draf laporan ke database.");
        return NextResponse.json({ status: "error", reason: "database_insert_failed" });
      }

      // 3. Format and send summary back to the user
      const summary = formatSummary(extractedData);
      await sendWhatsAppMessage(
        sender,
        `📊 *RANGKUMAN DATA TERCATAT:*\n\n${summary}\n\nSilakan kirimkan *FOTO MAKANAN* asli untuk melengkapi poster.`
      );

      return NextResponse.json({ status: "success", action: "text_processed", id: newReport.id });
    }

    // Fallback response for unhandled commands
    return NextResponse.json({ status: "ignored", reason: "command_not_recognized" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook processing error:", error);
    return NextResponse.json({ status: "error", message: errorMessage }, { status: 500 });
  }
}

// Download and upload photo from webhook to Supabase storage posters bucket
async function uploadPhotoToStorage(imageUrl: string, reportId: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image from payload: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = `photo-${reportId}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("posters") // Using posters bucket
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

// Extract data from raw WhatsApp message using Gemini AI
async function extractDataWithAI(text: string): Promise<Partial<MBGReportData>> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const prompt = `
    Anda adalah asisten data Badan Gizi Nasional. Tugas Anda adalah mengekstrak teks laporan harian MBG menjadi format JSON.

    Aturan:
    1. Gunakan skema JSON berikut:
       {
         "Tanggal": "YYYY-MM-DD",
         "Porsi Besar": number atau null,
         "Porsi Kecil": number atau null,
         "Menu": "string",
         "Energi": float atau null,
         "Protein": float atau null,
         "Lemak": float atau null,
         "Karbohidrat": float atau null,
         "Serat": float atau null
       }
    2. Pastikan angka gizi dikonversi menjadi format float (desimal) atau integer, bukan string.

    Teks Laporan: "${text}"
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().trim();
    return JSON.parse(jsonStr) as Partial<MBGReportData>;
  } catch (e: unknown) {
    console.error("Gemini Parsing failed:", e);
    return { error: "Parsing failed" };
  }
}

// Map parsed JSON fields to db column names
function mapExtractedToColumns(data: Partial<MBGReportData>) {
  return {
    tanggal: data.Tanggal || null,
    porsi_besar: data["Porsi Besar"] || data.porsi_besar || null,
    porsi_kecil: data["Porsi Kecil"] || data.porsi_kecil || null,
    menu: data.Menu || data.menu || null,
    energi: data.Energi || data.energi || null,
    protein: data.Protein || data.protein || null,
    lemak: data.Lemak || data.lemak || null,
    karbohidrat: data.Karbohidrat || data.karbohidrat || null,
    serat: data.Serat || data.serat || null
  };
}

// Format a readable summary message for user verification
function formatSummary(data: Partial<MBGReportData>) {
  return `📅 *Tanggal:* ${data.Tanggal || "-"}
🍴 *Menu:* ${data.Menu || "-"}
👥 *Porsi:* ${data["Porsi Besar"] || 0} Besar (SD-SMP), ${data["Porsi Kecil"] || 0} Kecil (PAUD)
🔥 *Energi:* ${data.Energi || 0} kcal
🥩 *Protein:* ${data.Protein || 0} g
🧈 *Lemak:* ${data.Lemak || 0} g
🍚 *Karbohidrat:* ${data.Karbohidrat || 0} g
🥦 *Serat:* ${data.Serat || 0} g`;
}

