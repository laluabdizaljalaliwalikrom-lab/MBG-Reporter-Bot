import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini-server";
import {
  buildMenuSchema,
  MENU_VARIANT_KEYS,
  NUTRITION_SCHEMA,
  SUGGESTION_SCHEMA,
  VARIANT_ADAPT_SCHEMA,
  type MenuVariantKey,
} from "@/lib/gemini-schemas";

export const dynamic = "force-dynamic";

/** Label varian untuk ditampilkan ke model. */
const VARIANT_LABELS: Record<MenuVariantKey, string> = {
  porsi_besar: "Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru)",
  porsi_kecil: "Porsi Kecil (PAUD, TK, SD Kelas 1-3)",
  pmt_balita: "PMT Balita (6-59 bulan)",
  pmt_bumil: "PMT Bumil (Ibu Hamil)",
  pmt_busui: "PMT Busui (Ibu Menyusui)",
};

/** Normalisasi target varian menjadi daftar kunci yang sah. */
function resolveTargetKeys(targetVariant: unknown): MenuVariantKey[] {
  if (!targetVariant || targetVariant === "all") {
    return [...MENU_VARIANT_KEYS];
  }

  const requested = Array.isArray(targetVariant)
    ? targetVariant
    : [targetVariant];

  const keys = requested
    .map((value) => String(value).trim())
    .filter((value): value is MenuVariantKey =>
      (MENU_VARIANT_KEYS as readonly string[]).includes(value)
    );

  return keys.length > 0 ? Array.from(new Set(keys)) : ["porsi_besar"];
}

/** System instruction generate_menu — disusun dinamis sesuai varian target. */
function buildMenuSystemInstruction(targetKeys: MenuVariantKey[]): string {
  const keyList = targetKeys.map((key) => `"${key}"`).join(", ");
  const labelList = targetKeys
    .map((key) => `- ${key} (${VARIANT_LABELS[key]})`)
    .join("\n");

  return `Anda adalah Ahli Gizi Spesialis Program Makanan Bergizi Gratis (MBG) Badan Gizi Nasional (BGN) Republik Indonesia.
Tugas Anda adalah membuat rencana menu makanan bergizi seimbang lengkap dengan resep, takaran bahan per 1 porsi, langkah persiapan, langkah pengolahan, dan estimasi nilai gizi.

Standar Gizi BGN:
1. Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru): ~600-750 kkal, Protein 20-30g, Lemak 18-25g, Karbohidrat 85-110g, Serat 6-9g.
2. Porsi Kecil (PAUD, TK, SD Kelas 1-3): ~400-500 kkal, Protein 12-18g, Lemak 12-18g, Karbohidrat 55-75g, Serat 4-6g.
3. PMT Balita (6-59 bulan): ~250-350 kkal, Protein 8-15g, Lemak 8-14g, tekstur ramah balita / cincang / lembut, kaya zat besi & zinc.
4. PMT Bumil (Ibu Hamil): ~500-650 kkal, Protein 22-30g, kaya Asam Folat, Zat Besi, Kalsium.
5. PMT Busui (Ibu Menyusui): ~550-700 kkal, Protein 25-35g, kaya cairan, kalsium, daun katuk/kelor/sayuran hijau pendukung ASI.

Varian yang harus dibuat:
${labelList}

Kembalikan respon HANYA dalam JSON valid dengan struktur berikut (hanya kunci varian di atas):
{
  "nama_menu": "Nama menu utama, misal: Nasi Liwet Ayam Suwir Gurih Sayur Labu Siam & Tempe Bacem",
  "catatan": "Catatan gizi dan tips keamanan pangan bagi dapur SPPG",
  "menu": {
    ${targetKeys[0]}: {
      "nama_menu": "string",
      "komposisi": [
        { "nama_bahan": "Beras Putih", "jumlah_per_porsi": 100, "satuan": "gram" },
        { "nama_bahan": "Dada Ayam Fillet", "jumlah_per_porsi": 60, "satuan": "gram" }
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
    }
  }
}
Kunci varian yang wajib ada: ${keyList}.
Satuan yang umum: "gram", "ml", "butir", "buah", "batang", "siung", "sdm", "sdt", "potong".
Nilai gizi: energi dalam kkal, sedangkan protein, lemak, karbohidrat, dan serat dalam gram per 1 porsi.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, prompt, currentVariant, fullMenuData, targetVariant } = body;

    if (!action) {
      return NextResponse.json(
        { status: "error", message: "Action wajib disertakan." },
        { status: 400 }
      );
    }

    // ── ACTION 1: GENERATE FULL MENU / SINGLE VARIANT ────────────────────────
    if (action === "generate_menu") {
      const userPrompt = prompt || "Menu sehat bergizi seimbang";
      const targetKeys = resolveTargetKeys(targetVariant);
      const targetLabel =
        targetKeys.length === MENU_VARIANT_KEYS.length
          ? "Seluruh 5 varian (Porsi Besar, Porsi Kecil, PMT Balita, PMT Bumil, PMT Busui)"
          : targetKeys.map((key) => VARIANT_LABELS[key]).join(", ");

      const { text: aiText, model, modelVersion } = await callGemini({
        systemInstruction: buildMenuSystemInstruction(targetKeys),
        prompt: `Buatlah menu MBG berdasarkan permintaan berikut:
Permintaan/Tema: "${userPrompt}"
Target varian: ${targetLabel}`,
        schema: buildMenuSchema(targetKeys),
        thinkingLevel: "LOW",
      });

      const parsed = JSON.parse(aiText);
      return NextResponse.json({
        status: "success",
        data: parsed,
        model,
        modelVersion,
      });
    }

    // ── ACTION 2: ADAPT VARIANT ──────────────────────────────────────────────
    if (action === "adapt_variant") {
      const { sourceVariant, targetKey, targetLabel } = body;
      if (!sourceVariant || !targetKey) {
        return NextResponse.json(
          { status: "error", message: "sourceVariant dan targetKey wajib diisi." },
          { status: 400 }
        );
      }

      const systemInstruction = `Anda adalah Ahli Gizi Program MBG Badan Gizi Nasional.
Tugas Anda adalah mengadaptasi resep dan komposisi dari Porsi Besar ke varian target: ${
        targetLabel || targetKey
      }.

Panduan Adaptasi:
- porsi_kecil (PAUD-SD 3): kurangi gramatur bahan ~30-40%, bumbu tidak terlalu pedas/tajam, sesuaikan nilai gizi (energi ~450kkal, protein ~15g).
- pmt_balita: potong/cincang lebih lembut, hindari duri/tulang/bahan keras, sesuaikan takaran (energi ~300kkal, protein ~10g).
- pmt_bumil: perkuat sumber zat besi, asam folat, kalsium, porsi protein lebih tinggi (energi ~600kkal, protein ~25g).
- pmt_busui: dukung laktasi (misal tambahkan daun katuk/sayuran hijau/cairan lebih), protein tinggi (energi ~650kkal, protein ~28g).

Kembalikan HANYA JSON valid:
{
  "nama_menu": "string",
  "komposisi": [
    { "nama_bahan": "string", "jumlah_per_porsi": 0, "satuan": "gram" }
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

      const { text: aiText, model, modelVersion } = await callGemini({
        systemInstruction,
        prompt:
          `Adaptasikan menu berikut ini untuk varian ${
            targetLabel || targetKey
          }:\n` + JSON.stringify(sourceVariant),
        schema: VARIANT_ADAPT_SCHEMA,
        thinkingLevel: "LOW",
      });

      const parsed = JSON.parse(aiText);
      return NextResponse.json({
        status: "success",
        data: parsed,
        model,
        modelVersion,
      });
    }

    // ── ACTION 3: ESTIMATE NUTRITION ─────────────────────────────────────────
    if (action === "estimate_nutrition") {
      if (!currentVariant || !Array.isArray(currentVariant.komposisi)) {
        return NextResponse.json(
          { status: "error", message: "Komposisi varian wajib disertakan." },
          { status: 400 }
        );
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

      const { text: aiText, model, modelVersion } = await callGemini({
        systemInstruction,
        prompt:
          `Hitung estimasi nilai gizi per 1 porsi untuk komposisi bahan makanan berikut:\n` +
          JSON.stringify({
            nama_menu: currentVariant.nama_menu,
            komposisi: currentVariant.komposisi,
          }),
        schema: NUTRITION_SCHEMA,
        thinkingLevel: "LOW",
      });

      const parsed = JSON.parse(aiText);
      return NextResponse.json({
        status: "success",
        data: parsed,
        model,
        modelVersion,
      });
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

      const { text: aiText, model, modelVersion } = await callGemini({
        systemInstruction,
        prompt:
          `Evaluasi dan berikan telaah gizi untuk menu MBG berikut:\n` +
          JSON.stringify(fullMenuData || currentVariant),
        schema: SUGGESTION_SCHEMA,
        thinkingLevel: "MEDIUM",
      });

      const parsed = JSON.parse(aiText);
      return NextResponse.json({
        status: "success",
        data: parsed,
        model,
        modelVersion,
      });
    }

    return NextResponse.json(
      { status: "error", message: `Action '${action}' tidak dikenal.` },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan pada AI Assistant.";
    console.error("POST /api/ai/menu-generator error:", error);
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
