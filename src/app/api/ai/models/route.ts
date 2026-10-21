import { NextResponse } from "next/server";
import { listAvailableModels } from "@/lib/gemini-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/models
 * Daftar model Gemini yang benar-benar bisa diakses oleh API key saat ini.
 * Di-proxy dari `GET https://generativelanguage.googleapis.com/v1beta/models`.
 */
export async function GET() {
  try {
    const models = await listAvailableModels();
    return NextResponse.json({ status: "success", models });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil daftar model Gemini.";
    console.error("GET /api/ai/models error:", error);
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
