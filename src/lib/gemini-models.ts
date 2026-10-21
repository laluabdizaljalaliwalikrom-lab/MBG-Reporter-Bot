// ─── Konfigurasi model Gemini (shared antara API route & UI Dashboard) ────────

/**
 * Urutan fallback model Gemini. Semua ID di bawah ini adalah ID resmi
 * Google AI API (prefix `models/` dihilangkan otomatis).
 *
 * Diurutkan berdasarkan hasil uji live terhadap API key proyek (2026-10-21):
 *  - gemini-3.8-flash      : Flash paling intelligent, ~5s, structured output OK
 *  - gemini-3.5-flash-lite : tercepat (~1.8s) & termurah, cadangan utama
 *  - gemini-3.6-flash      : valid, dipakai saat 3.8 sedang jenuh (503)
 */
export const DEFAULT_GEMINI_MODELS: string[] = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
];

/** Level thinking yang dipakai per action (Gemini 3+). */
export type ThinkingLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * Pilihan cepat di tab Pengaturan.
 * `note` berisi informasi status model (kuota / status) hasil uji live.
 */
export const GEMINI_MODEL_SUGGESTIONS: { id: string; label: string; note?: string }[] = [
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    note: "Utama — paling intelligent di kelas Flash",
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite",
    note: "Tercepat & termurah",
  },
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    note: "Generasi sebelumnya, cadangan",
  },
  {
    id: "gemini-4-argon",
    label: "Gemini 4 Argon",
    note: "Flagship Gemini 4 — butuh kuota berbayar",
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro (preview)",
    note: "Kelas Pro — butuh kuota berbayar",
  },
  {
    id: "gemini-flash-latest",
    label: "Gemini Flash Latest",
    note: "Alias model flash terbaru",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    note: "Legacy — akses terbatas, sering 503",
  },
];

/** Teks default untuk ditampilkan di input Pengaturan. */
export const DEFAULT_GEMINI_MODELS_TEXT = DEFAULT_GEMINI_MODELS.join(", ");

/** Format aman untuk model ID Gemini (a-z, 0-9, titik, underscore, strip). */
const MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

/** Maksimal jumlah model yang boleh dicoba dalam satu chain fallback. */
const MAX_GEMINI_MODELS = 5;

/**
 * `thinkingConfig` untuk satu request.
 * - Gemini 3+/4 : memakai `thinkingLevel` (thinkingBudget tidak didukung)
 * - Gemini 2.5  : hanya mendukung `thinkingBudget`
 * - model lain  : `undefined` (biarkan default server)
 */
export type ThinkingConfig =
  | { thinkingLevel: ThinkingLevel }
  | { thinkingBudget: number }
  | undefined;

export function isValidGeminiModel(id: string): boolean {
  return MODEL_ID_PATTERN.test(id.trim());
}

/** True untuk Gemini 3.x dan 4.x (mis. gemini-3.8-flash, gemini-4-argon). */
export function isGemini3PlusModel(model: string): boolean {
  return /^gemini-(3|4)(\.|-)/.test(model.trim().toLowerCase());
}

/**
 * Susun `thinkingConfig` sesuai keluarga model.
 * Gemini 3+ error 400 bila memakai `thinkingBudget`,
 * Gemini 2.5 error 400 bila memakai `thinkingLevel`.
 */
export function buildThinkingConfig(
  model: string,
  level: ThinkingLevel = "LOW"
): ThinkingConfig {
  const id = model.trim().toLowerCase();

  if (isGemini3PlusModel(id)) {
    return { thinkingLevel: level };
  }

  if (id.startsWith("gemini-2.5")) {
    return { thinkingBudget: 0 };
  }

  return undefined;
}

/**
 * Parse daftar model dari string bebas (dipisah koma / baris baru / titik koma).
 * Prefix `models/` dibuang, entri duplikat dihapus, entri tidak valid diabaikan.
 */
export function parseGeminiModels(value: string | null | undefined): string[] {
  if (!value) return [];

  const list = value
    .split(/[,;\n]+/)
    .map((item) => item.trim().replace(/^models\//i, ""))
    .filter((item) => item.length > 0 && isValidGeminiModel(item));

  return Array.from(new Set(list)).slice(0, MAX_GEMINI_MODELS);
}

/** Normalisasi daftar model menjadi string siap disimpan ke system_settings. */
export function formatGeminiModels(models: string[]): string {
  return models.join(", ");
}

/** Model teks yang terdeteksi dari Gemini API (dipakai di UI Pengaturan). */
export interface AvailableModel {
  id: string;
  label: string;
  outputTokenLimit: number | null;
  isPreview: boolean;
}

/** Hasil uji satu model (dipakai di UI Pengaturan). */
export interface ModelTestResult {
  ok: boolean;
  model: string;
  modelVersion: string | null;
  latencyMs: number;
  error: string | null;
}
