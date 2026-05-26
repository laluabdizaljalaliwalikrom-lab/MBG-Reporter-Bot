/**
 * Utility helper to send WhatsApp messages via MPWA Gateway (https://wa.gusdin.my.id/send-message)
 */

export interface MPWAResponse {
  status: boolean | string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface MPWAPayload {
  api_key: string;
  sender: string;
  number: string;
  message: string;
  footer?: string;
  msgid?: string;
}

export async function sendWhatsAppMessage(
  number: string,
  message: string,
  footer?: string,
  msgid?: string
): Promise<MPWAResponse> {
  let apiKey = "";
  let sender = "";

  // 1. Check if running in a client-side environment (browser) and load from localStorage
  if (typeof window !== "undefined") {
    apiKey = window.localStorage.getItem("mpwa_api_key") || "";
    sender = window.localStorage.getItem("mpwa_sender") || "";
  }

  // 2. Fallback to Environment Variables (Server-side or default configurations)
  if (!apiKey) {
    apiKey = process.env.MPWA_API_KEY || process.env.WHATSAPP_API_KEY || "";
  }
  if (!sender) {
    sender = process.env.MPWA_SENDER || process.env.WHATSAPP_PHONE_ID || "";
  }

  // Validate credentials
  if (!apiKey) {
    throw new Error(
      "sendWhatsAppMessage: API Key is not defined. Please set it in Settings UI or environment variables."
    );
  }
  if (!sender) {
    throw new Error(
      "sendWhatsAppMessage: Sender number is not defined. Please set it in Settings UI or environment variables."
    );
  }

  // 3. Format the target phone number
  // Clean all non-digit characters
  let formattedNumber = number.replace(/\D/g, "");

  // Convert leading 0 to 62 (Indonesian country code prefix)
  if (formattedNumber.startsWith("0")) {
    formattedNumber = "62" + formattedNumber.substring(1);
  }

  const endpoint = "https://wa.gusdin.my.id/send-message";

  // 4. Construct payload according to MPWA specifications
  const payload: MPWAPayload = {
    api_key: apiKey,
    sender: sender,
    number: formattedNumber,
    message: message
  };

  if (footer) {
    payload.footer = footer;
  }
  if (msgid) {
    payload.msgid = msgid;
  }

  // 5. Send POST request
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`MPWA Gateway returned HTTP status ${response.status} (${response.statusText})`);
    }

    const resJson = (await response.json()) as MPWAResponse;

    // Check if the response status from MPWA itself is explicitly false
    if (resJson.status === false || resJson.status === "false") {
      throw new Error(
        resJson.message || resJson.error || "MPWA response returned a status of false"
      );
    }

    return resJson;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("sendWhatsAppMessage: Error dispatching message to MPWA gateway:", errorMessage);
    throw error;
  }
}
