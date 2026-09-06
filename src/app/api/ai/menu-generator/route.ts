import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Helper to retrieve Gemini API Key from database settings or fallback to process.env
async function getGeminiApiKey(): Promise<string> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "gemini_api_key")
      .maybeSingle();

    if (data?.value && data.value.trim()) {
      return data.value.trim();
    }
  } catch (err) {
    console.warn("Gagal membaca gemini_api_key dari system_settings:", err);
  }

  return (process.env.GEMINI_API_KEY || "").trim();
}

// Helper to call Gemini REST API
async function callGemini(systemInstruction: string, prompt: string): Promise<string> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API Key belum diisi. Silakan masukkan di menu Pengaturan Dashboard atau tambahkan di .env.local.");
  }

  // Urutan model: prioritaskan model yang paling stabil dan responsif (bebas lonjakan 503)
  const models = [
    "gemini-2.5-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-flash-latest",
  ];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Gemini model ${model} failed (${response.status}):`, errorText);
        lastError = new Error(`Gemini API error (${response.status}): ${errorText}`);
        continue;
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Gemini model ${model} error:`, err);
    }
  }

  throw lastError || new Error("Semua model Gemini gagal merespons.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, prompt, currentVariant, fullMenuData, targetVariant } = body;

    if (!action) {
      return NextResponse.json({ status: "error", message: "Action wajib disertakan." }, { status: 400 });
    }

    // ── ACTION 1: GENERATE FULL MENU / SINGLE VARIANT ────────────────────────
    if (action === "generate_menu") {
      const userPrompt = prompt || "Menu sehat bergizi seimbang";
      const target = targetVariant || "all"; // 'all' or 'porsi_besar', 'porsi_kecil', etc.

      const systemInstruction = `Anda adalah Ahli Gizi Spesialis Program Makanan Bergizi Gratis (MBG) Badan Gizi Nasional (BGN) Republik Indonesia.
Tugas Anda adalah membuat rencana menu makanan bergizi seimbang lengkap dengan resep, takaran bahan per 1 porsi, langkah persiapan, langkah pengolahan, dan estimasi nilai gizi.

Standar Gizi BGN:
1. Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru): ~600-750 kkal, Protein 20-30g, Lemak 18-25g, Karbohidrat 85-110g, Serat 6-9g.
2. Porsi Kecil (PAUD, TK, SD Kelas 1-3): ~400-500 kkal, Protein 12-18g, Lemak 12-18g, Karbohidrat 55-75g, Serat 4-6g.
3. PMT Balita (6-59 bulan): ~250-350 kkal, Protein 8-15g, Lemak 8-14g, tekstur ramah balita / cincang / lembut, kaya zat besi & zinc.
4. PMT Bumil (Ibu Hamil): ~500-650 kkal, Protein 22-30g, kaya Asam Folat, Zat Besi, Kalsium.
5. PMT Busui (Ibu Menyusui): ~550-700 kkal, Protein 25-35g, kaya cairan, kalsium, daun katuk/kelor/sayuran hijau pendukung ASI.

Kembalikan respon HANYA dalam JSON valid dengan struktur:
{
  "nama_menu": "Nama menu utama, misal: Nasi Liwet Ayam Suwir Gurih Sayur Labu Siam & Tempe Bacem",
  "catatan": "Catatan gizi dan tips keamanan pangan bagi dapur SPPG",
  "menu": {
    "porsi_besar": {
      "nama_menu": "string",
      "komposisi": [
        { "nama_bahan": "Beras Putih", "jumlah_per_porsi": 100, "satuan": "gram", "kategori": "karbohidrat" },
        { "nama_bahan": "Dada Ayam Fillet", "jumlah_per_porsi": 60, "satuan": "gram", "kategori": "protein_hewani" }
      ],
      "resep": "Deskripsi singkat resep dan bumbu utama",
      "langkah_persiapan": ["Langkah 1", "Langkah 2"],
      "langkah_pengolahan": ["Langkah 1", "Langkah 2"],
      "nilai_gizi": {
        "energi": 680,
        "protein": 26,
        "lemak": 20,
        "karbohidrat": 95,
        "serat": 7
      }
    },
    "porsi_kecil": {
      "nama_menu": "string",
      "komposisi": [
        { "nama_bahan": "Beras Putih", "jumlah_per_porsi": 70, "satuan": "gram", "kategori": "karbohidrat" },
        { "nama_bahan": "Dada Ayam Fillet", "jumlah_per_porsi": 40, "satuan": "gram", "kategori": "protein_hewani" }
      ],
      "resep": "string",
      "langkah_persiapan": ["string"],
      "langkah_pengolahan": ["string"],
      "nilai_gizi": {
        "energi": 450,
        "protein": 16,
        "lemak": 14,
        "karbohidrat": 65,
        "serat": 5
      }
    },
    "pmt_balita": {
      "nama_menu": "string",
      "komposisi": [
        { "nama_bahan": "Beras Lembek / Nasi Tim", "jumlah_per_porsi": 50, "satuan": "gram", "kategori": "karbohidrat" },
        { "nama_bahan": "Dada Ayam Cincang", "jumlah_per_porsi": 30, "satuan": "gram", "kategori": "protein_hewani" }
      ],
      "resep": "string",
      "langkah_persiapan": ["string"],
      "langkah_pengolahan": ["string"],
      "nilai_gizi": {
        "energi": 300,
        "protein": 11,
        "lemak": 10,
        "karbohidrat": 40,
        "serat": 4
      }
    },
    "pmt_bumil": {
      "nama_menu": "string",
      "komposisi": [
        { "nama_bahan": "Beras Putih", "jumlah_per_porsi": 90, "satuan": "gram", "kategori": "karbohidrat" },
        { "nama_bahan": "Dada Ayam Fillet", "jumlah_per_porsi": 70, "satuan": "gram", "kategori": "protein_hewani" }
      ],
      "resep": "string",
      "langkah_persiapan": ["string"],
      "langkah_pengolahan": ["string"],
      "nilai_gizi": {
        "energi": 620,
        "protein": 27,
        "lemak": 19,
        "karbohidrat": 85,
        "serat": 8
      }
    },
    "pmt_busui": {
      "nama_menu": "string",
      "komposisi": [
        { "nama_bahan": "Beras Putih", "jumlah_per_porsi": 100, "satuan": "gram", "kategori": "karbohidrat" },
        { "nama_bahan": "Dada Ayam Fillet", "jumlah_per_porsi": 75, "satuan": "gram", "kategori": "protein_hewani" }
      ],
      "resep": "string",
      "langkah_persiapan": ["string"],
      "langkah_pengolahan": ["string"],
      "nilai_gizi": {
        "energi": 660,
        "protein": 29,
        "lemak": 21,
        "karbohidrat": 90,
        "serat": 8
      }
    }
  }
}
Kategori komposisi yang diizinkan: "karbohidrat", "protein_hewani", "protein_nabati", "sayuran", "buah", "bumbu", "lainnya".
Satuan yang umum: "gram", "ml", "butir", "buah", "batang", "siung", "sdm", "sdt", "potong".`;

      const aiText = await callGemini(
        systemInstruction,
        `Buatlah menu MBG berdasarkan permintaan berikut:
Permintaan/Tema: "${userPrompt}"
Target varian: ${target === "all" ? "Seluruh 5 varian (Porsi Besar, Porsi Kecil, PMT Balita, PMT Bumil, PMT Busui)" : target}`
      );

      const parsed = JSON.parse(aiText);
      return NextResponse.json({ status: "success", data: parsed });
    }

    // ── ACTION 2: ADAPT VARIANT ──────────────────────────────────────────────
    if (action === "adapt_variant") {
      const { sourceVariant, targetKey, targetLabel } = body;
      if (!sourceVariant || !targetKey) {
        return NextResponse.json({ status: "error", message: "sourceVariant dan targetKey wajib diisi." }, { status: 400 });
      }

      const systemInstruction = `Anda adalah Ahli Gizi Program MBG Badan Gizi Nasional.
Tugas Anda adalah mengadaptasi resep dan komposisi dari Porsi Besar ke varian target: ${targetLabel || targetKey}.

Panduan Adaptasi:
- porsi_kecil (PAUD-SD 3): kurangi gramatur bahan ~30-40%, bumbu tidak terlalu pedas/tajam, sesuaikan nilai gizi (energi ~450kkal, protein ~15g).
- pmt_balita: potong/cincang lebih lembut, hindari duri/tulang/bahan keras, sesuaikan takaran (energi ~300kkal, protein ~10g).
- pmt_bumil: perkuat sumber zat besi, asam folat, kalsium, porsi protein lebih tinggi (energi ~600kkal, protein ~25g).
- pmt_busui: dukung laktasi (misal tambahkan daun katuk/sayuran hijau/cairan lebih), protein tinggi (energi ~650kkal, protein ~28g).

Kembalikan HANYA JSON valid:
{
  "nama_menu": "string",
  "komposisi": [
    { "nama_bahan": "string", "jumlah_per_porsi": 0, "satuan": "gram", "kategori": "string" }
  ],
  "resep": "string",
  "langkah_persiapan": ["string"],
  "langkah_pengolahan": ["string"],
  "nilai_gizi": {
    "energi": 0,
    "protein": 0,
    "lemak": 0,
    "karbohidrat": 0,
    "serat": 0
  }
}`;

      const aiText = await callGemini(
        systemInstruction,
        `Adaptasikan menu berikut ini untuk varian ${targetLabel || targetKey}:\n` + JSON.stringify(sourceVariant)
      );

      const parsed = JSON.parse(aiText);
      return NextResponse.json({ status: "success", data: parsed });
    }

    // ── ACTION 3: ESTIMATE NUTRITION ─────────────────────────────────────────
    if (action === "estimate_nutrition") {
      if (!currentVariant || !Array.isArray(currentVariant.komposisi)) {
        return NextResponse.json({ status: "error", message: "Komposisi varian wajib disertakan." }, { status: 400 });
      }

      const systemInstruction = `Anda adalah Ahli Gizi BGN. Hitung estimasi nilai gizi (energi dalam kkal, protein dalam gram, lemak dalam gram, karbohidrat dalam gram, serat dalam gram) per 1 porsi berdasarkan daftar komposisi bahan yang diberikan menggunakan data Tabel Komposisi Pangan Indonesia (TKPI).

Kembalikan HANYA JSON valid:
{
  "nilai_gizi": {
    "energi": 0,
    "protein": 0,
    "lemak": 0,
    "karbohidrat": 0,
    "serat": 0
  },
  "analisis_singkat": "Penjelasan singkat apakah sudah memenuhi standar porsi/kelompok sasaran."
}`;

      const aiText = await callGemini(
        systemInstruction,
        `Hitung estimasi nilai gizi per 1 porsi untuk komposisi bahan makanan berikut:\n` +
          JSON.stringify({
            nama_menu: currentVariant.nama_menu,
            komposisi: currentVariant.komposisi,
          })
      );

      const parsed = JSON.parse(aiText);
      return NextResponse.json({ status: "success", data: parsed });
    }

    // ── ACTION 4: GIVE SUGGESTIONS / AUDIT ────────────────────────────────────
    if (action === "give_suggestions") {
      const systemInstruction = `Anda adalah Auditor & Konsultan Ahli Gizi Utama dari Badan Gizi Nasional (BGN).
Analisis rencana menu MBG yang diberikan. Berikan evaluasi terstruktur:
1. Kelebihan menu (keseimbangan makronutrien, daya tarik bagi anak sekolah/penerima manfaat).
2. Potensi kekurangan / gap gizi (misal kurang serat, kelebihan natrium/minyak, kurang mikronutrien penting).
3. Rekomendasi perbaikan bahan & teknik masak untuk SPPG.
4. Tips higienitas dan keamanan pangan (Food Safety & Sanitasi).

Kembalikan HANYA JSON valid:
{
  "skor_kebugaran_gizi": 85,
  "status_evaluasi": "SANGAT BAIK",
  "ringkasan": "string ringkasan 2 kalimat",
  "kelebihan": ["poin 1", "poin 2"],
  "kekurangan": ["poin 1", "poin 2"],
  "saran_ahli_gizi": ["saran 1", "saran 2", "saran 3"],
  "tips_keamanan_pangan": ["tips 1", "tips 2"]
}`;

      const aiText = await callGemini(
        systemInstruction,
        `Evaluasi dan berikan telaah gizi untuk menu MBG berikut:\n` + JSON.stringify(fullMenuData || currentVariant)
      );

      const parsed = JSON.parse(aiText);
      return NextResponse.json({ status: "success", data: parsed });
    }

    return NextResponse.json({ status: "error", message: `Action '${action}' tidak dikenal.` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan pada AI Assistant.";
    console.error("POST /api/ai/menu-generator error:", error);
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
