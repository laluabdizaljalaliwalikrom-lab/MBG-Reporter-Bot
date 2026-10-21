// ─── Helper server-side untuk Gemini API ───────────────────────────────────
//
// File ini HANYA boleh diimpor dari API route / Server Component.
// Semua request ke Google AI API (termasuk daftar model) lewat sini supaya
// konfigurasi (API key + chain model) hanya dibaca di satu tempat.

import { supabase } from "@/lib/supabase";
import {
  DEFAULT_GEMINI_MODELS,
  buildThinkingConfig,
  parseGeminiModels,
  type AvailableModel,
  type ThinkingLevel,
} from "@/lib/gemini-models";
import type { JsonSchema } from "@/lib/gemini-schemas";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Batas waktu satu request ke Gemini (ms). */
export const GEMINI_REQUEST_TIMEOUT_MS = 60_000;

export interface GeminiConfig {
  apiKey: string;
  models: string[];
}

export interface GeminiCallResult {
  /** Isi JSON yang dihasilkan model. */
  text: string;
  /** Model yang benar-benar dipakai (dari chain fallback). */
  model: string;
  /** Model asli yang melayani request (bisa berbeda bila model adalah alias). */
  modelVersion: string | null;
}

/**
 * Ambil API Key + daftar model fallback dari `system_settings` (satu query),
 * dengan fallback ke `process.env.GEMINI_API_KEY` dan daftar model default.
 */
export async function getGeminiConfig(): Promise<GeminiConfig> {
  let apiKey = "";
  let modelsRaw: string | null = null;

  try {
    const { data } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["gemini_api_key", "gemini_models"]);

    for (const row of data ?? []) {
      if (row.key === "gemini_api_key") {
        apiKey = (row.value || "").trim();
      } else if (row.key === "gemini_models") {
        modelsRaw = row.value ?? null;
      }
    }
  } catch (err) {
    console.warn("Gagal membaca konfigurasi Gemini dari system_settings:", err);
  }

  if (!apiKey) {
    apiKey = (process.env.GEMINI_API_KEY || "").trim();
  }

  const configured = parseGeminiModels(modelsRaw);

  return {
    apiKey,
    models: configured.length > 0 ? configured : [...DEFAULT_GEMINI_MODELS],
  };
}

/** Penyebab kegagalan request Gemini dalam bahasa sederhana. */
function describeGeminiError(status: number, body: string): string {
  const raw = body.replace(/\s+/g, " ").trim();

  if (status === 429) {
    return "kuota Gemini habis (HTTP 429)";
  }
  if (status === 503) {
    return "model sedang mengalami beban tinggi (HTTP 503)";
  }
  if (status === 404) {
    return "model tidak tersedia untuk API key ini (HTTP 404)";
  }
  if (status === 403 || status === 401) {
    return "akses ditolak, periksa Gemini API Key di menu Pengaturan";
  }
  if (status === 400) {
    return `permintaan ditolak (HTTP 400): ${raw.slice(0, 300)}`;
  }

  return `error HTTP ${status}: ${raw.slice(0, 300)}`;
}

/** Coba ekstrak pesan error dari body respons Google AI API. */
function extractErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body);
    const message = parsed?.error?.message;
    if (typeof message === "string" && message) return message;
  } catch {
    // body bukan JSON — pakai teks mentah
  }
  return body;
}

interface AttemptResult {
  ok: boolean;
  status: number;
  text?: string;
  modelVersion?: string | null;
  error?: string;
}

interface AttemptOptions {
  apiKey: string;
  model: string;
  systemInstruction: string;
  prompt: string;
  schema: JsonSchema | null;
  useThinking: boolean;
  thinkingLevel: ThinkingLevel;
}

/** Kirim satu request ke satu model dengan konfigurasi tertentu. */
async function attemptModel(opts: AttemptOptions): Promise<AttemptResult> {
  const generationConfig: Record<string, unknown> = {
    temperature: 0.3,
    responseMimeType: "application/json",
  };

  if (opts.schema) {
    generationConfig.responseJsonSchema = opts.schema;
  }

  if (opts.useThinking) {
    const thinking = buildThinkingConfig(opts.model, opts.thinkingLevel);
    if (thinking) {
      generationConfig.thinkingConfig = thinking;
    }
  }

  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(
    opts.model
  )}:generateContent?key=${opts.apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: opts.systemInstruction }] },
        contents: [{ parts: [{ text: opts.prompt }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const raw = await response.text();
      return {
        ok: false,
        status: response.status,
        error: describeGeminiError(
          response.status,
          extractErrorMessage(raw)
        ),
      };
    }

    const result = await response.json();
    const candidate = result?.candidates?.[0];

    if (candidate?.finishReason === "MAX_TOKENS") {
      return {
        ok: false,
        status: 400,
        error: `Respons model ${opts.model} terpotong (batas token tercapai). Coba lagi atau per-shortening permintaan.`,
      };
    }

    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      return {
        ok: false,
        status: 400,
        error: `Model ${opts.model} tidak mengembalikan konten.`,
      };
    }

    return {
      ok: true,
      status: 200,
      text,
      modelVersion: result?.modelVersion ?? null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 0,
      error: `Gagal menghubungi model ${opts.model}: ${message}`,
    };
  }
}

/**
 * Panggil Gemini dengan chain fallback model.
 *
 * Untuk tiap model, ada 4 variasi konfigurasi yang diuji berurutan.
 * Variasi berikutnya hanya dicoba bila model menjawab HTTP 400 (konfigurasi
 * tidak valid untuk model tersebut) — error 429/503 langsung pindah ke model
 * berikutnya supaya tidak membuang kuota.
 *
 *  1. schema ketat + thinkingConfig  (konfigurasi ideal)
 *  2. schema ketat tanpa thinkingConfig (model 2.5/alias lama)
 *  3. tanpa schema + thinkingConfig   (model tak mendukung responseJsonSchema)
 *  4. tanpa schema tanpa thinkingConfig (mode JSON paling sederhana)
 */
export async function callGemini(params: {
  systemInstruction: string;
  prompt: string;
  schema?: JsonSchema | null;
  thinkingLevel?: ThinkingLevel;
}): Promise<GeminiCallResult> {
  const { apiKey, models } = await getGeminiConfig();

  if (!apiKey) {
    throw new Error(
      "Gemini API Key belum diisi. Silakan masukkan di menu Pengaturan Dashboard atau tambahkan di .env.local."
    );
  }

  const schema = params.schema ?? null;
  const thinkingLevel = params.thinkingLevel ?? "LOW";

  const variants: { useSchema: boolean; useThinking: boolean }[] = [
    { useSchema: schema !== null, useThinking: true },
    { useSchema: schema !== null, useThinking: false },
    { useSchema: false, useThinking: true },
    { useSchema: false, useThinking: false },
  ];

  const failures: { model: string; reason: string }[] = [];

  for (const model of models) {
    for (const variant of variants) {
      const attempt = await attemptModel({
        apiKey,
        model,
        systemInstruction: params.systemInstruction,
        prompt: params.prompt,
        schema: variant.useSchema ? schema : null,
        useThinking: variant.useThinking,
        thinkingLevel,
      });

      if (attempt.ok && attempt.text) {
        return {
          text: attempt.text,
          model,
          modelVersion: attempt.modelVersion ?? null,
        };
      }

      const reason = attempt.error ?? "Kesalahan tidak diketahui.";

      // Hanya error konfigurasi (400) yang layak dicoba ulang dengan variasi lain.
      if (attempt.status !== 400) {
        console.warn(`Gemini model ${model} gagal (${attempt.status}): ${reason}`);
        failures.push({ model, reason });
        break;
      }

      console.warn(
        `Gemini model ${model} menolak konfigurasi (schema=${variant.useSchema}, thinking=${variant.useThinking}), mencoba variasi lain...`
      );

      if (variant === variants[variants.length - 1]) {
        failures.push({ model, reason });
      }
    }
  }

  if (failures.length === 0) {
    throw new Error("Semua model Gemini gagal merespons.");
  }

  const details = failures
    .map((f) => `• ${f.model} — ${f.reason}`)
    .join("\n");

  throw new Error(`Gagal merespons dengan semua model Gemini:\n${details}`);
}

// ─── Deteksi model yang tersedia ──────────────────────────────────────────

/** Model non-teks (gambar, TTS, embedding, robotika, riset mendalam, dll). */
const NON_TEXT_MODEL_PATTERN =
  /(-image|-tts|-transcribe|omni|lyria|robotics|deep-research|antigravity|computer-use|-embedding|^gemma-)/i;

let modelsCache: {
  expiresAt: number;
  models: AvailableModel[];
} | null = null;

/** TTL cache daftar model (10 menit). */
const MODELS_CACHE_TTL_MS = 10 * 60 * 1000;

function humanizeModelId(id: string): string {
  return id
    .replace(/^gemini-/, "Gemini ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Daftar model teks yang benar-benar bisa diakses oleh API key saat ini.
 * Cache di memori selama 10 menit agar tidak membanjiri kuota API.
 */
export async function listAvailableModels(): Promise<AvailableModel[]> {
  if (modelsCache && modelsCache.expiresAt > Date.now()) {
    return modelsCache.models;
  }

  const { apiKey } = await getGeminiConfig();
  if (!apiKey) {
    throw new Error(
      "Gemini API Key belum diisi. Silakan masukkan di menu Pengaturan Dashboard."
    );
  }

  const url = `${GEMINI_API_BASE}/models?key=${apiKey}&pageSize=1000`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(
      `Gagal mengambil daftar model Gemini: ${describeGeminiError(
        response.status,
        extractErrorMessage(raw)
      )}`
    );
  }

  const json = await response.json();
  const rawModels = Array.isArray(json?.models) ? json.models : [];

  const models: AvailableModel[] = rawModels
    .filter((m: { name?: string; supportedGenerationMethods?: string[] }) => {
      const id = (m?.name || "").replace(/^models\//, "");
      if (!id.startsWith("gemini-")) return false;
      if (NON_TEXT_MODEL_PATTERN.test(id)) return false;
      return (m?.supportedGenerationMethods || []).includes("generateContent");
    })
    .map((m: { name?: string; outputTokenLimit?: number }) => {
      const id = (m.name || "").replace(/^models\//, "");
      return {
        id,
        label: humanizeModelId(id),
        outputTokenLimit:
          typeof m.outputTokenLimit === "number" ? m.outputTokenLimit : null,
        isPreview: /preview|latest|exp/i.test(id),
      };
    })
    .sort((a: AvailableModel, b: AvailableModel) => a.id.localeCompare(b.id));

  modelsCache = { expiresAt: Date.now() + MODELS_CACHE_TTL_MS, models };

  return models;
}

/** Uji satu model dengan prompt pendek; dipakai tombol "Tes Model". */
export async function testGeminiModel(model: string): Promise<{
  ok: boolean;
  model: string;
  modelVersion: string | null;
  latencyMs: number;
  error: string | null;
}> {
  const { apiKey } = await getGeminiConfig();
  if (!apiKey) {
    throw new Error(
      "Gemini API Key belum diisi. Silakan masukkan di menu Pengaturan Dashboard."
    );
  }

  const startedAt = Date.now();
  const attempt = await attemptModel({
    apiKey,
    model,
    systemInstruction:
      "Kamu adalah asisten uji coba. Balas HANYA dengan JSON valid.",
    prompt:
      'Balas dengan JSON: {"status":"ok","message":"tes model berhasil"}',
    schema: {
      type: "object",
      properties: {
        status: { type: "string" },
        message: { type: "string" },
      },
      required: ["status", "message"],
    },
    useThinking: true,
    thinkingLevel: "LOW",
  });

  const latencyMs = Date.now() - startedAt;

  if (attempt.ok) {
    return {
      ok: true,
      model,
      modelVersion: attempt.modelVersion ?? null,
      latencyMs,
      error: null,
    };
  }

  return {
    ok: false,
    model,
    modelVersion: null,
    latencyMs,
    error: attempt.error ?? "Gagal menghubungi model.",
  };
}
