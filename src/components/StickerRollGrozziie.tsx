"use client";

import React from "react";

export interface StickerRollGrozziieProps {
  widthMm?: number; // e.g. 70
  heightMm?: number; // e.g. 50
  sppgName: string;
  subWilayah?: string;
  menu?: string;
  tanggal?: string;
  jamSelesai?: string;
  jamBatas?: string;
  waPengaduan?: string;
  tiktokPengaduan?: string;
  igPengaduan?: string;
  qrBaseUrl?: string; // Optional override for domain (e.g. https://domain.com)
  pairMode?: "both" | "left_only" | "right_only"; // both = 2 label berurutan (kiri lalu kanan)
}

export default function StickerRollGrozziie(props: StickerRollGrozziieProps) {
  const {
    widthMm = 70,
    heightMm = 50,
    sppgName = "SPPG KOTA BANDUNG",
    subWilayah = "Kawasan Pelayanan Mandiri",
    jamBatas = "10.30",
    waPengaduan = "081234567890",
    tiktokPengaduan = "sppg_official",
    igPengaduan = "sppg_official",
    qrBaseUrl = "",
    pairMode = "both",
  } = props;

  // Format jam display (e.g. 10:30 -> 10.30)
  const formatJamDisplay = (val: string) => {
    if (!val) return "10.30";
    return val.replace(":", ".");
  };

  // Dynamic layout tuning based on label dimensions (e.g. 70x50 mm vs 100x78 mm vs 130x80 mm)
  const isCompact = widthMm <= 75;
  const flapWidth = isCompact ? "10mm" : "18mm";
  const decorWidth = isCompact ? "7mm" : "14mm";

  // ─── STATIC QR URL DENGAN KONTEN MENU DINAMIS TERBARU ───
  // URL statis terikat pada nama SPPG. Saat di-scan, halaman /menu akan menarik
  // data laporan menu & rincian gizi paling baru yang diinput untuk SPPG tersebut.
  const origin = qrBaseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const publicMenuTargetUrl = `${origin}/menu?sppg=${encodeURIComponent(sppgName || "")}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=${encodeURIComponent(publicMenuTargetUrl)}`;

  // ─── LABEL SISI KIRI (SEGEL KIRI: WAKTU BATAS KONSUMSI) ───
  // Desain horizontal (landscape) seperti StickerPrintSheetSE:
  // [LIDAH SEGEL KIRI (vertikal)] | [STRIP SAYUR & BUAH] | [KONTEN: HEADER LOGO/SPPG + KOTAK JAM BESAR + MENU + FOOTER]
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
        border: "2px solid #000000",
        borderRadius: "6px",
        fontFamily: "'Arial Black', 'Arial', 'Helvetica', sans-serif",
        position: "relative",
        pageBreakAfter: "always",
        breakAfter: "page",
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
        padding: "0.5mm",
      }}
    >
      {/* ── AREA LIDAH SEGEL SISI KIRI (Untuk dilipat & direkatkan ke samping ompreng) ── */}
      <div
        style={{
          width: flapWidth,
          backgroundColor: "#f8fafc",
          borderRight: "2px dashed #000000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isCompact ? "4px 1px" : "6px 2px",
          flexShrink: 0,
          userSelect: "none",
          position: "relative",
        }}
        title="Area lipat segel ke samping ompreng"
      >
        <span style={{ fontSize: isCompact ? "10px" : "14px", color: "#000000", fontWeight: 900 }}>◀</span>
        <span
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: isCompact ? "7.5pt" : "10pt",
            fontWeight: 900,
            letterSpacing: isCompact ? "1.5px" : "3px",
            color: "#000000",
            whiteSpace: "nowrap",
          }}
        >
          LIPAT SEGEL
        </span>
        <span style={{ fontSize: isCompact ? "10px" : "14px", color: "#000000", fontWeight: 900 }}>◀</span>
      </div>

      {/* ── STRIP ORNAMEN SAYUR & BUAH DI TEPI KIRI ── */}
      <div
        style={{
          width: decorWidth,
          background: "#fef08a",
          borderRight: "2px solid #000000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isCompact ? "3px 1px" : "5px 2px",
          flexShrink: 0,
          userSelect: "none",
          overflow: "hidden",
        }}
        title="Ornamen Gizi Makanan Bergizi Gratis"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(2, 1fr)",
            gap: isCompact ? "3px 0" : "5px 2px",
            alignItems: "center",
            justifyItems: "center",
            width: "100%",
            height: "100%",
          }}
        >
          <span style={{ fontSize: isCompact ? "11px" : "15px" }} role="img" aria-label="broccoli">🥦</span>
          <span style={{ fontSize: isCompact ? "11px" : "15px" }} role="img" aria-label="apple">🍎</span>
          <span style={{ fontSize: isCompact ? "11px" : "15px" }} role="img" aria-label="carrot">🥕</span>
          <span style={{ fontSize: isCompact ? "11px" : "15px" }} role="img" aria-label="banana">🍌</span>
          <span style={{ fontSize: isCompact ? "11px" : "15px" }} role="img" aria-label="orange">🍊</span>
          {!isCompact && (
            <>
              <span style={{ fontSize: "15px" }} role="img" aria-label="corn">🌽</span>
              <span style={{ fontSize: "15px" }} role="img" aria-label="avocado">🥑</span>
              <span style={{ fontSize: "15px" }} role="img" aria-label="strawberry">🍓</span>
              <span style={{ fontSize: "15px" }} role="img" aria-label="tomato">🍅</span>
              <span style={{ fontSize: "15px" }} role="img" aria-label="grapes">🍇</span>
            </>
          )}
        </div>
      </div>

      {/* ── KONTEN UTAMA SEGEL KIRI (KOP + KOTAK JAM + FOOTER) ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: isCompact ? "2mm 2.5mm" : "3.5mm 4mm",
          minWidth: 0,
        }}
      >
        {/* Top Header: Logo BGN Resmi + Nama SPPG + Sub Wilayah */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isCompact ? "6px" : "10px",
            borderBottom: isCompact ? "1.8px solid #000000" : "2.2px solid #000000",
            paddingBottom: isCompact ? "2px" : "4px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-bgn-new.png"
            alt="Badan Gizi Nasional"
            style={{
              height: isCompact ? "24px" : "36px",
              width: "auto",
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              flex: 1,
              minWidth: 0,
              borderLeft: isCompact ? "1.8px solid #000000" : "2.2px solid #000000",
              paddingLeft: isCompact ? "6px" : "9px",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: isCompact
                  ? (sppgName.length > 25 ? "6.8pt" : sppgName.length > 18 ? "7.5pt" : "8.5pt")
                  : (sppgName.length > 30 ? "8.5pt" : sppgName.length > 20 ? "9.5pt" : "11pt"),
                fontWeight: 900,
                color: "#000000",
                textTransform: "uppercase",
                lineHeight: "1.1",
                wordBreak: "break-word",
                letterSpacing: "0.2px",
                fontFamily: "'Arial Black', 'Arial', sans-serif",
              }}
            >
              {sppgName}
            </div>
            <div
              style={{
                fontSize: isCompact ? "5.5pt" : (subWilayah && subWilayah.length > 30 ? "7pt" : "7.5pt"),
                fontWeight: 700,
                color: "#1e293b",
                lineHeight: "1.1",
                marginTop: "1px",
                wordBreak: "break-word",
              }}
            >
              {subWilayah || "Kawasan Pelayanan Mandiri"}
            </div>
          </div>
        </div>

        {/* Center: Kotak HARUS DIKONSUMSI SEBELUM + JAM BESAR */}
        <div
          style={{
            border: isCompact ? "2px solid #000000" : "2.8px solid #000000",
            borderRadius: isCompact ? "5px" : "8px",
            padding: isCompact ? "3px 4px" : "6px 10px",
            textAlign: "center",
            backgroundColor: "#ffffff",
            margin: isCompact ? "2px 0" : "3px 0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: isCompact ? "7.5pt" : "12pt",
              fontWeight: 900,
              textTransform: "uppercase",
              color: "#000000",
              letterSpacing: isCompact ? "0.5px" : "1px",
              lineHeight: 1.1,
            }}
          >
            HARUS DIKONSUMSI SEBELUM
          </div>
          <div
            style={{
              fontSize: isCompact ? "28pt" : "46pt",
              fontWeight: 900,
              color: "#000000",
              lineHeight: "0.95",
              letterSpacing: "0.5px",
              marginTop: isCompact ? "2px" : "4px",
              fontFamily: "'Arial Black', 'Impact', sans-serif",
            }}
          >
            {formatJamDisplay(jamBatas)}
          </div>
        </div>

        {/* Kaki label kiri */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: isCompact ? "5.8pt" : "7.5pt",
            color: "#000000",
            fontWeight: 800,
            paddingTop: isCompact ? "1.5px" : "3px",
            borderTop: "1px solid #cbd5e1",
          }}
        >
          <span>STANDAR KELAYAKAN MAKANAN</span>
          <span style={{ color: "#000000", fontWeight: 900, letterSpacing: "0.5px" }}>
            SEGEL KIRI
          </span>
        </div>
      </div>
    </div>
  );

  // ─── LABEL SISI KANAN (SEGEL KANAN: EDUKASI & PENGADUAN) ───
  // Desain horizontal (landscape) seperti StickerPrintSheetSE:
  // [KONTEN UTAMA: 2 BOX LARANGAN + KOTAK PENGADUAN LENGKAP] | [LIDAH SEGEL KANAN (vertikal)]
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
        border: "2px solid #000000",
        borderRadius: "6px",
        fontFamily: "'Arial Black', 'Arial', 'Helvetica', sans-serif",
        position: "relative",
        pageBreakAfter: "always",
        breakAfter: "page",
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
        padding: "0.5mm",
      }}
    >
      {/* ── KONTEN UTAMA SEGEL KANAN (2 PERINGATAN + KOTAK PENGADUAN) ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: isCompact ? "2mm 2.5mm" : "3.5mm 4mm",
          minWidth: 0,
        }}
      >
        {/* Bar Atas: Judul SPPG & Edukasi */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: isCompact ? "1.8px solid #000000" : "2.2px solid #000000",
            paddingBottom: isCompact ? "2px" : "3px",
          }}
        >
          <div style={{ minWidth: 0, flex: 1, paddingRight: isCompact ? "4px" : "6px" }}>
            <span style={{ fontSize: isCompact ? "5.5pt" : "7pt", color: "#000000", fontWeight: 800, display: "block", letterSpacing: "0.5px" }}>
              UNIT PELAYANAN MBG
            </span>
            <span
              style={{
                fontSize: isCompact
                  ? (sppgName.length > 25 ? "6.8pt" : sppgName.length > 18 ? "7.5pt" : "8.5pt")
                  : (sppgName.length > 30 ? "8.5pt" : sppgName.length > 20 ? "9.5pt" : "11pt"),
                fontWeight: 900,
                color: "#000000",
                textTransform: "uppercase",
                wordBreak: "break-word",
                display: "block",
                lineHeight: 1.1,
                fontFamily: "'Arial Black', 'Arial', sans-serif",
              }}
            >
              {sppgName}
            </span>
          </div>
          <span
            style={{
              fontSize: isCompact ? "6pt" : "8pt",
              fontWeight: 900,
              color: "#000000",
              border: isCompact ? "1.2px solid #000000" : "1.8px solid #000000",
              padding: isCompact ? "1px 4px" : "2px 7px",
              borderRadius: "4px",
              backgroundColor: "#f1f5f9",
              whiteSpace: "nowrap",
              letterSpacing: "0.5px",
            }}
          >
            HIGIENE TERJAGA
          </span>
        </div>

        {/* Baris Tengah: 2 Box Peringatan Konsumsi + Kotak Pengaduan */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            gap: isCompact ? "4px" : "7px",
            margin: isCompact ? "2px 0" : "4px 0",
          }}
        >
          {/* Bagian Kiri: 2 Box Larangan & Peringatan Konsumsi */}
          <div
            style={{
              flex: isCompact ? "1 1 42%" : "1 1 45%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: isCompact ? "2px" : "4px",
            }}
          >
            {/* Peringatan 1: TIDAK BOLEH DIBAWA PULANG */}
            <div
              style={{
                border: isCompact ? "1.5px solid #000000" : "2px solid #000000",
                borderRadius: isCompact ? "4px" : "6px",
                padding: isCompact ? "2px 2px" : "4px 4px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                flex: 1,
                backgroundColor: "#ffffff",
              }}
            >
              <svg viewBox="0 0 40 40" style={{ width: isCompact ? "17px" : "26px", height: isCompact ? "17px" : "26px" }}>
                <circle cx="20" cy="20" r="17" fill="none" stroke="#dc2626" strokeWidth="3.4" />
                <line x1="8" y1="8" x2="32" y2="32" stroke="#dc2626" strokeWidth="3.4" />
                <rect x="11" y="14" width="18" height="12" rx="2" fill="none" stroke="#000000" strokeWidth="2.2" />
                <line x1="14" y1="12" x2="26" y2="12" stroke="#000000" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <span
                style={{
                  fontSize: isCompact ? "5.4pt" : "8pt",
                  fontWeight: 900,
                  color: "#000000",
                  lineHeight: 1.1,
                  marginTop: isCompact ? "1px" : "2.5px",
                  textTransform: "uppercase",
                  fontFamily: "'Arial Black', 'Arial', sans-serif",
                }}
              >
                TIDAK BOLEH DIBAWA PULANG
              </span>
            </div>

            {/* Peringatan 2: SEGERA KONSUMSI SETELAH DITERIMA */}
            <div
              style={{
                border: isCompact ? "1.5px solid #000000" : "2px solid #000000",
                borderRadius: isCompact ? "4px" : "6px",
                padding: isCompact ? "2px 2px" : "4px 4px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                flex: 1,
                backgroundColor: "#ffffff",
              }}
            >
              <svg viewBox="0 0 40 40" style={{ width: isCompact ? "17px" : "26px", height: isCompact ? "17px" : "26px" }}>
                <circle cx="20" cy="20" r="17" fill="#000000" />
                <path d="M15 11v6c0 1.5.8 2.6 2 2.9V28h2V19.9c1.2-.3 2-1.4 2-2.9v-6h-1.2v4h-1v-4h-0.8v4h-1v-4z" fill="#ffffff" />
                <path d="M23 11c-1.8 0-3 1.8-3 3.8 0 1.8 1.1 3.2 2.3 3.5V28h2V18.3c1.2-.3 2.3-1.7 2.3-3.5 0-2-1.2-3.8-3.6-3.8z" fill="#ffffff" />
              </svg>
              <span
                style={{
                  fontSize: isCompact ? "5.4pt" : "8pt",
                  fontWeight: 900,
                  color: "#000000",
                  lineHeight: 1.1,
                  marginTop: isCompact ? "1px" : "2.5px",
                  textTransform: "uppercase",
                  fontFamily: "'Arial Black', 'Arial', sans-serif",
                }}
              >
                SEGERA KONSUMSI
              </span>
            </div>
          </div>

          {/* Bagian Kanan: QR INFO GIZI DI ATAS + KOTAK PENGADUAN DI BAWAH */}
          <div
            style={{
              flex: isCompact ? "1 1 58%" : "1 1 55%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* Box 1 (Atas): QR CODE INFO GIZI & MENU */}
            <div
              style={{
                border: isCompact ? "1.5px solid #000000" : "2px solid #000000",
                borderRadius: isCompact ? "4px" : "6px",
                padding: isCompact ? "2px 3px" : "3px 6px",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: isCompact ? "4px" : "8px",
                backgroundColor: "#ffffff",
                flex: "1 1 auto",
              }}
              title={`Scan untuk melihat menu & gizi terbaru: ${publicMenuTargetUrl}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeImageUrl}
                alt="QR Code Info Menu & Gizi"
                style={{
                  width: isCompact ? "14mm" : "21mm",
                  height: isCompact ? "14mm" : "21mm",
                  objectFit: "contain",
                  display: "block",
                  imageRendering: "pixelated",
                  flexShrink: 0,
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "left", minWidth: 0 }}>
                <span
                  style={{
                    fontSize: isCompact ? "5.8pt" : "8pt",
                    fontWeight: 900,
                    color: "#000000",
                    letterSpacing: "0.2px",
                    lineHeight: 1.1,
                    textTransform: "uppercase",
                    fontFamily: "'Arial Black', 'Arial', sans-serif",
                  }}
                >
                  SCAN INFO GIZI
                </span>
                <span
                  style={{
                    fontSize: isCompact ? "4.8pt" : "6.5pt",
                    fontWeight: 700,
                    color: "#334155",
                    lineHeight: 1.1,
                    marginTop: "1px",
                  }}
                >
                  Menu & gizi harian
                </span>
              </div>
            </div>

            {/* Box 2 (Bawah): KOTAK LAYANAN PENGADUAN */}
            <div
              style={{
                border: isCompact ? "1.5px dashed #000000" : "2px dashed #000000",
                borderRadius: isCompact ? "4px" : "6px",
                padding: isCompact ? "2px 3px" : "3px 6px",
                backgroundColor: "#ffffff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                flex: "1 1 auto",
              }}
            >
              {/* Judul Pengaduan */}
              <div
                style={{
                  fontSize: isCompact ? "5.2pt" : "7pt",
                  fontWeight: 900,
                  color: "#000000",
                  lineHeight: 1.1,
                  letterSpacing: "0.2px",
                  textTransform: "uppercase",
                  fontFamily: "'Arial Black', 'Arial', sans-serif",
                  borderBottom: "1px dashed #cbd5e1",
                  paddingBottom: "1px",
                  marginBottom: isCompact ? "1.5px" : "3px",
                  textAlign: "center",
                }}
              >
                LAYANAN PENGADUAN
              </div>

              {/* Baris Kontak: WA, IG, TikTok (Tampil utuh tanpa terputus) */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: isCompact ? "1.5px" : "2.5px",
                }}
              >
                {/* WA */}
                <div style={{ display: "flex", alignItems: "center", gap: isCompact ? "3px" : "5px" }}>
                  <svg viewBox="0 0 24 24" style={{ width: isCompact ? "8px" : "12px", height: isCompact ? "8px" : "12px", flexShrink: 0 }} fill="#16a34a">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zm0 18.15c-1.52 0-3.01-.41-4.31-1.18l-.31-.18-3.2.84.85-3.12-.2-.32c-.84-1.34-1.29-2.89-1.29-4.48 0-4.51 3.67-8.18 8.18-8.18 4.51 0 8.18 3.67 8.18 8.18 0 4.51-3.67 8.18-8.18 8.18zm4.49-6.13c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.47c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.08 0 1.23.89 2.41 1.02 2.58.12.16 1.76 2.68 4.26 3.76.6.26 1.06.41 1.42.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.47-.28z"/>
                  </svg>
                  <span
                    style={{
                      fontSize: isCompact ? "5.6pt" : "7.5pt",
                      fontWeight: 900,
                      color: "#000000",
                      wordBreak: "break-all",
                      lineHeight: 1.1,
                      fontFamily: "'Arial Black', 'Arial', sans-serif",
                    }}
                  >
                    {waPengaduan || "-"}
                  </span>
                </div>

                {/* Baris IG & TikTok berdampingan secara fleksibel */}
                <div style={{ display: "flex", alignItems: "center", gap: isCompact ? "4px" : "8px", flexWrap: "wrap" }}>
                  {/* IG */}
                  <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                    <svg viewBox="0 0 24 24" style={{ width: isCompact ? "7px" : "11px", height: isCompact ? "7px" : "11px", flexShrink: 0 }} fill="#e1306c">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span
                      style={{
                        fontSize: isCompact ? "5.2pt" : "6.8pt",
                        fontWeight: 800,
                        color: "#000000",
                        wordBreak: "break-word",
                        fontFamily: "'Arial', sans-serif",
                      }}
                    >
                      {igPengaduan ? (igPengaduan.startsWith("@") ? igPengaduan : `@${igPengaduan}`) : "-"}
                    </span>
                  </div>

                  {/* TikTok */}
                  <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                    <svg viewBox="0 0 24 24" style={{ width: isCompact ? "7px" : "11px", height: isCompact ? "7px" : "11px", flexShrink: 0 }} fill="#000000">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.35a6.34 6.34 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.28 8.28 0 0 0 4.84 1.54V6.84c-.36-.02-.72-.07-1.07-.15z"/>
                    </svg>
                    <span
                      style={{
                        fontSize: isCompact ? "5.2pt" : "6.8pt",
                        fontWeight: 800,
                        color: "#000000",
                        wordBreak: "break-word",
                        fontFamily: "'Arial', sans-serif",
                      }}
                    >
                      {tiktokPengaduan ? (tiktokPengaduan.startsWith("@") ? tiktokPengaduan : `@${tiktokPengaduan}`) : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kaki label kanan */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: isCompact ? "5.6pt" : "7.5pt",
            color: "#000000",
            fontWeight: 800,
            paddingTop: isCompact ? "1.5px" : "3px",
            borderTop: "1px solid #cbd5e1",
          }}
        >
          <span>LAYANAN PENGADUAN & MUTU</span>
          <span style={{ color: "#000000", fontWeight: 900, letterSpacing: isCompact ? "0.4px" : "0.8px" }}>
            SEGEL KANAN
          </span>
        </div>
      </div>

      {/* ── AREA LIDAH SEGEL SISI KANAN (Untuk dilipat & direkatkan ke samping kanan ompreng) ── */}
      <div
        style={{
          width: flapWidth,
          backgroundColor: "#f8fafc",
          borderLeft: "2px dashed #000000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isCompact ? "4px 1px" : "6px 2px",
          flexShrink: 0,
          userSelect: "none",
          position: "relative",
        }}
        title="Area lipat segel ke samping ompreng"
      >
        <span style={{ fontSize: isCompact ? "10px" : "14px", color: "#000000", fontWeight: 900 }}>▶</span>
        <span
          style={{
            writingMode: "vertical-rl",
            fontSize: isCompact ? "7.5pt" : "10pt",
            fontWeight: 900,
            letterSpacing: isCompact ? "1.5px" : "3px",
            color: "#000000",
            whiteSpace: "nowrap",
          }}
        >
          LIPAT SEGEL
        </span>
        <span style={{ fontSize: isCompact ? "10px" : "14px", color: "#000000", fontWeight: 900 }}>▶</span>
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
        gap: "8mm",
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
