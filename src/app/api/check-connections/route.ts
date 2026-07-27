import { NextResponse } from "next/server";
import { checkGeminiConnection } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const geminiConnected = await checkGeminiConnection();

    return NextResponse.json({
      gemini: {
        status: geminiConnected ? "OK" : "ERROR",
        message: geminiConnected
          ? "Gemini Terhubung"
          : "Gagal menghubungkan ke Gemini. Silakan periksa kembali API Key Anda."
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Terjadi kesalahan internal saat memeriksa koneksi.",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
