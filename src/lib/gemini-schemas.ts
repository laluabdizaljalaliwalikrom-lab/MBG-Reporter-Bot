// ─── JSON Schema ketat untuk respons Gemini (MBG Maker) ─────────────────────
//
// Schema ini dikirim ke API sebagai `generationConfig.responseJsonSchema`
// sehingga model WAJIB menghasilkan JSON yang valid & sesuai bentuk di bawah.
// Bentuknya harus selalu sinkron dengan:
//   1. system instruction di src/app/api/ai/menu-generator/route.ts
//   2. parser di src/components/MBGMaker.tsx
//
// Catatan: Gemini hanya mendukung subset JSON Schema — yang dipakai di sini
// hanya `type`, `properties`, `required`, `items`, `enum`, dan `description`.

/**
 * Kategori komponen menu wajib BGN. WAJIB ada di setiap bahan supaya
 * kelengkapan 5 komponen bisa divalidasi secara deterministik.
 */
export const KATEGORI_KOMPONEN = [
  "karbohidrat",
  "protein_hewani",
  "protein_nabati",
  "sayur",
  "buah",
] as const;

export interface JsonSchema {
  type: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: string[];
}

const INGREDIENT_SCHEMA: JsonSchema = {
  type: "object",
  description: "Satu bahan dengan takaran per 1 porsi",
  properties: {
    nama_bahan: { type: "string", description: "Nama bahan" },
    kategori: {
      type: "string",
      enum: [...KATEGORI_KOMPONEN],
      description:
        "Komponen menu wajib BGN: karbohidrat, protein_hewani, protein_nabati, sayur, atau buah",
    },
    jumlah_per_porsi: { type: "number", description: "Jumlah per 1 porsi (angka)" },
    satuan: {
      type: "string",
      enum: ["gram", "ml", "butir", "buah", "batang", "siung", "sdm", "sdt", "potong"],
    },
  },
  required: ["nama_bahan", "kategori", "jumlah_per_porsi", "satuan"],
};

const NILAI_GIZI_SCHEMA: JsonSchema = {
  type: "object",
  description: "Nilai gizi per 1 porsi (energi kkal, lainnya gram)",
  properties: {
    energi: { type: "number" },
    protein: { type: "number" },
    lemak: { type: "number" },
    karbohidrat: { type: "number" },
    serat: { type: "number" },
  },
  required: ["energi", "protein", "lemak", "karbohidrat", "serat"],
};

const VARIANT_SCHEMA: JsonSchema = {
  type: "object",
  description: "Satu varian menu (porsi/kelompok sasaran)",
  properties: {
    nama_menu: { type: "string" },
    komposisi: { type: "array", items: INGREDIENT_SCHEMA },
    resep: { type: "string", description: "Deskripsi singkat resep dan bumbu utama" },
    langkah_persiapan: { type: "array", items: { type: "string" } },
    langkah_pengolahan: { type: "array", items: { type: "string" } },
    nilai_gizi: NILAI_GIZI_SCHEMA,
    estimasi_biaya: {
      type: "number",
      description:
        "Estimasi biaya bahan baku per 1 porsi dalam Rupiah, wajib di bawah pagu anggaran BGN",
    },
  },
  required: [
    "nama_menu",
    "komposisi",
    "resep",
    "langkah_persiapan",
    "langkah_pengolahan",
    "nilai_gizi",
    "estimasi_biaya",
  ],
};

/** Kunci varian yang sah pada objek `menu`. */
export const MENU_VARIANT_KEYS = [
  "porsi_besar",
  "porsi_kecil",
  "pmt_balita",
  "pmt_bumil",
  "pmt_busui",
] as const;

export type MenuVariantKey = (typeof MENU_VARIANT_KEYS)[number];

const VARIANT_LABELS: Record<MenuVariantKey, string> = {
  porsi_besar: "Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru)",
  porsi_kecil: "Porsi Kecil (PAUD, TK, SD Kelas 1-3)",
  pmt_balita: "PMT Balita (6-59 bulan)",
  pmt_bumil: "PMT Bumil (Ibu Hamil)",
  pmt_busui: "PMT Busui (Ibu Menyusui)",
};

/**
 * Schema untuk action `generate_menu`.
 * Kalau hanya satu varian yang ditargetkan, schema dibuat ramping supaya
 * respons tidak wasting token (hanya 1 varian yang dikembalikan).
 */
export function buildMenuSchema(targetKeys: string[]): JsonSchema {
  const keys = targetKeys.filter((k): k is MenuVariantKey =>
    (MENU_VARIANT_KEYS as readonly string[]).includes(k)
  );
  const effective = keys.length > 0 ? keys : (["porsi_besar"] as MenuVariantKey[]);

  const menuProperties: Record<string, JsonSchema> = {};
  for (const key of effective) {
    menuProperties[key] = {
      ...VARIANT_SCHEMA,
      description: VARIANT_LABELS[key],
    };
  }

  return {
    type: "object",
    properties: {
      nama_menu: { type: "string", description: "Nama menu utama" },
      catatan: {
        type: "string",
        description: "Catatan gizi dan tips keamanan pangan bagi dapur SPPG",
      },
      menu: {
        type: "object",
        description: "Varian menu yang diminta",
        properties: menuProperties,
        required: effective,
      },
    },
    required: ["nama_menu", "catatan", "menu"],
  };
}

/** Schema untuk action `adapt_variant`. */
export const VARIANT_ADAPT_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    nama_menu: { type: "string" },
    komposisi: { type: "array", items: INGREDIENT_SCHEMA },
    resep: { type: "string" },
    langkah_persiapan: { type: "array", items: { type: "string" } },
    langkah_pengolahan: { type: "array", items: { type: "string" } },
    nilai_gizi: NILAI_GIZI_SCHEMA,
    estimasi_biaya: {
      type: "number",
      description: "Estimasi biaya bahan baku per 1 porsi dalam Rupiah",
    },
  },
  required: [
    "nama_menu",
    "komposisi",
    "resep",
    "langkah_persiapan",
    "langkah_pengolahan",
    "nilai_gizi",
    "estimasi_biaya",
  ],
};

/** Schema untuk action `estimate_nutrition`. */
export const NUTRITION_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    nilai_gizi: NILAI_GIZI_SCHEMA,
    analisis_singkat: {
      type: "string",
      description: "Penjelasan singkat apakah sudah memenuhi standar porsi/kelompok sasaran",
    },
    komponen_terpenuhi: {
      type: "array",
      items: { type: "string", enum: [...KATEGORI_KOMPONEN] },
      description: "Komponen menu wajib BGN yang sudah ada dalam komposisi",
    },
    estimasi_biaya: {
      type: "number",
      description: "Estimasi biaya bahan baku per 1 porsi dalam Rupiah",
    },
  },
  required: ["nilai_gizi", "analisis_singkat", "komponen_terpenuhi", "estimasi_biaya"],
};

/**
 * Schema untuk action `suggest_menu_ideas` (Inspirasi Cepat dari AI).
 * Menghasilkan ide menu siap pakai yang sudah memenuhi 5 komponen wajib,
 * sesuai anggaran, dan mengutamakan pangan lokal.
 */
export const MENU_IDEAS_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    ide: {
      type: "array",
      items: {
        type: "object",
        properties: {
          judul: {
            type: "string",
            description: "Nama menu ringkas, contoh: Nasi Kuning Telur Balado + Tempe Orek",
          },
          prompt: {
            type: "string",
            description:
              "Satu kalimat prompt siap tempel yang menjelaskan seluruh komponen menu, bahan lokal, dan Kisaran harga",
          },
          komponen: {
            type: "object",
            description: "Bahan pembentuk tiap komponen wajib",
            properties: {
              karbohidrat: { type: "string" },
              protein_hewani: { type: "string" },
              protein_nabati: { type: "string" },
              sayur: { type: "string" },
              buah: { type: "string" },
            },
            required: [
              "karbohidrat",
              "protein_hewani",
              "protein_nabati",
              "sayur",
              "buah",
            ],
          },
          estimasi_biaya: {
            type: "number",
            description: "Perkiraan biaya bahan baku per porsi dalam Rupiah",
          },
          alasan: {
            type: "string",
            description: "Alasan singkat kenapa menu ini sesuai standar BGN dan bahan lokal",
          },
        },
        required: ["judul", "prompt", "komponen", "estimasi_biaya", "alasan"],
      },
    },
  },
  required: ["ide"],
};

/** Schema untuk action `give_suggestions`. */
export const SUGGESTION_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    skor_kebugaran_gizi: { type: "number", description: "Skor 0-100" },
    status_evaluasi: { type: "string", description: "Contoh: SANGAT BAIK" },
    ringkasan: { type: "string", description: "Ringkasan 2 kalimat" },
    kelebihan: { type: "array", items: { type: "string" } },
    kekurangan: { type: "array", items: { type: "string" } },
    saran_ahli_gizi: { type: "array", items: { type: "string" } },
    tips_keamanan_pangan: { type: "array", items: { type: "string" } },
    cek_kepatuhan: {
      type: "array",
      description: "Hasil cek kepatuhan per varian menu terhadap standar BGN",
      items: {
        type: "object",
        properties: {
          varian: { type: "string", description: "Kunci varian, contoh: porsi_besar" },
          komponen_lengkap: {
            type: "boolean",
            description: "True bila kelima komponen wajib sudah ada",
          },
          komponen_kurang: {
            type: "array",
            items: { type: "string" },
            description: "Komponen wajib yang belum ada",
          },
          status_energi: {
            type: "string",
            description: "SESUAI / DI BAWAH STANDAR / DI ATAS STANDAR",
          },
          status_protein: {
            type: "string",
            description: "SESUAI / DI BAWAH STANDAR / DI ATAS STANDAR",
          },
          status_anggaran: {
            type: "string",
            description: "SESUAI / MELEBIHI PAGU",
          },
          estimasi_biaya: {
            type: "number",
            description: "Estimasi biaya bahan baku per porsi dalam Rupiah",
          },
          catatan: { type: "string", description: "Catatan singkat hasil pengecekan" },
        },
        required: [
          "varian",
          "komponen_lengkap",
          "komponen_kurang",
          "status_energi",
          "status_protein",
          "status_anggaran",
          "estimasi_biaya",
          "catatan",
        ],
      },
    },
  },
  required: [
    "skor_kebugaran_gizi",
    "status_evaluasi",
    "ringkasan",
    "kelebihan",
    "kekurangan",
    "saran_ahli_gizi",
    "tips_keamanan_pangan",
    "cek_kepatuhan",
  ],
};
