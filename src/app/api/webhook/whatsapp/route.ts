import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generatePoster } from "@/lib/poster-service";
import { sendWhatsAppMessage, sendWhatsAppMedia } from "@/lib/whatsapp";
import { parseManualInput, type MBGReportData } from "@/lib/parseManualInput";

export const dynamic = "force-dynamic";

// Webhook payload interface to support strict type-checking
interface ExtractedNutritionalInfo {
  Jumlah?: number | null;
  jumlah?: number | null;
  Energi?: number | null;
  energi?: number | null;
  Protein?: number | null;
  protein?: number | null;
  Lemak?: number | null;
  lemak?: number | null;
  Karbohidrat?: number | null;
  karbohidrat?: number | null;
  Serat?: number | null;
  serat?: number | null;
  [key: string]: unknown;
}

interface ExtractedMBGReport {
  Tanggal?: string | null;
  tanggal?: string | null;
  Menu?: string | null;
  menu?: string | null;
  "Porsi Besar"?: ExtractedNutritionalInfo | number | null;
  porsi_besar?: ExtractedNutritionalInfo | number | null;
  porsiBesar?: ExtractedNutritionalInfo | number | null;
  "Porsi Kecil"?: ExtractedNutritionalInfo | number | null;
  porsi_kecil?: ExtractedNutritionalInfo | number | null;
  porsiKecil?: ExtractedNutritionalInfo | number | null;
  Energi?: number | null;
  energi?: number | null;
  Protein?: number | null;
  protein?: number | null;
  Lemak?: number | null;
  lemak?: number | null;
  Karbohidrat?: number | null;
  karbohidrat?: number | null;
  Serat?: number | null;
  serat?: number | null;
  error?: string;
  [key: string]: unknown;
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
      imageUrl = body.url || body.imageUrl || body.mediaUrl || body.bufferImage || "";
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

      // Try to read nested gizi from JSONB extracted_data
      const ext = (existingDraft.extracted_data || {}) as ExtractedMBGReport;
      const besarRaw = ext["Porsi Besar"] || ext.porsi_besar;
      const besar = (besarRaw && typeof besarRaw === "object") ? (besarRaw as ExtractedNutritionalInfo) : {};
      const kecilRaw = ext["Porsi Kecil"] || ext.porsi_kecil;
      const kecil = (kecilRaw && typeof kecilRaw === "object") ? (kecilRaw as ExtractedNutritionalInfo) : {};

      const energiBesar = besar.Energi || besar.energi || existingDraft.energi || 0;
      const proteinBesar = besar.Protein || besar.protein || existingDraft.protein || 0;
      const lemakBesar = besar.Lemak || besar.lemak || existingDraft.lemak || 0;
      const karbohidratBesar = besar.Karbohidrat || besar.karbohidrat || existingDraft.karbohidrat || 0;
      const seratBesar = besar.Serat || besar.serat || existingDraft.serat || 0;

      const energiKecil = kecil.Energi || kecil.energi || 0;
      const proteinKecil = kecil.Protein || kecil.protein || 0;
      const lemakKecil = kecil.Lemak || kecil.lemak || 0;
      const karbohidratKecil = kecil.Karbohidrat || kecil.karbohidrat || 0;
      const seratKecil = kecil.Serat || kecil.serat || 0;

      // Construct official report caption
      const caption =
        `📢 *LAPORAN RESMI MBG (MAKANAN BERGIZI GRATIS)*\n\n` +
        `📅 *Tanggal:* ${existingDraft.tanggal || "-"}\n` +
        `🍴 *Menu:* ${existingDraft.menu || "-"}\n` +
        `👥 *Jumlah Penerima:* ${(existingDraft.porsi_besar || 0) + (existingDraft.porsi_kecil || 0)} Anak\n` +
        `   - Porsi Besar (SD-SMP): ${existingDraft.porsi_besar || 0} Anak\n` +
        `   - Porsi Kecil (PAUD-TK): ${existingDraft.porsi_kecil || 0} Anak\n\n` +
        `🍱 *Nilai Gizi Porsi Besar (SD-SMP):*\n` +
        `   - Energi: ${energiBesar} kcal\n` +
        `   - Protein: ${proteinBesar} g\n` +
        `   - Lemak: ${lemakBesar} g\n` +
        `   - Karbohidrat: ${karbohidratBesar} g\n` +
        `   - Serat: ${seratBesar} g\n\n` +
        `🍱 *Nilai Gizi Porsi Kecil (PAUD-TK):*\n` +
        `   - Energi: ${energiKecil} kcal\n` +
        `   - Protein: ${proteinKecil} g\n` +
        `   - Lemak: ${lemakKecil} g\n` +
        `   - Karbohidrat: ${karbohidratKecil} g\n` +
        `   - Serat: ${seratKecil} g\n\n` +
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
      let extractedData: ExtractedMBGReport;

      if (isManualMBG) {
        await sendWhatsAppMessage(sender, "📝 Memproses data laporan manual...");
        extractedData = parseManualInput(messageText);
      } else {
        await sendWhatsAppMessage(sender, "📝 Menganalisis data laporan...");

        try {
          extractedData = await extractDataWithAI(messageText);
          console.log("Extracted Data from Gemini:", JSON.stringify(extractedData, null, 2));
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

// Download or decode and upload photo from webhook to Supabase storage posters bucket
async function uploadPhotoToStorage(imageInput: string, reportId: string): Promise<string> {
  let buffer: Buffer;

  if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
    const response = await fetch(imageInput);
    if (!response.ok) {
      throw new Error(`Failed to download image from payload: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    // Treat as base64 string
    const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, "");
    buffer = Buffer.from(base64Data, "base64");
  }

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

// Helper function to wait/sleep
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Extract data from raw WhatsApp message using Gemini AI with retry mechanism
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
         "Menu": "string",
         "Porsi Besar": {
           "Jumlah": number atau null,
           "Energi": float atau null,
           "Protein": float atau null,
           "Lemak": float atau null,
           "Karbohidrat": float atau null,
           "Serat": float atau null
         },
         "Porsi Kecil": {
           "Jumlah": number atau null,
           "Energi": float atau null,
           "Protein": float atau null,
           "Lemak": float atau null,
           "Karbohidrat": float atau null,
           "Serat": float atau null
         }
       }
    2. Pastikan angka gizi dikonversi menjadi format float (desimal) atau integer, bukan string.

    Teks Laporan: "${text}"
  `;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const rawText = response.text().trim();
      
      // Clean markdown code blocks if the model wrapped the JSON in backticks
      let jsonStr = rawText;
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```json|```/g, "").trim();
      }
      
      return JSON.parse(jsonStr) as Partial<MBGReportData>;
    } catch (e: unknown) {
      lastError = e;
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn(`Gemini API attempt ${attempt} failed: ${errorMessage}`);
      if (attempt < 3) {
        // Wait 2 seconds before retrying
        await delay(2000);
      }
    }
  }

  console.error("Gemini Parsing failed after 3 attempts:", lastError);
  return { error: "Parsing failed" };
}

// Map parsed JSON fields to db column names
function mapExtractedToColumns(data: ExtractedMBGReport) {
  const besarRaw = data["Porsi Besar"] || data.porsi_besar;
  const besar = (besarRaw && typeof besarRaw === "object") ? besarRaw : {};
  
  const kecilRaw = data["Porsi Kecil"] || data.porsi_kecil;
  const kecil = (kecilRaw && typeof kecilRaw === "object") ? kecilRaw : {};

  const porsiBesar = (typeof besarRaw === "number") ? besarRaw : (besar.Jumlah || besar.jumlah || null);
  const porsiKecil = (typeof kecilRaw === "number") ? kecilRaw : (kecil.Jumlah || kecil.jumlah || null);

  return {
    tanggal: data.Tanggal || data.tanggal || null,
    porsi_besar: porsiBesar,
    porsi_kecil: porsiKecil,
    menu: data.Menu || data.menu || null,
    // Default fallback to Porsi Besar values or root values for main db columns
    energi: besar.Energi || besar.energi || data.Energi || data.energi || null,
    protein: besar.Protein || besar.protein || data.Protein || data.protein || null,
    lemak: besar.Lemak || besar.lemak || data.Lemak || data.lemak || null,
    karbohidrat: besar.Karbohidrat || besar.karbohidrat || data.Karbohidrat || data.karbohidrat || null,
    serat: besar.Serat || besar.serat || data.Serat || data.serat || null
  };
}

// Format a readable summary message for user verification
function formatSummary(data: ExtractedMBGReport) {
  const tanggal = data.Tanggal || data.tanggal || "-";
  const menu = data.Menu || data.menu || "-";

  const besarRaw = data["Porsi Besar"] || data.porsi_besar;
  const besar = (besarRaw && typeof besarRaw === "object") ? besarRaw : {};

  const kecilRaw = data["Porsi Kecil"] || data.porsi_kecil;
  const kecil = (kecilRaw && typeof kecilRaw === "object") ? kecilRaw : {};

  const porsiBesar = (typeof besarRaw === "number") ? besarRaw : (besar.Jumlah || besar.jumlah || 0);
  const porsiKecil = (typeof kecilRaw === "number") ? kecilRaw : (kecil.Jumlah || kecil.jumlah || 0);

  // Check if we have nested nutritional data
  const hasNestedNutrition = (Object.keys(besar).length > 0 && (besar.Energi || besar.energi)) ||
                            (Object.keys(kecil).length > 0 && (kecil.Energi || kecil.energi));

  if (hasNestedNutrition) {
    return `📅 *Tanggal:* ${tanggal}
🍴 *Menu:* ${menu}
👥 *Jumlah Penerima:* ${porsiBesar + porsiKecil} Anak
   - Porsi Besar (SD-SMP): ${porsiBesar} Anak
   - Porsi Kecil (PAUD-TK): ${porsiKecil} Anak

🍱 *Nilai Gizi Porsi Besar (SD-SMP):*
   - Energi: ${besar.Energi || besar.energi || 0} kcal
   - Protein: ${besar.Protein || besar.protein || 0} g
   - Lemak: ${besar.Lemak || besar.lemak || 0} g
   - Karbohidrat: ${besar.Karbohidrat || besar.karbohidrat || 0} g
   - Serat: ${besar.Serat || besar.serat || 0} g

🍱 *Nilai Gizi Porsi Kecil (PAUD-TK):*
   - Energi: ${kecil.Energi || kecil.energi || 0} kcal
   - Protein: ${kecil.Protein || kecil.protein || 0} g
   - Lemak: ${kecil.Lemak || kecil.lemak || 0} g
   - Karbohidrat: ${kecil.Karbohidrat || kecil.karbohidrat || 0} g
   - Serat: ${kecil.Serat || kecil.serat || 0} g`;
  } else {
    // Legacy / manual flat format
    const energi = data.Energi || data.energi || 0;
    const protein = data.Protein || data.protein || 0;
    const lemak = data.Lemak || data.lemak || 0;
    const karbohidrat = data.Karbohidrat || data.karbohidrat || 0;
    const serat = data.Serat || data.serat || 0;

    return `📅 *Tanggal:* ${tanggal}
🍴 *Menu:* ${menu}
👥 *Porsi:* ${porsiBesar} Besar (SD-SMP), ${porsiKecil} Kecil (PAUD)
🔥 *Energi:* ${energi} kcal
🥩 *Protein:* ${protein} g
🧈 *Lemak:* ${lemak} g
🍚 *Karbohidrat:* ${karbohidrat} g
🥦 *Serat:* ${serat} g`;
  }
}

