"use client";

import React, { useEffect, useState, use } from "react";
import { Utensils, HeartPulse, Calendar, AlertTriangle, ShieldCheck, MapPin, RefreshCw } from "lucide-react";

interface PublicMenuData {
  id: string;
  tanggal: string;
  menu: string;
  porsi_besar: number;
  porsi_kecil: number;
  energi: number;
  protein: number;
  lemak: number;
  karbohidrat: number;
  serat: number;
  photo_url?: string;
  poster_url?: string;
  extracted_data?: {
    sppg_name?: string;
    sub_wilayah?: string;
    jam_selesai?: string;
    jam_batas?: string;
    "Porsi Besar"?: {
      Energi?: string | number;
      Protein?: string | number;
      Lemak?: string | number;
      Karbohidrat?: string | number;
      Serat?: string | number;
    };
    "Porsi Kecil"?: {
      Energi?: string | number;
      Protein?: string | number;
      Lemak?: string | number;
      Karbohidrat?: string | number;
      Serat?: string | number;
    };
    B3?: {
      Balita?: number;
      Bumil?: number;
      Busui?: number;
    };
  };
}

export default function InfoMenuPublicPage({
  searchParams,
}: {
  searchParams: Promise<{ sppg?: string }>;
}) {
  const resolvedParams = use(searchParams);
  const sppgQuery = resolvedParams.sppg || "";

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<PublicMenuData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function fetchMenu() {
      setLoading(true);
      try {
        const url = sppgQuery
          ? `/api/public/menu?sppg=${encodeURIComponent(sppgQuery)}`
          : `/api/public/menu`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.status === "success" && json.data) {
          setReport(json.data);
        } else {
          setErrorMsg(json.message || "Laporan menu belum tersedia.");
        }
      } catch {
        setErrorMsg("Gagal memuat informasi menu. Periksa koneksi internet.");
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, [sppgQuery]);

  const ext = report?.extracted_data || {};
  const sppgName = ext.sppg_name || sppgQuery || "SPPG Wilayah MBG";
  const giziBesar = ext["Porsi Besar"] || {
    Energi: report?.energi || "-",
    Protein: report?.protein || "-",
    Lemak: report?.lemak || "-",
    Karbohidrat: report?.karbohidrat || "-",
    Serat: report?.serat || "-",
  };
  const giziKecil = ext["Porsi Kecil"] || {};

  const fmtDate = report?.tanggal
    ? new Date(report.tanggal + "T00:00:00").toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Container Mobile First Card */}
      <div className="w-full max-w-lg space-y-4 my-auto">
        {/* Header Branding BGN */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 border-b border-slate-800/80 pb-4">
            <div className="w-14 h-14 bg-white rounded-2xl p-1.5 flex items-center justify-center shrink-0 shadow-md shadow-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-bgn-new.png"
                alt="Badan Gizi Nasional"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                BADAN GIZI NASIONAL
              </span>
              <h1 className="text-base sm:text-lg font-black text-white truncate leading-tight">
                {sppgName}
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin size={12} className="text-emerald-400 shrink-0" />
                <span>Informasi Resmi Makanan Bergizi Gratis (MBG)</span>
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Calendar size={14} className="text-emerald-400" />
              <span suppressHydrationWarning>{fmtDate}</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={12} /> Terverifikasi
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-10 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-emerald-400 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Memuat rincian gizi & menu...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && errorMsg && (
          <div className="p-6 bg-slate-900/80 border border-rose-500/30 rounded-3xl text-center space-y-2">
            <AlertTriangle size={32} className="text-rose-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Informasi Menu Belum Tersedia</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Content State */}
        {!loading && report && (
          <>
            {/* Foto Makanan (jika ada) */}
            {report.photo_url && (
              <div className="relative w-full h-56 rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={report.photo_url}
                  alt={report.menu}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-3 left-4 right-4">
                  <span className="text-[10px] bg-emerald-500/90 text-white font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Foto Dokumentasi Sajian
                  </span>
                </div>
              </div>
            )}

            {/* Menu Makanan Utama Card */}
            <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-3xl space-y-2 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Utensils size={15} />
                <span>Menu Sajian Hari Ini</span>
              </div>
              <h2 className="text-lg font-extrabold text-white leading-snug">
                {report.menu || "Menu Makanan Bergizi Gratis"}
              </h2>
            </div>

            {/* Kandungan Zat Gizi Card */}
            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <HeartPulse size={16} className="text-rose-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Rincian Nilai Gizi Porsi
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  Standar Badan Gizi Nasional
                </span>
              </div>

              {/* Grid Zat Gizi (Porsi Besar) */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-emerald-400 block">
                  Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru):
                </span>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
                    <span className="text-[9px] font-bold text-slate-400 block">ENERGI</span>
                    <strong className="text-sm font-black text-amber-400 block mt-0.5">
                      {giziBesar.Energi || report.energi || "0"}
                    </strong>
                    <span className="text-[8px] text-slate-500">kkal</span>
                  </div>
                  <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
                    <span className="text-[9px] font-bold text-slate-400 block">PROTEIN</span>
                    <strong className="text-sm font-black text-indigo-400 block mt-0.5">
                      {giziBesar.Protein || report.protein || "0"}
                    </strong>
                    <span className="text-[8px] text-slate-500">gram</span>
                  </div>
                  <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
                    <span className="text-[9px] font-bold text-slate-400 block">LEMAK</span>
                    <strong className="text-sm font-black text-rose-400 block mt-0.5">
                      {giziBesar.Lemak || report.lemak || "0"}
                    </strong>
                    <span className="text-[8px] text-slate-500">gram</span>
                  </div>
                  <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
                    <span className="text-[9px] font-bold text-slate-400 block">KARBO</span>
                    <strong className="text-sm font-black text-emerald-400 block mt-0.5">
                      {giziBesar.Karbohidrat || report.karbohidrat || "0"}
                    </strong>
                    <span className="text-[8px] text-slate-500">gram</span>
                  </div>
                  <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
                    <span className="text-[9px] font-bold text-slate-400 block">SERAT</span>
                    <strong className="text-sm font-black text-teal-400 block mt-0.5">
                      {giziBesar.Serat || report.serat || "0"}
                    </strong>
                    <span className="text-[8px] text-slate-500">gram</span>
                  </div>
                </div>
              </div>

              {/* Grid Zat Gizi (Porsi Kecil jika ada) */}
              {giziKecil.Energi && (
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <span className="text-[11px] font-bold text-indigo-400 block">
                    Porsi Kecil (PAUD-TK & SD Kelas 1-3):
                  </span>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                      <span className="text-[8px] font-bold text-slate-400 block">ENERGI</span>
                      <strong className="text-xs font-black text-amber-300 block">{giziKecil.Energi}</strong>
                      <span className="text-[7px] text-slate-500">kkal</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                      <span className="text-[8px] font-bold text-slate-400 block">PROTEIN</span>
                      <strong className="text-xs font-black text-indigo-300 block">{giziKecil.Protein}</strong>
                      <span className="text-[7px] text-slate-500">gram</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                      <span className="text-[8px] font-bold text-slate-400 block">LEMAK</span>
                      <strong className="text-xs font-black text-rose-300 block">{giziKecil.Lemak}</strong>
                      <span className="text-[7px] text-slate-500">gram</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                      <span className="text-[8px] font-bold text-slate-400 block">KARBO</span>
                      <strong className="text-xs font-black text-emerald-300 block">{giziKecil.Karbohidrat}</strong>
                      <span className="text-[7px] text-slate-500">gram</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                      <span className="text-[8px] font-bold text-slate-400 block">SERAT</span>
                      <strong className="text-xs font-black text-teal-300 block">{giziKecil.Serat}</strong>
                      <span className="text-[7px] text-slate-500">gram</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Peringatan & Aturan Konsumsi Sesuai SE 2026 */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-3xl space-y-2 text-xs leading-relaxed text-amber-200">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 uppercase tracking-wide">
                <AlertTriangle size={15} />
                <span>Peringatan Penting Higiene:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                <li>Makanan harus segera dikonsumsi setelah diterima dan tidak boleh disimpan melebihi jam batas konsumsi.</li>
                <li>Makanan bergizi gratis <strong className="text-white">tidak boleh dibawa pulang</strong> dan wajib dihabiskan di lingkungan sekolah.</li>
              </ul>
            </div>
          </>
        )}

        {/* Footer Official */}
        <div className="text-center text-[10px] text-slate-500 pt-2 pb-4 space-y-1">
          <p>© Badan Gizi Nasional Republik Indonesia</p>
          <p>Mendukung Generasi Emas Indonesia 2045</p>
        </div>
      </div>
    </div>
  );
}
