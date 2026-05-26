"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Smartphone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [senderNumber, setSenderNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  // Fetch the current setting on page mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "mpwa_sender")
          .maybeSingle();

        if (error) throw error;
        if (data?.value) {
          setSenderNumber(data.value);
        }
      } catch (err: unknown) {
        console.error("Failed to load settings:", err);
        showToast("Gagal memuat pengaturan dari database.", "error");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Clean target sender phone number (only digits)
      const cleanedNumber = senderNumber.replace(/\D/g, "");
      if (!cleanedNumber) {
        showToast("Nomor WhatsApp tidak valid.", "error");
        setSaving(false);
        return;
      }

      // Perform upsert on key 'mpwa_sender'
      const { error } = await supabase
        .from("system_settings")
        .upsert(
          { key: "mpwa_sender", value: cleanedNumber },
          { onConflict: "key" }
        );

      if (error) throw error;

      showToast("Nomor WhatsApp Sender berhasil diperbarui!", "success");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to save settings:", err);
      showToast(errorMessage || "Gagal menyimpan perubahan ke database.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans overflow-x-hidden antialiased relative">
      {/* Dynamic Futuristic Gradient Background Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_45%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_40%)] pointer-events-none" />

      {/* Header */}
      <header className="h-20 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20 px-6 lg:px-8 flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="p-2.5 rounded-xl bg-slate-800/85 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Kembali ke Dashboard"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Pengaturan System Settings</h2>
          <p className="text-xs text-slate-400">Kelola variabel global sistem pelaporan secara terpusat.</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 max-w-2xl w-full mx-auto relative z-10 flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="animate-spin text-indigo-500" size={40} />
            <p className="text-slate-400 text-sm">Memuat data dari Supabase...</p>
          </div>
        ) : (
          <div className="bg-slate-950/40 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone size={18} className="text-indigo-400" />
                <span>Konfigurasi WhatsApp Gateway (MPWA)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Atur nomor WhatsApp pengirim yang akan digunakan bot untuk mengirim pesan konfirmasi dan laporan ke grup.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nomor WhatsApp Sender (mpwa_sender)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500 font-bold text-xs select-none">+</span>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 628123456789"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    className="w-full pl-7 pr-4 py-3 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-xs outline-none transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Masukkan nomor WhatsApp lengkap beserta kode negara tanpa tanda tambah (+) atau spasi. Contoh: <strong className="text-slate-400">628123456789</strong>.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border bg-slate-950/90 backdrop-blur-md shadow-2xl transition-all duration-300 transform ${
        toast.show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"
      } ${
        toast.type === "success" ? "border-emerald-500/20" : "border-red-500/20"
      }`}>
        {toast.type === "success" ? (
          <CheckCircle2 className="text-emerald-400" size={18} />
        ) : (
          <AlertCircle className="text-red-400" size={18} />
        )}
        <span className="text-xs font-semibold text-slate-200">{toast.message}</span>
      </div>
    </div>
  );
}
