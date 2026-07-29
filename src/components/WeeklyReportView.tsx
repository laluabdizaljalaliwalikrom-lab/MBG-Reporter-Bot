"use client";

import React, { useState, useMemo } from "react";
import { Printer, Calendar, Building2, MapPin, FileText, Download, ChevronDown } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import WeeklyReportPDF from "./WeeklyReportPDF";

interface ReportData {
  id: string;
  tanggal?: string | null;
  created_at?: string | null;
  menu?: string | null;
  porsi_besar?: number | null;
  porsi_kecil?: number | null;
  energi?: number | null;
  protein?: number | null;
  lemak?: number | null;
  karbohidrat?: number | null;
  serat?: number | null;
  photo_url?: string | null;
  poster_url?: string | null;
  status?: string | null;
  extracted_data?: {
    sppg_name?: string | null;
    "Porsi Besar"?: { Energi?: number; Protein?: number; Lemak?: number; Karbohidrat?: number; Serat?: number };
    "Porsi Kecil"?: { Energi?: number; Protein?: number; Lemak?: number; Karbohidrat?: number; Serat?: number };
    gizi_besar?: { Energi?: number; Protein?: number; Lemak?: number; Karbohidrat?: number; Serat?: number };
    gizi_kecil?: { Energi?: number; Protein?: number; Lemak?: number; Karbohidrat?: number; Serat?: number };
    B3?: { Balita?: number; Bumil?: number; Busui?: number };
  } | null;
}

interface SppgItem {
  id?: string;
  nama_sppg: string;
  porsi_kecil?: number;
  porsi_besar?: number;
  kepala_sppg?: string;
  pengawas_gizi?: string;
}

interface WeeklyReportViewProps {
  reports: ReportData[];
  sppgList: SppgItem[];
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function formatTanggalIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(monthIndex) && monthIndex >= 0 && monthIndex < 12 && !isNaN(day)) {
      return `${day} ${MONTH_NAMES[monthIndex]} ${year}`;
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }
  return dateStr;
}

function toTitleCase(str?: string | null): string {
  if (!str) return "";
  const acronyms = ["SPPG", "BGN", "PMT", "PAUD", "TK", "SD", "SMP", "SMA", "KAB", "KOTA", "PK", "B3", "PIC", "WIB", "WIT", "WITA"];
  return str
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      const upper = word.toUpperCase();
      if (acronyms.includes(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export default function WeeklyReportView({ reports = [], sppgList = [] }: WeeklyReportViewProps) {
  // Date calculations default: current week (Monday to Saturday)
  const now = new Date();
  const currentDay = now.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  const formatIsoDate = (d: Date) => d.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState<string>(formatIsoDate(monday));
  const [endDate, setEndDate] = useState<string>(formatIsoDate(saturday));
  const [selectedSppg, setSelectedSppg] = useState<string>("All");
  const [kabupaten, setKabupaten] = useState<string>("LOMBOK TIMUR");
  const [kecamatan, setKecamatan] = useState<string>("SIKUR");
  const [sppgDetailName, setSppgDetailName] = useState<string>("SIKUR 02");
  const [namaKepalaSppg, setNamaKepalaSppg] = useState<string>("");
  const [namaPengawasGizi, setNamaPengawasGizi] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState<boolean>(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState<boolean>(false);

  React.useEffect(() => {
    if (selectedSppg !== "All") {
      const found = sppgList.find((s) => s.nama_sppg === selectedSppg);
      if (found) {
        if (found.kepala_sppg) setNamaKepalaSppg(found.kepala_sppg);
        if (found.pengawas_gizi) setNamaPengawasGizi(found.pengawas_gizi);
      }
    } else if (sppgList.length > 0) {
      const first = sppgList[0];
      if (first.kepala_sppg && !namaKepalaSppg) setNamaKepalaSppg(first.kepala_sppg);
      if (first.pengawas_gizi && !namaPengawasGizi) setNamaPengawasGizi(first.pengawas_gizi);
    }
  }, [selectedSppg, sppgList]);

  const setQuickPeriod = (preset: "thisWeek" | "lastWeek" | "thisMonth") => {
    const n = new Date();
    if (preset === "thisWeek") {
      const day = n.getDay();
      const distToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(n);
      mon.setDate(n.getDate() + distToMon);
      const sat = new Date(mon);
      sat.setDate(mon.getDate() + 5);
      setStartDate(mon.toISOString().split("T")[0]);
      setEndDate(sat.toISOString().split("T")[0]);
    } else if (preset === "lastWeek") {
      const day = n.getDay();
      const distToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(n);
      mon.setDate(n.getDate() + distToMon - 7);
      const sat = new Date(mon);
      sat.setDate(mon.getDate() + 5);
      setStartDate(mon.toISOString().split("T")[0]);
      setEndDate(sat.toISOString().split("T")[0]);
    } else if (preset === "thisMonth") {
      const firstDay = new Date(n.getFullYear(), n.getMonth(), 1);
      const lastDay = new Date(n.getFullYear(), n.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(lastDay.toISOString().split("T")[0]);
    }
  };

  // Filter reports by date range and selected SPPG
  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        const rDate = r.tanggal || (r.created_at ? r.created_at.split("T")[0] : "");
        if (!rDate) return false;
        if (startDate && rDate < startDate) return false;
        if (endDate && rDate > endDate) return false;

        if (selectedSppg !== "All") {
          const sppgName = r.extracted_data?.sppg_name || "";
          if (sppgName !== selectedSppg) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.tanggal || a.created_at || "";
        const dateB = b.tanggal || b.created_at || "";
        return dateA.localeCompare(dateB);
      });
  }, [reports, startDate, endDate, selectedSppg]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (filteredReports.length === 0) return;
    setIsPdfGenerating(true);

    try {
      const blob = await pdf(
        <WeeklyReportPDF
          reports={filteredReports}
          kabupaten={kabupaten}
          kecamatan={kecamatan}
          sppgDetailName={sppgDetailName}
          startDate={startDate}
          endDate={endDate}
          namaPengawasGizi={namaPengawasGizi}
          namaKepalaSppg={namaKepalaSppg}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Mingguan_MBG_${startDate}_sd_${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal generate PDF:", err);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleDownloadWord = () => {
    if (filteredReports.length === 0) return;

    const headerTitle = `LAPORAN MAKAN BERGIZI GRATIS`;
    const sppgTitle = `SATUAN PELAYANAN PEMENUHAN GIZI (SPPG) ${toTitleCase(kabupaten || "LOMBOK TIMUR")}`;
    const locationTitle = `${toTitleCase(kecamatan ? `${kecamatan}, ` : "")}${toTitleCase(sppgDetailName || "SIKUR 02")}`;
    const periodText = `Periode: ${formatTanggalIndo(startDate)} s/d ${formatTanggalIndo(endDate)}`;

    let tableRowsHtml = "";

    filteredReports.forEach((report) => {
      const dateStr = formatTanggalIndo(report.tanggal || report.created_at);
      const menuItems = (report.menu || "")
        .split(/[\n,*•]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const menuListHtml = menuItems
        .map((item) => `<li style="margin-bottom: 4px;">${toTitleCase(item)}</li>`)
        .join("");

      const gb = report.extracted_data?.["Porsi Besar"] || report.extracted_data?.gizi_besar || {};
      const gk = report.extracted_data?.["Porsi Kecil"] || report.extracted_data?.gizi_kecil || {};

      const gbEnergi = gb.Energi ?? report.energi;
      const gbProtein = gb.Protein ?? report.protein;
      const gbLemak = gb.Lemak ?? report.lemak;
      const gbKh = gb.Karbohidrat ?? report.karbohidrat;
      const gbSerat = gb.Serat ?? report.serat;

      const gkEnergi = gk.Energi;
      const gkProtein = gk.Protein;
      const gkLemak = gk.Lemak;
      const gkKh = gk.Karbohidrat;
      const gkSerat = gk.Serat;

      const giziHtml = `
        <div style="margin-bottom: 6px;">
          <strong>&bull; Porsi kecil</strong>
          <div style="margin-left: 10px; margin-top: 2px;">
            <div>Energi : ${gkEnergi != null ? `${gkEnergi} kkal` : "-"}</div>
            <div>Protein : ${gkProtein != null ? `${gkProtein} gram` : "-"}</div>
            <div>Lemak : ${gkLemak != null ? `${gkLemak} gram` : "-"}</div>
            <div>Karbohidrat : ${gkKh != null ? `${gkKh} gram` : "-"}</div>
            <div>Serat : ${gkSerat != null ? `${gkSerat} gram` : "-"}</div>
          </div>
        </div>
        <div style="border-top: 1px solid #dddddd; padding-top: 6px;">
          <strong>&bull; Porsi besar</strong>
          <div style="margin-left: 10px; margin-top: 2px;">
            <div>Energi : ${gbEnergi != null ? `${gbEnergi} kkal` : "-"}</div>
            <div>Protein : ${gbProtein != null ? `${gbProtein} gram` : "-"}</div>
            <div>Lemak : ${gbLemak != null ? `${gbLemak} gram` : "-"}</div>
            <div>Karbohidrat : ${gbKh != null ? `${gbKh} gram` : "-"}</div>
            <div>Serat : ${gbSerat != null ? `${gbSerat} gram` : "-"}</div>
          </div>
        </div>
      `;

      const photoHtml = report.photo_url
        ? `<img src="${report.photo_url}" width="160" height="120" style="max-width: 160px; max-height: 120px; border: 1px solid #cccccc; border-radius: 4px;" />`
        : `<span style="color: #888888; font-style: italic;">Tidak Ada Foto</span>`;

      tableRowsHtml += `
        <tr>
          <td style="border: 1pt solid #000000; padding: 8px; text-align: center; font-size: 10pt; font-weight: bold; vertical-align: top;">${dateStr}</td>
          <td style="border: 1pt solid #000000; padding: 8px; font-size: 10pt; vertical-align: top;">
            <ul style="margin: 0; padding-left: 18px;">${menuListHtml}</ul>
          </td>
          <td style="border: 1pt solid #000000; padding: 8px; font-size: 9.5pt; vertical-align: top;">${giziHtml}</td>
          <td style="border: 1pt solid #000000; padding: 8px; text-align: center; vertical-align: middle;">${photoHtml}</td>
        </tr>
      `;
    });

    const pengawasName = namaPengawasGizi ? toTitleCase(namaPengawasGizi) : "............................................";
    const kepalaName = namaKepalaSppg ? toTitleCase(namaKepalaSppg) : "............................................";

    const wordDocumentHtml = `
      <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:m="http://schemas.microsoft.com/office/2004/12/omml" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Laporan Mingguan MBG</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page WordSection1 {
            size: 595.3pt 841.9pt;
            margin: 42.5pt 42.5pt 42.5pt 42.5pt;
          }
          div.WordSection1 {
            page: WordSection1;
          }
          body {
            font-family: 'Calibri', 'Times New Roman', serif;
            font-size: 11pt;
            color: #000000;
          }
          table {
            border-collapse: collapse;
          }
        </style>
      </head>
      <body>
        <div class="WordSection1">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 14pt; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase;">${headerTitle}</h1>
            <h2 style="font-size: 12pt; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase;">${sppgTitle}</h2>
            <h3 style="font-size: 11pt; font-weight: bold; margin: 0 0 6px 0; text-transform: uppercase;">${locationTitle}</h3>
            <p style="font-size: 10pt; color: #444444; margin: 0;">${periodText}</p>
          </div>

          <table border="1" cellspacing="0" cellpadding="8" style="width: 100%; border-collapse: collapse; border: 1pt solid #000000;">
            <thead>
              <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
                <th style="border: 1pt solid #000000; width: 15%; padding: 8px; font-size: 10pt;">TGL</th>
                <th style="border: 1pt solid #000000; width: 30%; padding: 8px; font-size: 10pt; text-align: left;">NAMA MENU</th>
                <th style="border: 1pt solid #000000; width: 35%; padding: 8px; font-size: 10pt; text-align: left;">NILAI GIZI</th>
                <th style="border: 1pt solid #000000; width: 20%; padding: 8px; font-size: 10pt;">DOKUMENTASI</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <br/><br/>

          <table style="width: 100%; border: none; border-collapse: collapse; margin-top: 30px;">
            <tr>
              <td style="width: 50%; text-align: center; border: none; font-size: 10pt; vertical-align: top;">
                <p style="margin-bottom: 55px;">Pengawas Gizi SPPG</p>
                <p style="font-weight: bold; text-decoration: underline;">( ${pengawasName} )</p>
              </td>
              <td style="width: 50%; text-align: center; border: none; font-size: 10pt; vertical-align: top;">
                <p style="margin-bottom: 55px;">Kepala SPPG</p>
                <p style="font-weight: bold; text-decoration: underline;">( ${kepalaName} )</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + wordDocumentHtml], {
      type: 'application/msword;charset=utf-8'
    });

    const fileName = `Laporan_Mingguan_MBG_${startDate}_sd_${endDate}.doc`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Control Panel (Hidden on Print) */}
      <div className="print:hidden bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-400" />
              Generator Laporan Mingguan MBG
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Rekapitulasi menu harian & nilai gizi sesuai format resmi Badan Gizi Nasional.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Unified Download Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                disabled={isPdfGenerating}
                onClick={() => setShowDownloadDropdown((prev) => !prev)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-emerald-600/20"
              >
                <Download className="w-4 h-4" />
                <span>{isPdfGenerating ? "Mengunduh PDF..." : "Download"}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDownloadDropdown ? "rotate-180" : ""}`} />
              </button>

              {showDownloadDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDownloadDropdown(false)} />
                  
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden py-1 divide-y divide-slate-800/80">
                    <button
                      type="button"
                      disabled={isPdfGenerating}
                      onClick={() => {
                        setShowDownloadDropdown(false);
                        handleDownloadPDF();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left font-medium disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 text-indigo-400" />
                      <span>Unduh PDF (.pdf)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDownloadDropdown(false);
                        handleDownloadWord();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left font-medium"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Unduh Word (.doc)</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Dedicated Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Quick Period Presets */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-slate-400">Pilih Cepat Periode:</span>
          <button
            type="button"
            onClick={() => setQuickPeriod("thisWeek")}
            className="px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/60 rounded-lg text-xs font-medium transition-all"
          >
            Minggu Ini
          </button>
          <button
            type="button"
            onClick={() => setQuickPeriod("lastWeek")}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 rounded-lg text-xs font-medium transition-all"
          >
            Minggu Lalu
          </button>
          <button
            type="button"
            onClick={() => setQuickPeriod("thisMonth")}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 rounded-lg text-xs font-medium transition-all"
          >
            Bulan Ini
          </button>
        </div>

        {/* Filters Form Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark] cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Tanggal Selesai
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark] cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              Pilih SPPG
            </label>
            <select
              value={selectedSppg}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSppg(val);
                if (val !== "All") {
                  setSppgDetailName(val);
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="All">Semua SPPG</option>
              {sppgList.map((sppg, i) => (
                <option key={sppg.id || i} value={sppg.nama_sppg}>
                  {sppg.nama_sppg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              Kabupaten / Kota
            </label>
            <input
              type="text"
              value={kabupaten}
              onChange={(e) => setKabupaten(e.target.value.toUpperCase())}
              placeholder="e.g. LOMBOK TIMUR"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              Kecamatan & Kode SPPG
            </label>
            <input
              type="text"
              value={sppgDetailName}
              onChange={(e) => setSppgDetailName(e.target.value)}
              placeholder="e.g. SIKUR 02"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Second Row for Pejabat / Signatures Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 mt-3 border-t border-slate-800/60">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              Nama Pengawas Gizi SPPG
            </label>
            <input
              type="text"
              value={namaPengawasGizi}
              onChange={(e) => setNamaPengawasGizi(e.target.value)}
              placeholder="e.g. Ns. Fatimah, S.Gz"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              Nama Kepala SPPG
            </label>
            <input
              type="text"
              value={namaKepalaSppg}
              onChange={(e) => setNamaKepalaSppg(e.target.value)}
              placeholder="e.g. Drs. Ahmad Hidayat, M.Si"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Report Document Preview Container */}
      <div id="printable-weekly-report" className="print-only-document bg-white text-slate-900 rounded-2xl p-8 md:p-12 shadow-2xl overflow-x-auto print:shadow-none print:p-0 print:m-0 print:rounded-none">
        {/* Document Header matching Google Doc template */}
        <div className="text-center mb-8 font-serif uppercase tracking-wide">
          <div className="flex items-center justify-center gap-4 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-bgn.png"
              alt="Logo BGN"
              className="w-16 h-16 object-contain print:w-16 print:h-16"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
          <h1 className="text-lg md:text-xl font-bold text-black leading-snug">
            LAPORAN MAKAN BERGIZI GRATIS
          </h1>
          <h2 className="text-base md:text-lg font-bold text-black mt-1">
            SATUAN PELAYANAN PEMENUHAN GIZI (SPPG) {kabupaten || "LOMBOK TIMUR"}
          </h2>
          <h3 className="text-sm md:text-base font-bold text-black mt-1">
            {kecamatan ? `${kecamatan}, ` : ""}{sppgDetailName || "SIKUR 02"}
          </h3>
          <p className="text-xs text-slate-600 font-sans capitalize mt-1 normal-case tracking-normal">
            Periode: {formatTanggalIndo(startDate)} s/d {formatTanggalIndo(endDate)}
          </p>
        </div>

        {/* Report Content Table */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-xl my-6">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-600">Tidak ada laporan harian pada rentang tanggal ini.</p>
            <p className="text-sm text-slate-400 mt-1">Silakan sesuaikan filter tanggal atau tambahkan laporan harian baru.</p>
          </div>
        ) : (
          <table className="w-full border-collapse border border-black text-sm text-black font-serif">
            <thead>
              <tr className="bg-slate-100 font-bold text-center">
                <th className="border border-black px-3 py-2 w-[12%] text-center">TGL</th>
                <th className="border border-black px-3 py-2 w-[28%] text-left">NAMA MENU</th>
                <th className="border border-black px-3 py-2 w-[35%] text-left">NILAI GIZI</th>
                <th className="border border-black px-3 py-2 w-[25%] text-center">DOKUMENTASI</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report, idx) => {
                const menuItems = (report.menu || "")
                  .split(/[\n,*•]+/)
                  .map((s) => s.trim())
                  .filter(Boolean);

                const gb = report.extracted_data?.["Porsi Besar"] || report.extracted_data?.gizi_besar || {};
                const gk = report.extracted_data?.["Porsi Kecil"] || report.extracted_data?.gizi_kecil || {};

                const gbEnergi = gb.Energi ?? report.energi;
                const gbProtein = gb.Protein ?? report.protein;
                const gbLemak = gb.Lemak ?? report.lemak;
                const gbKh = gb.Karbohidrat ?? report.karbohidrat;
                const gbSerat = gb.Serat ?? report.serat;

                const gkEnergi = gk.Energi;
                const gkProtein = gk.Protein;
                const gkLemak = gk.Lemak;
                const gkKh = gk.Karbohidrat;
                const gkSerat = gk.Serat;

                return (
                  <tr key={report.id || idx} className="align-top">
                    {/* TGL */}
                    <td className="border border-black px-3 py-3 font-sans text-center whitespace-nowrap text-xs font-semibold">
                      {formatTanggalIndo(report.tanggal || report.created_at)}
                    </td>

                    {/* NAMA MENU */}
                    <td className="border border-black px-3 py-3 font-sans">
                      <ul className="list-disc pl-4 space-y-1 text-xs">
                        {menuItems.length > 0 ? (
                          menuItems.map((item, i) => (
                            <li key={i} className="text-slate-900 leading-snug">
                              {toTitleCase(item)}
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-500 italic">-</li>
                        )}
                      </ul>
                    </td>

                    {/* NILAI GIZI */}
                    <td className="border border-black px-3 py-3 font-sans text-xs space-y-2">
                      <div>
                        <div className="font-bold text-black flex items-center gap-1 mb-0.5">
                          <span>• Porsi kecil</span>
                        </div>
                        <div className="pl-3 text-slate-800 space-y-0.5">
                          <p>Energi : {gkEnergi != null ? `${gkEnergi} kkal` : "-"}</p>
                          <p>Protein : {gkProtein != null ? `${gkProtein} gram` : "-"}</p>
                          <p>Lemak : {gkLemak != null ? `${gkLemak} gram` : "-"}</p>
                          <p>Karbohidrat : {gkKh != null ? `${gkKh} gram` : "-"}</p>
                          <p>Serat : {gkSerat != null ? `${gkSerat} gram` : "-"}</p>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-200">
                        <div className="font-bold text-black flex items-center gap-1 mb-0.5">
                          <span>• Porsi besar</span>
                        </div>
                        <div className="pl-3 text-slate-800 space-y-0.5">
                          <p>Energi : {gbEnergi != null ? `${gbEnergi} kkal` : "-"}</p>
                          <p>Protein : {gbProtein != null ? `${gbProtein} gram` : "-"}</p>
                          <p>Lemak : {gbLemak != null ? `${gbLemak} gram` : "-"}</p>
                          <p>Karbohidrat : {gbKh != null ? `${gbKh} gram` : "-"}</p>
                          <p>Serat : {gbSerat != null ? `${gbSerat} gram` : "-"}</p>
                        </div>
                      </div>
                    </td>

                    {/* DOKUMENTASI */}
                    <td className="border border-black px-2 py-3 text-center align-middle font-sans">
                      {report.photo_url ? (
                        <div className="flex justify-center items-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={report.photo_url}
                            alt={`Dokumentasi ${report.tanggal}`}
                            className="max-h-40 max-w-full rounded border border-slate-200 object-cover shadow-sm print:max-h-36"
                          />
                        </div>
                      ) : (
                        <div className="h-28 flex flex-col items-center justify-center text-slate-400 text-xs italic bg-slate-50 border border-dashed border-slate-200 rounded">
                          <span>Tidak Ada Foto</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Footer / Signature Block */}
        {filteredReports.length > 0 && (
          <div className="mt-12 grid grid-cols-2 gap-8 text-center font-serif text-xs text-black print:mt-8 print:break-inside-avoid">
            <div>
              <p className="mb-16">Pengawas Gizi SPPG</p>
              <p className="font-bold border-b border-black inline-block px-4 pb-0.5 min-w-[200px]">
                ( {namaPengawasGizi ? toTitleCase(namaPengawasGizi) : "............................................"} )
              </p>
            </div>
            <div>
              <p className="mb-16">Kepala SPPG</p>
              <p className="font-bold border-b border-black inline-block px-4 pb-0.5 min-w-[200px]">
                ( {namaKepalaSppg ? toTitleCase(namaKepalaSppg) : "............................................"} )
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
