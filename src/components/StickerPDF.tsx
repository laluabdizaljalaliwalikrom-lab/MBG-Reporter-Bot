import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { PaperSize } from "./StickerPrintSheet";

interface StickerGizi {
  energi: string;
  protein: string;
  lemak: string;
  karbohidrat: string;
  serat: string;
}

export interface StickerPDFProps {
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

export default function StickerPDF(props: StickerPDFProps) {
  const {
    paperSize = "a4",
    capacity,
    mode,
    countBesar,
    sppgName,
    menu,
    tanggal,
    jamSelesai,
    jamBatas,
    giziBesar,
    giziKecil,
  } = props;

  const fmtDate = tanggal ? tanggal.split("-").reverse().join("/") : "-";
  const formatTime = (t: string) => {
    if (!t) return "-";
    return t.toUpperCase().includes("WITA") ? t : `${t} WITA`;
  };

  // Determine Page Size in points for React-PDF (1 mm = 2.83465 pt)
  // A4: [595.28, 841.89], F4: [609.45, 935.43], A3: [841.89, 1190.55]
  let pageSize: [number, number] = [595.28, 841.89];
  let cols = 2;
  let rows = 6;
  let isComfortable = true;

  if (paperSize === "a4") {
    pageSize = [595.28, 841.89]; // 210 x 297 mm
    if (capacity === 24) {
      cols = 3;
      rows = 8;
      isComfortable = false;
    } else if (capacity === 16) {
      cols = 2;
      rows = 8;
      isComfortable = false;
    } else {
      cols = 2;
      rows = 6;
      isComfortable = true;
    }
  } else if (paperSize === "f4") {
    // Folio / F4 in points: 215mm x 330mm = 609.45pt x 935.43pt
    pageSize = [609.45, 935.43];
    if (capacity === 28) {
      cols = 3;
      rows = 10;
      isComfortable = false;
    } else if (capacity === 18) {
      cols = 2;
      rows = 9;
      isComfortable = false;
    } else {
      cols = 2;
      rows = 7;
      isComfortable = true;
    }
  } else if (paperSize === "a3") {
    pageSize = [841.89, 1190.55]; // 297 x 420 mm
    if (capacity === 48) {
      cols = 4;
      rows = 12;
      isComfortable = false;
    } else if (capacity === 32) {
      cols = 4;
      rows = 8;
      isComfortable = true;
    } else {
      cols = 3;
      rows = 8;
      isComfortable = true;
    }
  }

  // Calculate items width and height percentages
  const itemWidthPct = `${(100 / cols) - (cols === 2 ? 1.5 : cols === 3 ? 1.2 : 0.9)}%`;
  const itemHeightPct = `${(100 / rows) - (rows <= 6 ? 1.2 : rows <= 8 ? 1.0 : 0.8)}%`;

  return (
    <Document>
      <Page size={pageSize} style={styles.page}>
        <View style={styles.gridContainer}>
          {Array.from({ length: capacity }).map((_, idx) => {
            let isBesar = true;
            if (mode === "all_kecil") isBesar = false;
            else if (mode === "split") isBesar = idx < countBesar;
            const gizi = isBesar ? giziBesar : giziKecil;

            return (
              <View
                key={idx}
                style={[
                  styles.card,
                  {
                    width: itemWidthPct,
                    height: itemHeightPct,
                    padding: isComfortable ? 6 : 4,
                  },
                ]}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image
                    src="/images/logo-bgn.png"
                    style={{
                      height: isComfortable ? 22 : 16,
                      width: isComfortable ? 22 : 16,
                      objectFit: "contain",
                    }}
                  />
                  <View style={{ flex: 1, marginLeft: 4 }}>
                    <Text style={[styles.titleBgn, { fontSize: isComfortable ? 7.5 : 6 }]}>
                      BADAN GIZI NASIONAL
                    </Text>
                    <Text style={[styles.titleSppg, { fontSize: isComfortable ? 6.5 : 5.2 }]}>
                      {sppgName}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <View
                      style={[
                        styles.badgePorsi,
                        {
                          backgroundColor: isBesar ? "#1e3a8a" : "#065f46",
                          paddingHorizontal: 4,
                          paddingVertical: 1.5,
                        },
                      ]}
                    >
                      <Text style={[styles.badgePorsiText, { fontSize: isComfortable ? 6.5 : 5 }]}>
                        PORSI {isBesar ? "BESAR" : "KECIL"}
                      </Text>
                    </View>
                    <Text style={[styles.dateText, { fontSize: isComfortable ? 6 : 5 }]}>
                      TGL: {fmtDate}
                    </Text>
                  </View>
                </View>

                {/* Menu */}
                <View style={{ marginVertical: 1.5 }}>
                  <Text style={{ fontSize: isComfortable ? 7 : 5.8, color: "#334155" }}>
                    <Text style={{ fontWeight: "bold" }}>MENU: </Text>
                    <Text style={{ fontWeight: "heavy", color: "#020617" }}>{menu}</Text>
                  </Text>
                </View>

                {/* Nutrition Box */}
                <View style={[styles.nutritionBox, { padding: isComfortable ? 3 : 2 }]}>
                  <Text style={[styles.nutritionTitle, { fontSize: isComfortable ? 5.5 : 4.5 }]}>
                    NILAI GIZI HARIAN:
                  </Text>
                  <View style={styles.nutritionRow}>
                    <Text style={[styles.nutritionItem, { fontSize: isComfortable ? 6 : 4.8 }]}>
                      Energi: <Text style={{ fontWeight: "bold" }}>{gizi.energi || 0} kcal</Text>
                    </Text>
                    <Text style={[styles.nutritionItem, { fontSize: isComfortable ? 6 : 4.8 }]}>
                      Protein: <Text style={{ fontWeight: "bold" }}>{gizi.protein || 0} g</Text>
                    </Text>
                    <Text style={[styles.nutritionItem, { fontSize: isComfortable ? 6 : 4.8 }]}>
                      Lemak: <Text style={{ fontWeight: "bold" }}>{gizi.lemak || 0} g</Text>
                    </Text>
                    <Text style={[styles.nutritionItem, { fontSize: isComfortable ? 6 : 4.8 }]}>
                      Karbo: <Text style={{ fontWeight: "bold" }}>{gizi.karbohidrat || 0} g</Text>
                    </Text>
                    <Text style={[styles.nutritionItem, { fontSize: isComfortable ? 6 : 4.8 }]}>
                      Serat: <Text style={{ fontWeight: "bold" }}>{gizi.serat || 0} g</Text>
                    </Text>
                  </View>
                </View>

                {/* Time row */}
                <View style={[styles.timeRow, { paddingVertical: 1.5, marginVertical: 1 }]}>
                  <Text style={{ fontSize: isComfortable ? 5.8 : 4.6, color: "#334155" }}>
                    Selesai: <Text style={{ fontWeight: "bold" }}>{formatTime(jamSelesai)}</Text>
                  </Text>
                  <Text style={{ fontSize: isComfortable ? 5.8 : 4.6, color: "#991b1b", fontWeight: "bold" }}>
                    Batas: {formatTime(jamBatas)}
                  </Text>
                </View>

                {/* Warnings */}
                <View style={styles.warningBox}>
                  <Text style={[styles.warningText, { fontSize: isComfortable ? 5.2 : 4.2 }]}>
                    DILARANG MEMBAWA PULANG MAKANAN MBG
                  </Text>
                  <Text style={[styles.warningSubText, { fontSize: isComfortable ? 4.8 : 3.8 }]}>
                    JANGAN DIKONSUMSI JIKA BERLENDIR / BERBAU / BERUBAH RASA
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 12,
    backgroundColor: "#ffffff",
    fontFamily: "Times-Roman",
  },
  gridContainer: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignContent: "space-between",
  },
  card: {
    borderWidth: 1,
    borderColor: "#0f172a",
    borderRadius: 3,
    backgroundColor: "#ffffff",
    flexDirection: "column",
    justifyContent: "space-between",
    boxSizing: "border-box",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
    paddingBottom: 2,
    marginBottom: 2,
  },
  titleBgn: {
    fontWeight: "heavy",
    color: "#0f172a",
    textTransform: "uppercase",
  },
  titleSppg: {
    fontWeight: "bold",
    color: "#334155",
  },
  badgePorsi: {
    borderRadius: 2,
  },
  badgePorsiText: {
    color: "#ffffff",
    fontWeight: "heavy",
    textTransform: "uppercase",
  },
  dateText: {
    color: "#475569",
    fontWeight: "bold",
    marginTop: 1,
  },
  nutritionBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 2,
    marginVertical: 1,
  },
  nutritionTitle: {
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 1,
  },
  nutritionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  nutritionItem: {
    color: "#1e293b",
    marginRight: 4,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
  },
  warningBox: {
    borderTopWidth: 0.8,
    borderTopColor: "#0f172a",
    paddingTop: 1.5,
    marginTop: 1,
    alignItems: "center",
  },
  warningText: {
    color: "#991b1b",
    fontWeight: "heavy",
    textAlign: "center",
  },
  warningSubText: {
    color: "#0f172a",
    fontWeight: "bold",
    textAlign: "center",
  },
});
