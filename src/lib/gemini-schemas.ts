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
    jumlah_per_porsi: { type: "number", description: "Jumlah per 1 porsi (angka)" },
    satuan: {
      type: "string",
      enum: ["gram", "ml", "butir", "buah", "batang", "siung", "sdm", "sdt", "potong"],
    },
  },
  required: ["nama_bahan", "jumlah_per_porsi", "satuan"],
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
  },
  required: [
    "nama_menu",
    "komposisi",
    "resep",
    "langkah_persiapan",
    "langkah_pengolahan",
    "nilai_gizi",
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
  },
  required: [
    "nama_menu",
    "komposisi",
    "resep",
    "langkah_persiapan",
    "langkah_pengolahan",
    "nilai_gizi",
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
  },
  required: ["nilai_gizi", "analisis_singkat"],
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
  },
  required: [
    "skor_kebugaran_gizi",
    "status_evaluasi",
    "ringkasan",
    "kelebihan",
    "kekurangan",
    "saran_ahli_gizi",
    "tips_keamanan_pangan",
  ],
};
