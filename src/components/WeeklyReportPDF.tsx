import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

interface ReportData {
  id: string;
  tanggal?: string | null;
  created_at?: string | null;
  menu?: string | null;
  photo_url?: string | null;
  energi?: number | null;
  protein?: number | null;
  lemak?: number | null;
  karbohidrat?: number | null;
  serat?: number | null;
  extracted_data?: {
    sppg_name?: string | null;
    "Porsi Besar"?: { Energi?: number; Protein?: number; Lemak?: number; Karbohidrat?: number; Serat?: number };
    "Porsi Kecil"?: { Energi?: number; Protein?: number; Lemak?: number; Karbohidrat?: number; Serat?: number };
    gizi_besar?: { Energi?: number; Protein?: number; Lemak?: number; Karbohidrat?: number; Serat?: number };
    gizi_kecil?: { Energi?: number; Protein?: number; Lemak?: number; Karbohidrat?: number; Serat?: number };
  } | null;
}

interface Props {
  reports: ReportData[];
  kabupaten: string;
  kecamatan: string;
  sppgDetailName: string;
  startDate: string;
  endDate: string;
  namaPengawasGizi: string;
  namaKepalaSppg: string;
}

const MONTH = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function fmt(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const p = dateStr.split("T")[0].split("-");
  if (p.length === 3) {
    const mi = parseInt(p[1], 10) - 1;
    const d = parseInt(p[2], 10);
    if (mi >= 0 && mi < 12 && !isNaN(d)) return `${d} ${MONTH[mi]} ${p[0]}`;
  }
  const dt = new Date(dateStr);
  if (!isNaN(dt.getTime())) return `${dt.getDate()} ${MONTH[dt.getMonth()]} ${dt.getFullYear()}`;
  return dateStr;
}

const acronyms = ["SPPG", "BGN", "PMT", "PAUD", "TK", "SD", "SMP", "SMA", "KAB", "KOTA", "PK", "B3", "PIC", "WIB", "WIT", "WITA"];
function toTitleCase(str?: string | null): string {
  if (!str) return "";
  return str.split(/\s+/).map((word) => {
    if (!word) return "";
    const upper = word.toUpperCase();
    if (acronyms.includes(upper)) return upper;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Times-Roman", fontSize: 10, color: "#000" },
  header: { textAlign: "center", marginBottom: 20, fontFamily: "Times-Roman" },
  headerWrap: { fontFamily: "Times-Roman", textTransform: "uppercase" },
  logo: { width: 48, height: 48, marginBottom: 8, alignSelf: "center" },
  h1: { fontSize: 14, fontWeight: "bold", marginBottom: 2 },
  h2: { fontSize: 12, fontWeight: "bold", marginTop: 2, marginBottom: 2 },
  h3: { fontSize: 11, fontWeight: "bold", marginTop: 2 },
  periodText: { fontSize: 9, color: "#475569", marginTop: 2, fontFamily: "Helvetica" },
  table: { width: "100%", borderStyle: "solid", borderWidth: 1, borderColor: "#000", marginTop: 12 },
  headerRow: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottomWidth: 1, borderBottomColor: "#000", fontWeight: "bold" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000" },
  cellStyle: { padding: 10, fontSize: 10, fontFamily: "Helvetica" },
  cellTgl: { width: "12%", padding: 10, textAlign: "center", fontSize: 10, fontFamily: "Helvetica", fontWeight: "semibold", borderRightWidth: 1, borderRightColor: "#000" },
  cellMenu: { width: "28%", padding: 10, fontSize: 10, fontFamily: "Helvetica", borderRightWidth: 1, borderRightColor: "#000" },
  cellGizi: { width: "35%", padding: 10, fontSize: 10, fontFamily: "Helvetica", borderRightWidth: 1, borderRightColor: "#000" },
  cellFoto: { width: "25%", padding: 8, textAlign: "center", fontSize: 10, fontFamily: "Helvetica" },
  noBorder: { borderRightWidth: 0 },
  giziLabel: { fontWeight: "bold", color: "#000", marginBottom: 2 },
  giziValue: { marginLeft: 10, color: "#1e293b" },
  giziSep: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 6, marginTop: 8 },
  photo: { maxWidth: 160, maxHeight: 160, objectFit: "contain" },
  emptyPhotoBox: { height: 112, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1, borderStyle: "dashed", borderColor: "#e2e8f0", borderRadius: 4 },
  emptyPhotoText: { color: "#94a3b8", fontStyle: "italic", fontSize: 10 },
  noData: { textAlign: "center", padding: 24, color: "#666", fontSize: 10, fontFamily: "Helvetica" },
  footer: { marginTop: 48, flexDirection: "row", justifyContent: "space-around", textAlign: "center", fontSize: 10, fontFamily: "Times-Roman" },
  sigCol: { width: "40%" },
  sigSpace: { marginBottom: 50 },
  sigLine: { fontWeight: "bold", borderBottomWidth: 1, borderBottomColor: "#000", paddingBottom: 2, minWidth: 160 },
  italic: { fontStyle: "italic" },
});

export default function WeeklyReportPDF({ reports, kabupaten, kecamatan, sppgDetailName, startDate, endDate, namaPengawasGizi, namaKepalaSppg }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image style={styles.logo} src="/images/logo-bgn.png" />
          <View style={styles.headerWrap}>
            <Text style={styles.h1}>LAPORAN MAKAN BERGIZI GRATIS</Text>
            <Text style={styles.h2}>{`SATUAN PELAYANAN PEMENUHAN GIZI (SPPG) ${kabupaten || "LOMBOK TIMUR"}`}</Text>
            <Text style={styles.h3}>{kecamatan ? `${kecamatan}, ` : ""}{sppgDetailName || "SIKUR 02"}</Text>
          </View>
          <Text style={styles.periodText}>{`Periode: ${fmt(startDate)} s/d ${fmt(endDate)}`}</Text>
        </View>

        {/* Table */}
        {reports.length === 0 ? (
          <Text style={styles.noData}>Tidak ada laporan harian pada rentang tanggal ini.</Text>
        ) : (
          <View>
            <View style={styles.headerRow}>
              <Text style={[styles.cellStyle, styles.cellTgl]}>TGL</Text>
              <Text style={[styles.cellStyle, styles.cellMenu]}>NAMA MENU</Text>
              <Text style={[styles.cellStyle, styles.cellGizi]}>NILAI GIZI</Text>
              <Text style={[styles.cellStyle, styles.cellFoto, styles.noBorder]}>DOKUMENTASI</Text>
            </View>
            {reports.map((r, idx) => {
              const gb = r.extracted_data?.["Porsi Besar"] || r.extracted_data?.gizi_besar || {};
              const gk = r.extracted_data?.["Porsi Kecil"] || r.extracted_data?.gizi_kecil || {};
              const gbEnergi = (gb as any).Energi ?? r.energi;
              const gbProtein = (gb as any).Protein ?? r.protein;
              const gbLemak = (gb as any).Lemak ?? r.lemak;
              const gbKh = (gb as any).Karbohidrat ?? r.karbohidrat;
              const gbSerat = (gb as any).Serat ?? r.serat;
              const gkEnergi = (gk as any).Energi;
              const gkProtein = (gk as any).Protein;
              const gkLemak = (gk as any).Lemak;
              const gkKh = (gk as any).Karbohidrat;
              const gkSerat = (gk as any).Serat;
              const menuItems = (r.menu || "").split(/[\n,*•]+/).map((s) => s.trim()).filter(Boolean);
              const isLast = idx === reports.length - 1;
              const lastRowStyle = isLast ? { borderBottomWidth: 0 } : {};
              return (
                <View key={r.id || idx} style={[styles.row, lastRowStyle]}>
                  <Text style={styles.cellTgl}>{fmt(r.tanggal || r.created_at)}</Text>
                  <View style={styles.cellMenu}>
                    {menuItems.length > 0 ? menuItems.map((item, i) => (
                      <Text key={i} style={{ marginBottom: 4 }}>{`• ${toTitleCase(item)}`}</Text>
                    )) : <Text style={styles.italic}>-</Text>}
                  </View>
                  <View style={styles.cellGizi}>
                    <Text style={styles.giziLabel}>• Porsi kecil</Text>
                    <View style={styles.giziValue}>
                      <Text>Energi : {gkEnergi != null ? `${gkEnergi} kkal` : "-"}</Text>
                      <Text>Protein : {gkProtein != null ? `${gkProtein} gram` : "-"}</Text>
                      <Text>Lemak : {gkLemak != null ? `${gkLemak} gram` : "-"}</Text>
                      <Text>Karbohidrat : {gkKh != null ? `${gkKh} gram` : "-"}</Text>
                      <Text>Serat : {gkSerat != null ? `${gkSerat} gram` : "-"}</Text>
                    </View>
                    <View style={styles.giziSep}>
                      <Text style={styles.giziLabel}>• Porsi besar</Text>
                      <View style={styles.giziValue}>
                        <Text>Energi : {gbEnergi != null ? `${gbEnergi} kkal` : "-"}</Text>
                        <Text>Protein : {gbProtein != null ? `${gbProtein} gram` : "-"}</Text>
                        <Text>Lemak : {gbLemak != null ? `${gbLemak} gram` : "-"}</Text>
                        <Text>Karbohidrat : {gbKh != null ? `${gbKh} gram` : "-"}</Text>
                        <Text>Serat : {gbSerat != null ? `${gbSerat} gram` : "-"}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.cellFoto, styles.noBorder]}>
                    {r.photo_url ? (
                      <Image style={styles.photo} src={r.photo_url} />
                    ) : (
                      <View style={styles.emptyPhotoBox}>
                        <Text style={styles.emptyPhotoText}>Tidak Ada Foto</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Signature */}
        {reports.length > 0 && (
          <View style={styles.footer}>
            <View style={styles.sigCol}>
              <Text style={styles.sigSpace}>Pengawas Gizi SPPG</Text>
              <Text style={styles.sigLine}>{`( ${toTitleCase(namaPengawasGizi) || "............................................"} )`}</Text>
            </View>
            <View style={styles.sigCol}>
              <Text style={styles.sigSpace}>Kepala SPPG</Text>
              <Text style={styles.sigLine}>{`( ${toTitleCase(namaKepalaSppg) || "............................................"} )`}</Text>
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
