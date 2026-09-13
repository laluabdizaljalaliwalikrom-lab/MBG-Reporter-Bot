"use client";

import React from "react";
import { PaperSize } from "@/components/StickerPrintSheet";

export interface StickerPrintSheetSEProps {
  paperSize?: PaperSize;
  capacity: number; // e.g. 10, 12, 14, 16, 20
  pairMode?: "pair" | "left_only" | "right_only";
  sppgName: string;
  subWilayah?: string;
  menu?: string;
  tanggal?: string;
  jamBatas?: string;
  waPengaduan?: string;
  tiktokPengaduan?: string;
  igPengaduan?: string;
}

export default function StickerPrintSheetSE(props: StickerPrintSheetSEProps) {
  const {
    paperSize = "a4",
    capacity = 12,
    pairMode = "pair",
    sppgName = "SPPG KOTA BANDUNG",
    subWilayah = "Kawasan Pelayanan Mandiri",
    jamBatas = "10.00",
    waPengaduan = "081234567890",
    tiktokPengaduan = "sppg_official",
    igPengaduan = "sppg_official",
  } = props;

  // Format jam display (e.g. 10:00 -> 10.00)
  const formatJamDisplay = (val: string) => {
    if (!val) return "10.00";
    return val.replace(":", ".");
  };

  // Dimensions configuration per paper size
  let sheetWidth = "210mm";
  let sheetHeight = "296mm";
  let gridHeight = "293mm";
  let gridCols = "repeat(2, 1fr)";
  let gridRows = "repeat(6, 1fr)";

  // Scale tier for font & padding adaptation
  let tier: "jumbo" | "large" | "medium" | "compact" = "large";

  if (paperSize === "a4") {
    sheetWidth = "210mm";
    sheetHeight = "296mm";
    gridHeight = "293mm";
    if (capacity <= 6) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(3, 1fr)";
      tier = "jumbo";
    } else if (capacity <= 8) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(4, 1fr)";
      tier = "jumbo";
    } else if (capacity <= 10) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(5, 1fr)";
      tier = "large";
    } else if (capacity <= 12) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(6, 1fr)";
      tier = "large";
    } else if (capacity <= 16) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(8, 1fr)";
      tier = "medium";
    } else {
      gridCols = "repeat(3, 1fr)";
      gridRows = "repeat(8, 1fr)";
      tier = "compact";
    }
  } else if (paperSize === "f4") {
    sheetWidth = "215mm";
    sheetHeight = "329mm";
    gridHeight = "326mm";
    if (capacity <= 6) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(3, 1fr)";
      tier = "jumbo";
    } else if (capacity <= 8) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(4, 1fr)";
      tier = "jumbo";
    } else if (capacity <= 10) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(5, 1fr)";
      tier = "large";
    } else if (capacity <= 14) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(7, 1fr)";
      tier = "large";
    } else if (capacity <= 18) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(9, 1fr)";
      tier = "medium";
    } else {
      gridCols = "repeat(3, 1fr)";
      gridRows = "repeat(10, 1fr)";
      tier = "compact";
    }
  } else if (paperSize === "a3") {
    sheetWidth = "297mm";
    sheetHeight = "419mm";
    gridHeight = "416mm";
    if (capacity <= 8) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(4, 1fr)";
      tier = "jumbo";
    } else if (capacity <= 12) {
      gridCols = "repeat(3, 1fr)";
      gridRows = "repeat(4, 1fr)";
      tier = "jumbo";
    } else if (capacity <= 16) {
      gridCols = "repeat(2, 1fr)";
      gridRows = "repeat(8, 1fr)";
      tier = "large";
    } else if (capacity <= 24) {
      gridCols = "repeat(3, 1fr)";
      gridRows = "repeat(8, 1fr)";
      tier = "large";
    } else if (capacity <= 32) {
      gridCols = "repeat(4, 1fr)";
      gridRows = "repeat(8, 1fr)";
      tier = "medium";
    } else {
      gridCols = "repeat(4, 1fr)";
      gridRows = "repeat(12, 1fr)";
      tier = "compact";
    }
  }

  // Dimension helpers
  const logoH = tier === "jumbo" ? "24px" : tier === "large" ? "19px" : tier === "medium" ? "16px" : "13px";
  const titleBgn = tier === "jumbo" ? "7.5pt" : tier === "large" ? "6.2pt" : tier === "medium" ? "5.4pt" : "4.8pt";
  const titleSppg = tier === "jumbo" ? "8pt" : tier === "large" ? "6.8pt" : tier === "medium" ? "5.8pt" : "5pt";
  const subWilayahSize = tier === "jumbo" ? "5.8pt" : tier === "large" ? "4.8pt" : tier === "medium" ? "4.2pt" : "3.8pt";
  const noticeTitleSize = tier === "jumbo" ? "7.8pt" : tier === "large" ? "6.8pt" : tier === "medium" ? "5.8pt" : "5.2pt";
  const timeBigSize = tier === "jumbo" ? "28pt" : tier === "large" ? "22pt" : tier === "medium" ? "17pt" : "14pt";
  const warningTextSize = tier === "jumbo" ? "6.8pt" : tier === "large" ? "5.6pt" : tier === "medium" ? "4.8pt" : "4.2pt";
  const contactTextSize = tier === "jumbo" ? "6.8pt" : tier === "large" ? "5.6pt" : tier === "medium" ? "4.8pt" : "4.2pt";
  const gridGap = tier === "jumbo" ? "2mm" : tier === "large" ? "1.6mm" : "1.2mm";

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
        fontFamily: "'Arial', 'Segoe UI', sans-serif",
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
          let isLeft = true;
          if (pairMode === "right_only") {
            isLeft = false;
          } else if (pairMode === "pair") {
            isLeft = idx % 2 === 0;
          }

          if (isLeft) {
            // ─── LABEL SISI KIRI (WAKTU BATAS KONSUMSI) ───
            return (
              <div
                key={idx}
                style={{
                  border: "1.5px solid #1e293b",
                  borderRadius: "5px",
                  backgroundColor: "#ffffff",
                  boxSizing: "border-box",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "row",
                  position: "relative",
                  height: "100%",
                }}
              >
                {/* Strip ornamen sayur & buah di tepi kiri */}
                <div
                  style={{
                    width: tier === "jumbo" ? "24px" : tier === "large" ? "19px" : "15px",
                    backgroundColor: "#fef08a",
                    borderRight: "1px dashed #cbd5e1",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "space-around",
                    padding: "2px 0",
                    flexShrink: 0,
                    userSelect: "none",
                  }}
                >
                  <span style={{ fontSize: tier === "jumbo" ? "13px" : "10px" }} role="img" aria-label="vegetable">🥦</span>
                  <span style={{ fontSize: tier === "jumbo" ? "13px" : "10px" }} role="img" aria-label="fruit">🍌</span>
                  <span style={{ fontSize: tier === "jumbo" ? "13px" : "10px" }} role="img" aria-label="carrot">🥕</span>
                  <span style={{ fontSize: tier === "jumbo" ? "13px" : "10px" }} role="img" aria-label="avocado">🥑</span>
                  <span style={{ fontSize: tier === "jumbo" ? "13px" : "10px" }} role="img" aria-label="tomato">🍅</span>
                </div>

                {/* Konten Label Kiri */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: tier === "jumbo" ? "3.5mm 4mm" : tier === "large" ? "2.5mm 3.2mm" : "2mm 2.5mm",
                    minWidth: 0,
                  }}
                >
                  {/* Top Header: Logo BGN + Box SPPG */}
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", borderBottom: "1px solid #0f172a", paddingBottom: "2.5px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/logo-bgn.png"
                      alt="Logo BGN"
                      style={{ height: logoH, width: "auto", objectFit: "contain", flexShrink: 0 }}
                    />
                    <div style={{ lineHeight: "1.05", flexShrink: 0 }}>
                      <div style={{ fontSize: titleBgn, fontWeight: 900, color: "#0f172a", letterSpacing: "0.2px" }}>
                        BADAN
                      </div>
                      <div style={{ fontSize: titleBgn, fontWeight: 900, color: "#0f172a", letterSpacing: "0.2px" }}>
                        GIZI
                      </div>
                      <div style={{ fontSize: titleBgn, fontWeight: 900, color: "#0f172a", letterSpacing: "0.2px" }}>
                        NASIONAL
                      </div>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        borderLeft: "1.5px solid #0f172a",
                        paddingLeft: "5px",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          fontSize: titleSppg,
                          fontWeight: 900,
                          color: "#0f172a",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: "1.1",
                        }}
                      >
                        {sppgName}
                      </div>
                      <div
                        style={{
                          fontSize: subWilayahSize,
                          color: "#475569",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: "1.1",
                          marginTop: "1px",
                        }}
                      >
                        {subWilayah || "Kawasan Pelayanan Mandiri"}
                      </div>
                    </div>
                  </div>

                  {/* Center: Kotak HARUS DIKONSUMSI SEBELUM + JAM BESAR */}
                  <div
                    style={{
                      border: "2px solid #0f172a",
                      borderRadius: "6px",
                      padding: tier === "jumbo" ? "4px 6px" : "2px 4px",
                      textAlign: "center",
                      backgroundColor: "#ffffff",
                      margin: "2px 0",
                    }}
                  >
                    <div
                      style={{
                        fontSize: noticeTitleSize,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        color: "#0f172a",
                        letterSpacing: "0.4px",
                        lineHeight: 1.15,
                      }}
                    >
                      HARUS DIKONSUMSI SEBELUM
                    </div>
                    <div
                      style={{
                        fontSize: timeBigSize,
                        fontWeight: 900,
                        color: "#000000",
                        lineHeight: "0.95",
                        letterSpacing: "0.5px",
                        marginTop: "1px",
                        fontFamily: "'Impact', 'Arial Black', sans-serif",
                      }}
                    >
                      {formatJamDisplay(jamBatas)}
                    </div>
                  </div>

                  {/* Kaki label kiri */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "4.5pt", color: "#64748b", fontWeight: "bold" }}>
                    <span>SE KEPALA BGN NO. 21 / 2026</span>
                    <span>SEGEL KIRI</span>
                  </div>
                </div>
              </div>
            );
          } else {
            // ─── LABEL SISI KANAN (EDUKASI & PENGADUAN) ───
            return (
              <div
                key={idx}
                style={{
                  border: "1.5px solid #1e293b",
                  borderRadius: "5px",
                  backgroundColor: "#ffffff",
                  boxSizing: "border-box",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "row",
                  position: "relative",
                  height: "100%",
                  padding: tier === "jumbo" ? "3.5mm 4mm" : tier === "large" ? "2.5mm 3.2mm" : "2mm 2.5mm",
                  gap: "4px",
                }}
              >
                {/* Bagian Kiri: 2 Box Larangan & Peringatan Konsumsi */}
                <div
                  style={{
                    flex: "1 1 50%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "3px",
                  }}
                >
                  {/* Peringatan 1: TIDAK BOLEH DIBAWA PULANG */}
                  <div
                    style={{
                      border: "1.5px solid #0f172a",
                      borderRadius: "5px",
                      padding: "2px 3px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      flex: 1,
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {/* SVG Ompreng Dilarang */}
                    <svg
                      viewBox="0 0 40 40"
                      style={{
                        width: tier === "jumbo" ? "24px" : tier === "large" ? "18px" : "15px",
                        height: tier === "jumbo" ? "24px" : tier === "large" ? "18px" : "15px",
                      }}
                    >
                      <circle cx="20" cy="20" r="17" fill="none" stroke="#dc2626" strokeWidth="3" />
                      <line x1="8" y1="8" x2="32" y2="32" stroke="#dc2626" strokeWidth="3" />
                      {/* Ikon box ompreng sederhana */}
                      <rect x="11" y="14" width="18" height="12" rx="2" fill="none" stroke="#0f172a" strokeWidth="1.8" />
                      <line x1="14" y1="12" x2="26" y2="12" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span
                      style={{
                        fontSize: warningTextSize,
                        fontWeight: 900,
                        color: "#0f172a",
                        lineHeight: 1.1,
                        marginTop: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      TIDAK BOLEH DIBAWA PULANG.
                    </span>
                  </div>

                  {/* Peringatan 2: SEGERA KONSUMSI SETELAH DITERIMA */}
                  <div
                    style={{
                      border: "1.5px solid #0f172a",
                      borderRadius: "5px",
                      padding: "2px 3px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      flex: 1,
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {/* SVG Sendok Garpu */}
                    <svg
                      viewBox="0 0 40 40"
                      style={{
                        width: tier === "jumbo" ? "24px" : tier === "large" ? "18px" : "15px",
                        height: tier === "jumbo" ? "24px" : tier === "large" ? "18px" : "15px",
                      }}
                    >
                      <circle cx="20" cy="20" r="17" fill="#0f172a" />
                      {/* Fork */}
                      <path d="M15 11v6c0 1.5.8 2.6 2 2.9V28h2V19.9c1.2-.3 2-1.4 2-2.9v-6h-1.2v4h-1v-4h-0.8v4h-1v-4z" fill="#ffffff" />
                      {/* Spoon */}
                      <path d="M23 11c-1.8 0-3 1.8-3 3.8 0 1.8 1.1 3.2 2.3 3.5V28h2V18.3c1.2-.3 2.3-1.7 2.3-3.5 0-2-1.2-3.8-3.6-3.8z" fill="#ffffff" />
                    </svg>
                    <span
                      style={{
                        fontSize: warningTextSize,
                        fontWeight: 900,
                        color: "#0f172a",
                        lineHeight: 1.1,
                        marginTop: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      SEGERA KONSUMSI SETELAH DITERIMA
                    </span>
                  </div>
                </div>

                {/* Bagian Kanan: Kotak Pengaduan Dashed */}
                <div
                  style={{
                    flex: "1 1 50%",
                    border: "1.5px dashed #0f172a",
                    borderRadius: "6px",
                    padding: tier === "jumbo" ? "3px 4px" : "2px 3px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    backgroundColor: "#fafafa",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: noticeTitleSize,
                        fontWeight: 900,
                        color: "#0f172a",
                        lineHeight: 1.1,
                      }}
                    >
                      Kotak Pengaduan
                    </div>
                  </div>

                  {/* List Akun Medsos / Kontak */}
                  <div style={{ display: "flex", flexDirection: "column", gap: tier === "jumbo" ? "3px" : "2px" }}>
                    {/* WhatsApp */}
                    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      <svg viewBox="0 0 24 24" style={{ width: tier === "jumbo" ? "12px" : "10px", height: tier === "jumbo" ? "12px" : "10px", flexShrink: 0 }} fill="#16a34a">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zm0 18.15c-1.52 0-3.01-.41-4.31-1.18l-.31-.18-3.2.84.85-3.12-.2-.32c-.84-1.34-1.29-2.89-1.29-4.48 0-4.51 3.67-8.18 8.18-8.18 4.51 0 8.18 3.67 8.18 8.18 0 4.51-3.67 8.18-8.18 8.18zm4.49-6.13c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.47c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.08 0 1.23.89 2.41 1.02 2.58.12.16 1.76 2.68 4.26 3.76.6.26 1.06.41 1.42.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.47-.28z"/>
                      </svg>
                      <span
                        style={{
                          fontSize: contactTextSize,
                          fontWeight: 700,
                          color: "#1e293b",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {waPengaduan || "XXXXXXXXX"}
                      </span>
                    </div>

                    {/* TikTok */}
                    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      <svg viewBox="0 0 24 24" style={{ width: tier === "jumbo" ? "12px" : "10px", height: tier === "jumbo" ? "12px" : "10px", flexShrink: 0 }} fill="#000000">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.35a6.34 6.34 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.28 8.28 0 0 0 4.84 1.54V6.84c-.36-.02-.72-.07-1.07-.15z"/>
                      </svg>
                      <span
                        style={{
                          fontSize: contactTextSize,
                          fontWeight: 600,
                          color: "#334155",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {tiktokPengaduan ? `@${tiktokPengaduan.replace(/^@/, "")}` : "sppg.xxxxxxx"}
                      </span>
                    </div>

                    {/* Instagram */}
                    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      <svg viewBox="0 0 24 24" style={{ width: tier === "jumbo" ? "12px" : "10px", height: tier === "jumbo" ? "12px" : "10px", flexShrink: 0 }} fill="#e1306c">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      <span
                        style={{
                          fontSize: contactTextSize,
                          fontWeight: 600,
                          color: "#334155",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {igPengaduan ? `@${igPengaduan.replace(/^@/, "")}` : "sppg_xxxxxxx"}
                      </span>
                    </div>
                  </div>

                  {/* Kaki label kanan */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "4.5pt", color: "#64748b", fontWeight: "bold" }}>
                    <span>LAYANAN PENGADUAN</span>
                    <span>SEGEL KANAN</span>
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
