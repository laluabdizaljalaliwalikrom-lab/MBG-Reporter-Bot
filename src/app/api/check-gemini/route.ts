import { NextResponse } from "next/server";
import { checkGeminiConnection } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const isConnected = await checkGeminiConnection();
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: "Gemini Terhubung"
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Gagal menghubungkan ke Gemini. Silakan periksa kembali API Key Anda."
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        message: `Terjadi kesalahan internal: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}
