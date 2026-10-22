import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini-server";
import {
  buildMenuSchema,
  MENU_IDEAS_SCHEMA,
  MENU_VARIANT_KEYS,
  NUTRITION_SCHEMA,
  SUGGESTION_SCHEMA,
  VARIANT_ADAPT_SCHEMA,
  type MenuVariantKey,
} from "@/lib/gemini-schemas";
import {
  buildBlokAnggaran,
  buildBlokHargaAcuan,
  buildBlokKomponen,
  buildBlokPanganLokal,
  buildBlokStandarPorsi,
  STANDAR_PORSI,
} from "@/lib/mbg-standards";

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

/** System instruction generate_menu, disusun dinamis sesuai varian target. */
function buildMenuSystemInstruction(
  targetKeys: MenuVariantKey[],
  wilayah?: string | null
): string {
  const labelList = targetKeys
    .map((key) => `- ${key} (${VARIANT_LABELS[key]})`)
    .join("\n");

  return `Anda adalah Ahli Gizi Spesialis Program Makanan Bergizi Gratis (MBG) Badan Gizi Nasional (BGN) Republik Indonesia, sekaligus Ahli Dapur SPPG.
Tugas Anda membuat rencana menu MBG yang SESUAI STANDAR BGN: lengkap 5 komponen, gramasi
sesuai AKG, dan bahan baku tidak melebihi pagu anggaran per porsi.

${buildBlokKomponen()}

${buildBlokStandarPorsi(targetKeys)}

${buildBlokAnggaran(targetKeys)}

${buildBlokPanganLokal(wilayah)}

${buildBlokHargaAcuan()}

Varian yang harus dibuat:
${labelList}

Kaidah penyusunan:
- Pastikan kelima komponen terisi minimal 1 bahan pada setiap varian.
- WAJIB melakukan cek ulang (self-check) per varian sebelum mengembalikan JSON:
  a) hitung nilai gizi dari takaran bahan yang dipilih (TKPI per bahan),
  b) bandingkan satu per satu dengan TARGET di atas,
  c) bila ada nilai (energi/protein/lemak/karbohidrat/serat) di luar rentang TARGET, UBAH
     TAKARAN bahan (tambah/kurangi gram) lalu hitung ulang sampai semuanya masuk rentang.
  DILARANG hanya menulis angka gizi yang tidak sesuai dengan takaran bahan.
- Perhatikan khusus protein: takaran lauk hewani pada Porsi Kecil harus proporsional
  (umumnya 30-50 g daging/ikan/telur per porsi) agar protein tidak melewati batas atas.
- Pastikan "estimasi_biaya" tidak melebihi pagu anggaran varian.
- Untuk PMT Balita: tekstur lembut (cincang/dihaluskan), tanpa duri/tulang, kaya zat besi & zinc.
- Untuk PMT Bumil: perkuat sumber zat besi, asam folat, kalsium, dan daun hijau.
- Untuk PMT Busui: dukung laktasi (daun katuk/kelor/sayuran hijau), protein tinggi, cairan cukup.
- Rasa dan tampilan penting: variasi rasa, warna, dan tekstur agar appeal tinggi bagi anak.

Kembalikan HANYA JSON valid dengan struktur berikut (hanya kunci varian di atas):
{
  "nama_menu": "Nama menu utama, misal: Nasi Kuning Ayam Suwir Sayur Labu Siam dan Tempe Bacem",
  "catatan": "Catatan gizi dan tips keamanan pangan bagi dapur SPPG",
  "menu": {
    "${targetKeys[0]}": {
      "nama_menu": "string",
      "komposisi": [
        { "nama_bahan": "Beras Putih", "kategori": "karbohidrat", "jumlah_per_porsi": 100, "satuan": "gram" },
        { "nama_bahan": "Dada Ayam Fillet", "kategori": "protein_hewani", "jumlah_per_porsi": 60, "satuan": "gram" },
        { "nama_bahan": "Tempe", "kategori": "protein_nabati", "jumlah_per_porsi": 40, "satuan": "gram" },
        { "nama_bahan": "Bayam", "kategori": "sayur", "jumlah_per_porsi": 50, "satuan": "gram" },
        { "nama_bahan": "Pisang", "kategori": "buah", "jumlah_per_porsi": 80, "satuan": "gram" }
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
      },
      "estimasi_biaya": 8500
    }
  }
}
Kunci varian yang wajib ada: ${targetKeys.map((key) => `"${key}"`).join(", ")}.
Satuan yang umum: "gram", "ml", "butir", "buah", "batang", "siung", "sdm", "sdt", "potong".
Nilai gizi: energi dalam kkal, sedangkan protein, lemak, karbohidrat, dan serat dalam gram per 1 porsi.
"estimasi_biaya" dalam Rupiah untuk bahan baku per 1 porsi.`;
}

/** System instruction adapt_variant. */
function buildAdaptSystemInstruction(
  targetKey: string,
  wilayah?: string | null
): string {
  const std = STANDAR_PORSI[targetKey as keyof typeof STANDAR_PORSI];
  const target = std
    ? `Target varian ${std.label}\n${buildBlokStandarPorsi([targetKey])}`
    : `Target varian ${targetKey}`;

  return `Anda adalah Ahli Gizi Program MBG Badan Gizi Nasional.
Tugas Anda mengadaptasi resep dan komposisi dari Porsi Besar ke varian target.

${target}

${buildBlokAnggaran([targetKey])}

${buildBlokKomponen()}

${buildBlokPanganLokal(wilayah)}

Panduan adaptasi:
- Porsi Kecil (PAUD/TK/SD 1-3): kurangi gramatur bahan, bumbu tidak terlalu pedas/tajam,
  tekstur lebih lembut dan mudah dikunyah anak.
- PMT Balita: potong/cincang lebih lembut, hindari duri/tulang/bahan keras, tanpa garam berlebih.
- PMT Bumil: perkuat sumber zat besi, asam folat, kalsium, dan protein.
- PMT Busui: dukung laktasi (daun katuk/sayuran hijau), protein tinggi.
- WAJIB pertahankan kelima komponen wajib dan hitung ulang "estimasi_biaya" sesuai pagu.
- WAJIB cek ulang nilai gizi hasil adaptasi terhadap TARGET di atas; bila ada nilai di luar
  rentang, ubah TAKARAN bahan (khususnya takaran lauk hewani untuk protein) lalu hitung ulang.
  DILARANG menulis angka gizi yang tidak sesuai dengan takaran bahan.

Kembalikan HANYA JSON valid:
{
  "nama_menu": "string",
  "komposisi": [
    { "nama_bahan": "string", "kategori": "karbohidrat", "jumlah_per_porsi": 0, "satuan": "gram" }
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
  },
  "estimasi_biaya": 0
}`;
}

/** System instruction estimate_nutrition. */
function buildEstimateSystemInstruction(variantKey: string): string {
  const std = STANDAR_PORSI[variantKey as keyof typeof STANDAR_PORSI];
  const blokStandar = std ? buildBlokStandarPorsi([variantKey]) : "";

  return `Anda adalah Ahli Gizi BGN. Hitung estimasi nilai gizi per 1 porsi berdasarkan daftar
komposisi bahan yang diberikan, memakai Tabel Komposisi Pangan Indonesia (TKPI).

${blokStandar}

${buildBlokAnggaran([variantKey])}

Tugas Anda:
1. Hitung energi (kkal), protein, lemak, karbohidrat, dan serat per 1 porsi.
2. Tentukan komponen wajib BGN yang sudah ada pada komposisi (nilai "kategori" atau deteksi
   dari nama bahan bila kategori kosong).
3. Hitung estimasi biaya bahan baku per 1 porsi dalam Rupiah memakai acuan harga pasar lokal.
4. Jelaskan singkat apakah sudah memenuhi standar porsi kelompok sasaran.

Kembalikan HANYA JSON valid:
{
  "nilai_gizi": {
    "energi": 0,
    "protein": 0,
    "lemak": 0,
    "karbohidrat": 0,
    "serat": 0
  },
  "analisis_singkat": "Penjelasan singkat apakah sudah memenuhi standar porsi/kelompok sasaran",
  "komponen_terpenuhi": ["karbohidrat", "protein_hewani", "protein_nabati", "sayur", "buah"],
  "estimasi_biaya": 0
}`;
}

/** System instruction give_suggestions (telaah + cek kepatuhan). */
function buildSuggestionsSystemInstruction(variantKeys: string[]): string {
  return `Anda adalah Auditor dan Konsultan Ahli Gizi Utama dari Badan Gizi Nasional (BGN).
Analisis rencana menu MBG yang diberikan. Berikan telaah terstruktur:

1. Kelebihan menu (keseimbangan makronutrien, daya tarik bagi anak sekolah/penerima manfaat).
2. Potensi kekurangan atau gap gizi (misal kurang serat, kelebihan natrium/minyak, kurang mikronutrien).
3. Rekomendasi perbaikan bahan dan teknik masak untuk SPPG.
4. Tips higienitas dan keamanan pangan (Food Safety dan Sanitasi).
5. Cek kepatuhan per varian terhadap standar BGN:
   - Kelengkapan 5 komponen wajib (karbohidrat, protein hewani, protein nabati, sayur, buah).
   - Energi dan protein dalam rentang standar porsi.
   - Estimasi biaya bahan baku per porsi dibanding pagu anggaran.

${buildBlokStandarPorsi(variantKeys)}

${buildBlokAnggaran(variantKeys)}

${buildBlokKomponen()}

Kembalikan HANYA JSON valid:
{
  "skor_kebugaran_gizi": 85,
  "status_evaluasi": "SANGAT BAIK",
  "ringkasan": "string ringkasan 2 kalimat",
  "kelebihan": ["poin 1", "poin 2"],
  "kekurangan": ["poin 1", "poin 2"],
  "saran_ahli_gizi": ["saran 1", "saran 2", "saran 3"],
  "tips_keamanan_pangan": ["tips 1", "tips 2"],
  "cek_kepatuhan": [
    {
      "varian": "porsi_besar",
      "komponen_lengkap": true,
      "komponen_kurang": [],
      "status_energi": "SESUAI",
      "status_protein": "SESUAI",
      "status_anggaran": "SESUAI",
      "estimasi_biaya": 8500,
      "catatan": "Catatan singkat hasil pengecekan"
    }
  ]
}`;
}

/** System instruction suggest_menu_ideas (Inspirasi Cepat dari AI). */
function buildIdeasSystemInstruction(
  targetKey: string,
  wilayah?: string | null
): string {
  const std = STANDAR_PORSI[targetKey as keyof typeof STANDAR_PORSI];
  const blokStandar = std ? buildBlokStandarPorsi([targetKey]) : "";

  return `Anda adalah Ahli Gizi dan Creative Menu Planner Program MBG Badan Gizi Nasional.
Tugas Anda memberi ide menu singkat yang SIAP DIPAKAI oleh dapur SPPG.

${blokStandar}

${buildBlokAnggaran([targetKey])}

${buildBlokKomponen()}

${buildBlokPanganLokal(wilayah)}

${buildBlokHargaAcuan()}

Kaidah ide menu:
- Setiap ide WAJIB memuat kelima komponen wajib (sebutkan bahan pembentuk tiap komponen).
- Bahan harus mudah didapat di wilayah kerja SPPG, mengutamakan pangan lokal dan musiman.
- Estimasi biaya bahan baku per porsi TIDAK boleh melebihi pagu.
- Nama menu harus singkat, menarik, dan mudah diingat anak.
- Berikan 6 ide dengan variasi metode masak (bakar, rebus, tumis, sup, goreng, kue/roti).

Kembalikan HANYA JSON valid:
{
  "ide": [
    {
      "judul": "Nasi Kuning Telur Balado plus Tempe Orek",
      "prompt": "Satu kalimat prompt lengkap yang menjelaskan seluruh komponen, bahan lokal, dan kisaran harga",
      "komponen": {
        "karbohidrat": "Nasi Kuning (beras)",
        "protein_hewani": "Telur balado",
        "protein_nabati": "Tempe orek",
        "sayur": "Sayur asem",
        "buah": "Semangka"
      },
      "estimasi_biaya": 7200,
      "alasan": "Alasan singkat kenapa menu ini sesuai standar BGN dan hemat"
    }
  ]
}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, prompt, currentVariant, fullMenuData, targetVariant, wilayah } = body;

    if (!action) {
      return NextResponse.json(
        { status: "error", message: "Action wajib disertakan." },
        { status: 400 }
      );
    }

    // ACTION 1: GENERATE FULL MENU / SINGLE VARIANT
    if (action === "generate_menu") {
      const userPrompt = prompt || "Menu sehat bergizi seimbang";
      const targetKeys = resolveTargetKeys(targetVariant);
      const targetLabel =
        targetKeys.length === MENU_VARIANT_KEYS.length
          ? "Seluruh 5 varian (Porsi Besar, Porsi Kecil, PMT Balita, PMT Bumil, PMT Busui)"
          : targetKeys.map((key) => VARIANT_LABELS[key]).join(", ");

      const { text: aiText, model, modelVersion } = await callGemini({
        systemInstruction: buildMenuSystemInstruction(targetKeys, wilayah),
        prompt: `Buatlah menu MBG sesuai standar BGN berdasarkan permintaan berikut:
Permintaan/Tema: "${userPrompt}"
Target varian: ${targetLabel}
${wilayah ? `Wilayah kerja SPPG: ${wilayah}` : ""}
Ingat: 5 komponen wajib, gramasi sesuai AKG, dan biaya bahan baku di bawah pagu anggaran.`,
        schema: buildMenuSchema(targetKeys),
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

    // ACTION 2: ADAPT VARIANT
    if (action === "adapt_variant") {
      const { sourceVariant, targetKey, targetLabel } = body;
      if (!sourceVariant || !targetKey) {
        return NextResponse.json(
          { status: "error", message: "sourceVariant dan targetKey wajib diisi." },
          { status: 400 }
        );
      }

      const { text: aiText, model, modelVersion } = await callGemini({
        systemInstruction: buildAdaptSystemInstruction(targetKey, wilayah),
        prompt:
          `Adaptasikan menu berikut ini untuk varian ${
            targetLabel || targetKey
          }:\n` + JSON.stringify(sourceVariant),
        schema: VARIANT_ADAPT_SCHEMA,
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

    // ACTION 3: ESTIMATE NUTRITION
    if (action === "estimate_nutrition") {
      if (!currentVariant || !Array.isArray(currentVariant.komposisi)) {
        return NextResponse.json(
          { status: "error", message: "Komposisi varian wajib disertakan." },
          { status: 400 }
        );
      }

      const variantKey = String(body.variantKey || "porsi_besar");

      const { text: aiText, model, modelVersion } = await callGemini({
        systemInstruction: buildEstimateSystemInstruction(variantKey),
        prompt:
          "Hitung estimasi nilai gizi per 1 porsi untuk komposisi bahan makanan berikut:\n" +
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

    // ACTION 4: GIVE SUGGESTIONS / AUDIT
    if (action === "give_suggestions") {
      const auditKeys = resolveTargetKeys(targetVariant);

      const { text: aiText, model, modelVersion } = await callGemini({
        systemInstruction: buildSuggestionsSystemInstruction(auditKeys),
        prompt:
          "Evaluasi dan berikan telaah gizi untuk menu MBG berikut:\n" +
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

    // ACTION 5: SUGGEST MENU IDEAS (Inspirasi Cepat dari AI)
    if (action === "suggest_menu_ideas") {
      const ideaKeys = resolveTargetKeys(targetVariant);
      const primaryKey = ideaKeys[0];

      const { text: aiText, model, modelVersion } = await callGemini({
        systemInstruction: buildIdeasSystemInstruction(primaryKey, wilayah),
        prompt: `Berikan ide menu MBG untuk varian ${VARIANT_LABELS[primaryKey]}${
          wilayah ? ` di wilayah ${wilayah}` : ""
        }. Setiap ide harus memuat 5 komponen wajib dan biaya bahan baku di bawah pagu anggaran.`,
        schema: MENU_IDEAS_SCHEMA,
        thinkingLevel: "LOW",
        temperature: 0.85,
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
