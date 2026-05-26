import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";

// Initialize the Gemini Client
export const genAI = new GoogleGenerativeAI(apiKey);

// Default model used in the application is gemini-1.5-flash
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Checks if the Gemini API Key is valid and the model responds correctly.
 * Returns true if the connection test succeeds, false otherwise.
 */
export async function checkGeminiConnection(): Promise<boolean> {
  if (!apiKey) {
    console.error("checkGeminiConnection: GEMINI_API_KEY is not defined in environment variables.");
    return false;
  }

  try {
    const result = await geminiModel.generateContent("Hello");
    const response = await result.response;
    const text = response.text();

    if (text && text.trim().length > 0) {
      console.log("checkGeminiConnection: Successful response received from Gemini API.");
      return true;
    }
    return false;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("checkGeminiConnection: Gemini API connection test failed:", errorMessage);
    return false;
  }
}
