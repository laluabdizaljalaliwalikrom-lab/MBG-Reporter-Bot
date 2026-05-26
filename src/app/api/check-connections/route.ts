import { NextResponse } from "next/server";
import { checkGeminiConnection } from "@/lib/gemini";
import { checkWhatsAppConnection } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const geminiConnected = await checkGeminiConnection();
    const whatsappResult = await checkWhatsAppConnection();

    return NextResponse.json({
      gemini: {
        status: geminiConnected ? "OK" : "ERROR",
        message: geminiConnected
          ? "Gemini Terhubung"
          : "Gagal menghubungkan ke Gemini. Silakan periksa kembali API Key Anda."
      },
      whatsapp: {
        status: whatsappResult.success ? "OK" : "ERROR",
        message: whatsappResult.success
          ? whatsappResult.message
          : `${whatsappResult.message}${whatsappResult.details ? `: ${whatsappResult.details}` : ""}`
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
