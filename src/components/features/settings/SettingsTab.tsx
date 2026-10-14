"use client";

import React from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  Key,
  Moon,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  Sun,
} from "lucide-react";
import SbCard from "@/components/ui/SbCard";

interface SettingsTabProps {
  theme: "dark" | "light";
  toggleTheme: () => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  autoSync: boolean;
  setAutoSync: (value: boolean) => void;
  geminiApiKeyInput: string;
  setGeminiApiKeyInput: (value: string) => void;
  isSavingGeminiKey: boolean;
  showGeminiKeySecret: boolean;
  setShowGeminiKeySecret: (value: boolean) => void;
  handleSaveGeminiKey: (e: React.FormEvent) => void;
}

export default function SettingsTab({
  theme,
  toggleTheme,
  notificationsEnabled,
  setNotificationsEnabled,
  autoSync,
  setAutoSync,
  geminiApiKeyInput,
  setGeminiApiKeyInput,
  isSavingGeminiKey,
  showGeminiKeySecret,
  setShowGeminiKeySecret,
  handleSaveGeminiKey,
}: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <SbCard
        title="Sistem & Sinkronisasi"
        subtitle="Pengaturan tema tampilan dan sinkronisasi data"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#f8f9fc] dark:bg-gray-800/60 rounded border border-[#e3e6f0] dark:border-gray-700 gap-3">
            <div className="space-y-1 pr-4">
              <h6 className="text-xs font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                {theme === "dark" ? (
                  <Moon size={14} className="text-[#4e73df]" />
                ) : (
                  <Sun size={14} className="text-amber-500" />
                )}
                Tema Tampilan Antarmuka
              </h6>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Pilih antara Mode Gelap (Dark Mode) atau Mode Terang (Light
                Mode) sesuai kenyamanan visual Anda.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (theme !== "dark") toggleTheme();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  theme === "dark"
                    ? "bg-[#4e73df] text-white shadow-sm"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-[#d1d3e2] dark:border-gray-600 hover:text-gray-900"
                }`}
              >
                <Moon size={13} />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (theme !== "light") toggleTheme();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  theme === "light"
                    ? "bg-[#4e73df] text-white shadow-sm"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-[#d1d3e2] dark:border-gray-600 hover:text-gray-900"
                }`}
              >
                <Sun size={13} />
                <span>Light</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#f8f9fc] dark:bg-gray-800/60 rounded border border-[#e3e6f0] dark:border-gray-700">
            <div className="space-y-1 pr-4">
              <h6 className="text-xs font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                <Bell size={14} className="text-[#4e73df]" />
                Notifikasi Alert Laporan Harian
              </h6>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Kirim notifikasi peringatan ketika ada laporan SPPG yang terlambat terkirim.
              </p>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-200 ${
                notificationsEnabled
                  ? "bg-[#4e73df] justify-end"
                  : "bg-gray-300 dark:bg-gray-700 justify-start"
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#f8f9fc] dark:bg-gray-800/60 rounded border border-[#e3e6f0] dark:border-gray-700">
            <div className="space-y-1 pr-4">
              <h6 className="text-xs font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                <Clock size={14} className="text-[#4e73df]" />
                Sinkronisasi Otomatis Supabase
              </h6>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Sinkronisasikan draft laporan secara otomatis ke database cloud setiap 5 menit sekali.
              </p>
            </div>
            <button
              onClick={() => setAutoSync(!autoSync)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-200 ${
                autoSync ? "bg-[#4e73df] justify-end" : "bg-gray-300 dark:bg-gray-700 justify-start"
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
            </button>
          </div>
        </div>
      </SbCard>

      <SbCard
        title="Kecerdasan Buatan (Gemini AI API)"
        subtitle="Konfigurasi API Key Google Gemini untuk fitur komposisi menu MBG Maker, kalkulasi gizi, dan resep"
      >
        <div className="space-y-4">
          <form onSubmit={handleSaveGeminiKey} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key size={13} className="text-amber-500" />
                  <span>Gemini API Key</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowGeminiKeySecret(!showGeminiKeySecret)}
                  className="text-[11px] text-[#4e73df] hover:underline transition-colors"
                >
                  {showGeminiKeySecret ? "Sembunyikan" : "Tampilkan"}
                </button>
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showGeminiKeySecret ? "text" : "password"}
                  value={geminiApiKeyInput}
                  onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] rounded px-3 py-2 text-xs text-gray-700 dark:text-gray-200 outline-none font-mono"
                />
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                Dapatkan kunci API gratis di{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#4e73df] hover:underline"
                >
                  Google AI Studio
                </a>
                . Kunci disimpan dengan aman di database pengaturan sistem.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs">
                {geminiApiKeyInput ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 size={13} /> Terpasang
                  </span>
                ) : (
                  <span className="text-gray-400 italic">Belum disetel</span>
                )}
              </div>
              <button
                type="submit"
                disabled={isSavingGeminiKey}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white rounded text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {isSavingGeminiKey ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                <span>
                  {isSavingGeminiKey ? "Menyimpan..." : "Simpan API Key"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </SbCard>

      <SbCard
        title="Pengiriman Laporan"
        subtitle="Alur pengiriman laporan harian SPPG"
      >
        <div className="p-4 bg-[#f8f9fc] dark:bg-gray-800/60 rounded border border-[#e3e6f0] dark:border-gray-700 space-y-3">
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            Laporan dikirim <span className="font-bold text-gray-900 dark:text-white">manual</span>{" "}
            ke grup WhatsApp melalui halaman Dashboard.
          </p>
          <ol className="list-decimal list-inside text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
            <li>
              Buka tab <span className="font-semibold text-gray-800 dark:text-gray-200">Laporan Harian</span>, isi
              form, klik{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200">Buat Pratinjau</span>.
            </li>
            <li>
              Di modal pratinjau, klik{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200">Download Poster</span>{" "}
              untuk menyimpan gambar poster.
            </li>
            <li>
              Klik <span className="font-semibold text-gray-800 dark:text-gray-200">Copy Caption</span>{" "}
              untuk menyalin teks laporan.
            </li>
            <li>
              Buka WhatsApp, pilih grup tujuan, tempel caption, unggah poster,
              lalu kirim.
            </li>
          </ol>
        </div>
      </SbCard>
    </div>
  );
}
