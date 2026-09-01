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

  // Typography & sizing scale tiers: "jumbo" (<=8), "large" (10-14), "medium" (16-24), "compact" (>24)
  let tier: "jumbo" | "large" | "medium" | "compact" = "medium";

  if (paperSize === "a4") {
    sheetWidth = "210mm";
    sheetHeight = "296mm";
    gridHeight = "293mm";
    if (capacity === 6) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(3, 1fr)";
      tier = "jumbo";
    } else if (capacity === 8) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(4, 1fr)";
      tier = "jumbo";
    } else if (capacity === 10) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(5, 1fr)";
      tier = "large";
    } else if (capacity === 12) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(6, 1fr)";
      tier = "large";
    } else if (capacity === 16) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(8, 1fr)";
      tier = "medium";
    } else {
      // 24 labels
      gridCols = "repeat(3, 1fr)";
      gridRows = "repeat(8, 1fr)";
      tier = "compact";
    }
  } else if (paperSize === "f4") {
    sheetWidth = "215mm";
    sheetHeight = "329mm";
    gridHeight = "326mm";
    if (capacity === 6) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(3, 1fr)";
      tier = "jumbo";
    } else if (capacity === 8) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(4, 1fr)";
      tier = "jumbo";
    } else if (capacity === 10) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(5, 1fr)";
      tier = "large";
    } else if (capacity === 14) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(7, 1fr)";
      tier = "large";
    } else if (capacity === 18) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(9, 1fr)";
      tier = "medium";
    } else {
      // 28 labels
      gridCols = "repeat(3, 1fr)";
      gridRows = "repeat(10, 1fr)";
      tier = "compact";
    }
  } else if (paperSize === "a3") {
    sheetWidth = "297mm";
    sheetHeight = "419mm";
    gridHeight = "416mm";
    if (capacity === 8) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(4, 1fr)";
      tier = "jumbo";
    } else if (capacity === 12) {
      gridCols = "repeat(3, 1fr)";
      gridRows = "repeat(4, 1fr)";
      tier = "jumbo";
    } else if (capacity === 16) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(8, 1fr)";
      tier = "large";
    } else if (capacity === 24) {
      gridCols = "repeat(3, 1fr)";
      gridRows = "repeat(8, 1fr)";
      tier = "large";
    } else if (capacity === 32) {
      gridCols = "repeat(4, 1fr)";
      gridRows = "repeat(8, 1fr)";
      tier = "medium";
    } else {
      // 48 labels
      gridCols = "repeat(4, 1fr)";
      gridRows = "repeat(12, 1fr)";
      tier = "compact";
    }
  }

  // Scaling styles based on tier with slim gaps
  const cardPadding = tier === "jumbo" ? "5mm 6mm" : tier === "large" ? "3.5mm 4.5mm" : tier === "medium" ? "2.5mm 3mm" : "2mm 2.5mm";
  const logoHeight = tier === "jumbo" ? "32px" : tier === "large" ? "24px" : tier === "medium" ? "19px" : "16px";
  const titleBgnSize = tier === "jumbo" ? "11pt" : tier === "large" ? "8.5pt" : tier === "medium" ? "7pt" : "6.5pt";
  const titleSppgSize = tier === "jumbo" ? "9.5pt" : tier === "large" ? "7.5pt" : tier === "medium" ? "6.2pt" : "5.8pt";
  const badgeSize = tier === "jumbo" ? "9.5pt" : tier === "large" ? "7.5pt" : tier === "medium" ? "6.2pt" : "5.8pt";
  const dateSize = tier === "jumbo" ? "9pt" : tier === "large" ? "7pt" : tier === "medium" ? "5.8pt" : "5.2pt";
  const menuSize = tier === "jumbo" ? "10pt" : tier === "large" ? "8pt" : tier === "medium" ? "6.5pt" : "6pt";
  const giziHeadSize = tier === "jumbo" ? "8pt" : tier === "large" ? "6.2pt" : tier === "medium" ? "5.2pt" : "4.8pt";
  const giziValSize = tier === "jumbo" ? "8.5pt" : tier === "large" ? "6.8pt" : tier === "medium" ? "5.5pt" : "5pt";
  const timeSize = tier === "jumbo" ? "8.5pt" : tier === "large" ? "6.8pt" : tier === "medium" ? "5.5pt" : "5pt";
  const warningSize = tier === "jumbo" ? "7.5pt" : tier === "large" ? "6pt" : tier === "medium" ? "5pt" : "4.5pt";
  const gridGap = tier === "jumbo" ? "2mm 2.5mm" : tier === "large" ? "1.8mm 2mm" : "1.5mm 1.8mm";

  return (
    <div
      className={`sticker-sheet sticker-${paperSize}-sheet`}
      style={{
        width: sheetWidth,
        height: sheetHeight,
        padding: "1.5mm",
        boxSizing: "border-box",
        backgroundColor: "#ffffff",
        color: "#000000",
        margin: "0 auto",
        fontFamily: "'Times New Roman', Times, serif",
      }}
    >
      <div
        style={{
          display: "grid",
          width: "100%",
          height: gridHeight,
          gridTemplateColumns: gridCols,
          gridTemplateRows: gridRows,
          gap: gridGap,
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
                padding: cardPadding,
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
              <div style={{ display: "flex", alignItems: "center", gap: "6px", borderBottom: "1.5px solid #0f172a", paddingBottom: "3px", marginBottom: "2px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/logo-bgn.png"
                  alt="BGN"
                  style={{ height: logoHeight, width: "auto", objectFit: "contain", flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontWeight: 900, fontSize: titleBgnSize, textTransform: "uppercase", letterSpacing: "0.3px", color: "#0f172a", lineHeight: 1.1 }}>
                    BADAN GIZI NASIONAL
                  </div>
                  <div style={{ fontWeight: 700, fontSize: titleSppgSize, color: "#334155", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {sppgName}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                  <span style={{ fontWeight: 900, fontSize: badgeSize, background: isBesar ? "#1e3a8a" : "#065f46", color: "#ffffff", padding: "1.5px 5px", borderRadius: "2px", textTransform: "uppercase" }}>
                    PORSI {isBesar ? "BESAR" : "KECIL"}
                  </span>
                  <span style={{ fontSize: dateSize, fontWeight: "bold", color: "#475569" }}>
                    TGL: {fmtDate}
                  </span>
                </div>
              </div>

              {/* Menu */}
              <div style={{ fontWeight: "bold", fontSize: menuSize, margin: "2px 0", color: "#475569" }}>
                MENU: <span style={{ fontWeight: 800, color: "#020617" }}>{menu}</span>
              </div>

              {/* Nutrition box */}
              <div style={{ fontSize: giziValSize, background: "#f8fafc", border: "0.5px solid #cbd5e1", padding: tier === "jumbo" ? "4px 6px" : "2.5px 4px", borderRadius: "3px", margin: "2px 0" }}>
                <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: giziHeadSize, color: "#475569", marginBottom: "1.5px" }}>NILAI GIZI HARIAN:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: tier === "jumbo" ? "3px 12px" : "2px 8px", fontWeight: "600", color: "#1e293b" }}>
                  <span>Energi: <strong>{gizi.energi || 0} kcal</strong></span>
                  <span>Protein: <strong>{gizi.protein || 0} g</strong></span>
                  <span>Lemak: <strong>{gizi.lemak || 0} g</strong></span>
                  <span>Karbohidrat: <strong>{gizi.karbohidrat || 0} g</strong></span>
                  <span>Serat: <strong>{gizi.serat || 0} g</strong></span>
                </div>
              </div>

              {/* Times */}
              <div style={{ fontSize: timeSize, display: "flex", justifySelf: "stretch", justifyContent: "space-between", gap: "4px", margin: "2px 0", borderTop: "0.5px solid #cbd5e1", borderBottom: "0.5px solid #cbd5e1", padding: "2px 0", color: "#334155" }}>
                <span>Selesai Produksi: <strong>{formatTime(jamSelesai)}</strong></span>
                <span style={{ color: "#991b1b", fontWeight: 700 }}>Baik dikonsumsi sebelum: <strong>{formatTime(jamBatas)}</strong></span>
              </div>

              {/* Warnings */}
              <div style={{ borderTop: "1px solid #0f172a", paddingTop: "2px", marginTop: "1.5px", fontSize: warningSize, lineHeight: "1.15", textAlign: "center" }}>
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
