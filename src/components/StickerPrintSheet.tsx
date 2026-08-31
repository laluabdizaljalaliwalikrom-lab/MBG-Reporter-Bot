"use client";

interface StickerGizi {
  energi: string;
  protein: string;
  lemak: string;
  karbohidrat: string;
  serat: string;
}

export type PaperSize = "a4" | "f4" | "a3";

export interface StickerPrintSheetProps {
  paperSize?: PaperSize;
  capacity: number;
  mode: "all_besar" | "all_kecil" | "split";
  countBesar: number;
  sppgName: string;
  menu: string;
  tanggal: string;
  jamSelesai: string;
  jamBatas: string;
  giziBesar: StickerGizi;
  giziKecil: StickerGizi;
}

export default function StickerPrintSheet(props: StickerPrintSheetProps) {
  const { paperSize = "a4", capacity, mode, countBesar, sppgName, menu, tanggal, jamSelesai, jamBatas, giziBesar, giziKecil } = props;

  const fmtDate = tanggal ? tanggal.split("-").reverse().join("/") : "-";
  const formatTime = (t: string) => {
    if (!t) return "-";
    return t.toUpperCase().includes("WITA") ? t : `${t} WITA`;
  };

  // Dimensions configuration per paper size
  let sheetWidth = "210mm";
  let sheetHeight = "296mm";
  let gridHeight = "285mm";
  let gridCols = "repeat(2, 1fr)";
  let gridRows = "repeat(6, 1fr)";
  let isComfortable = true;

  if (paperSize === "a4") {
    sheetWidth = "210mm";
    sheetHeight = "296mm";
    gridHeight = "285mm";
    if (capacity === 24) {
      gridCols = "repeat(3, 1fr)";
      gridRows = "repeat(8, 1fr)";
      isComfortable = false;
    } else if (capacity === 16) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(8, 1fr)";
      isComfortable = false;
    } else {
      // 12 labels
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(6, 1fr)";
      isComfortable = true;
    }
  } else if (paperSize === "f4") {
    sheetWidth = "215mm";
    sheetHeight = "329mm";
    gridHeight = "318mm";
    if (capacity === 28) {
      gridCols = "repeat(3, 1fr)";
      gridRows = "repeat(9, 1fr)"; // or 3x9=27, 4x7=28 -> let's do 3 cols or 4 cols
      gridCols = "repeat(3, 1fr)";
      gridRows = "repeat(10, 1fr)";
      isComfortable = false;
    } else if (capacity === 18) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(9, 1fr)";
      isComfortable = false;
    } else {
      // 14 labels (2 x 7)
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(7, 1fr)";
      isComfortable = true;
    }
  } else if (paperSize === "a3") {
    sheetWidth = "297mm";
    sheetHeight = "419mm";
    gridHeight = "408mm";
    if (capacity === 48) {
      gridCols = "repeat(4, 1fr)";
      gridRows = "repeat(12, 1fr)";
      isComfortable = false;
    } else if (capacity === 32) {
      gridCols = "repeat(4, 1fr)";
      gridRows = "repeat(8, 1fr)";
      isComfortable = true;
    } else {
      // 24 labels (3 x 8 or 4 x 6)
      gridCols = "repeat(3, 1fr)";
      gridRows = "repeat(8, 1fr)";
      isComfortable = true;
    }
  }

  return (
    <div
      className={`sticker-sheet sticker-${paperSize}-sheet`}
      style={{
        width: sheetWidth,
        height: sheetHeight,
        padding: "5mm",
        boxSizing: "border-box",
        backgroundColor: "#ffffff",
        color: "#000000",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "grid",
          width: "100%",
          height: gridHeight,
          gridTemplateColumns: gridCols,
          gridTemplateRows: gridRows,
          gap: isComfortable ? "3mm 4mm" : "2mm 2.5mm",
          boxSizing: "border-box",
        }}
      >
        {Array.from({ length: capacity }).map((_, idx) => {
          let isBesar = true;
          if (mode === "all_kecil") isBesar = false;
          else if (mode === "split") isBesar = idx < countBesar;
          const gizi = isBesar ? giziBesar : giziKecil;

          return (
            <div
              key={idx}
              style={{
                border: "1.5px solid #0f172a",
                borderRadius: "4px",
                padding: isComfortable ? "3mm 4mm" : "2mm 2.5mm",
                fontSize: isComfortable ? "8.5pt" : "7pt",
                lineHeight: "1.2",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                backgroundColor: "#ffffff",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {/* Header: logo BGN + title + porsi & tanggal */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", borderBottom: "1.5px solid #0f172a", paddingBottom: "3px", marginBottom: "3px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/logo-bgn.png"
                  alt="BGN"
                  style={{ height: isComfortable ? "24px" : "18px", width: "auto", objectFit: "contain", flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontWeight: 900, fontSize: isComfortable ? "8.5pt" : "7pt", textTransform: "uppercase", letterSpacing: "0.3px", color: "#0f172a", lineHeight: 1.1 }}>
                    BADAN GIZI NASIONAL
                  </div>
                  <div style={{ fontWeight: 700, fontSize: isComfortable ? "7.5pt" : "6pt", color: "#334155", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {sppgName}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                  <span style={{ fontWeight: 900, fontSize: isComfortable ? "7.5pt" : "6pt", background: isBesar ? "#1e3a8a" : "#065f46", color: "#ffffff", padding: "1.5px 5px", borderRadius: "2px", textTransform: "uppercase" }}>
                    PORSI {isBesar ? "BESAR" : "KECIL"}
                  </span>
                  <span style={{ fontSize: isComfortable ? "7pt" : "5.8pt", fontWeight: "bold", color: "#475569" }}>
                    TGL: {fmtDate}
                  </span>
                </div>
              </div>

              {/* Menu */}
              <div style={{ fontWeight: "bold", fontSize: isComfortable ? "8pt" : "6.5pt", margin: "2px 0", color: "#475569" }}>
                MENU: <span style={{ fontWeight: 800, color: "#020617" }}>{menu}</span>
              </div>

              {/* Nutrition box */}
              <div style={{ fontSize: isComfortable ? "6.8pt" : "5.5pt", background: "#f8fafc", border: "0.5px solid #cbd5e1", padding: "2.5px 4px", borderRadius: "3px", margin: "2px 0" }}>
                <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: isComfortable ? "6pt" : "5pt", color: "#475569", marginBottom: "1.5px" }}>NILAI GIZI HARIAN:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: isComfortable ? "2px 8px" : "1px 4px", fontWeight: "600", color: "#1e293b" }}>
                  <span>Energi: <strong>{gizi.energi || 0} kcal</strong></span>
                  <span>Protein: <strong>{gizi.protein || 0} g</strong></span>
                  <span>Lemak: <strong>{gizi.lemak || 0} g</strong></span>
                  <span>Karbohidrat: <strong>{gizi.karbohidrat || 0} g</strong></span>
                  <span>Serat: <strong>{gizi.serat || 0} g</strong></span>
                </div>
              </div>

              {/* Times */}
              <div style={{ fontSize: isComfortable ? "6.8pt" : "5.5pt", display: "flex", justifySelf: "stretch", justifyContent: "space-between", gap: "4px", margin: "2px 0", borderTop: "0.5px solid #cbd5e1", borderBottom: "0.5px solid #cbd5e1", padding: "1.5px 0", color: "#334155" }}>
                <span>Selesai Produksi: <strong>{formatTime(jamSelesai)}</strong></span>
                <span style={{ color: "#991b1b", fontWeight: 700 }}>Baik dikonsumsi sebelum: <strong>{formatTime(jamBatas)}</strong></span>
              </div>

              {/* Warnings */}
              <div style={{ borderTop: "1px solid #0f172a", paddingTop: "2px", marginTop: "2px", fontSize: isComfortable ? "6pt" : "5pt", lineHeight: "1.15", textAlign: "center" }}>
                <div style={{ color: "#991b1b", fontWeight: 800 }}>⚠️ DILARANG MEMBAWA PULANG MAKANAN MBG</div>
                <div style={{ color: "#0f172a", fontWeight: 700 }}>❌ JANGAN DIKONSUMSI JIKA BERLENDIR/BERBAU/BERUBAH RASA</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
