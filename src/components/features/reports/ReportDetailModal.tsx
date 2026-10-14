"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  ImageIcon,
  Maximize2,
  Palette,
  Phone,
  Printer,
  RefreshCw,
  Send,
  Thermometer,
  Undo2,
  UserCheck,
  Users,
  Utensils,
  X,
  Camera,
  Activity,
  ClipboardList,
} from "lucide-react";
import type { Report } from "@/types/report";

interface ReportDetailModalProps {
  report: Report | null;
  onClose: () => void;
  onUpdateStatus: (id: string, nextStatus: "Draft" | "Approved" | "Sent") => Promise<void>;
  onOpenSticker: (report: Report) => void;
  showToast: (message: string, type?: "success" | "error") => void;
  generateCaption: (report: Report) => string;
  onReportUpdated?: (updated: Report) => void;
}

export default function ReportDetailModal({
  report,
  onClose,
  onUpdateStatus,
  onOpenSticker,
  showToast,
  generateCaption,
  onReportUpdated,
}: ReportDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<"poster" | "photo">("poster");
  const [selectedTemplate, setSelectedTemplate] = useState("1");
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [actionLoading, setActionLoading] = useState<"download" | "copy" | "status" | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (report && mounted) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [report, mounted]);

  // Close on Escape key
  useEffect(() => {
    if (!report) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [report, onClose]);

  // Set default media tab when report changes
  useEffect(() => {
    if (report) {
      if (report.posterUrl) {
        setActiveMediaTab("poster");
      } else if (report.photoUrl) {
        setActiveMediaTab("photo");
      }
    }
  }, [report]);

  if (!report || !mounted) return null;

  // Format Indonesian date
  const formattedDate = (() => {
    try {
      const d = report.date ? new Date(report.date + "T00:00:00") : new Date();
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return report.date || "-";
    }
  })();

  // Handle template change
  const handleTemplateChange = async (templateId: string) => {
    if (!report?.id || isGeneratingPoster) return;
    setSelectedTemplate(templateId);
    setIsGeneratingPoster(true);

    try {
      const res = await fetch(`/api/generate-poster?id=${report.id}&template=${templateId}`);
      const json = await res.json();
      if (json.success && json.url) {
        const updated = { ...report, posterUrl: json.url };
        onReportUpdated?.(updated);
        showToast(`Poster berhasil diperbarui ke Template ${templateId}!`, "success");
      } else {
        showToast("Gagal memperbarui template poster.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan saat menghubungi server.", "error");
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  // Handle download poster
  const handleDownloadPoster = async () => {
    if (!report.posterUrl) return;
    setActionLoading("download");
    try {
      const res = await fetch(report.posterUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `poster-mbg-${report.sppgName.replace(/\s+/g, "-")}-${report.date}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Poster berhasil diunduh!", "success");
    } catch {
      showToast("Gagal mengunduh poster.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle copy caption
  const handleCopyCaption = async () => {
    setActionLoading("copy");
    try {
      const caption = generateCaption(report);
      await navigator.clipboard.writeText(caption);
      showToast("Caption WhatsApp berhasil disalin!", "success");
    } catch {
      showToast("Gagal menyalin caption.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Copy ID
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(report.id);
      setCopiedId(true);
      showToast("ID Laporan disalin ke clipboard", "success");
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // ignore
    }
  };

  // Status transitions
  const handleStatusChange = async (nextStatus: "Draft" | "Approved" | "Sent") => {
    setActionLoading("status");
    try {
      await onUpdateStatus(report.id, nextStatus);
      showToast(`Status berhasil diubah menjadi ${nextStatus}!`, "success");
    } catch {
      showToast("Gagal mengubah status laporan.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const hasNutrition = Boolean(
    report.giziBesar &&
      (report.giziBesar.Energi > 0 ||
        report.giziBesar.Protein > 0 ||
        report.giziBesar.Lemak > 0 ||
        report.giziBesar.Karbohidrat > 0 ||
        report.giziBesar.Serat > 0)
  );

  const totalB3 = (report.balita ?? 0) + (report.bumil ?? 0) + (report.busui ?? 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-gray-900/60 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Modal Box */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#1f2937] border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden text-gray-800 dark:text-gray-100">
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="shrink-0 bg-[#f8f9fc] dark:bg-gray-800/90 border-b border-[#e3e6f0] dark:border-gray-700 px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-[0.35rem] bg-[#4e73df]/10 text-[#4e73df] flex items-center justify-center shrink-0 shadow-xs">
              <ClipboardList size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-[11px] font-bold text-[#4e73df] uppercase tracking-wider">
                  Detail Laporan Harian MBG
                </span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[0.25rem] text-[11px] font-bold text-white shadow-xs ${
                    report.status === "Draft"
                      ? "bg-[#f6c23e]"
                      : report.status === "Sent"
                      ? "bg-[#1cc88a]"
                      : "bg-[#4e73df]"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {report.status === "Draft"
                    ? "Draft Laporan"
                    : report.status === "Approved"
                    ? "Disetujui"
                    : "Terkirim"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#5a5c69] dark:text-gray-100 truncate leading-tight">
                {report.sppgName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-[0.25rem] bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-[#858796] dark:text-gray-300 border border-[#e3e6f0] dark:border-gray-600 transition-colors flex items-center justify-center shadow-xs"
            aria-label="Tutup Modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── BODY ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] gap-0">
            {/* ══ LEFT COLUMN: MEDIA PREVIEW & TEMPLATES ══════════════ */}
            <div className="bg-[#f8f9fc] dark:bg-gray-900/60 border-b lg:border-b-0 lg:border-r border-[#e3e6f0] dark:border-gray-700 p-4 sm:p-5 flex flex-col gap-4">
              {/* Media Switcher Tab */}
              <div className="flex rounded-[0.35rem] bg-gray-200/80 dark:bg-gray-800 p-1 border border-[#e3e6f0] dark:border-gray-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveMediaTab("poster")}
                  className={`flex-1 py-1.5 px-3 rounded-[0.25rem] flex items-center justify-center gap-1.5 transition-all ${
                    activeMediaTab === "poster"
                      ? "bg-white dark:bg-gray-700 text-[#4e73df] dark:text-white shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <ImageIcon size={13} />
                  <span>Poster MBG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMediaTab("photo")}
                  className={`flex-1 py-1.5 px-3 rounded-[0.25rem] flex items-center justify-center gap-1.5 transition-all ${
                    activeMediaTab === "photo"
                      ? "bg-white dark:bg-gray-700 text-[#4e73df] dark:text-white shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Camera size={13} />
                  <span>Foto Asli</span>
                </button>
              </div>

              {/* Active Media Container */}
              <div className="relative rounded-[0.35rem] overflow-hidden border border-[#e3e6f0] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm group flex flex-col items-center justify-center min-h-[340px]">
                {activeMediaTab === "poster" ? (
                  report.posterUrl ? (
                    <div className="relative w-full aspect-[4/5] bg-gray-950 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={report.posterUrl}
                        alt="Poster Laporan MBG"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                      />
                      <a
                        href={report.posterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2.5 right-2.5 p-2 bg-gray-900/80 hover:bg-black text-white rounded-[0.35rem] text-[11px] font-bold flex items-center gap-1.5 shadow-md backdrop-blur-xs transition-colors"
                        title="Lihat Ukuran Penuh"
                      >
                        <ExternalLink size={12} />
                        <span>Buka Penuh</span>
                      </a>
                    </div>
                  ) : (
                    <div className="w-full aspect-[4/5] flex flex-col items-center justify-center gap-2.5 p-6 text-center bg-gray-50 dark:bg-gray-800/50">
                      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#4e73df] flex items-center justify-center">
                        <ImageIcon size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Poster Belum Dibuat</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Poster akan di-generate otomatis saat laporan disetujui atau klik opsi di bawah.</p>
                      </div>
                    </div>
                  )
                ) : report.photoUrl ? (
                  <div className="relative w-full aspect-[4/3] bg-gray-950 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={report.photoUrl}
                      alt="Foto Makanan MBG"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                    />
                    <a
                      href={report.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2.5 right-2.5 p-2 bg-gray-900/80 hover:bg-black text-white rounded-[0.35rem] text-[11px] font-bold flex items-center gap-1.5 shadow-md backdrop-blur-xs transition-colors"
                      title="Lihat Ukuran Penuh"
                    >
                      <ExternalLink size={12} />
                      <span>Buka Penuh</span>
                    </a>
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-2.5 p-6 text-center bg-gray-50 dark:bg-gray-800/50">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 flex items-center justify-center">
                      <Camera size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Foto Tidak Tersedia</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Laporan ini dibuat tanpa lampiran foto dokumentasi.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Template Selector Card */}
              <div className="bg-white dark:bg-gray-800 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] p-3.5 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette size={12} className="text-[#4e73df]" />
                    <span>Ganti Template Poster</span>
                  </span>
                  {isGeneratingPoster && (
                    <span className="text-[10px] text-[#4e73df] flex items-center gap-1 animate-pulse font-bold">
                      <RefreshCw size={10} className="animate-spin" /> Memproses...
                    </span>
                  )}
                </div>

                <select
                  value={selectedTemplate}
                  disabled={isGeneratingPoster}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] rounded-[0.35rem] px-2.5 py-1.5 text-xs font-bold text-[#4e73df] dark:text-blue-400 outline-none cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <option value="1">Template 1: Modern Classic</option>
                  <option value="2">Template 2: Classic Beige</option>
                  <option value="3">Template 3: Sky Blue Grid</option>
                  <option value="4">Template 4: Bold Royal Blue</option>
                  <option value="5">Template 5: Eco Green</option>
                  <option value="6">Template 6: Executive Gold</option>
                </select>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Pilih gaya desain yang sesuai untuk publikasi ke grup koordinasi atau media sosial.
                </p>
              </div>
            </div>

            {/* ══ RIGHT COLUMN: DETAILED REPORT INFORMATION ═══════════ */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* META INFO ROW: TANGGAL, WAKTU, SUHU */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-[#f8f9fc] dark:bg-gray-800/70 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] p-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[0.25rem] bg-blue-50 dark:bg-blue-950/40 text-[#4e73df] flex items-center justify-center shrink-0">
                    <Calendar size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tanggal</p>
                    <p className="text-xs font-bold text-[#5a5c69] dark:text-gray-200 truncate">{formattedDate}</p>
                  </div>
                </div>

                <div className="bg-[#f8f9fc] dark:bg-gray-800/70 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] p-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[0.25rem] bg-emerald-50 dark:bg-emerald-950/40 text-[#1cc88a] flex items-center justify-center shrink-0">
                    <Clock size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Waktu Distribusi</p>
                    <p className="text-xs font-bold text-[#5a5c69] dark:text-gray-200 font-mono truncate">
                      {report.distributionTime || "11:30 WIB"}
                    </p>
                  </div>
                </div>

                <div className="bg-[#f8f9fc] dark:bg-gray-800/70 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] p-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[0.25rem] bg-amber-50 dark:bg-amber-950/40 text-[#f6c23e] flex items-center justify-center shrink-0">
                    <Thermometer size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Suhu Makanan</p>
                    <p className="text-xs font-bold text-[#5a5c69] dark:text-gray-200 font-mono truncate">
                      {report.temperatureServed || "62°C"} (Higienis)
                    </p>
                  </div>
                </div>
              </div>

              {/* MENU MAKANAN CARD */}
              <div className="bg-[#f8f9fc] dark:bg-gray-800/90 border-l-[0.25rem] border-l-[#4e73df] border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] p-4 shadow-xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <Utensils size={14} className="text-[#4e73df]" />
                  <span className="text-[10px] font-bold text-[#4e73df] uppercase tracking-wider">
                    Menu Makanan yang Disajikan
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold text-[#5a5c69] dark:text-gray-100 leading-relaxed">
                  {report.menu || "-"}
                </p>
              </div>

              {/* STATS: DISTRIBUSI PENERIMA MANFAAT */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-[#4e73df]" />
                    <span className="text-[11px] font-bold text-[#4e73df] uppercase tracking-wider">
                      Distribusi Penerima Manfaat
                    </span>
                  </div>
                  <span className="text-[11px] text-[#858796] dark:text-gray-400 font-medium">
                    Total: <strong className="text-gray-900 dark:text-white font-bold">{report.totalBeneficiaries.toLocaleString("id-ID")}</strong> porsi
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Card 1: Total */}
                  <div className="bg-[#f8f9fc] dark:bg-gray-800/80 border-l-[0.25rem] border-l-[#4e73df] border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] p-3 text-center shadow-xs">
                    <p className="text-[10px] font-bold text-[#4e73df] uppercase tracking-wider">Total Porsi</p>
                    <p className="text-xl font-extrabold text-[#5a5c69] dark:text-gray-100 mt-1 leading-none">
                      {report.totalBeneficiaries.toLocaleString("id-ID")}
                    </p>
                  </div>

                  {/* Card 2: Porsi Besar */}
                  <div className="bg-[#f8f9fc] dark:bg-gray-800/80 border-l-[0.25rem] border-l-[#36b9cc] border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] p-3 text-center shadow-xs">
                    <p className="text-[10px] font-bold text-[#36b9cc] uppercase tracking-wider">Porsi Besar</p>
                    <p className="text-xl font-extrabold text-[#5a5c69] dark:text-gray-100 mt-1 leading-none">
                      {report.largePortions.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-1 truncate">SD 4-6, SMP, Tendik</p>
                  </div>

                  {/* Card 3: Porsi Kecil */}
                  <div className="bg-[#f8f9fc] dark:bg-gray-800/80 border-l-[0.25rem] border-l-[#1cc88a] border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] p-3 text-center shadow-xs">
                    <p className="text-[10px] font-bold text-[#1cc88a] uppercase tracking-wider">Porsi Kecil</p>
                    <p className="text-xl font-extrabold text-[#5a5c69] dark:text-gray-100 mt-1 leading-none">
                      {report.smallPortions.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-1 truncate">PAUD, TK, SD 1-3</p>
                  </div>

                  {/* Card 4: PMT B3 */}
                  <div className="bg-[#f8f9fc] dark:bg-gray-800/80 border-l-[0.25rem] border-l-[#f6c23e] border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] p-3 text-center shadow-xs">
                    <p className="text-[10px] font-bold text-[#f6c23e] uppercase tracking-wider">PMT B3</p>
                    <p className="text-xl font-extrabold text-[#5a5c69] dark:text-gray-100 mt-1 leading-none">
                      {totalB3.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-1 truncate">Balita, Bumil, Busui</p>
                  </div>
                </div>

                {/* PMT B3 Detail Chips */}
                {totalB3 > 0 && (
                  <div className="flex items-center gap-2 mt-2.5 p-2 bg-[#f8f9fc] dark:bg-gray-800/50 rounded border border-[#e3e6f0] dark:border-gray-700/60 flex-wrap text-xs">
                    <span className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">
                      Rincian B3:
                    </span>
                    {(report.balita ?? 0) > 0 && (
                      <span className="px-2.5 py-0.5 rounded-[0.25rem] bg-[#f6c23e] text-white text-[11px] font-bold shadow-xs">
                        {report.balita} Balita
                      </span>
                    )}
                    {(report.bumil ?? 0) > 0 && (
                      <span className="px-2.5 py-0.5 rounded-[0.25rem] bg-[#e74a3b] text-white text-[11px] font-bold shadow-xs">
                        {report.bumil} Ibu Hamil
                      </span>
                    )}
                    {(report.busui ?? 0) > 0 && (
                      <span className="px-2.5 py-0.5 rounded-[0.25rem] bg-[#36b9cc] text-white text-[11px] font-bold shadow-xs">
                        {report.busui} Ibu Menyusui
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* NUTRITION TABLE (KANDUNGAN NILAI GIZI) */}
              {hasNutrition && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-[#4e73df]" />
                    <span className="text-[11px] font-bold text-[#4e73df] uppercase tracking-wider">
                      Informasi Nilai Gizi Makanan
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-[0.35rem] border border-[#e3e6f0] dark:border-gray-700 shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#f8f9fc] dark:bg-gray-800 border-b border-[#e3e6f0] dark:border-gray-700 text-[11px] font-bold uppercase text-[#5a5c69] dark:text-gray-300">
                          <th className="py-2 px-3">Zat Gizi</th>
                          <th className="py-2 px-3 text-center">Porsi Besar (SD 4-6, SMP)</th>
                          <th className="py-2 px-3 text-center">Porsi Kecil (PAUD, SD 1-3)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e3e6f0] dark:divide-gray-700">
                        <tr className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                          <td className="py-2 px-3 font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <Flame size={12} className="text-orange-500" /> Energi
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-[#4e73df]">
                            {report.giziBesar?.Energi ?? "-"} kkal
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-[#1cc88a]">
                            {report.giziKecil?.Energi ?? "-"} kkal
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                          <td className="py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Protein</td>
                          <td className="py-2 px-3 text-center font-bold text-[#4e73df]">
                            {report.giziBesar?.Protein ?? "-"} g
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-[#1cc88a]">
                            {report.giziKecil?.Protein ?? "-"} g
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                          <td className="py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Lemak</td>
                          <td className="py-2 px-3 text-center font-bold text-[#4e73df]">
                            {report.giziBesar?.Lemak ?? "-"} g
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-[#1cc88a]">
                            {report.giziKecil?.Lemak ?? "-"} g
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                          <td className="py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Karbohidrat</td>
                          <td className="py-2 px-3 text-center font-bold text-[#4e73df]">
                            {report.giziBesar?.Karbohidrat ?? "-"} g
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-[#1cc88a]">
                            {report.giziKecil?.Karbohidrat ?? "-"} g
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                          <td className="py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Serat</td>
                          <td className="py-2 px-3 text-center font-bold text-[#4e73df]">
                            {report.giziBesar?.Serat ?? "-"} g
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-[#1cc88a]">
                            {report.giziKecil?.Serat ?? "-"} g
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CATATAN TAMBAHAN (IF ANY) */}
              {report.notes && (
                <div className="bg-[#f8f9fc] dark:bg-gray-800/70 border-l-[0.25rem] border-l-[#f6c23e] border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] p-3.5 shadow-xs">
                  <span className="text-[10px] font-bold text-[#f6c23e] uppercase tracking-wider block mb-1">
                    Catatan Lapangan
                  </span>
                  <p className="text-xs text-[#5a5c69] dark:text-gray-300 italic leading-relaxed">
                    &ldquo;{report.notes}&rdquo;
                  </p>
                </div>
              )}

              {/* STATUS & WORKFLOW SECTION */}
              <div className="pt-3 border-t border-[#e3e6f0] dark:border-gray-700">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <span className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">
                    Alur Validasi & Status
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Petugas: <strong>{report.picName || "Petugas SPPG"}</strong> ({report.picPhone || "Dashboard"})
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {report.status === "Draft" && (
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleStatusChange("Approved")}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1cc88a] hover:bg-[#17a673] disabled:opacity-50 text-white rounded-[0.35rem] text-xs font-bold shadow-xs transition-colors"
                    >
                      {actionLoading === "status" ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      <span>Setujui Laporan</span>
                    </button>
                  )}

                  {report.status === "Approved" && (
                    <>
                      <button
                        type="button"
                        disabled={actionLoading !== null}
                        onClick={() => handleStatusChange("Draft")}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#858796] hover:bg-[#717384] disabled:opacity-50 text-white rounded-[0.35rem] text-xs font-bold transition-colors shadow-xs"
                      >
                        <Undo2 size={13} />
                        <span>Kembalikan ke Draft</span>
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading !== null}
                        onClick={() => handleStatusChange("Sent")}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#4e73df] hover:bg-[#2e59d9] disabled:opacity-50 text-white rounded-[0.35rem] text-xs font-bold shadow-xs transition-colors"
                      >
                        {actionLoading === "status" ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <Send size={13} />
                        )}
                        <span>Tandai Terkirim</span>
                      </button>
                    </>
                  )}

                  {report.status === "Sent" && (
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleStatusChange("Approved")}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#858796] hover:bg-[#717384] disabled:opacity-50 text-white rounded-[0.35rem] text-xs font-bold transition-colors shadow-xs"
                    >
                      <Undo2 size={13} />
                      <span>Batalkan Pengiriman (Ke Disetujui)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 bg-[#f8f9fc] dark:bg-gray-800/90 border-t border-[#e3e6f0] dark:border-gray-700 flex flex-wrap items-center justify-between gap-2.5">
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Download Poster */}
            <button
              type="button"
              disabled={!report.posterUrl || actionLoading !== null}
              onClick={handleDownloadPoster}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1cc88a] hover:bg-[#17a673] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[0.35rem] text-xs font-bold shadow-xs transition-colors"
              title="Unduh Poster PNG Resolusi Penuh"
            >
              {actionLoading === "download" ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              <span>Download Poster</span>
            </button>

            {/* Copy Caption */}
            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={handleCopyCaption}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#4e73df] hover:bg-[#2e59d9] disabled:opacity-50 text-white rounded-[0.35rem] text-xs font-bold shadow-xs transition-colors"
              title="Salin Teks Format WhatsApp"
            >
              {actionLoading === "copy" ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Copy size={13} />
              )}
              <span>Copy Caption WA</span>
            </button>

            {/* Stiker Ompreng */}
            <button
              type="button"
              onClick={() => onOpenSticker(report)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#36b9cc] hover:bg-[#2c9faf] text-white rounded-[0.35rem] text-xs font-bold shadow-xs transition-colors"
              title="Cetak Stiker Label Ompreng"
            >
              <Printer size={13} />
              <span>Stiker Ompreng</span>
            </button>
          </div>

          {/* Right: ID & Close */}
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={handleCopyId}
              className="text-[11px] font-mono text-[#858796] dark:text-gray-400 hover:text-[#4e73df] transition-colors flex items-center gap-1"
              title="Klik untuk menyalin ID Laporan"
            >
              <span>ID: {report.id?.slice(0, 8)}...</span>
              <Copy size={11} className={copiedId ? "text-emerald-500" : ""} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#858796] hover:bg-[#717384] text-white rounded-[0.35rem] text-xs font-bold shadow-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

