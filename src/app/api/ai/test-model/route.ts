import { NextResponse } from "next/server";
import { testGeminiModel } from "@/lib/gemini-server";
import { isValidGeminiModel } from "@/lib/gemini-models";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/test-model
 * Body: { model: "gemini-3.8-flash" }
 * Menjalankan satu prompt kecil untuk memverifikasi model benar-benar bisa dipakai.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const model = String(body?.model || "").trim();

    if (!model) {
      return NextResponse.json(
        { status: "error", message: "Parameter 'model' wajib diisi." },
        { status: 400 }
      );
    }

    if (!isValidGeminiModel(model)) {
      return NextResponse.json(
        { status: "error", message: `Model '${model}' tidak valid.` },
        { status: 400 }
      );
    }

    const result = await testGeminiModel(model);

    return NextResponse.json({
      status: result.ok ? "success" : "error",
      ...result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal menguji model Gemini.";
    console.error("POST /api/ai/test-model error:", error);
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
