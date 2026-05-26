export interface MBGReportData {
  Tanggal: string | null;
  "Porsi Besar": number | null;
  "Porsi Kecil": number | null;
  Menu: string | null;
  Energi: number | null;
  Protein: number | null;
  Lemak: number | null;
  Karbohidrat: number | null;
  Serat: number | null;
  error?: string;
  raw?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Parses manual report text starting with MANUAL_MBG using regex and extracts it
 * into a JSON structure matching the Gemini AI model output.
 */
export function parseManualInput(text: string): Partial<MBGReportData> {
  const data: Partial<MBGReportData> = {
    Tanggal: null,
    "Porsi Besar": null,
    "Porsi Kecil": null,
    Menu: null,
    Energi: null,
    Protein: null,
    Lemak: null,
    Karbohidrat: null,
    Serat: null
  };

  const extractString = (keys: string[]): string | null => {
    // Generate regex pattern joining all variations, e.g. (?:porsi\s+besar|besar)
    const keysPattern = keys.map(k => k.replace(/\s+/g, "\\s+")).join("|");
    const regex = new RegExp(`(?:${keysPattern})\\s*:\\s*([^\\r\\n]+)`, "i");
    const match = text.match(regex);
    return match && match[1] ? match[1].trim() : null;
  };

  const extractNumber = (keys: string[]): number | null => {
    const val = extractString(keys);
    if (!val) return null;
    const cleaned = val.replace(/,/g, ".");
    const match = cleaned.match(/([0-9.]+)/);
    if (match && match[1]) {
      const num = parseFloat(match[1]);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  data.Tanggal = extractString(["Tanggal"]);
  data["Porsi Besar"] = extractNumber(["Porsi Besar", "Besar"]);
  data["Porsi Kecil"] = extractNumber(["Porsi Kecil", "Kecil"]);
  data.Menu = extractString(["Menu"]);
  data.Energi = extractNumber(["Energi"]);
  data.Protein = extractNumber(["Protein"]);
  data.Lemak = extractNumber(["Lemak"]);
  data.Karbohidrat = extractNumber(["Karbohidrat"]);
  data.Serat = extractNumber(["Serat"]);

  return data;
}
