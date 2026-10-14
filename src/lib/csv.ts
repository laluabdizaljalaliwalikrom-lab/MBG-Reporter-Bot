export interface CsvRow {
  [key: string]: string;
}

// Minimal CSV parser supporting quoted fields and escaped quotes.
export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldStarted = false;

  function pushField() {
    current.push(field);
    field = "";
    fieldStarted = false;
  }
  function pushRow() {
    if (current.length === 0 && field === "" && !fieldStarted) return;
    // trailing empty row guard
    rows.push(current);
    current = [];
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
        fieldStarted = true;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        fieldStarted = true;
      } else if (ch === ",") {
        pushField();
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        pushField();
        pushRow();
      } else {
        field += ch;
        fieldStarted = true;
      }
    }
  }
  // flush
  if (fieldStarted || field !== "" || current.length > 0) {
    pushField();
    pushRow();
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim() !== ""));

  const objs: CsvRow[] = dataRows.map((r) => {
    const obj: CsvRow = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });

  return { headers, rows: objs };
}

export const BENEFICIARY_TEMPLATE_HEADERS = [
  "nama_lengkap",
  "tanggal_lahir",
  "gender",
  "nik",
  "type",
  "identity_code",
  "kategori",
  "sub_kategori"
];

export const OPTIONAL_BENEFICIARY_HEADERS = [
  "nama_kelompok",
  "sppg",
  "status",
  "tanggal_mulai",
  "tanggal_berhenti",
  "catatan"
];

export function downloadTemplateCsv(): string {
  return BENEFICIARY_TEMPLATE_HEADERS.join(",") + "\n";
}
