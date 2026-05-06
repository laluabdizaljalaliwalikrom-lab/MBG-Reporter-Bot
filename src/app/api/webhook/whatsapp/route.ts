import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generatePoster } from '@/lib/poster-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // 1. Extract message, sender, and media
    let messageText = '';
    let sender = '';
    let imageUrl = '';
    
    // Whapi.cloud Format
    if (payload.messages && payload.messages[0]) {
      const msg = payload.messages[0];
      sender = msg.from;
      if (msg.type === 'text') {
        messageText = msg.text?.body || '';
      } else if (msg.type === 'image') {
        imageUrl = msg.image?.link || '';
        messageText = msg.image?.caption || '';
      }
    } 
    // Fontee Format
    else if (payload.message && payload.sender) {
      messageText = payload.message;
      sender = payload.sender;
      imageUrl = payload.url || ''; // Fontee provides url if it's media
    }
    // Generic/Fallback
    else {
      messageText = payload.text || '';
      sender = payload.from || payload.sender || 'unknown';
      imageUrl = payload.imageUrl || '';
    }

    // 2. State Management: Get the latest DRAFT for this sender
    const { data: existingDraft, error: draftError } = await supabase
      .from('mbg_reports')
      .select('*')
      .eq('whatsapp_from', sender)
      .eq('status', 'DRAFT')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 3. Logic based on message content and state
    
    // Case A: User confirms with 'YA'
    if (existingDraft && messageText.toUpperCase() === 'YA') {
      await supabase
        .from('mbg_reports')
        .update({ status: 'SENT' })
        .eq('id', existingDraft.id);
      
      await sendWhatsAppMessage(sender, '✅ Laporan telah dikirim ke grup pemangku kepentingan. Terima kasih!');
      // TODO: Notify group API call here
      return NextResponse.json({ status: 'success', action: 'confirmed' });
    }

    // Case B: User wants to 'REVISI'
    if (existingDraft && messageText.toUpperCase() === 'REVISI') {
      await sendWhatsAppMessage(sender, 'Silakan kirimkan kembali teks laporan yang benar.');
      return NextResponse.json({ status: 'success', action: 'revision_requested' });
    }

    // Case C: Handling Image (Photo Menu)
    if (imageUrl) {
      let reportId = '';
      
      if (existingDraft) {
        // Update existing draft with photo
        await supabase
          .from('mbg_reports')
          .update({ photo_url: imageUrl })
          .eq('id', existingDraft.id);
        reportId = existingDraft.id;
      } else {
        // Create new draft if none exists
        const { data: newReport } = await supabase
          .from('mbg_reports')
          .insert({
            whatsapp_from: sender,
            photo_url: imageUrl,
            status: 'DRAFT'
          })
          .select()
          .single();
        reportId = newReport.id;
      }

      await sendWhatsAppMessage(sender, '📸 Foto menu diterima. Sedang memproses poster...');
      
      // Generate poster asynchronously (or wait if needed)
      const posterUrl = await generatePoster(reportId);
      
      await sendWhatsAppMessage(sender, `🎨 Poster laporan telah dibuat!\n\nLihat di sini: ${posterUrl}\n\nApakah data ini sudah benar? Ketik *YA* untuk kirim, atau *REVISI* untuk mengubah.`);
      return NextResponse.json({ status: 'success', action: 'image_processed' });
    }

    // Case D: Handling Text (Extraction)
    if (messageText) {
      await sendWhatsAppMessage(sender, '📝 Menganalisis data laporan...');

      // 1. AI Extraction
      const extractedData = await extractDataWithAI(messageText);
      
      // 2. Save/Update to Supabase
      let reportId = '';
      if (existingDraft) {
        await supabase
          .from('mbg_reports')
          .update({
            raw_message: messageText,
            extracted_data: extractedData,
            ...mapExtractedToColumns(extractedData)
          })
          .eq('id', existingDraft.id);
        reportId = existingDraft.id;
      } else {
        const { data: newReport } = await supabase
          .from('mbg_reports')
          .insert({
            whatsapp_from: sender,
            raw_message: messageText,
            extracted_data: extractedData,
            status: 'DRAFT',
            ...mapExtractedToColumns(extractedData)
          })
          .select()
          .single();
        reportId = newReport.id;
      }

      // 3. Send Summary and Question
      const summary = formatSummary(extractedData);
      await sendWhatsAppMessage(sender, `📊 *RANGKUMAN LAPORAN*\n\n${summary}\n\nSilakan kirim *FOTO MENU* untuk melengkapi laporan.`);
      
      return NextResponse.json({ status: 'success', action: 'text_processed' });
    }

    return NextResponse.json({ status: 'ignored' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook processing error:', error);
    return NextResponse.json({ status: 'error', message: errorMessage }, { status: 500 });
  }
}

interface MBGReportData {
  Tanggal: string | null;
  'Porsi Besar': number | null;
  'Porsi Kecil': number | null;
  Menu: string | null;
  Energi: number | null;
  Protein: number | null;
  Lemak: number | null;
  Karbohidrat: number | null;
  Serat: number | null;
  error?: string;
  raw?: string;
  [key: string]: string | number | boolean | null | undefined;
}

async function extractDataWithAI(text: string): Promise<Partial<MBGReportData>> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `
    Anda adalah asisten data Badan Gizi Nasional. Tugas Anda adalah mengekstrak teks laporan harian MBG menjadi format JSON.

    Aturan:
    1. Keluarkan output HANYA dalam format JSON.
    2. Jangan tambahkan penjelasan atau kata-kata tambahan di luar JSON.
    3. Gunakan skema JSON berikut:
       {
         "Tanggal": "YYYY-MM-DD",
         "Porsi Besar": number,
         "Porsi Kecil": number,
         "Menu": "string",
         "Energi": float,
         "Protein": float,
         "Lemak": float,
         "Karbohidrat": float,
         "Serat": float
       }
    4. Jika ada informasi yang hilang, isi dengan null.
    5. Pastikan angka gizi dikonversi menjadi format float (desimal), bukan string.

    Teks Laporan: "${text}"
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const jsonStr = response.text().trim().replace(/```json|```/g, '').trim();
  
  try {
    return JSON.parse(jsonStr) as Partial<MBGReportData>;
  } catch (e: unknown) {
    return { error: 'Parsing failed', raw: jsonStr };
  }
}

function mapExtractedToColumns(data: Partial<MBGReportData>) {
  return {
    tanggal: data.Tanggal || null,
    porsi_besar: data['Porsi Besar'] || data.porsi_besar || null,
    porsi_kecil: data['Porsi Kecil'] || data.porsi_kecil || null,
    menu: data.Menu || data.menu || null,
    energi: data.Energi || data.energi || null,
    protein: data.Protein || data.protein || null,
    lemak: data.Lemak || data.lemak || null,
    karbohidrat: data.Karbohidrat || data.karbohidrat || null,
    serat: data.Serat || data.serat || null
  };
}

function formatSummary(data: Partial<MBGReportData>) {
  return `📅 Tanggal: ${data.Tanggal || '-'}
🍴 Menu: ${data.Menu || '-'}
👥 Porsi: ${data['Porsi Besar'] || 0} Besar, ${data['Porsi Kecil'] || 0} Kecil
🔥 Energi: ${data.Energi || 0} kcal
🥩 Protein: ${data.Protein || 0} g
🧈 Lemak: ${data.Lemak || 0} g
🍚 Karbo: ${data.Karbohidrat || 0} g
🥦 Serat: ${data.Serat || 0} g`;
}

async function sendWhatsAppMessage(to: string, text: string) {
  const apiUrl = process.env.WHATSAPP_API_URL || 'https://api.fonnte.com/send';
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!apiKey) return;

  try {
    const formData = new FormData();
    formData.append('target', to);
    formData.append('message', text);
    formData.append('countryCode', '62');

    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': apiKey },
      body: formData,
    });
  } catch (err: unknown) {
    console.error('WhatsApp Send Error:', err instanceof Error ? err.message : 'Unknown error');
  }
}
