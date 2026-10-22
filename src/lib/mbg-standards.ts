// ─── Standar Menu MBG — Badan Gizi Nasional (BGN) TA 2026 ──────────────────
//
// Single source of truth untuk seluruh aturan Mushroom MBG Maker:
//   1. Komponen menu wajib (5 komponen)
//   2. Anggaran bahan baku per porsi (Juknis Tata Kelola MBG TA 2026)
//   3. Standar porsi: target energi/protein/lemak/karbohidrat/serat + % AKG
//   4. Tabel harga acuan bahan pangan lokal Indonesia (untuk estimasi biaya)
//
// Referensi:
//   • SK Kepala BGN No. 401.1 Tahun 2025 — Juknis Tata Kelola MBG TA 2026
//   • Siaran Pers BGN SIPERS-98/BGN/02/2026 (24 Feb 2026) — anggaran
//     bahan baku Rp8.000–Rp10.000 per porsi (bukan Rp15.000)
//   • Pedoman Standar Gizi MBG (BGN, Desember 2024) — standar porsi per
//     kelompok sasaran (% AKG: 20–25% makan pagi, 30–35% makan siang)
//   • Permenkes No. 28 Tahun 2019 — Angka Kecukupan Gizi (AKG) harian
//
// File ini client-safe (murni data + fungsi tanpa dependensi server).

// ─── 1. Komponen menu wajib ────────────────────────────────────────────────

export type KomponenKey =
  | "karbohidrat"
  | "protein_hewani"
  | "protein_nabati"
  | "sayur"
  | "buah";

export type KategoriBahan = KomponenKey | "bumbu" | "lainnya";

export interface KomponenInfo {
  key: KomponenKey;
  label: string;
  contoh: string;
}

export const KOMPONEN_WAJIB: KomponenInfo[] = [
  {
    key: "karbohidrat",
    label: "Karbohidrat",
    contoh: "Beras, jagung, ubi, kentang, mie, roti",
  },
  {
    key: "protein_hewani",
    label: "Protein Hewani",
    contoh: "Ayam, ikan, daging, telur, udang",
  },
  {
    key: "protein_nabati",
    label: "Protein Nabati",
    contoh: "Tahu, tempe, kacang hijau, kedelai",
  },
  {
    key: "sayur",
    label: "Sayur",
    contoh: "Bayam, wortel, buncis, tomat, labu",
  },
  {
    key: "buah",
    label: "Buah",
    contoh: "Pisang, jeruk, pepaya, semangka, mangga",
  },
];

export const KOMPONEN_KEYS: KomponenKey[] = KOMPONEN_WAJIB.map((k) => k.key);

export const LABEL_KOMPONEN: Record<KategoriBahan, string> = {
  karbohidrat: "Karbohidrat",
  protein_hewani: "Protein Hewani",
  protein_nabati: "Protein Nabati",
  sayur: "Sayur",
  buah: "Buah",
  bumbu: "Bumbu & Minyak",
  lainnya: "Bahan Lainnya",
};

// ─── 2. Varian menu & anggaran bahan baku ──────────────────────────────────

export type VariantKeyStandar =
  | "porsi_besar"
  | "porsi_kecil"
  | "pmt_balita"
  | "pmt_bumil"
  | "pmt_busui";

/**
 * Anggaran bahan baku per porsi (BGN SIPERS-98/BGN/02/2026).
 * Rp8.000 → balita, PAUD/TK/RA, SD/MI kelas 1–3
 * Rp10.000 → SD/MI kelas 4 ke atas sampai ibu menyusui
 * (operasional Rp3.000 & fasilitas Rp2.000 TIDAK termasuk di sini)
 */
export const ANGGARAN_BAHAN_BAKU: Record<VariantKeyStandar, number> = {
  porsi_kecil: 8000,
  porsi_besar: 10000,
  pmt_balita: 8000,
  pmt_bumil: 10000,
  pmt_busui: 10000,
};

/** Napkin sare operasional & fasilitas (dip informing saja, bukan bahan baku). */
export const ANGGARAN_OPERASIONAL = 3000;
export const ANGGARAN_FASILITAS = 2000;

// ─── 3. Standar porsi per kelompok sasaran ─────────────────────────────────

export interface KelompokSasaran {
  key: string;
  label: string;
  usia: string;
  /** AKG harian (Permenkes 28/2019). */
  ak: {
    energi: number;
    protein: number;
    lemak: number;
    karbohidrat: number;
    serat: number;
  };
  /** % AKG harian yang dipenuhi oleh 1 serving MBG (Pedoman Standar Gizi MBG). */
  persenAkg: {
    energi: number;
    protein: number;
    lemak: number;
    karbohidrat: number;
  };
  /** Energi per serving MBG (kkal) — angka resmi Pedoman Standar Gizi MBG. */
  energiPorsi: number;
  waktuPemberian: "makan pagi" | "makan siang";
  budget: number;
}

export const KELOMPOK_SASARAN: KelompokSasaran[] = [
  {
    key: "tk_paud",
    label: "Siswa PAUD/TK/RA",
    usia: "4–6 tahun",
    ak: { energi: 1400, protein: 25, lemak: 50, karbohidrat: 220, serat: 20 },
    persenAkg: { energi: 23.4, protein: 25.0, lemak: 23.7, karbohidrat: 20.9 },
    energiPorsi: 328,
    waktuPemberian: "makan pagi",
    budget: 8000,
  },
  {
    key: "sd_1_3",
    label: "Siswa SD/MI kelas 1–3",
    usia: "7–9 tahun",
    ak: { energi: 1650, protein: 40, lemak: 55, karbohidrat: 250, serat: 23 },
    persenAkg: { energi: 22.3, protein: 23.1, lemak: 24.1, karbohidrat: 20.1 },
    energiPorsi: 368.8,
    waktuPemberian: "makan pagi",
    budget: 8000,
  },
  {
    key: "sd_4_6",
    label: "Siswa SD/MI kelas 4–6",
    usia: "7–9 tahun",
    ak: { energi: 1650, protein: 40, lemak: 55, karbohidrat: 250, serat: 23 },
    persenAkg: { energi: 32.2, protein: 33.1, lemak: 30.9, karbohidrat: 31.0 },
    energiPorsi: 531,
    waktuPemberian: "makan siang",
    budget: 10000,
  },
  {
    key: "smp",
    label: "Siswa SMP/MTs",
    usia: "10–12 tahun",
    ak: { energi: 2000, protein: 50, lemak: 65, karbohidrat: 300, serat: 28 },
    persenAkg: { energi: 32.3, protein: 34.8, lemak: 30.7, karbohidrat: 30.8 },
    energiPorsi: 719,
    waktuPemberian: "makan siang",
    budget: 10000,
  },
  {
    key: "sma",
    label: "Siswa SMA/SMK/MA",
    usia: "13–15 tahun",
    ak: { energi: 2400, protein: 70, lemak: 80, karbohidrat: 350, serat: 34 },
    persenAkg: { energi: 32.1, protein: 36.4, lemak: 31.0, karbohidrat: 30.4 },
    energiPorsi: 762.5,
    waktuPemberian: "makan siang",
    budget: 10000,
  },
  {
    key: "balita",
    label: "Anak Balita",
    usia: "1–3 tahun",
    ak: { energi: 1350, protein: 20, lemak: 45, karbohidrat: 215, serat: 19 },
    persenAkg: { energi: 24.4, protein: 47.6, lemak: 21.6, karbohidrat: 20.6 },
    energiPorsi: 342,
    waktuPemberian: "makan siang",
    budget: 8000,
  },
  {
    key: "bumil",
    label: "Ibu Hamil (trimester 2–3)",
    usia: "Dewasa + tambahan trimester",
    ak: { energi: 2450, protein: 85, lemak: 70, karbohidrat: 280, serat: 25 },
    persenAkg: { energi: 33.3, protein: 40.4, lemak: 32.1, karbohidrat: 31.9 },
    energiPorsi: 818,
    waktuPemberian: "makan siang",
    budget: 10000,
  },
  {
    key: "busui",
    label: "Ibu Menyusui",
    usia: "Dewasa + tambahan menyusui",
    ak: { energi: 2480, protein: 95, lemak: 70, karbohidrat: 310, serat: 25 },
    persenAkg: { energi: 31.9, protein: 52.9, lemak: 32.2, karbohidrat: 30.8 },
    energiPorsi: 818,
    waktuPemberian: "makan siang",
    budget: 10000,
  },
];

export const KELOMPOK_BY_KEY: Record<string, KelompokSasaran> = Object.fromEntries(
  KELOMPOK_SASARAN.map((k) => [k.key, k])
);

/** Toleransi atas nilai anchor (10%). */
const TOLERANSI = 0.1;

export interface RentangNilai {
  min: number;
  max: number;
}

export interface StandarPorsi {
  /** Kunci varian aplikasi. */
  key: VariantKeyStandar;
  /** Label varian aplikasi. */
  label: string;
  /** Kelompok sasaran yang dicakup (untuk acuan AKG). */
  kelompok: string[];
  /** Rentang target per 1 porsi. */
  energi: RentangNilai;
  protein: RentangNilai;
  lemak: RentangNilai;
  karbohidrat: RentangNilai;
  serat: RentangNilai;
  /** Cap anggaran bahan baku per porsi (Rp). */
  capAnggaran: number;
  /** % AKG acuan. */
  persenAkg: RentangNilai;
  akEnergi: RentangNilai;
  akProtein: RentangNilai;
  waktuPemberian: string;
}

function bulat(n: number): number {
  return Math.round(n * 10) / 10;
}

function rentangDari(list: number[]): RentangNilai {
  const min = Math.min(...list);
  const max = Math.max(...list);
  return { min: bulat(min * (1 - TOLERANSI)), max: bulat(max * (1 + TOLERANSI)) };
}

/** Target per serving untuk satu kelompok sasaran (hasil %AKG × AKG harian). */
export function targetKelompok(k: KelompokSasaran) {
  return {
    energi: bulat(k.energiPorsi),
    protein: bulat((k.ak.protein * k.persenAkg.protein) / 100),
    lemak: bulat((k.ak.lemak * k.persenAkg.lemak) / 100),
    karbohidrat: bulat((k.ak.karbohidrat * k.persenAkg.karbohidrat) / 100),
    serat: bulat((k.ak.serat * k.energiPorsi) / k.ak.energi),
  };
}

const VARIANT_STANDAR_DEF: {
  key: VariantKeyStandar;
  label: string;
  kelompok: string[];
}[] = [
  { key: "porsi_kecil", label: "Porsi Kecil", kelompok: ["tk_paud", "sd_1_3"] },
  { key: "porsi_besar", label: "Porsi Besar", kelompok: ["sd_4_6", "smp", "sma"] },
  { key: "pmt_balita", label: "PMT Balita", kelompok: ["balita"] },
  { key: "pmt_bumil", label: "PMT Bumil", kelompok: ["bumil"] },
  { key: "pmt_busui", label: "PMT Busui", kelompok: ["busui"] },
];

/** Standar porsi akhir per varian aplikasi (gabungan kelompok sasaran). */
export const STANDAR_PORSI: Record<VariantKeyStandar, StandarPorsi> =
  VARIANT_STANDAR_DEF.reduce((acc, def) => {
    const groups = def.kelompok
      .map((key) => KELOMPOK_BY_KEY[key])
      .filter(Boolean) as KelompokSasaran[];
    const targets = groups.map(targetKelompok);

    acc[def.key] = {
      key: def.key,
      label: def.label,
      kelompok: def.kelompok,
      energi: rentangDari(targets.map((t) => t.energi)),
      protein: rentangDari(targets.map((t) => t.protein)),
      lemak: rentangDari(targets.map((t) => t.lemak)),
      karbohidrat: rentangDari(targets.map((t) => t.karbohidrat)),
      serat: rentangDari(targets.map((t) => t.serat)),
      capAnggaran: ANGGARAN_BAHAN_BAKU[def.key],
      persenAkg: rentangDari(groups.map((g) => g.persenAkg.energi)),
      akEnergi: rentangDari(groups.map((g) => g.ak.energi)),
      akProtein: rentangDari(groups.map((g) => g.ak.protein)),
      waktuPemberian: groups
        .map((g) => g.waktuPemberian)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .join(" / "),
    };
    return acc;
  }, {} as Record<VariantKeyStandar, StandarPorsi>);

// ─── 4. Kategori bahan ─────────────────────────────────────────────────────

interface AturanKategori {
  kategori: KategoriBahan;
  kunci: string[];
}

/**
 * Aturan penentuan kategori bahan. Urutan penting — pola lebih spesifik
 * diletakkan lebih dulu.
 */
const ATURAN_KATEGORI: AturanKategori[] = [
  {
    kategori: "protein_hewani",
    kunci: [
      "ayam", "daging", "sapi", "kambing", "domba", "babi", "ikan", "lele",
      "kembung", "kakap", "baron", "tilapia", "nila", "tongkol", "sarden",
      "makarel", "tuna", "udang", "cumi", "kerang", "telur", "susu", "bakso",
      "sosis", "kornet", "fillet", "rendang", "sate",
    ],
  },
  {
    kategori: "protein_nabati",
    kunci: [
      "tahu", "tempe", "kacang", "kedelai", "oncom", "sari_kacang",
      "susu_kedelai", "veggie",
    ],
  },
  {
    kategori: "sayur",
    kunci: [
      "bayam", "kangkung", "wortel", "buncis", "labu", "kubis", "sawi",
      "tomat", "brokoli", "tauge", "katuk", "kelor", "terong", "timun",
      "daun", "selada", "pakcoy", "nangka", "oyen", "pumpkin", "carrot",
      "tomato",
    ],
  },
  {
    kategori: "buah",
    kunci: [
      "pisang", "semangka", "melon", "jeruk", "pepaya", "apel", "anggur",
      "mangga", "jambu", "nanas", "salak", "rambutan", "duku", "sawo", "belimbing",
      "markisa", "stroberi", "karamel", "buah",
    ],
  },
  {
    kategori: "karbohidrat",
    kunci: [
      "beras", "nasi", "roti", "ubi", "singkong", "jagung", "mie", "bihun",
      "oat", "ketan", "sorgum", "pasta", "kentang",
    ],
  },
  {
    kategori: "bumbu",
    kunci: [
      "bawang", "cabai", "cabe", "garam", "gula", "merica", "lada", "ketumbar",
      "kemiri", "kunyit", "jahe", "lengkuas", "salam", "serai", "kecap",
      "saus", "minyak", "margarin", "mentega", "ragi", "pewarna",
      "penyedap", "kaldu", "santen", "vanili",
    ],
  },];

/** Normalisasi nama bahan: lowercase + pemisah non-alfanumerik → "_". */
function normalisasiNama(nama: string): string {
  return (nama || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");
}

/**
 * Cocokkan kata pada teks dengan batas kata nyata, sehingga "bayam" tidak
 * dianggap mengandung "ayam" (huruf sebelum "ayam" adalah huruf).
 */
export function cocokkanKata(teks: string, kata: string): boolean {
  if (!teks || !kata) return false;
  let idx = teks.indexOf(kata);
  while (idx !== -1) {
    const sebelum = idx > 0 ? teks[idx - 1] : "_";
    const sesudah = idx + kata.length < teks.length ? teks[idx + kata.length] : "_";
    const batasDepan = !/[a-z0-9]/.test(sebelum);
    const batasBelakang = !/[a-z0-9]/.test(sesudah);
    if (batasDepan && batasBelakang) return true;
    idx = teks.indexOf(kata, idx + 1);
  }
  return false;
}

/**
 * Tentukan kategori kanonik sebuah bahan.
 * Memakai `kategori` dari AI bila tersedia (lebih akurat), jika tidak
 * dideteksi dari nama bahan.
 */
export function kategoriDariBahan(
  nama: string,
  kategoriAi?: string | null
): KategoriBahan {
  const dariAi = normalisasiKategoriAi(kategoriAi);
  if (dariAi) return dariAi;

  const b = normalisasiNama(nama);
  if (!b) return "lainnya";

  for (const aturan of ATURAN_KATEGORI) {
    for (const kunci of aturan.kunci) {
      if (cocokkanKata(b, kunci)) return aturan.kategori;
    }
  }
  return "lainnya";
}

/** Petakan kategori dari AI ke kategori kanonik. */
export function normalisasiKategoriAi(kategori?: string | null): KategoriBahan | null {
  if (!kategori) return null;
  const k = kategori.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (KOMPONEN_KEYS.includes(k as KomponenKey)) return k as KomponenKey;
  if (k === "bumbu" || k === "bumbu_minyak" || k === "bumbu_dan_minyak") return "bumbu";
  if (k === "lainnya" || k === "lain") return "lainnya";
  return null;
}

// ─── 5. Tabel harga acuan bahan pangan lokal ───────────────────────────────

export interface HargaBahan {
  /** Keyword pencocokan (huruf kecil). */
  kunci: string[];
  /** Harga acuan ecer. */
  harga: number;
  /** Basis harga. */
  satuan: "kg" | "liter" | "butir";
  /** Gram per butir (untuk satuan "butir"). */
  gramPerButir?: number;
}

/**
 * Harga acuan bahan pangan lokal Indonesia (Rp, ecer, TA 2026).
 * Dipakai untuk estimasi biaya bahan baku per porsi terhadap cap anggaran.
 */
export const HARGA_BAHAN: HargaBahan[] = [
  // ── Karbohidrat ──
  { kunci: ["beras"], harga: 16000, satuan: "kg" },
  { kunci: ["ketan"], harga: 18000, satuan: "kg" },
  { kunci: ["jagung"], harga: 12000, satuan: "kg" },
  { kunci: ["kentang"], harga: 16000, satuan: "kg" },
  { kunci: ["ubi", "singkong"], harga: 12000, satuan: "kg" },
  { kunci: ["mie", "bihun"], harga: 14000, satuan: "kg" },
  { kunci: ["roti"], harga: 18000, satuan: "kg" },
  { kunci: ["oat"], harga: 20000, satuan: "kg" },

  // ── Protein hewani ──
  { kunci: ["fillet", "dada_ayam"], harga: 38000, satuan: "kg" },
  { kunci: ["telur"], harga: 3000, satuan: "butir", gramPerButir: 50 },
  { kunci: ["ayam"], harga: 36000, satuan: "kg" },
  { kunci: ["daging_sapi", "sapi"], harga: 130000, satuan: "kg" },
  { kunci: ["kembung", "kakap", "baron", "tongkol", "sarden", "makarel"], harga: 30000, satuan: "kg" },
  { kunci: ["lele", "tilapia", "nila", "patin"], harga: 22000, satuan: "kg" },
  { kunci: ["ikan"], harga: 30000, satuan: "kg" },
  { kunci: ["udang"], harga: 90000, satuan: "kg" },
  { kunci: ["cumi"], harga: 70000, satuan: "kg" },
  { kunci: ["susu_uht"], harga: 22000, satuan: "liter" },
  { kunci: ["susu"], harga: 20000, satuan: "liter" },

  // ── Protein nabati ──
  { kunci: ["tahu"], harga: 14000, satuan: "kg" },
  { kunci: ["tempe"], harga: 14000, satuan: "kg" },
  { kunci: ["kacang_hijau"], harga: 30000, satuan: "kg" },
  { kunci: ["kacang_kedelai", "kedelai"], harga: 22000, satuan: "kg" },
  { kunci: ["kacang"], harga: 28000, satuan: "kg" },

  // ── Sayur ──
  { kunci: ["bayam", "kangkung", "sawi", "selada", "pakcoy"], harga: 8000, satuan: "kg" },
  { kunci: ["wortel", "carrot"], harga: 12000, satuan: "kg" },
  { kunci: ["buncis"], harga: 18000, satuan: "kg" },
  { kunci: ["kubis", "kol"], harga: 8000, satuan: "kg" },
  { kunci: ["tomat", "tomato"], harga: 12000, satuan: "kg" },
  { kunci: ["labu"], harga: 6000, satuan: "kg" },
  { kunci: ["terong"], harga: 10000, satuan: "kg" },
  { kunci: ["timun"], harga: 9000, satuan: "kg" },
  { kunci: ["brokoli"], harga: 16000, satuan: "kg" },
  { kunci: ["tauge"], harga: 6000, satuan: "kg" },
  { kunci: ["daun_katuk", "katuk"], harga: 10000, satuan: "kg" },
  { kunci: ["kelor"], harga: 12000, satuan: "kg" },
  { kunci: ["nangka"], harga: 8000, satuan: "kg" },
  { kunci: ["daun_bawang"], harga: 12000, satuan: "kg" },
  { kunci: ["sawi"], harga: 8000, satuan: "kg" },
  { kunci: ["kangkung"], harga: 8000, satuan: "kg" },
  { kunci: ["selada"], harga: 8000, satuan: "kg" },
  { kunci: ["oyen"], harga: 10000, satuan: "kg" },

  // ── Buah ──
  { kunci: ["pisang"], harga: 18000, satuan: "kg" },
  { kunci: ["semangka"], harga: 6000, satuan: "kg" },
  { kunci: ["melon"], harga: 12000, satuan: "kg" },
  { kunci: ["jeruk"], harga: 16000, satuan: "kg" },
  { kunci: ["pepaya"], harga: 12000, satuan: "kg" },
  { kunci: ["mangga"], harga: 15000, satuan: "kg" },
  { kunci: ["jambu"], harga: 20000, satuan: "kg" },
  { kunci: ["nanas"], harga: 12000, satuan: "kg" },
  { kunci: ["salak"], harga: 20000, satuan: "kg" },
  { kunci: ["rambutan"], harga: 30000, satuan: "kg" },
  { kunci: ["apel"], harga: 40000, satuan: "kg" },
  { kunci: ["anggur"], harga: 60000, satuan: "kg" },
  { kunci: ["buah"], harga: 15000, satuan: "kg" },

  // ── Bumbu ──
  { kunci: ["bawang_merah"], harga: 30000, satuan: "kg" },
  { kunci: ["bawang_putih"], harga: 40000, satuan: "kg" },
  { kunci: ["bawang"], harga: 32000, satuan: "kg" },
  { kunci: ["cabai", "cabe"], harga: 30000, satuan: "kg" },
  { kunci: ["minyak"], harga: 18000, satuan: "liter" },
  { kunci: ["kemiri"], harga: 60000, satuan: "kg" },
  { kunci: ["kunyit"], harga: 25000, satuan: "kg" },
  { kunci: ["jahe"], harga: 30000, satuan: "kg" },
  { kunci: ["lengkuas"], harga: 25000, satuan: "kg" },
  { kunci: ["serai"], harga: 20000, satuan: "kg" },
  { kunci: ["merica", "lada"], harga: 40000, satuan: "kg" },
  { kunci: ["garam"], harga: 5000, satuan: "kg" },
  { kunci: ["gula"], harga: 15000, satuan: "kg" },
  { kunci: ["kecap"], harga: 20000, satuan: "liter" },
];

/** Gram ≈ 1 satuan takaran umum (untuk bahan tanpa acuan satuan khusus). */
const GRAM_PER_SATUAN: Record<string, number> = {
  gram: 1,
  kg: 1000,
  ml: 1,
  liter: 1000,
  butir: 50,
  buah: 150,
  batang: 200,
  lembar: 20,
  siung: 5,
  sdm: 15,
  sdt: 5,
  potong: 50,
  ikat: 250,
  bungkus: 80,
  ekor: 150,
};

export interface BarisKomposisi {
  bahan?: string;
  nama_bahan?: string;
  jumlah_per_porsi?: number | string;
  jumlah?: number | string;
  satuan?: string;
  kategori?: string;
}

export interface RincianBiaya {
  nama: string;
  jumlah: number;
  satuan: string;
  hargaAcuan: number | null;
  biaya: number;
  adaAcuan: boolean;
}

export interface HasilEstimasiBiaya {
  total: number;
  baris: RincianBiaya[];
  bahanTanpaAcuan: string[];
}

function cocokkanHarga(nama: string): HargaBahan | null {
  const b = normalisasiNama(nama);
  if (!b) return null;
  let terbaik: HargaBahan | null = null;
  let panjangTerbaik = 0;
  for (const h of HARGA_BAHAN) {
    for (const kunci of h.kunci) {
      if (cocokkanKata(b, kunci) && kunci.length > panjangTerbaik) {
        terbaik = h;
        panjangTerbaik = kunci.length;
      }
    }
  }
  return terbaik;
}

/** Hitung estimasi biaya bahan baku untuk 1 porsi. */
export function estimasiBiayaBahan(komposisi: BarisKomposisi[] | null | undefined): HasilEstimasiBiaya {
  const baris: RincianBiaya[] = [];
  const tanpaAcuan: string[] = [];
  let total = 0;

  for (const item of komposisi ?? []) {
    const nama = (item?.bahan || item?.nama_bahan || "").trim();
    if (!nama) continue;
    const jumlah = Number(item?.jumlah_per_porsi ?? item?.jumlah ?? 0) || 0;
    if (jumlah <= 0) continue;

    const satuan = (item?.satuan || "gram").trim().toLowerCase();
    const harga = cocokkanHarga(nama);

    let biaya = 0;
    let adaAcuan = false;

    if (harga) {
      adaAcuan = true;
      if (harga.satuan === "butir") {
        if (satuan === "butir") {
          biaya = jumlah * harga.harga;
        } else {
          // konversi ke gram dulu
          const gram = jumlah * (GRAM_PER_SATUAN[satuan] ?? 1);
          biaya = (gram / (harga.gramPerButir ?? 50)) * harga.harga;
        }
      } else if (harga.satuan === "liter") {
        if (satuan === "liter") {
          biaya = jumlah * harga.harga;
        } else {
          const gram = jumlah * (GRAM_PER_SATUAN[satuan] ?? 1);
          biaya = (gram / 1000) * harga.harga;
        }
      } else {
        // kg
        if (satuan === "kg") {
          biaya = jumlah * harga.harga;
        } else {
          const gram = jumlah * (GRAM_PER_SATUAN[satuan] ?? 1);
          biaya = (gram / 1000) * harga.harga;
        }
      }
    } else {
      tanpaAcuan.push(nama);
    }

    total += biaya;
    baris.push({
      nama,
      jumlah,
      satuan,
      hargaAcuan: harga?.harga ?? null,
      biaya: Math.round(biaya),
      adaAcuan,
    });
  }

  return { total: Math.round(total), baris, bahanTanpaAcuan: Array.from(new Set(tanpaAcuan)) };
}

// ─── 6. Cek kepatuhan ──────────────────────────────────────────────────────

export interface StatusNilai {
  nilai: number;
  min: number;
  max: number;
  status: "ok" | "di_bawah" | "di_atas" | "belum_ada";
}

export interface HasilKepatuhan {
  komponen: {
    lengkap: boolean;
    ada: KomponenKey[];
    kurang: KomponenKey[];
    daftar: { key: KomponenKey; label: string; terpenuhi: boolean }[];
  };
  standar: StandarPorsi;
  energi: StatusNilai;
  protein: StatusNilai;
  lemak: StatusNilai;
  karbohidrat: StatusNilai;
  serat: StatusNilai;
  biaya: {
    estimasi: number;
    cap: number;
    status: "ok" | "melebihi" | "belum_ada";
    persen: number;
  };
  skor: number;
  ringkas: string[];
}

function statusNilai(nilai: number, min: number, max: number): StatusNilai {
  if (!nilai || nilai <= 0) return { nilai, min, max, status: "belum_ada" };
  if (nilai < min) return { nilai, min, max, status: "di_bawah" };
  if (nilai > max) return { nilai, min, max, status: "di_atas" };
  return { nilai, min, max, status: "ok" };
}

/**
 * Nilai kepatuhan sebuah varian terhadap standar BGN:
 * kelengkapan 5 komponen + target gizi + cap anggaran bahan baku.
 */
export function evaluasiVarian(
  key: string,
  komposisi: BarisKomposisi[] | null | undefined,
  nilaiGizi: {
    energi?: number;
    protein?: number;
    lemak?: number;
    karbohidrat?: number;
    serat?: number;
  } | null | undefined,
  estimasiBiayaAi?: number | null
): HasilKepatuhan {
  const standar = STANDAR_PORSI[key as VariantKeyStandar] ?? STANDAR_PORSI.porsi_besar;

  const ada = new Set<KomponenKey>();
  for (const item of komposisi ?? []) {
    const nama = (item?.bahan || item?.nama_bahan || "").trim();
    if (!nama) continue;
    const kat = kategoriDariBahan(nama, item?.kategori);
    if ((KOMPONEN_KEYS as string[]).includes(kat)) ada.add(kat as KomponenKey);
  }

  const daftar = KOMPONEN_WAJIB.map((k) => ({
    key: k.key,
    label: k.label,
    terpenuhi: ada.has(k.key),
  }));
  const kurang = daftar.filter((d) => !d.terpenuhi).map((d) => d.key);

  const biaya = estimasiBiayaBahan(komposisi);
  const estimasi =
    typeof estimasiBiayaAi === "number" && estimasiBiayaAi > 0
      ? Math.round(estimasiBiayaAi)
      : biaya.total;

  const energi = statusNilai(Number(nilaiGizi?.energi || 0), standar.energi.min, standar.energi.max);
  const protein = statusNilai(Number(nilaiGizi?.protein || 0), standar.protein.min, standar.protein.max);
  const lemak = statusNilai(Number(nilaiGizi?.lemak || 0), standar.lemak.min, standar.lemak.max);
  const karbohidrat = statusNilai(Number(nilaiGizi?.karbohidrat || 0), standar.karbohidrat.min, standar.karbohidrat.max);
  const serat = statusNilai(Number(nilaiGizi?.serat || 0), standar.serat.min, standar.serat.max);

  const statusBiaya: HasilKepatuhan["biaya"]["status"] =
    estimasi <= 0 ? "belum_ada" : estimasi > standar.capAnggaran ? "melebihi" : "ok";

  // Skor 0–100: 40% komponen, 40% nilai gizi (energi + protein), 20% anggaran.
  const skorKomponen = (daftar.filter((d) => d.terpenuhi).length / daftar.length) * 40;
  const nilaiGiziSkor =
    (energi.status === "ok" ? 20 : 0) +
    (protein.status === "ok" ? 20 : 0) +
    (lemak.status === "ok" ? 8 : 0) +
    (karbohidrat.status === "ok" ? 8 : 0) +
    (serat.status === "ok" ? 4 : 0);
  const skorAnggaran = statusBiaya === "ok" ? 20 : statusBiaya === "melebihi" ? 0 : 8;

  const ringkas: string[] = [];
  if (kurang.length > 0) {
    ringkas.push(
      `Komponen wajib belum lengkap: ${kurang
        .map((k) => KOMPONEN_WAJIB.find((x) => x.key === k)?.label || k)
        .join(", ")}.`
    );
  }
  if (energi.status === "di_bawah") {
    ringkas.push(`Energi ${energi.nilai} kkal di bawah standar ${standar.energi.min}–${standar.energi.max} kkal.`);
  }
  if (energi.status === "di_atas") {
    ringkas.push(`Energi ${energi.nilai} kkal di atas standar ${standar.energi.min}–${standar.energi.max} kkal.`);
  }
  if (protein.status !== "ok" && protein.status !== "belum_ada") {
    ringkas.push(
      `Protein ${protein.nilai} g di luar rentang standar ${standar.protein.min}–${standar.protein.max} g.`
    );
  }
  if (statusBiaya === "melebihi") {
    ringkas.push(
      `Estimasi bahan baku Rp${estimasi.toLocaleString("id-ID")} melebihi pagu Rp${standar.capAnggaran.toLocaleString("id-ID")} per porsi.`
    );
  }
  if (biaya.bahanTanpaAcuan.length > 0) {
    ringkas.push(
      `Belum ada acuan harga untuk: ${biaya.bahanTanpaAcuan.join(", ")} — estimasi biaya belum lengkap.`
    );
  }

  return {
    komponen: {
      lengkap: kurang.length === 0,
      ada: Array.from(ada),
      kurang,
      daftar,
    },
    standar,
    energi,
    protein,
    lemak,
    karbohidrat,
    serat,
    biaya: {
      estimasi,
      cap: standar.capAnggaran,
      status: statusBiaya,
      persen: standar.capAnggaran > 0 ? Math.round((estimasi / standar.capAnggaran) * 100) : 0,
    },
    skor: Math.round(Math.min(100, skorKomponen + nilaiGiziSkor + skorAnggaran)),
    ringkas,
  };
}

// ─── 7. Blok prompt (dipakai system instruction AI) ─────────────────────────

export function formatRupiah(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

export function deskripsiVarian(key: string): string {
  const std = STANDAR_PORSI[key as VariantKeyStandar];
  if (!std) return key;
  const groups = std.kelompok
    .map((k) => KELOMPOK_BY_KEY[k])
    .filter(Boolean) as KelompokSasaran[];
  return groups.map((g) => g.label).join(" + ");
}

/** Blok aturan 5 komponen wajib menu MBG. */
export function buildBlokKomponen(): string {
  const daftar = KOMPONEN_WAJIB.map(
    (k, i) => `${i + 1}. ${k.label} — contoh: ${k.contoh}`
  ).join("\n");

  return `ATURAN WAJIB — 5 KOMPONEN MENU MBG (Badan Gizi Nasional)
Setiap menu WAJIB memuat kelima komponen berikut, masing-masing minimal 1 bahan:
${daftar}
Setiap item pada "komposisi" WAJIB diisi field "kategori" dengan salah satu nilai:
karbohidrat, protein_hewani, protein_nabati, sayur, buah.
Bumbu dan minyak tidak dihitung sebagai komponen tersendiri — masukkan ke bahan
masak dari komponen terdekat (contoh: minyak goreng ikut pada komponen karbohidrat).`;
}

/** Blok aturan anggaran bahan baku per porsi. */
export function buildBlokAnggaran(variantKeys: string[]): string {
  const caps = Array.from(new Set(variantKeys.map((k) => ANGGARAN_BAHAN_BAKU[k as VariantKeyStandar]).filter(Boolean)));
  const daftarCap = caps.length > 0 ? caps : [8000, 10000];

  const baris = (Object.entries(ANGGARAN_BAHAN_BAKU) as [VariantKeyStandar, number][])
    .map(([key, cap]) => {
      const std = STANDAR_PORSI[key];
      return `  • ${std.label} (${deskripsiVarian(key)}): pagu ${formatRupiah(cap)} per porsi bahan baku`;
    })
    .join("\n");

  return `ATURAN ANGGARAN BAHAN BAKU (Juknis Tata Kelola MBG TA 2026 — SK Kepala BGN 401.1/2025)
${baris}
WAJIB hitung "estimasi_biaya" = jumlah (takaran per porsi × harga bahan) untuk seluruh bahan
pada "komposisi", dalam Rupiah, lalu pastikan nilainya TIDAK MELEBIHI pagu di atas
(${daftarCap.map((c) => formatRupiah(c)).join(" / ")}).
Anggaran operasional (Rp3.000/porsi) dan fasilitas (Rp2.000) BUKAN bagian dari bahan baku.
Bila pagu terlampaui, perkecil takaran bahan non-esensial atau pilih bahan lebih murah —
jangan menambah bahan baru yang tidak wajib.`;
}

/** Blok standar porsi (AKG + target per serving) per varian target. */
export function buildBlokStandarPorsi(variantKeys: string[]): string {
  const blok: string[] = [];

  for (const key of variantKeys) {
    const std = STANDAR_PORSI[key as VariantKeyStandar];
    if (!std) continue;

    const detailKelompok = std.kelompok
      .map((k) => KELOMPOK_BY_KEY[k])
      .filter(Boolean)
      .map((g) => {
        const t = targetKelompok(g);
        return (
          `      • ${g.label} (${g.usia}): 1 serving = ${g.energiPorsi} kkal ` +
          `(${String(g.persenAkg.energi).replace(".", ",")}% AKG harian ${g.ak.energi} kkal; ` +
          `P ${t.protein} g; L ${t.lemak} g; K ${t.karbohidrat} g; S ${t.serat} g) — ${g.waktuPemberian}`
        );
      })
      .join("\n");

    blok.push(
      `  ▸ ${std.label} (${deskripsiVarian(key)}) — pagu ${formatRupiah(std.capAnggaran)}/porsi
${detailKelompok}
      TARGET per 1 porsi: energi ${std.energi.min}–${std.energi.max} kkal | protein ${std.protein.min}–${std.protein.max} g | lemak ${std.lemak.min}–${std.lemak.max} g | karbohidrat ${std.karbohidrat.min}–${std.karbohidrat.max} g | serat ${std.serat.min}–${std.serat.max} g`
    );
  }

  return `STANDAR PORSI MBG (Pedoman Standar Gizi MBG BGN + AKG Permenkes 28/2019)
Setiap menu harus memenuhi % AKG harian sesuai kelompok sasaran (20–25% AKG untuk makan pagi,
30–35% AKG untuk makan siang). Target per varian:
${blok.join("\n")}`;
}

/** Blok prioritas pangan lokal + musiman. */
export function buildBlokPanganLokal(wilayah?: string | null): string {
  const wilayahTeks =
    wilayah && wilayah.trim()
      ? `Wilayah kerja SPPG: "${wilayah.trim()}"`
      : "Wilayah kerja SPPG: tidak ditentukan — gunakan bahan pangan lokal yang tersedia secara nasional.";

  return `PRIORITAS PANGAN LOKAL & MUSIMAN
${wilayahTeks}
- Utamakan bahan pangan yang tersedia dan musiman di wilayah tersebut.
- Dahulukan pangan lokal/domestik: beras lokal, ikan dan seafood lokal (kembung, kakap, baron,
  lele, ikan sungai), telur lokal, hortikultur lokal, buah lokal (pisang, mangga, jambu, salak),
  serta kacang-kacangan lokal (tahu, tempe, kacang hijau).
- Hindari bahan impor atau berharga tinggi yang menghabiskan pagu (sosis/bakso impor, nugget,
  cheese, saus kemasan, buah impor) — ganti dengan bahan setara yang lebih murah.
- Bila bahan pilihan tidak tersedia, gunakan bahan substitusi yang setara gizi dan lebih ekonomis.
- Pastikan seluruh bahan mudah didapat di pasar setempat.
- Untuk PMT Balita, hindari bahan berisiko (duri, tulang, potongan keras, buah keras) dan
  pilih tekstur lembut (cincang/dihaluskan).`;
}

/** Blok tabel harga acuan bahan pangan lokal (dipakai menghitung estimasi_biaya). */
export function buildBlokHargaAcuan(): string {
  const grup: Record<string, string[]> = {};
  const labelGrup: Record<string, string> = {
    Karbohidrat: "karbohidrat",
    "Protein hewani": "protein_hewani",
    "Protein nabati": "protein_nabati",
    Sayur: "sayur",
    Buah: "buah",
    Bumbu: "bumbu",
  };

  // Kelompokkan harga berdasarkan kategori bahan.
  for (const h of HARGA_BAHAN) {
    const contoh = h.kunci[0];
    const kat = kategoriDariBahan(contoh);
    const grupKey = kat === "lainnya" ? "bumbu" : kat;
    grup[grupKey] = grup[grupKey] ?? [];
    grup[grupKey].push(
      `${contoh} ${formatRupiah(h.harga)}/${h.satuan === "butir" ? "butir" : h.satuan}`
    );
  }

  const baris = Object.entries(labelGrup)
    .map(([label, key]) => {
      const isi = grup[key];
      if (!isi || isi.length === 0) return null;
      return `  • ${label}: ${isi.join(", ")}`;
    })
    .filter(Boolean)
    .join("\n");

  return `ACUAN HARGA BAHAN PANGAN LOKAL (ecer, untuk menghitung estimasi_biaya)
${baris}
Gunakan harga di atas saat menghitung "estimasi_biaya". Bila bahan tidak tercantum, gunakan
perkiraan harga pasar yang wajar di wilayah kerja SPPG.`;
}

