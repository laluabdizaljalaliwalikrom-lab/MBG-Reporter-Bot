import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";

// Initialize the Gemini Client
export const genAI = new GoogleGenerativeAI(apiKey);

// Default model used in the application is gemini-2.5-flash
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Helper function to wait/sleep
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Checks if the Gemini API Key is valid and the model responds correctly.
 * Returns true if the connection test succeeds, false otherwise.
 * Retries up to 3 times for transient failures.
 */
export async function checkGeminiConnection(): Promise<boolean> {
  if (!apiKey) {
    console.error("checkGeminiConnection: GEMINI_API_KEY is not defined in environment variables.");
    return false;
  }

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await geminiModel.generateContent("Hello");
      const response = await result.response;
      const text = response.text();

      if (text && text.trim().length > 0) {
        console.log("checkGeminiConnection: Successful response received from Gemini API.");
        return true;
      }
    } catch (error: unknown) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`checkGeminiConnection: Attempt ${attempt} failed: ${errorMessage}`);
      if (attempt < 3) {
        await delay(2000);
      }
    }
  }

  console.error("checkGeminiConnection: Gemini API connection test failed after 3 attempts:", lastError);
  return false;
}
