/**
 * Utility helper to send WhatsApp messages via MPWA Gateway (https://wa.gusdin.my.id/send-message)
 */

export interface MPWAResponse {
  status: boolean | string;
  message?: string;
  msg?: string;
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

export interface MPWAMediaPayload {
  api_key: string;
  sender: string;
  number: string;
  media_type: "image";
  url: string;
  caption?: string;
  footer?: string;
}

export async function sendWhatsAppMedia(
  number: string,
  mediaUrl: string,
  caption?: string,
  footer?: string
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
      "sendWhatsAppMedia: API Key is not defined. Please set it in Settings UI or environment variables."
    );
  }
  if (!sender) {
    throw new Error(
      "sendWhatsAppMedia: Sender number is not defined. Please set it in Settings UI or environment variables."
    );
  }

  // 3. Format the target phone number
  // Clean all non-digit characters
  let formattedNumber = number.replace(/\D/g, "");

  // Convert leading 0 to 62 (Indonesian country code prefix)
  if (formattedNumber.startsWith("0")) {
    formattedNumber = "62" + formattedNumber.substring(1);
  }

  const endpoint = "https://wa.gusdin.my.id/send-media";

  // 4. Construct payload according to MPWA specifications
  const payload: MPWAMediaPayload = {
    api_key: apiKey,
    sender: sender,
    number: formattedNumber,
    media_type: "image",
    url: mediaUrl
  };

  if (caption) {
    payload.caption = caption;
  }
  if (footer) {
    payload.footer = footer;
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
    console.error("sendWhatsAppMedia: Error dispatching media to MPWA gateway:", errorMessage);
    throw error;
  }
}

/**
 * Checks the WhatsApp connection status using the MPWA Gateway API.
 * It retrieves api_key and sender from environment variables.
 * If successful, returns { success: true, message: 'WhatsApp Gateway Terhubung' }.
 * If it fails, catches the error and returns failure details.
 */
export async function checkWhatsAppConnection(): Promise<{
  success: boolean;
  message: string;
  details?: string;
}> {
  const apiKey = process.env.MPWA_API_KEY || process.env.WHATSAPP_API_KEY || "";
  const sender = process.env.MPWA_SENDER || process.env.WHATSAPP_PHONE_ID || "";

  if (!apiKey) {
    return {
      success: false,
      message: "API Key WhatsApp tidak didefinisikan di environment variables.",
      details: "Harap atur MPWA_API_KEY atau WHATSAPP_API_KEY di file konfigurasi .env."
    };
  }

  if (!sender) {
    return {
      success: false,
      message: "Nomor pengirim (Sender) WhatsApp tidak didefinisikan di environment variables.",
      details: "Harap atur MPWA_SENDER atau WHATSAPP_PHONE_ID di file konfigurasi .env."
    };
  }

  // Format the sender number as the target number for the connection test
  let formattedNumber = sender.replace(/\D/g, "");
  if (formattedNumber.startsWith("0")) {
    formattedNumber = "62" + formattedNumber.substring(1);
  }

  const endpoint = "https://wa.gusdin.my.id/send-message";
  const payload = {
    api_key: apiKey,
    sender: sender,
    number: formattedNumber,
    message: "Tes Koneksi WhatsApp Gateway (Pesan Internal)"
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    let resJson: MPWAResponse;
    try {
      resJson = (await response.json()) as MPWAResponse;
    } catch {
      throw new Error(`MPWA Gateway returned HTTP status ${response.status} (${response.statusText})`);
    }

    if (resJson.status === true || resJson.status === "true") {
      return {
        success: true,
        message: "WhatsApp Gateway Terhubung"
      };
    } else {
      const errorMsg = resJson.message || resJson.error || resJson.msg || "Status respons false dari MPWA Gateway";
      return {
        success: false,
        message: "WhatsApp Gateway Gagal Terhubung",
        details: String(errorMsg)
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("checkWhatsAppConnection: Connection test failed:", errorMessage);
    return {
      success: false,
      message: "Gagal terhubung ke WhatsApp Gateway",
      details: errorMessage
    };
  }
}

