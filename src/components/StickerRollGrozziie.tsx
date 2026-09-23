"use client";

import React from "react";

export interface StickerRollGrozziieProps {
  widthMm?: number; // e.g. 80
  heightMm?: number; // e.g. 130
  sppgName: string;
  subWilayah?: string;
  menu?: string;
  tanggal?: string;
  jamSelesai?: string;
  jamBatas?: string;
  waPengaduan?: string;
  tiktokPengaduan?: string;
  igPengaduan?: string;
  pairMode?: "both" | "left_only" | "right_only"; // both = 2 label berurutan (kiri lalu kanan)
}

export default function StickerRollGrozziie(props: StickerRollGrozziieProps) {
  const {
    widthMm = 80,
    heightMm = 130,
    sppgName = "SPPG KOTA BANDUNG",
    subWilayah = "Kawasan Pelayanan Mandiri",
    menu = "Nasi Putih, Ayam Goreng, Tumis Buncis, Buah",
    tanggal = "",
    jamSelesai = "05:30",
    jamBatas = "10.00",
    waPengaduan = "081234567890",
    tiktokPengaduan = "sppg_official",
    igPengaduan = "sppg_official",
    pairMode = "both",
  } = props;

  // Format tanggal display (DD/MM/YYYY)
  const fmtDate = tanggal ? tanggal.split("-").reverse().join("/") : "-";

  // Format jam display (e.g. 10:00 -> 10.00)
  const formatJamDisplay = (val: string) => {
    if (!val) return "10.00";
    return val.replace(":", ".");
  };

  // Komponen Label Segel Kiri
  const renderLeftLabel = (keySuffix: string = "left") => (
    <div
      key={`grozziie-left-${keySuffix}`}
      className="grozziie-label-page"
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        boxSizing: "border-box",
        backgroundColor: "#ffffff",
        color: "#000000",
        padding: "3.5mm",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        border: "1.5px solid #0f172a",
        fontFamily: "'Arial', 'Segoe UI', sans-serif",
        position: "relative",
        pageBreakAfter: "always",
        breakAfter: "page",
        overflow: "hidden",
      }}
    >
      {/* ── LIDAH LIPAT SEGEL ATAS (Untuk ditempel melingkar di bibir ompreng) ── */}
      <div
        style={{
          borderBottom: "2px dashed #475569",
          backgroundColor: "#f8fafc",
          padding: "3px 4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "8pt",
          fontWeight: 900,
          color: "#334155",
          letterSpacing: "1.5px",
        }}
      >
        <span>▲ LIPAT & TEMPEL KE OMPRENG</span>
        <span>SEGEL KIRI ▲</span>
      </div>

      {/* ── HEADER: LOGO BGN + KOP SPPG ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          borderBottom: "1.8px solid #0f172a",
          padding: "4px 0",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo-bgn-new.png"
          alt="Badan Gizi Nasional"
          style={{
            height: "38px",
            width: "auto",
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "7pt",
              fontWeight: 700,
              color: "#475569",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            BADAN GIZI NASIONAL
          </div>
          <div
            style={{
              fontSize: sppgName.length > 25 ? "9.5pt" : "11pt",
              fontWeight: 900,
              color: "#0f172a",
              textTransform: "uppercase",
              lineHeight: 1.15,
            }}
          >
            {sppgName}
          </div>
          <div
            style={{
              fontSize: "7pt",
              fontWeight: 600,
              color: "#64748b",
              marginTop: "1px",
            }}
          >
            {subWilayah || "Kawasan Pelayanan Mandiri"}
          </div>
        </div>
      </div>

      {/* ── INFORMASI PRODUKSI (TANGGAL & JAM SELESAI MASAK) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px",
          backgroundColor: "#f1f5f9",
          padding: "4px 6px",
          borderRadius: "4px",
          border: "1px solid #cbd5e1",
          fontSize: "7.5pt",
        }}
      >
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: "6.5pt", fontWeight: 700 }}>
            TANGGAL DISTRIBUSI:
          </span>
          <strong style={{ color: "#0f172a", fontSize: "8pt" }}>{fmtDate}</strong>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: "6.5pt", fontWeight: 700 }}>
            WAKTU SELESAI MASAK:
          </span>
          <strong style={{ color: "#0f172a", fontSize: "8pt" }}>
            {jamSelesai ? (jamSelesai.includes("WITA") ? jamSelesai : `${jamSelesai} WITA`) : "-"}
          </strong>
        </div>
      </div>

      {/* ── KOTAK UTAMA: HARUS DIKONSUMSI SEBELUM (BATAS KONSUMSI) ── */}
      <div
        style={{
          border: "2.5px solid #0f172a",
          borderRadius: "8px",
          backgroundColor: "#ffffff",
          padding: "6px 4px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 0 0 1px #e2e8f0",
        }}
      >
        <div
          style={{
            fontSize: "9pt",
            fontWeight: 900,
            textTransform: "uppercase",
            color: "#0f172a",
            letterSpacing: "0.5px",
          }}
        >
          HARUS DIKONSUMSI SEBELUM
        </div>
        <div
          style={{
            fontSize: "38pt",
            fontWeight: 900,
            color: "#000000",
            lineHeight: 0.92,
            letterSpacing: "1px",
            marginTop: "3px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
          }}
        >
          {formatJamDisplay(jamBatas)}
        </div>
        <div
          style={{
            fontSize: "7.5pt",
            fontWeight: 800,
            color: "#dc2626",
            letterSpacing: "0.5px",
            marginTop: "3px",
          }}
        >
          MAKSIMAL 4 JAM DARI PRODUKSI
        </div>
      </div>

      {/* ── MENU MAKANAN ── */}
      <div
        style={{
          border: "1px solid #94a3b8",
          borderRadius: "5px",
          padding: "4px 6px",
          backgroundColor: "#f8fafc",
        }}
      >
        <span
          style={{
            fontSize: "6.5pt",
            fontWeight: 800,
            color: "#475569",
            textTransform: "uppercase",
            display: "block",
            letterSpacing: "0.5px",
          }}
        >
          MENU HARI INI:
        </span>
        <div
          style={{
            fontSize: "8pt",
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.25,
            marginTop: "1px",
          }}
        >
          {menu || "Menu Makanan Bergizi Gratis"}
        </div>
      </div>

      {/* ── FOOTER RESMI SE BGN ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "6pt",
          color: "#475569",
          fontWeight: 700,
          borderTop: "1.2px solid #0f172a",
          paddingTop: "3px",
        }}
      >
        <span>STANDAR SE KEPALA BGN NO. 21 / 2026</span>
        <span style={{ fontWeight: 900, color: "#0f172a" }}>GROZZIIE 80×130</span>
      </div>
    </div>
  );

  // Komponen Label Segel Kanan
  const renderRightLabel = (keySuffix: string = "right") => (
    <div
      key={`grozziie-right-${keySuffix}`}
      className="grozziie-label-page"
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        boxSizing: "border-box",
        backgroundColor: "#ffffff",
        color: "#000000",
        padding: "3.5mm",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        border: "1.5px solid #0f172a",
        fontFamily: "'Arial', 'Segoe UI', sans-serif",
        position: "relative",
        pageBreakAfter: "always",
        breakAfter: "page",
        overflow: "hidden",
      }}
    >
      {/* ── LIDAH LIPAT SEGEL ATAS ── */}
      <div
        style={{
          borderBottom: "2px dashed #475569",
          backgroundColor: "#f8fafc",
          padding: "3px 4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "8pt",
          fontWeight: 900,
          color: "#334155",
          letterSpacing: "1.5px",
        }}
      >
        <span>▲ LIPAT & TEMPEL KE OMPRENG</span>
        <span>SEGEL KANAN ▲</span>
      </div>

      {/* ── HEADER SINGKAT: SPPG & EDUKASI ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1.8px solid #0f172a",
          padding: "3px 0",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "6.5pt", fontWeight: 700, color: "#64748b" }}>
            UNIT PELAYANAN
          </div>
          <div
            style={{
              fontSize: "9.5pt",
              fontWeight: 900,
              color: "#0f172a",
              textTransform: "uppercase",
              lineHeight: 1.15,
            }}
          >
            {sppgName}
          </div>
        </div>
        <div
          style={{
            fontSize: "7pt",
            fontWeight: 800,
            color: "#16a34a",
            border: "1px solid #16a34a",
            padding: "2px 6px",
            borderRadius: "4px",
            backgroundColor: "#f0fdf4",
          }}
        >
          HIGIENE TERJAGA
        </div>
      </div>

      {/* ── 2 PERINGATAN KONSUMSI ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "5px",
        }}
      >
        {/* Peringatan 1: Tidak Boleh Dibawa Pulang */}
        <div
          style={{
            border: "1.8px solid #0f172a",
            borderRadius: "6px",
            padding: "4px 3px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            backgroundColor: "#ffffff",
          }}
        >
          <svg
            viewBox="0 0 40 40"
            style={{ width: "26px", height: "26px" }}
          >
            <circle cx="20" cy="20" r="17" fill="none" stroke="#dc2626" strokeWidth="3.2" />
            <line x1="8" y1="8" x2="32" y2="32" stroke="#dc2626" strokeWidth="3.2" />
            <rect x="11" y="14" width="18" height="12" rx="2" fill="none" stroke="#0f172a" strokeWidth="2" />
            <line x1="14" y1="12" x2="26" y2="12" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span
            style={{
              fontSize: "7.5pt",
              fontWeight: 900,
              color: "#0f172a",
              lineHeight: 1.15,
              marginTop: "3px",
              textTransform: "uppercase",
            }}
          >
            TIDAK BOLEH DIBAWA PULANG.
          </span>
        </div>

        {/* Peringatan 2: Segera Konsumsi */}
        <div
          style={{
            border: "1.8px solid #0f172a",
            borderRadius: "6px",
            padding: "4px 3px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            backgroundColor: "#ffffff",
          }}
        >
          <svg
            viewBox="0 0 40 40"
            style={{ width: "26px", height: "26px" }}
          >
            <circle cx="20" cy="20" r="17" fill="#0f172a" />
            <path d="M15 11v6c0 1.5.8 2.6 2 2.9V28h2V19.9c1.2-.3 2-1.4 2-2.9v-6h-1.2v4h-1v-4h-0.8v4h-1v-4z" fill="#ffffff" />
            <path d="M23 11c-1.8 0-3 1.8-3 3.8 0 1.8 1.1 3.2 2.3 3.5V28h2V18.3c1.2-.3 2.3-1.7 2.3-3.5 0-2-1.2-3.8-3.6-3.8z" fill="#ffffff" />
          </svg>
          <span
            style={{
              fontSize: "7.5pt",
              fontWeight: 900,
              color: "#0f172a",
              lineHeight: 1.15,
              marginTop: "3px",
              textTransform: "uppercase",
            }}
          >
            SEGERA KONSUMSI SETELAH DITERIMA
          </span>
        </div>
      </div>

      {/* ── KOTAK PENGADUAN LENGKAP ── */}
      <div
        style={{
          border: "2px dashed #0f172a",
          borderRadius: "6px",
          padding: "5px 6px",
          backgroundColor: "#fafafa",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: "9pt",
            fontWeight: 900,
            color: "#0f172a",
            letterSpacing: "0.5px",
            borderBottom: "1px dashed #cbd5e1",
            paddingBottom: "3px",
            marginBottom: "4px",
          }}
        >
          KOTAK PENGADUAN & LAYANAN
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {/* WhatsApp / Telp */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg viewBox="0 0 24 24" style={{ width: "15px", height: "15px", flexShrink: 0 }} fill="#16a34a">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zm0 18.15c-1.52 0-3.01-.41-4.31-1.18l-.31-.18-3.2.84.85-3.12-.2-.32c-.84-1.34-1.29-2.89-1.29-4.48 0-4.51 3.67-8.18 8.18-8.18 4.51 0 8.18 3.67 8.18 8.18 0 4.51-3.67 8.18-8.18 8.18zm4.49-6.13c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.47c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.08 0 1.23.89 2.41 1.02 2.58.12.16 1.76 2.68 4.26 3.76.6.26 1.06.41 1.42.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.47-.28z"/>
            </svg>
            <span style={{ fontSize: "7.5pt", color: "#475569", fontWeight: 700 }}>WA:</span>
            <span style={{ fontSize: "8.5pt", fontWeight: 900, color: "#0f172a" }}>
              {waPengaduan || "-"}
            </span>
          </div>

          {/* Instagram */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg viewBox="0 0 24 24" style={{ width: "15px", height: "15px", flexShrink: 0 }} fill="#e1306c">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <span style={{ fontSize: "7.5pt", color: "#475569", fontWeight: 700 }}>IG:</span>
            <span style={{ fontSize: "8pt", fontWeight: 800, color: "#0f172a" }}>
              {igPengaduan ? (igPengaduan.startsWith("@") ? igPengaduan : `@${igPengaduan}`) : "-"}
            </span>
          </div>

          {/* TikTok */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg viewBox="0 0 24 24" style={{ width: "15px", height: "15px", flexShrink: 0 }} fill="#000000">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.35a6.34 6.34 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.28 8.28 0 0 0 4.84 1.54V6.84c-.36-.02-.72-.07-1.07-.15z"/>
            </svg>
            <span style={{ fontSize: "7.5pt", color: "#475569", fontWeight: 700 }}>TikTok:</span>
            <span style={{ fontSize: "8pt", fontWeight: 800, color: "#0f172a" }}>
              {tiktokPengaduan ? (tiktokPengaduan.startsWith("@") ? tiktokPengaduan : `@${tiktokPengaduan}`) : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* ── FOOTER SE 2026 ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "6pt",
          color: "#475569",
          fontWeight: 700,
          borderTop: "1.2px solid #0f172a",
          paddingTop: "3px",
        }}
      >
        <span>SE KEPALA BGN NO. 21 / 2026</span>
        <span style={{ fontWeight: 900, color: "#0f172a" }}>LAYANAN PENGADUAN</span>
      </div>
    </div>
  );

  return (
    <div
      className="grozziie-print-container"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10mm",
        margin: "0 auto",
      }}
    >
      {pairMode === "left_only" && renderLeftLabel("single")}
      {pairMode === "right_only" && renderRightLabel("single")}
      {pairMode === "both" && (
        <>
          {renderLeftLabel("1")}
          {renderRightLabel("2")}
        </>
      )}
    </div>
  );
}
