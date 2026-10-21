"use client";

import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from "react";
import { useLaporanRealtime } from "@/lib/hooks/useLaporanRealtime";
import { supabase } from "@/lib/supabase";
import type { SppgData } from "@/types/sppg";
import { useSppgManager } from "@/hooks/useSppgManager";
import type { KelompokData, BeneficiaryData } from "@/types/penerima";
import { fetchSppgListApi } from "@/lib/api/sppg";
import { fetchBeneficiaryListApi } from "@/lib/api/penerima";
import { fetchKelompokListApi } from "@/lib/api/kelompok";
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  Menu,
  X,
  Users,
  Utensils,
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  CheckCircle2,
  Send,
  Clock,
  Calendar,
  ArrowUpDown,
  LogOut,
  Bell,
  User,
  Shield,
  RefreshCw,
  Database,
  Trash2,
  Edit,
  Download,
  Copy,
  Eye,
  Camera,
  Image as ImageIcon,
  Plus,
  Upload,
  FileText,
  Printer,
  Palette,
  Sun,
  Moon,
  ChefHat,
  Key,
  Sparkles,
  Smartphone,
  SlidersHorizontal,
  Bluetooth,
  BarChart3,
} from "lucide-react";
import WeeklyReportView from "@/components/WeeklyReportView";
import StickerPrintSheet from "@/components/StickerPrintSheet";
import { downloadTemplateCsv } from "@/lib/csv";
import { KATEGORI_OPTIONS, getSubKategoriOptions } from "@/lib/penerima-options";
import StickerPrintSheetSE from "@/components/StickerPrintSheetSE";
import StickerRollGrozziie from "@/components/StickerRollGrozziie";
import StickerPreview from "@/components/StickerPreview";
import MBGMaker from "@/components/MBGMaker";
import {
  DEFAULT_GEMINI_MODELS_TEXT,
  formatGeminiModels,
  parseGeminiModels,
  type AvailableModel,
  type ModelTestResult,
} from "@/lib/gemini-models";
import RekapTab from "@/components/features/rekap/RekapTab";
import SppgTab from "@/components/features/sppg/SppgTab";
import SbModal from "@/components/ui/SbModal";
import SbCard from "@/components/ui/SbCard";
import SbStatCard from "@/components/ui/SbStatCard";
import SbPageHeader from "@/components/ui/SbPageHeader";
import PenerimaTab from "@/components/features/penerima/PenerimaTab";
import SettingsTab from "@/components/features/settings/SettingsTab";
import { directPrintElementViaBle, isWebBluetoothSupported, printTestPatternViaBle } from "@/lib/thermal-ble";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import type { Report } from "@/types/report";
import ReportDetailModal from "@/components/features/reports/ReportDetailModal";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Realtime database data source

function toTitleCase(str: string): string {
  if (!str) return "";
  const acronyms = ["SPPG", "BGN", "PAUD", "TK", "SD", "SMP", "SMA", "PMT", "B3"];
  return str
    .split(" ")
    .map((word) => {
      const cleanWord = word.trim();
      if (!cleanWord) return "";
      const upper = cleanWord.toUpperCase();
      if (acronyms.includes(upper)) return upper;
      return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
    })
    .join(" ");
}

// Theme external store — single source of truth synced with the `light`/`dark`
// class applied on <html> (set by the inline head script and the toggles).
// Module-initial state stays "dark" so SSR and the first client render match,
// then the store is reconciled with the applied theme right after mount.
let themeSnapshot: "dark" | "light" = "dark";
const themeListeners = new Set<() => void>();

function setThemeSnapshot(next: "dark" | "light") {
  if (next !== themeSnapshot) {
    themeSnapshot = next;
    themeListeners.forEach((listener) => listener());
  }
}

function subscribeTheme(onChange: () => void) {
  themeListeners.add(onChange);
  return () => {
    themeListeners.delete(onChange);
  };
}

function getThemeSnapshot() {
  return themeSnapshot;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "laporan" | "mingguan" | "pengaturan" | "sppg" | "penerima" | "rekap" | "riwayat" | "stiker" | "menu">("dashboard");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [statusFilter, setStatusFilter] = useState<string>("All");

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { reports: dbReports, setReports: setDbReports, loading: reportsLoading } = useLaporanRealtime();

  // Map DB reports to local Report structure, fallback to mock data if empty
  const reportsList = useMemo<Report[]>(() => {
    const dbMapped = dbReports.map((r) => {
      let statusStr: "Draft" | "Approved" | "Sent" = "Draft";
      if (r.status?.toUpperCase() === "SENT") statusStr = "Sent";
      if (r.status?.toUpperCase() === "APPROVED") statusStr = "Approved";

      const large = r.porsi_besar || 0;
      const small = r.porsi_kecil || 0;
      const b3 = r.extracted_data?.B3 || {};
      const balita = b3.Balita || 0;
      const bumil = b3.Bumil || 0;
      const busui = b3.Busui || 0;
      const total = large + small + balita + bumil + busui;

      let dateStr = r.tanggal || "";
      if (!dateStr && r.created_at) {
        dateStr = r.created_at.split("T")[0];
      }

      const sppgName = r.extracted_data?.sppg_name || "SPPG Wilayah";
      const location = r.extracted_data?.sppg_address || "Operasional Lapangan";

      const rawGb = r.extracted_data?.["Porsi Besar"] || r.extracted_data?.gizi_besar || null;
      const rawGk = r.extracted_data?.["Porsi Kecil"] || r.extracted_data?.gizi_kecil || null;

      const giziBesar = rawGb
        ? {
          Energi: Number(rawGb.Energi ?? rawGb.energi ?? r.energi ?? 0),
          Protein: Number(rawGb.Protein ?? rawGb.protein ?? r.protein ?? 0),
          Lemak: Number(rawGb.Lemak ?? rawGb.lemak ?? r.lemak ?? 0),
          Karbohidrat: Number(rawGb.Karbohidrat ?? rawGb.karbohidrat ?? r.karbohidrat ?? 0),
          Serat: Number(rawGb.Serat ?? rawGb.serat ?? r.serat ?? 0),
        }
        : (r.energi || r.protein || r.lemak || r.karbohidrat || r.serat)
          ? {
            Energi: Number(r.energi || 0),
            Protein: Number(r.protein || 0),
            Lemak: Number(r.lemak || 0),
            Karbohidrat: Number(r.karbohidrat || 0),
            Serat: Number(r.serat || 0),
          }
          : undefined;

      const giziKecil = rawGk
        ? {
          Energi: Number(rawGk.Energi ?? rawGk.energi ?? 0),
          Protein: Number(rawGk.Protein ?? rawGk.protein ?? 0),
          Lemak: Number(rawGk.Lemak ?? rawGk.lemak ?? 0),
          Karbohidrat: Number(rawGk.Karbohidrat ?? rawGk.karbohidrat ?? 0),
          Serat: Number(rawGk.Serat ?? rawGk.serat ?? 0),
        }
        : undefined;

      return {
        id: r.id,
        date: dateStr || new Date().toISOString().split("T")[0],
        sppgName,
        location,
        totalBeneficiaries: total,
        largePortions: large,
        smallPortions: small,
        status: statusStr,
        menu: r.menu || "Belum ditentukan",
        picName: r.extracted_data?.PIC || "Petugas",
        picPhone: r.whatsapp_from || "Dashboard",
        distributionTime: r.created_at ? new Date(r.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB" : "11:30 WIB",
        temperatureServed: "62°C",
        notes: r.raw_message || undefined,
        photoUrl: r.photo_url || undefined,
        posterUrl: r.poster_url || undefined,
        balita,
        bumil,
        busui,
        giziBesar,
        giziKecil
      };
    });

    return dbMapped;
  }, [dbReports]);

  const generateReportCaption = useCallback((report: Report): string => {
    const d = report.date ? new Date(report.date + "T00:00:00") : new Date();
    const dateFormatted = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const balita = report.balita ?? 0;
    const bumil = report.bumil ?? 0;
    const busui = report.busui ?? 0;
    const total = report.largePortions + report.smallPortions + balita + bumil + busui;
    const gb = report.giziBesar;
    const gk = report.giziKecil;

    let caption =
      `*LAPORAN HARIAN MBG (MAKANAN BERGIZI GRATIS)*\n\n` +
      `*SPPG:* ${report.sppgName}\n` +
      `*Tanggal:* ${dateFormatted}\n` +
      `*Menu:* ${report.menu}\n` +
      `*Jumlah Penerima:* ${total} Orang\n` +
      `   - Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru/Tendik): ${report.largePortions} Orang\n` +
      `   - Porsi Kecil (PAUD-TK, SD Kelas 1-3): ${report.smallPortions} Orang\n` +
      `   - B3 Balita: ${balita} Anak\n` +
      `   - B3 Bumil: ${bumil} Ibu\n` +
      `   - B3 Busui: ${busui} Ibu\n\n`;

    if (gb) {
      caption +=
        `*Nilai Gizi Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru/Tendik):*\n` +
        `   - Energi: ${gb.Energi || 0} kcal\n` +
        `   - Protein: ${gb.Protein || 0} g\n` +
        `   - Lemak: ${gb.Lemak || 0} g\n` +
        `   - Karbohidrat: ${gb.Karbohidrat || 0} g\n` +
        `   - Serat: ${gb.Serat || 0} g\n\n`;
    }

    if (gk) {
      caption +=
        `*Nilai Gizi Porsi Kecil (PAUD-TK, SD Kelas 1-3):*\n` +
        `   - Energi: ${gk.Energi || 0} kcal\n` +
        `   - Protein: ${gk.Protein || 0} g\n` +
        `   - Lemak: ${gk.Lemak || 0} g\n` +
        `   - Karbohidrat: ${gk.Karbohidrat || 0} g\n` +
        `   - Serat: ${gk.Serat || 0} g\n\n`;
    }

    caption += `Dikirim dengan hormat untuk mewujudkan Generasi Emas Indonesia 2045.`;
    return caption;
  }, []);

  // Derived state from reportsList
  const reports = reportsList;

  // Theme State (Dark / Light Mode)
  // useSyncExternalStore keeps hydration deterministic: server and the first
  // client render both see "dark", then the store is reconciled with the theme
  // already applied on <html> by the inline head script (no hydration mismatch).
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "dark" as const);

  useEffect(() => {
    const applied: "dark" | "light" = document.documentElement.classList.contains("light") ? "light" : "dark";
    setThemeSnapshot(applied);
  }, []);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "light" ? "#f8fafc" : "#0f172a");
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("mbg_theme", nextTheme);
    } catch {
      // ignore
    }
    setThemeSnapshot(nextTheme);
  };

  const [settingsToast, setSettingsToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({

    show: false, message: "", type: "success"

  });

  const showSettingsToast = (message: string, type: "success" | "error" = "success") => {

    setSettingsToast({ show: true, message, type });

    setTimeout(() => setSettingsToast((prev) => ({ ...prev, show: false })), 4000);

  };

  // SPPG States & Interfaces (tipe dari @/types/sppg)



  const handleSppgLoaded = useCallback((list: SppgData[]) => {
    if (list.length > 0) {
      setStandaloneStikerSppg((prev) => {
        if (!prev || prev === "SPPG KOTA BANDUNG" || !list.some((s: SppgData) => s.nama_sppg === prev)) {
          const first = list[0];
          if (first.kontak_pengaduan) setStandaloneStikerWaPengaduan(first.kontak_pengaduan);
          if (first.sub_wilayah) setStandaloneStikerSubWilayah(first.sub_wilayah);
          if (first.tiktok) setStandaloneStikerTiktok(first.tiktok);
          if (first.instagram) setStandaloneStikerInstagram(first.instagram);
          return first.nama_sppg;
        }
        return prev;
      });
    }
  }, []);

  const sppgManager = useSppgManager({
    showToast: showSettingsToast,
    onLoaded: handleSppgLoaded,
  });



  const {



    sppgList,



    setSppgList,



    loadingSppg,



    sppgForm,



    setSppgForm,



    editingSppgId,



    setEditingSppgId,



    showSppgModal,



    setShowSppgModal,



    sppgSubmitting,



    sppgSearch,



    setSppgSearch,



    fetchSppgList,



    handleSaveSppg,



    handleEditSppg,



    handleDeleteSppg,



  } = sppgManager;




  // Gemini API Key state

  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState("");

  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);

  const [showGeminiKeySecret, setShowGeminiKeySecret] = useState(false);

  // Gemini model fallback chain (disimpan di system_settings key "gemini_models")
  const [geminiModelsInput, setGeminiModelsInput] = useState(DEFAULT_GEMINI_MODELS_TEXT);

  const [isSavingGeminiModels, setIsSavingGeminiModels] = useState(false);

  // Deteksi model yang tersedia (proxy ke Gemini API)
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);

  const [isDetectingModels, setIsDetectingModels] = useState(false);

  // Hasil uji per model (tombol "Tes Model")
  const [modelTestResults, setModelTestResults] = useState<
    Record<string, ModelTestResult>
  >({});

  const [isTestingModel, setIsTestingModel] = useState<string | null>(null);



  const handleSaveGeminiKey = async (e: React.FormEvent) => {

    e.preventDefault();

    setIsSavingGeminiKey(true);

    try {

      const res = await fetch("/api/settings", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          key: "gemini_api_key",

          value: geminiApiKeyInput.trim(),

        }),

      });
      const json = await res.json();
      if (json.success) {
        showSettingsToast("Gemini API Key berhasil disimpan!", "success");
      } else {
        showSettingsToast(json.error || "Gagal menyimpan Gemini API Key.", "error");
      }
    } catch {
      showSettingsToast("Terjadi kesalahan saat menyimpan pengaturan.", "error");
    } finally {
      setIsSavingGeminiKey(false);
    }
  };

  const handleSaveGeminiModels = async (e: React.FormEvent) => {
    e.preventDefault();

    const models = parseGeminiModels(geminiModelsInput);
    if (models.length === 0) {
      showSettingsToast("Masukkan minimal satu model ID Gemini yang valid.", "error");
      return;
    }

    setIsSavingGeminiModels(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "gemini_models",
          value: formatGeminiModels(models),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setGeminiModelsInput(formatGeminiModels(models));
        showSettingsToast("Daftar model Gemini berhasil disimpan!", "success");
      } else {
        showSettingsToast(json.error || "Gagal menyimpan daftar model Gemini.", "error");
      }
    } catch {
      showSettingsToast("Terjadi kesalahan saat menyimpan daftar model Gemini.", "error");
    } finally {
      setIsSavingGeminiModels(false);
    }
  };

  const handleResetGeminiModels = async () => {
    setGeminiModelsInput(DEFAULT_GEMINI_MODELS_TEXT);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "gemini_models",
          value: DEFAULT_GEMINI_MODELS_TEXT,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showSettingsToast("Daftar model Gemini dikembalikan ke default.", "success");
      } else {
        showSettingsToast(json.error || "Gagal mengembalikan daftar model Gemini.", "error");
      }
    } catch {
      showSettingsToast("Terjadi kesalahan saat mengembalikan daftar model Gemini.", "error");
    }
  };

  // Deteksi model yang benar-benar tersedia untuk API key saat ini
  const handleDetectModels = async () => {
    setIsDetectingModels(true);
    try {
      const res = await fetch("/api/ai/models");
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.models)) {
        setAvailableModels(json.models as AvailableModel[]);
        showSettingsToast(
          `${json.models.length} model Gemini terdeteksi.`,
          "success"
        );
      } else {
        showSettingsToast(
          json.message || "Gagal mendeteksi daftar model Gemini.",
          "error"
        );
      }
    } catch {
      showSettingsToast("Terjadi kesalahan saat mendeteksi model Gemini.", "error");
    } finally {
      setIsDetectingModels(false);
    }
  };

  // Uji satu model Gemini (cek kuota, status, dan latensi)
  const handleTestModel = async (model: string) => {
    setIsTestingModel(model);
    try {
      const res = await fetch("/api/ai/test-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      const json = await res.json();
      const result: ModelTestResult = {
        ok: Boolean(json.ok),
        model,
        modelVersion: json.modelVersion ?? null,
        latencyMs: Number(json.latencyMs) || 0,
        error: json.error ?? null,
      };
      setModelTestResults((prev) => ({ ...prev, [model]: result }));
      const reason = result.error
        ? result.error.charAt(0).toUpperCase() + result.error.slice(1)
        : "tidak diketahui";
      showSettingsToast(
        result.ok
          ? `${model} siap dipakai (${result.latencyMs} ms).`
          : `${model} gagal: ${reason}`,
        result.ok ? "success" : "error"
      );
    } catch {
      showSettingsToast("Terjadi kesalahan saat menguji model.", "error");
    } finally {
      setIsTestingModel(null);
    }
  };

  // Kelompok Penerima Manfaat (grup) — tipe dari @/types/penerima
  const JENIS_KELOMPOK = ["Sekolah", "Posyandu", "PKBM", "PES", "Lainnya"];
  const [kelompokList, setKelompokList] = useState<KelompokData[]>([]);
  const [loadingKelompok, setLoadingKelompok] = useState(false);
  const [kelompokForm, setKelompokForm] = useState<KelompokData>({
    sppg_id: null,
    nama_kelompok: "",
    jenis: "Sekolah",
    kode: "",
    kategori: "",
    nama_kader: "",
    telepon: "",
    email: "",
    alamat: "",
    kontak: "",
    catatan: ""
  });
  const [editingKelompokId, setEditingKelompokId] = useState<string | null>(null);
  const [showKelompokModal, setShowKelompokModal] = useState(false);
  const [showKpmImportModal, setShowKpmImportModal] = useState(false);
  const [kpmImportSppgId, setKpmImportSppgId] = useState<string>("");
  const [kpmImportFile, setKpmImportFile] = useState<File | null>(null);
  const [kpmImportRows, setKpmImportRows] = useState<Record<string, string>[]>([]);
  const [kpmImportHeaders, setKpmImportHeaders] = useState<string[]>([]);
  const [kpmImportErrors, setKpmImportErrors] = useState<{ row: number; reason: string }[]>([]);
  const [kpmImporting, setKpmImporting] = useState(false);

  interface KpmReviewRow {
    id: string;
    selected: boolean;
    status: "valid" | "error";
    errors: string[];
    row: {
      jenis: string;
      nama_kelompok: string;
      kode: string;
      nama_kader: string;
      telepon: string;
      email: string;
      alamat: string;
    };
  }
  interface PenerimaReviewRow {
    id: string;
    selected: boolean;
    status: "valid" | "error";
    errors: string[];
    row: {
      nama_lengkap: string;
      tanggal_lahir: string;
      gender: string;
      nik: string;
      identity_type: string;
      identity_code: string;
      kategori: string;
      sub_kategori: string;
      nama_kpm: string;
      status: string;
      catatan: string;
    };
  }

  const [kpmReviewRows, setKpmReviewRows] = useState<KpmReviewRow[]>([]);
  const [kpmReviewPage, setKpmReviewPage] = useState(1);
  const [kpmReviewFilter, setKpmReviewFilter] = useState<"all" | "valid" | "error">("all");
  const [kpmReviewEdit, setKpmReviewEdit] = useState(false);

  const [beneficiaryReviewRows, setBeneficiaryReviewRows] = useState<PenerimaReviewRow[]>([]);
  const [beneficiaryReviewPage, setBeneficiaryReviewPage] = useState(1);
  const [beneficiaryReviewFilter, setBeneficiaryReviewFilter] = useState<"all" | "valid" | "error">("all");
  const [beneficiaryReviewEdit, setBeneficiaryReviewEdit] = useState(false);
  const [existingPenerimaKeys, setExistingPenerimaKeys] = useState<string[]>([]);

  const validateKpmReviewRow = (r: KpmReviewRow["row"]) => {
    const errs: string[] = [];
    if (!r.nama_kelompok.trim()) errs.push("Nama KPM wajib");
    return errs;
  };
  const validatePenerimaReviewRow = (r: PenerimaReviewRow["row"]) => {
    const errs: string[] = [];
    if (!r.nama_lengkap.trim()) errs.push("Nama wajib");
    if (!r.kategori.trim()) errs.push("Kategori wajib");
    if (!r.sub_kategori.trim()) errs.push("Sub kategori wajib");
    if (r.gender && !["L", "P"].includes(r.gender.toUpperCase())) errs.push("Gender L/P");
    if (r.nik && !/^\d{16}$/.test(r.nik.trim())) errs.push("NIK 16 digit");
    if (r.nama_kpm.trim()) {
      const match = kelompokList.some((k) => (k.nama_kelompok || "").trim().toLowerCase() === r.nama_kpm.trim().toLowerCase());
      if (!match) errs.push(`KPM tidak ditemukan: ${r.nama_kpm}`);
    }
    return errs;
  };

  const normalizeDateInput = (v: string) => {
    const s = (v || "").trim();
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const [_, d, mo, y] = m;
      return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return s;
  };

  const getPenerimaDupKey = (r: PenerimaReviewRow["row"]) => {
    if (r.nik && r.nik.trim()) return `nik:${r.nik.trim()}`;
    if (r.identity_code && r.identity_code.trim()) return `id:${r.identity_type || ""}:${r.identity_code.trim()}`;
    if (r.nama_lengkap.trim() && r.tanggal_lahir.trim()) return `name:${r.nama_lengkap.trim().toLowerCase()}:${r.tanggal_lahir.trim()}`;
    return "";
  };
  const [kelompokSubmitting, setKelompokSubmitting] = useState(false);
  const [kelompokFilterSppg, setKelompokFilterSppg] = useState<string>("");

  // Penerima Manfaat (individu)
  // Penerima Manfaat (individu) — tipe dari @/types/penerima
  const [beneficiaryList, setBeneficiaryList] = useState<BeneficiaryData[]>([]);
  const [loadingBeneficiary, setLoadingBeneficiary] = useState(false);
  const [beneficiaryForm, setBeneficiaryForm] = useState<BeneficiaryData>({
    sppg_id: null,
    kelompok_id: null,
    nama_lengkap: "",
    tanggal_lahir: "",
    gender: "",
    nik: "",
    identity_type: "nik",
    identity_code: "",
    kategori: "",
    sub_kategori: "",
    status: "Aktif",
    tanggal_mulai: "",
    tanggal_berhenti: "",
    catatan: ""
  });
  const [editingBeneficiaryId, setEditingBeneficiaryId] = useState<string | null>(null);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [beneficiarySubmitting, setBeneficiarySubmitting] = useState(false);
  const [beneficiarySearch, setBeneficiarySearch] = useState("");
  const [beneficiaryFilterSppg, setBeneficiaryFilterSppg] = useState<string>("");
  const [beneficiaryFilterKategori, setBeneficiaryFilterKategori] = useState<string>("");
  const [beneficiaryFilterStatus, setBeneficiaryFilterStatus] = useState<string>("");
  const [beneficiaryView, setBeneficiaryView] = useState<"kelompok" | "individu">("kelompok");

  // Rekap tab kini diekstrak ke src/components/features/rekap/RekapTab.tsx



  // Import CSV state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSppgId, setImportSppgId] = useState<string>("");
  const [importKelompokId, setImportKelompokId] = useState<string>("");
  const [importAutoCreate, setImportAutoCreate] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<{ row: number; reason: string }[]>([]);
  const [importing, setImporting] = useState(false);

  // Standalone Stiker Tab States
  const [standaloneStikerTemplate, setStandaloneStikerTemplate] = useState<"se2026" | "classic" | "grozziie">("grozziie");
  const [standaloneStikerSEPairMode, setStandaloneStikerSEPairMode] = useState<"pair" | "left_only" | "right_only">("pair");
  const [standaloneGrozziieWidth, setStandaloneGrozziieWidth] = useState<number>(70);
  const [standaloneGrozziieHeight, setStandaloneGrozziieHeight] = useState<number>(50);
  const [standaloneGrozziieRollOrientation, setStandaloneGrozziieRollOrientation] = useState<"horizontal" | "vertical">("horizontal");
  const [standaloneGrozziiePairMode, setStandaloneGrozziiePairMode] = useState<"both" | "left_only" | "right_only">("both");
  const [standaloneGrozziieXOffset, setStandaloneGrozziieXOffset] = useState<number>(0);
  const [standaloneGrozziieYOffset, setStandaloneGrozziieYOffset] = useState<number>(0);
  const [standaloneGrozziieDirection, setStandaloneGrozziieDirection] = useState<0 | 1>(0);
  const [standaloneGrozziieRotate90, setStandaloneGrozziieRotate90] = useState<boolean>(false);
  const [standaloneStikerSubWilayah, setStandaloneStikerSubWilayah] = useState<string>("Kawasan Pelayanan Mandiri");
  const [standaloneStikerWaPengaduan, setStandaloneStikerWaPengaduan] = useState<string>("081234567890");
  const [standaloneStikerTiktok, setStandaloneStikerTiktok] = useState<string>("sppg_bandung");
  const [standaloneStikerInstagram, setStandaloneStikerInstagram] = useState<string>("sppg_bandung");
  const [standaloneStikerSelectedReportId, setStandaloneStikerSelectedReportId] = useState<string>("");
  const [standaloneStikerPaperSize, setStandaloneStikerPaperSize] = useState<"a4" | "f4" | "a3">("a4");
  const [standaloneStikerCapacity, setStandaloneStikerCapacity] = useState<number>(12);
  const [standaloneStikerSppg, setStandaloneStikerSppg] = useState<string>("SPPG KOTA BANDUNG");
  const [standaloneStikerMenu, setStandaloneStikerMenu] = useState<string>("Nasi Putih, Ayam Goreng, Tumis Buncis, Buah");
  const [standaloneStikerMode, setStandaloneStikerMode] = useState<"all_besar" | "all_kecil" | "split">("split");
  const [standaloneStikerCountBesar, setStandaloneStikerCountBesar] = useState<number>(6);
  const [standaloneStikerTanggal, setStandaloneStikerTanggal] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [standaloneStikerJamSelesai, setStandaloneStikerJamSelesai] = useState<string>("05:30");
  const [standaloneStikerJamBatas, setStandaloneStikerJamBatas] = useState<string>("10:30");
  const [standaloneStikerGiziBesar, setStandaloneStikerGiziBesar] = useState({ energi: "650", protein: "22", lemak: "18", karbohidrat: "85", serat: "6" });
  const [standaloneStikerGiziKecil, setStandaloneStikerGiziKecil] = useState({ energi: "450", protein: "15", lemak: "12", karbohidrat: "60", serat: "4" });
  const [isDownloadingStickerPDF, setIsDownloadingStickerPDF] = useState<boolean>(false);
  const [isDownloadingStickerPNG, setIsDownloadingStickerPNG] = useState<boolean>(false);
  const [isPrintingBle, setIsPrintingBle] = useState<boolean>(false);
  const [bleStatusText, setBleStatusText] = useState<string>("");

  const handleDirectBluetoothPrint = async () => {
    if (!isWebBluetoothSupported()) {
      showSettingsToast("Browser Anda tidak mendukung Web Bluetooth. Buka di Chrome/Edge PC atau Chrome Android.", "error");
      return;
    }

    setIsPrintingBle(true);
    setBleStatusText("Mencari printer Bluetooth...");

    try {
      const pages = document.querySelectorAll("#app-root .grozziie-label-page");
      if (pages.length === 0) {
        throw new Error("Label Grozziie tidak ditemukan di layar.");
      }

      // Dimensi desain visual label (misal 70mm x 50mm)
      const visualW = standaloneGrozziieWidth || 70;
      const visualH = standaloneGrozziieHeight || 50;

      // Orientasi fisik gulungan kertas pada printer:
      // - "horizontal": Kertas keluar mendatar (lebar roll = visualW misal 70mm, panjang feed = visualH misal 50mm).
      // - "vertical": Kertas keluar tegak (lebar roll = visualH misal 50mm, panjang feed = visualW misal 70mm).
      const isRollHorizontal = standaloneGrozziieRollOrientation === "horizontal";
      const physW = isRollHorizontal ? visualW : visualH;
      const physH = isRollHorizontal ? visualH : visualW;

      // Print each rendered label sequentially
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        setBleStatusText(`Mencetak label ${i + 1} dari ${pages.length}...`);
        await directPrintElementViaBle(pageEl, physW, physH, (msg) => setBleStatusText(msg), {
          xOffsetDots: Math.round(standaloneGrozziieXOffset * 8), // convert mm to dots
          yOffsetDots: Math.round(standaloneGrozziieYOffset * 8), // convert mm to dots
          direction: standaloneGrozziieDirection,
          rotate90: standaloneGrozziieRotate90, // override rotasi manual jika perlu
        });
      }

      showSettingsToast("Label berhasil dicetak langsung ke printer Grozziie!", "success");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Gagal mencetak via Bluetooth.";
      console.error("Direct BLE print error:", err);
      // If user cancelled device selector dialog, don't show scary error
      if (!errMsg.includes("User cancelled") && !errMsg.includes("cancelled")) {
        showSettingsToast(errMsg, "error");
      }
    } finally {
      setIsPrintingBle(false);
      setBleStatusText("");
    }
  };

  const getStickerTargetNode = () => {
    // Find the actual rendered sticker sheet inside the preview area.
    // If in Grozziie roll mode, target the grozziie container
    if (standaloneStikerTemplate === "grozziie") {
      return (document.querySelector("#app-root .grozziie-print-container") ||
        document.querySelector("#app-root .grozziie-label-page")) as HTMLElement | null;
    }
    return document.querySelector("#app-root .sticker-sheet") as HTMLElement | null;
  };

  const getPaperDimensionsMm = () => {
    if (standaloneStikerTemplate === "grozziie") {
      return {
        widthMm: standaloneGrozziieWidth || 70,
        heightMm: standaloneGrozziieHeight || 50,
        format: [standaloneGrozziieWidth || 70, standaloneGrozziieHeight || 50] as [number, number],
      };
    }
    if (standaloneStikerPaperSize === "a3") return { widthMm: 297, heightMm: 420, format: "a3" as const };
    if (standaloneStikerPaperSize === "f4") return { widthMm: 215, heightMm: 330, format: [215, 330] as [number, number] };
    return { widthMm: 210, heightMm: 297, format: "a4" as const };
  };

  const handlePrintSticker = () => {
    // Dynamically inject @page rule agar dialog print browser mengikuti ukuran & orientasi kertas yang dipilih
    let dynamicStyleEl = document.getElementById("dynamic-grozziie-page-style");
    if (!dynamicStyleEl) {
      dynamicStyleEl = document.createElement("style");
      dynamicStyleEl.id = "dynamic-grozziie-page-style";
      document.head.appendChild(dynamicStyleEl);
    }

    if (standaloneStikerTemplate === "grozziie") {
      const isRollHorizontal = standaloneGrozziieRollOrientation === "horizontal";
      // Untuk kertas keluar horizontal: lebar 70mm, tinggi 50mm landscape
      // Untuk kertas keluar vertikal: lebar 50mm, tinggi 70mm portrait
      const w = isRollHorizontal ? (standaloneGrozziieWidth || 70) : (standaloneGrozziieHeight || 50);
      const h = isRollHorizontal ? (standaloneGrozziieHeight || 50) : (standaloneGrozziieWidth || 70);
      const orient = isRollHorizontal ? "landscape" : "portrait";

      dynamicStyleEl.innerHTML = `
        @media print {
          @page {
            size: ${w}mm ${h}mm ${orient} !important;
            margin: 0mm !important;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${w}mm !important;
            height: ${h}mm !important;
            overflow: visible !important;
            background: #ffffff !important;
          }
          #sticker-print-root {
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: ${w}mm !important;
            overflow: visible !important;
          }
          .grozziie-print-container {
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
          }
          .grozziie-label-page {
            width: ${standaloneGrozziieWidth || 70}mm !important;
            height: ${standaloneGrozziieHeight || 50}mm !important;
            max-height: ${standaloneGrozziieHeight || 50}mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            position: relative !important;
            top: ${standaloneGrozziieYOffset}mm !important;
            left: ${standaloneGrozziieXOffset}mm !important;
            transform-origin: top left !important;
          }
        }
      `;
    } else {
      const paperDimensions = getPaperDimensionsMm();
      const pW = paperDimensions.widthMm;
      const pH = paperDimensions.heightMm;
      dynamicStyleEl.innerHTML = `
        @media print {
          @page {
            size: ${pW}mm ${pH}mm portrait !important;
            margin: 0 !important;
          }
        }
      `;
    }
    window.print();
  };

  const handleDownloadStickerPNG = async () => {
    setIsDownloadingStickerPNG(true);
    try {
      const node = getStickerTargetNode();
      if (!node) throw new Error("Sticker sheet element not found");

      // Calculate pixel dimensions from exact element scroll dimensions
      const width = node.scrollWidth || node.offsetWidth;
      const height = node.scrollHeight || node.offsetHeight;

      // Render exact DOM node as high-res PNG
      const dataUrl = await toPng(node, {
        quality: 1,
        pixelRatio: 3,
        width: width,
        height: height,
        backgroundColor: "#ffffff",
        cacheBust: true,
        style: {
          margin: "0",
          transform: "none",
          overflow: "visible",
        }
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      const prefix = standaloneStikerTemplate === "grozziie" ? `Stiker_Grozziie_${standaloneGrozziieWidth}x${standaloneGrozziieHeight}mm` : `Stiker_Ompreng_${standaloneStikerPaperSize.toUpperCase()}`;
      a.download = `${prefix}_${standaloneStikerTanggal || "MBG"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showSettingsToast("File PNG stiker resolusi tinggi berhasil diunduh!", "success");
    } catch (err) {
      console.error("Gagal download PNG stiker:", err);
      showSettingsToast("Gagal mengunduh gambar PNG stiker.", "error");
    } finally {
      setIsDownloadingStickerPNG(false);
    }
  };

  const handleDownloadStickerPDF = async () => {
    setIsDownloadingStickerPDF(true);
    try {
      const { widthMm, heightMm, format } = getPaperDimensionsMm();

      // If in Grozziie mode with both labels, download each label as a separate page
      if (standaloneStikerTemplate === "grozziie") {
        const pages = document.querySelectorAll("#app-root .grozziie-label-page");
        if (pages.length === 0) throw new Error("Label Grozziie tidak ditemukan");

        const pdfDoc = new jsPDF({
          orientation: widthMm > heightMm ? "landscape" : "portrait",
          unit: "mm",
          format: format,
        });

        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdfDoc.addPage(format, widthMm > heightMm ? "landscape" : "portrait");
          const pageEl = pages[i] as HTMLElement;
          const w = pageEl.scrollWidth || pageEl.offsetWidth;
          const h = pageEl.scrollHeight || pageEl.offsetHeight;

          const dataUrl = await toPng(pageEl, {
            quality: 1,
            pixelRatio: 3,
            width: w,
            height: h,
            backgroundColor: "#ffffff",
            cacheBust: true,
            style: { margin: "0", transform: "none", overflow: "visible" },
          });

          pdfDoc.addImage(dataUrl, "PNG", 0, 0, widthMm, heightMm, undefined, "FAST");
        }

        pdfDoc.save(`Stiker_Grozziie_${standaloneGrozziieWidth}x${standaloneGrozziieHeight}mm_${standaloneStikerTanggal || "MBG"}.pdf`);
        showSettingsToast("File PDF stiker label roll siap cetak berhasil diunduh!", "success");
        return;
      }

      // Normal multi-grid sheet (A4/F4/A3)
      const node = getStickerTargetNode();
      if (!node) throw new Error("Sticker sheet element not found");

      const width = node.scrollWidth || node.offsetWidth;
      const height = node.scrollHeight || node.offsetHeight;

      const dataUrl = await toPng(node, {
        quality: 1,
        pixelRatio: 3,
        width: width,
        height: height,
        backgroundColor: "#ffffff",
        cacheBust: true,
        style: {
          margin: "0",
          transform: "none",
          overflow: "visible",
        }
      });

      const pdfDoc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: format,
      });

      pdfDoc.addImage(dataUrl, "PNG", 0, 0, widthMm, heightMm, undefined, "FAST");
      pdfDoc.save(`Stiker_Ompreng_${standaloneStikerPaperSize.toUpperCase()}_${standaloneStikerTanggal || "MBG"}.pdf`);

      showSettingsToast("File PDF stiker utuh (1 Lembar Penuh) berhasil diunduh!", "success");
    } catch (err) {
      console.error("Gagal download PDF stiker:", err);
      showSettingsToast("Gagal mengunduh PDF stiker.", "error");
    } finally {
      setIsDownloadingStickerPDF(false);
    }
  };

  // Load a report into the standalone sticker form, then switch to the Stiker tab
  const loadReportIntoSticker = useCallback((rep: Report) => {
    const sName = rep.sppgName || "SPPG KOTA BANDUNG";
    setStandaloneStikerSppg(sName);
    setStandaloneStikerMenu(rep.menu || "");
    setStandaloneStikerTanggal(rep.date || new Date().toISOString().split("T")[0]);

    // Cari referensi master data SPPG untuk auto-populate kontak pengaduan, medsos, dan sub-wilayah
    const matchedSppg = sppgList.find((s) => s.nama_sppg.toLowerCase() === sName.toLowerCase());
    if (matchedSppg) {
      if (matchedSppg.kontak_pengaduan) setStandaloneStikerWaPengaduan(matchedSppg.kontak_pengaduan);
      if (matchedSppg.tiktok) setStandaloneStikerTiktok(matchedSppg.tiktok);
      if (matchedSppg.instagram) setStandaloneStikerInstagram(matchedSppg.instagram);
      if (matchedSppg.sub_wilayah) setStandaloneStikerSubWilayah(matchedSppg.sub_wilayah);
    }

    const gBesar = rep.giziBesar;
    const gKecil = rep.giziKecil;
    if (gBesar) {
      setStandaloneStikerGiziBesar({
        energi: String(gBesar.Energi || 0),
        protein: String(gBesar.Protein || 0),
        lemak: String(gBesar.Lemak || 0),
        karbohidrat: String(gBesar.Karbohidrat || 0),
        serat: String(gBesar.Serat || 0)
      });
    }
    if (gKecil) {
      setStandaloneStikerGiziKecil({
        energi: String(gKecil.Energi || 0),
        protein: String(gKecil.Protein || 0),
        lemak: String(gKecil.Lemak || 0),
        karbohidrat: String(gKecil.Karbohidrat || 0),
        serat: String(gKecil.Serat || 0)
      });
    }

    const l = rep.largePortions || 0;
    const s = rep.smallPortions || 0;
    if (l > 0 && s === 0) {
      setStandaloneStikerMode("all_besar");
    } else if (s > 0 && l === 0) {
      setStandaloneStikerMode("all_kecil");
    } else {
      setStandaloneStikerMode("split");
      setStandaloneStikerCountBesar(Math.floor(standaloneStikerCapacity / 2));
    }
  }, [standaloneStikerCapacity, sppgList]);

  const openStickerFromReport = useCallback((rep: Report) => {
    loadReportIntoSticker(rep);
    setStandaloneStikerSelectedReportId(rep.id);
    setActiveTab("stiker");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [loadReportIntoSticker]);

  useEffect(() => {
    let mounted = true;
    async function loadKey() {
      try {
        const res = await fetch("/api/settings?key=gemini_api_key");
        const json = await res.json();
        if (mounted && json.value) {
          setGeminiApiKeyInput(json.value);
        }
      } catch {
        // ignore
      }
    }
    async function loadModels() {
      try {
        const res = await fetch("/api/settings?key=gemini_models");
        const json = await res.json();
        const models = parseGeminiModels(json.value);
        if (mounted && models.length > 0) {
          setGeminiModelsInput(formatGeminiModels(models));
        }
      } catch {
        // ignore
      }
    }
    loadKey();
    loadModels();
    return () => {
      mounted = false;
    };
  }, []);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
      return true;
    }
    return false;
  });

  const fetchKelompokList = useCallback(async () => {
    setLoadingKelompok(true);
    try {
      const data = await fetchKelompokListApi(kelompokFilterSppg);
      setKelompokList(data);
    } catch (err) {
      console.error("Gagal mengambil kelompok penerima manfaat:", err);
      showSettingsToast("Gagal memuat kelompok penerima manfaat.", "error");
    } finally {
      setLoadingKelompok(false);
    }
  }, [kelompokFilterSppg]);

  const fetchBeneficiaryList = useCallback(async () => {
    setLoadingBeneficiary(true);
    try {
      const data = await fetchBeneficiaryListApi({
        sppgId: beneficiaryFilterSppg,
        kategori: beneficiaryFilterKategori,
        status: beneficiaryFilterStatus,
        q: beneficiarySearch,
      });
      setBeneficiaryList(data);
    } catch (err) {
      console.error("Gagal mengambil penerima manfaat:", err);
      showSettingsToast("Gagal memuat penerima manfaat.", "error");
    } finally {
      setLoadingBeneficiary(false);
    }
  }, [beneficiaryFilterSppg, beneficiaryFilterKategori, beneficiaryFilterStatus, beneficiarySearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSppgList();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchSppgList]);

  useEffect(() => {
    if (activeTab === "penerima") {
      const t = setTimeout(() => {
        fetchKelompokList();
        fetchBeneficiaryList();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [activeTab, fetchKelompokList, fetchBeneficiaryList]);

  // PWA install prompt
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Form states for manual report submission
  const [formSppgName, setFormSppgName] = useState("");
  const [formTanggal, setFormTanggal] = useState(() => new Date().toISOString().split("T")[0]);
  const [formMenu, setFormMenu] = useState("");
  const [formPorsiBesar, setFormPorsiBesar] = useState<number>(0);
  const [formPorsiKecil, setFormPorsiKecil] = useState<number>(0);
  const [formBalita, setFormBalita] = useState<number>(0);
  const [formBumil, setFormBumil] = useState<number>(0);
  const [formBusui, setFormBusui] = useState<number>(0);

  // Nutrition states
  const [formGiziBesar, setFormGiziBesar] = useState({
    Energi: 0, Protein: 0, Lemak: 0, Karbohidrat: 0, Serat: 0
  });
  const [formGiziKecil, setFormGiziKecil] = useState({
    Energi: 0, Protein: 0, Lemak: 0, Karbohidrat: 0, Serat: 0
  });

  const [formImageBase64, setFormImageBase64] = useState("");
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);
  const [formPreviewData, setFormPreviewData] = useState<{ reportId: string; posterUrl: string; caption: string } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [formIsConfirming, setFormIsConfirming] = useState(false);
  const [previewLoadingAction, setPreviewLoadingAction] = useState<"download" | "copy" | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingExistingPhotoUrl, setEditingExistingPhotoUrl] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("1");
  const [isGeneratingPosterTemplate, setIsGeneratingPosterTemplate] = useState<boolean>(false);

  // Reset the manual report form to its initial state
  const resetReportForm = useCallback(() => {
    setFormSppgName("");
    setFormTanggal(new Date().toISOString().split("T")[0]);
    setFormMenu("");
    setFormPorsiBesar(0);
    setFormPorsiKecil(0);
    setFormBalita(0);
    setFormBumil(0);
    setFormBusui(0);
    setFormGiziBesar({ Energi: 0, Protein: 0, Lemak: 0, Karbohidrat: 0, Serat: 0 });
    setFormGiziKecil({ Energi: 0, Protein: 0, Lemak: 0, Karbohidrat: 0, Serat: 0 });
    setFormImageBase64("");
    setEditingExistingPhotoUrl("");
    setEditingReportId(null);
  }, []);

  // Helper to handle image file input to base64 conversion
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImageBase64(reader.result as string);
      };
      reader.onerror = () => {
        showSettingsToast("Gagal membaca file gambar. Coba pilih file lain.", "error");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveKelompok = async () => {
    if (!kelompokForm.nama_kelompok.trim()) {
      alert("Nama kelompok wajib diisi!");
      return;
    }
    if (!kelompokForm.sppg_id) {
      alert("SPPG wajib dipilih!");
      return;
    }
    setKelompokSubmitting(true);
    try {
      const url = editingKelompokId ? "/api/kelompok-penerima-manfaat" : "/api/kelompok-penerima-manfaat";
      const method = editingKelompokId ? "PUT" : "POST";
      const body = editingKelompokId ? { id: editingKelompokId, ...kelompokForm } : kelompokForm;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        showSettingsToast(editingKelompokId ? "Kelompok diperbarui." : "Kelompok ditambahkan.", "success");
        setKelompokForm({ sppg_id: kelompokForm.sppg_id, nama_kelompok: "", jenis: "Sekolah", kode: "", kategori: "", nama_kader: "", telepon: "", email: "", alamat: "", kontak: "", catatan: "" });
        setEditingKelompokId(null);
        setShowKelompokModal(false);
        fetchKelompokList();
      } else {
        alert("Gagal menyimpan kelompok: " + (json.message || "Unknown"));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
      alert("Error: " + errMsg);
    } finally {
      setKelompokSubmitting(false);
    }
  };

  const handleEditKelompok = (k: KelompokData) => {
    setKelompokForm({
      id: k.id,
      sppg_id: k.sppg_id || null,
      nama_kelompok: k.nama_kelompok || "",
      jenis: k.jenis || "Sekolah",
      kode: k.kode || "",
      kategori: k.kategori || "",
      nama_kader: k.nama_kader || "",
      telepon: k.telepon || "",
      email: k.email || "",
      alamat: k.alamat || "",
      kontak: k.kontak || "",
      catatan: k.catatan || ""
    });
    setEditingKelompokId(k.id || null);
    setShowKelompokModal(true);
  };

  const handleDeleteKelompok = async (id: string) => {
    if (!confirm("Hapus kelompok ini? Individu terkait tidak akan ikut terhapus.")) return;
    try {
      const res = await fetch(`/api/kelompok-penerima-manfaat?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        showSettingsToast("Kelompok dihapus.", "success");
        fetchKelompokList();
        fetchBeneficiaryList();
      } else {
        alert("Gagal menghapus kelompok: " + json.message);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
      alert("Error: " + errMsg);
    }
  };

  const handleSaveBeneficiary = async () => {
    if (!beneficiaryForm.nama_lengkap.trim()) {
      alert("Nama lengkap wajib diisi!");
      return;
    }
    if (!beneficiaryForm.sppg_id) {
      alert("SPPG wajib dipilih!");
      return;
    }
    if (!beneficiaryForm.kategori.trim() || !beneficiaryForm.sub_kategori.trim()) {
      alert("Kategori dan sub kategori wajib diisi!");
      return;
    }
    setBeneficiarySubmitting(true);
    try {
      const url = "/api/penerima-manfaat";
      const method = editingBeneficiaryId ? "PUT" : "POST";
      const body = editingBeneficiaryId ? { id: editingBeneficiaryId, ...beneficiaryForm } : beneficiaryForm;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        showSettingsToast(editingBeneficiaryId ? "Penerima diperbarui." : "Penerima ditambahkan.", "success");
        setBeneficiaryForm({
          sppg_id: beneficiaryForm.sppg_id,
          kelompok_id: null,
          nama_lengkap: "",
          tanggal_lahir: "",
          gender: "",
          nik: "",
          identity_type: "nik",
          identity_code: "",
          kategori: "",
          sub_kategori: "",
          status: "Aktif",
          tanggal_mulai: "",
          tanggal_berhenti: "",
          catatan: ""
        });
        setEditingBeneficiaryId(null);
        setShowBeneficiaryModal(false);
        fetchBeneficiaryList();
      } else {
        alert("Gagal menyimpan penerima: " + (json.message || "Unknown"));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
      alert("Error: " + errMsg);
    } finally {
      setBeneficiarySubmitting(false);
    }
  };

  const handleEditBeneficiary = (b: BeneficiaryData) => {
    setBeneficiaryForm({
      id: b.id,
      sppg_id: b.sppg_id || null,
      kelompok_id: b.kelompok_id || null,
      nama_lengkap: b.nama_lengkap || "",
      tanggal_lahir: b.tanggal_lahir || "",
      gender: b.gender || "",
      nik: b.nik || "",
      identity_type: b.identity_type || "nik",
      identity_code: b.identity_code || "",
      kategori: b.kategori || "",
      sub_kategori: b.sub_kategori || "",
      status: b.status || "Aktif",
      tanggal_mulai: b.tanggal_mulai || "",
      tanggal_berhenti: b.tanggal_berhenti || "",
      catatan: b.catatan || ""
    });
    setEditingBeneficiaryId(b.id || null);
    setShowBeneficiaryModal(true);
  };

  const handleDeleteBeneficiary = async (id: string) => {
    if (!confirm("Hapus penerima manfaat ini?")) return;
    try {
      const res = await fetch(`/api/penerima-manfaat?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        showSettingsToast("Penerima dihapus.", "success");
        fetchBeneficiaryList();
      } else {
        alert("Gagal menghapus penerima: " + json.message);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
      alert("Error: " + errMsg);
    }
  };

  const handleCsvFileChange = async (file: File | null) => {
    setImportFile(file);
    setImportPreview([]);
    setImportHeaders([]);
    setImportErrors([]);
    if (!file) return;
    const lower = file.name.toLowerCase();
    let headers: string[] = [];
    let rawRows: Record<string, unknown>[] = [];

    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false }) as Record<string, unknown>[];
      headers = json.length ? Object.keys(json[0]) : [];
      rawRows = json;
    } else {
      const text = await file.text();
      const { parseCsv } = await import("@/lib/csv");
      const parsed = parseCsv(text);
      headers = parsed.headers;
      rawRows = parsed.rows as Record<string, unknown>[];
    }

    setImportHeaders(headers);

    const getVal = (r: Record<string, unknown>, keys: string[]) => {
      for (const k of keys) {
        if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== "") return String(r[k]).trim();
        const found = Object.keys(r).find((kk) => kk.toLowerCase() === k.toLowerCase());
        if (found && r[found] !== undefined && r[found] !== null && String(r[found]).trim() !== "") return String(r[found]).trim();
      }
      return "";
    };

    const normalized: PenerimaReviewRow["row"][] = rawRows.map((r) => {
      const tglRaw = getVal(r, ["tanggal_lahir", "date_of_birth", "dob", "tanggal"]);
      let tgl = tglRaw;
      // Excel serial number conversion
      const num = Number(tglRaw);
      if (!isNaN(num) && num > 1000) {
        const d = new Date((num - 25569) * 86400 * 1000);
        if (!isNaN(d.getTime())) tgl = d.toISOString().slice(0, 10);
      } else {
        tgl = normalizeDateInput(tgl);
      }

      return {
        nama_lengkap: getVal(r, ["nama_lengkap", "fullname", "nama"]),
        tanggal_lahir: tgl,
        gender: (getVal(r, ["gender"]) || "").toUpperCase(),
        nik: getVal(r, ["nik"]),
        identity_type: getVal(r, ["type", "identity_type", "jenis_identitas"]) || "nik",
        identity_code: getVal(r, ["identity_code", "nisn", "nomor_identitas", "identity"]),
        kategori: getVal(r, ["kategori", "category"]),
        sub_kategori: getVal(r, ["sub_kategori", "subcategory", "subCategory", "sub kategori"]),
        nama_kpm: getVal(r, ["nama_kpm", "nama KPM", "nama Kpm", "nama_posyandu", "nama_kelompok", "kelompok", "group"]),
        status: getVal(r, ["status"]) || "Aktif",
        catatan: getVal(r, ["catatan", "notes"])
      };
    }).filter((r) => {
      const nama = (r.nama_lengkap || "").trim().toLowerCase();
      if (!nama) return false;
      if (nama.includes("wajib diisi")) return false;
      if (nama.includes("tuliskan nama")) return false;
      if (nama.startsWith("contoh")) return false;
      return true;
    });

    const reviewRows: PenerimaReviewRow[] = normalized.map((r, idx) => {
      const errs = validatePenerimaReviewRow(r);
      return {
        id: `pm-${Date.now()}-${idx}`,
        selected: errs.length === 0,
        status: errs.length === 0 ? "valid" : "error",
        errors: errs,
        row: r
      };
    });

    setBeneficiaryReviewRows(reviewRows);
    setBeneficiaryReviewPage(1);
    setBeneficiaryReviewFilter("all");

    // Duplikat detection (intra-file + database global)
    void (async () => {
      try {
        const res = await fetch("/api/penerima-manfaat");
        const j = await res.json();
        const existingKeys = new Set<string>();
        (j?.data || []).forEach((r: any) => {
          const key = r?.nik?.trim()
            ? `nik:${r.nik.trim()}`
            : (r?.identity_code?.trim()
                ? `id:${r.identity_type || ""}:${r.identity_code.trim()}`
                : (r?.nama_lengkap?.trim() && r?.tanggal_lahir ? `name:${String(r.nama_lengkap).trim().toLowerCase()}:${r.tanggal_lahir}` : ""));
          if (key) existingKeys.add(key);
        });
        setExistingPenerimaKeys([...existingKeys]);

        const countMap = new Map<string, number>();
        const firstIdx = new Map<string, number>();
        reviewRows.forEach((r, idx) => {
          const key = getPenerimaDupKey(r.row);
          if (!key) return;
          countMap.set(key, (countMap.get(key) || 0) + 1);
          if (!firstIdx.has(key)) firstIdx.set(key, idx);
        });

        const finalRows = reviewRows.map((r, idx) => {
          const errs = [...r.errors];
          const key = getPenerimaDupKey(r.row);
          if (key) {
            const isDupInFile = (countMap.get(key) || 0) > 1 && firstIdx.get(key) !== idx;
            if (isDupInFile) errs.push("Duplikat dalam file import");
            if (existingKeys.has(key)) errs.push("Duplikat dengan data existing");
          }
          return { ...r, errors: errs, status: (errs.length ? "error" : "valid") as "error" | "valid", selected: errs.length === 0 };
        });
        setBeneficiaryReviewRows(finalRows);
      } catch (e) {
        // ignore duplicate detection failures; import API still validates
      }
    })();

    // keep legacy preview
    setImportPreview(rawRows.slice(0, 10) as Record<string,string>[]);
    setImportErrors(reviewRows.flatMap((r, i) => r.errors.map((e) => ({ row: i + 1, reason: e }))));
  };

  const handleImportSubmit = async () => {
    if (!importSppgId) {
      alert("Pilih SPPG terlebih dahulu.");
      return;
    }
    const selectedRows = beneficiaryReviewRows
      .filter((r) => r.selected && r.status === "valid")
      .map((r) => ({
        ...r.row,
        kelompok: undefined
      }));
    if (selectedRows.length === 0) {
      alert("Tidak ada baris valid yang dipilih.");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/penerima-manfaat/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sppg_id: importSppgId,
          kelompok_id: importKelompokId || null,
          auto_create_group: importAutoCreate,
          rows: selectedRows
        })
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        showSettingsToast(`Import selesai: ${json.inserted} data ditambahkan.`, "success");
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportHeaders([]);
        fetchBeneficiaryList();
        fetchKelompokList();
      } else {
        alert("Gagal import: " + (json.message || "Unknown"));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
      alert("Error: " + errMsg);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const a = document.createElement("a");
    a.href = "/templates/penerima-manfaat-template.xlsx";
    a.download = "template_penerima_manfaat.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleKpmFileChange = async (file: File | null) => {
    setKpmImportFile(file);
    setKpmImportRows([]);
    setKpmImportHeaders([]);
    setKpmImportErrors([]);
    if (!file) return;

    const lower = file.name.toLowerCase();
    let rawRows: Record<string, unknown>[] = [];
    let headers: string[] = [];

    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
      headers = json.length ? Object.keys(json[0]) : [];
      rawRows = json;
    } else {
      const text = await file.text();
      const { parseCsv } = await import("@/lib/csv");
      const parsed = parseCsv(text);
      headers = parsed.headers;
      rawRows = parsed.rows;
    }

    const normalized = rawRows.map((r: Record<string, unknown>) => {
      const get = (keys: string[]) => {
        for (const k of keys) {
          if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== "") return String(r[k]).trim();
          // case-insensitive search
          const found = Object.keys(r).find((kk) => kk.toLowerCase() === k.toLowerCase());
          if (found) return String(r[found]).trim();
        }
        return "";
      };
      return {
        jenis: get(["Jenis KPM", "jenis"]) || "Posyandu",
        nama_kelompok: get(["Nama KPM", "nama_kelompok", "Nama Kelompok", "nama"]),
        kode: get(["Kode", "kode"]),
        nama_kader: get(["Nama PIC", "nama_pic", "pic", "Nama PIC", "nama_kader", "Kader"]),
        telepon: get(["No. Telpon", "telepon", "No Telpon", "telpon"]),
        email: get(["Email", "email"]),
        alamat: get(["Alamat", "alamat"])
      };
    }).filter((r) => {
      const nama = (r.nama_kelompok || "").trim().toLowerCase();
      if (!nama) return false;
      if (nama.includes("wajib diisi")) return false;
      if (nama.includes("tuliskan")) return false;
      if (nama.startsWith("contoh")) return false;
      return true;
    });

    const reviewRows: KpmReviewRow[] = normalized.map((r, idx) => {
      const errs = validateKpmReviewRow(r);
      return { id: `kpm-${Date.now()}-${idx}`, selected: errs.length === 0, status: errs.length === 0 ? "valid" : "error", errors: errs, row: r };
    });
    setKpmReviewRows(reviewRows);
    setKpmReviewPage(1);
    setKpmReviewFilter("all");
    setKpmImportRows(normalized);
    setKpmImportHeaders(headers);

    // Duplikat KPM detection (intra-file + existing DB)
    void (async () => {
      try {
        const existingNames = new Set<string>();
        if (kpmImportSppgId) {
          const res = await fetch(`/api/kelompok-penerima-manfaat?sppg_id=${encodeURIComponent(kpmImportSppgId)}`);
          const j = await res.json();
          (j?.data || []).forEach((g: any) => {
            if (g?.nama_kelompok) existingNames.add(String(g.nama_kelompok).trim().toLowerCase());
          });
        }
        const countMap = new Map<string, number>();
        const firstIdx = new Map<string, number>();
        reviewRows.forEach((r, idx) => {
          const key = (r.row.nama_kelompok || "").trim().toLowerCase();
          if (!key) return;
          countMap.set(key, (countMap.get(key) || 0) + 1);
          if (!firstIdx.has(key)) firstIdx.set(key, idx);
        });
        const finalRows = reviewRows.map((r, idx) => {
          const errs = [...r.errors];
          const key = (r.row.nama_kelompok || "").trim().toLowerCase();
          if (key) {
            const dupInFile = (countMap.get(key) || 0) > 1 && firstIdx.get(key) !== idx;
            if (dupInFile) errs.push("Duplikat dalam file import");
            if (existingNames.has(key)) errs.push("KPM duplikat dengan data existing");
          }
          return { ...r, errors: errs, status: (errs.length ? "error" : "valid") as "error" | "valid", selected: errs.length === 0 };
        });
        setKpmReviewRows(finalRows);
      } catch (e) {
        // ignore
      }
    })();

    const errs: { row: number; reason: string }[] = [];
    normalized.forEach((r, i) => {
      if (!r.nama_kelompok) errs.push({ row: i + 1, reason: "Nama KPM wajib diisi." });
    });
    setKpmImportErrors(errs);
  };

  const handleKpmImportSubmit = async () => {
    if (!kpmImportSppgId) {
      alert("Pilih SPPG terlebih dahulu.");
      return;
    }
    if (!kpmImportFile || kpmImportRows.length === 0) {
      alert("File kosong atau belum dipilih.");
      return;
    }
    setKpmImporting(true);
    try {
      const selectedRows = kpmReviewRows
      .filter((r) => r.selected && r.status === "valid")
      .map((r) => r.row);
    if (selectedRows.length === 0) {
      alert("Tidak ada baris valid yang dipilih.");
      return;
    }
    const bodyRows = selectedRows;
      const res = await fetch("/api/kelompok-penerima-manfaat/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sppg_id: kpmImportSppgId, rows: bodyRows })
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        showSettingsToast(`Import KPM selesai: ${json.inserted} data ditambahkan.`, "success");
        setShowKpmImportModal(false);
        setKpmImportFile(null);
        setKpmImportRows([]);
        setKpmImportHeaders([]);
        fetchKelompokList();
      } else {
        alert("Gagal import: " + (json.message || "Unknown"));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
      alert("Error: " + errMsg);
    } finally {
      setKpmImporting(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!formMenu.trim()) {
      alert("Detail Menu Makanan harus diisi!");
      return;
    }
    if (!formSppgName.trim()) {
      alert("SPPG harus dipilih atau diisi!");
      return;
    }
    if (!formTanggal) {
      alert("Tanggal laporan harus diisi!");
      return;
    }
    setFormIsSubmitting(true);
    try {
      const isEditing = !!editingReportId;
      const response = await fetch("/api/reports", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isEditing ? "edit" : "preview",
          reportId: editingReportId || undefined,
          sppgName: formSppgName,
          tanggal: formTanggal,
          menu: formMenu,
          porsiBesar: formPorsiBesar,
          porsiKecil: formPorsiKecil,
          balita: formBalita,
          bumil: formBumil,
          busui: formBusui,
          giziBesar: formGiziBesar,
          giziKecil: formGiziKecil,
          bufferImage: formImageBase64
        })
      });

      const resData = await response.json();
      if (response.ok && (resData.action === "preview_ready" || resData.status === "success")) {
        if (isEditing) {
          showSettingsToast("Laporan berhasil diperbarui!", "success");
          resetReportForm();
        } else {
          setFormPreviewData({
            reportId: resData.reportId,
            posterUrl: resData.posterUrl,
            caption: resData.caption
          });
          setShowPreviewModal(true);
        }
      } else {
        alert("Gagal memproses: " + resData.message);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
      alert("Error: " + errorMsg);
    } finally {
      setFormIsSubmitting(false);
    }
  };

  const handleConfirmReport = async (confirmAction: "confirm" | "cancel") => {
    if (!formPreviewData) return;
    setFormIsConfirming(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: confirmAction,
          reportId: formPreviewData.reportId
        })
      });

      const resData = await response.json();
      if (response.ok) {
        if (confirmAction === "confirm") {
          showSettingsToast("Laporan berhasil disetujui! Silakan download poster & copy caption.", "success");
          // Reset form
          resetReportForm();
        } else {
          showSettingsToast("Draf laporan berhasil dibatalkan/revisi.", "success");
        }
        setShowPreviewModal(false);
        setFormPreviewData(null);
      } else {
        alert("Gagal memproses persetujuan: " + resData.message);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      alert("Error: " + errorMsg);
    } finally {
      setFormIsConfirming(false);
    }
  };


  // Notifications State Mockup
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const userProfile = {
    name: "Puput",
    email: "admin@mbg-sppg.go.id",
    region: "Lombok Timur"
  };

  // Calculate Metrics dynamically based on current state (synced with DB)
  const metrics = useMemo(() => {
    return reports.reduce(
      (acc, r) => {
        acc.total += r.totalBeneficiaries;
        acc.large += r.largePortions;
        acc.small += r.smallPortions;
        return acc;
      },
      { total: 0, large: 0, small: 0 }
    );
  }, [reports]);

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return reports.filter(r => r.date === today).length;
  }, [reports]);
  const activeSppgCount = useMemo(() => new Set(reports.map(r => r.sppgName)).size, [reports]);
  const b3Totals = useMemo(() => reports.reduce(
    (acc, r) => ({
      balita: acc.balita + (r.balita ?? 0),
      bumil: acc.bumil + (r.bumil ?? 0),
      busui: acc.busui + (r.busui ?? 0),
    }),
    { balita: 0, bumil: 0, busui: 0 }
  ), [reports]);

  // Handle report status transition from Modal Review and write to DB
  const updateReportStatus = async (id: string, nextStatus: "Draft" | "Approved" | "Sent") => {
    try {
      // Map frontend status back to DB format
      let dbStatus = "DRAFT";
      if (nextStatus === "Sent") dbStatus = "SENT";
      if (nextStatus === "Approved") dbStatus = "APPROVED";

      // Persist to Supabase table mbg_reports if it exists in DB
      const isDbReport = dbReports.some((r) => r.id === id);
      if (isDbReport) {
        // Optimistic update of dbReports state in the hook
        setDbReports((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: dbStatus } : r))
        );

        const { error: dbError } = await supabase
          .from("mbg_reports")
          .update({ status: dbStatus })
          .eq("id", id);

        if (dbError) throw dbError;

        // Generate poster when status changes to Sent or Approved
        if (dbStatus === "SENT" || dbStatus === "APPROVED") {
          try { await fetch(`/api/generate-poster?id=${id}`); } catch { /* non-critical */ }
        }
      }

      // Update selectedReport state so modal changes instantly
      setSelectedReport((prev) => (prev && prev.id === id ? { ...prev, status: nextStatus } : prev));
    } catch (err) {
      console.error("Failed to update status in Supabase:", err);
      showSettingsToast("Gagal memperbarui status di database.", "error");
    }
  };

  // Filtered reports list
  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        const matchesSearch =
          r.sppgName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "All" ? true : r.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      });
  }, [reports, searchQuery, statusFilter, sortDirection]);

  // Toggle sort order
  const toggleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <>
      <div
        id="app-root"
        className={`min-h-screen sb-admin-shell flex font-sans antialiased ${activeTab === "stiker" ? "print:hidden" : ""
          }`}
      >
        {/* SB Admin 2 inspired solid canvas (no custom gradient backdrop) */}
        {/* --- SIDEBAR FOR DESKTOP (COLLAPSIBLE / EXPANDABLE VIA CIRCULAR BUTTON) --- */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 ${sidebarCollapsed ? "w-20" : "w-56"} bg-sb-primary border-r border-white/10 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } lg:translate-x-0 transition-all duration-300 ease-in-out flex flex-col justify-between overflow-hidden shadow-lg`}
        >
          <div>
            {/* Logo Brand */}
            <div className="sidebar-logo-header h-16 flex items-center justify-between px-4 border-b border-white/15 bg-white/5 overflow-hidden whitespace-nowrap">
              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center gap-2.5 text-left focus:outline-none"
              >
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0 shadow-sm border border-white/20">
                  <UtensilsCrossed size={20} className="-rotate-12" />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0 transition-opacity duration-200">
                    <h1 className="font-extrabold text-sm leading-tight text-white tracking-wider uppercase truncate">
                      MBG ADMIN <sup className="text-[10px]">2</sup>
                    </h1>
                    <p className="text-[9px] text-white/70 font-bold tracking-widest uppercase truncate">
                      SISTEM SPPG
                    </p>
                  </div>
                )}
              </button>
              {/* Close sidebar on Mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-2.5 space-y-1 flex-1 overflow-y-auto max-h-[calc(100vh-9rem)]">
              {/* Section: CORE */}
              {!sidebarCollapsed && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-white/40">
                  CORE
                </div>
              )}
              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "dashboard"
                  ? "bg-white/20 text-white font-bold shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white font-semibold"
                  }`}
                title="Dashboard Utama"
              >
                <LayoutDashboard size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="text-xs">Dashboard Utama</span>}
              </button>

              <hr className="border-t border-white/15 my-2 mx-2" />

              {/* Section: INTERFACE */}
              {!sidebarCollapsed && (
                <div className="px-3 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-white/40">
                  INTERFACE
                </div>
              )}
              <button
                onClick={() => {
                  setActiveTab("laporan");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "laporan"
                  ? "bg-white/20 text-white font-bold shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white font-semibold"
                  }`}
                title="Laporan Harian"
              >
                <ClipboardList size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="text-xs">Laporan Harian</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab("mingguan");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "mingguan"
                  ? "bg-white/20 text-white font-bold shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white font-semibold"
                  }`}
                title="Laporan Mingguan"
              >
                <FileText size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="text-xs">Laporan Mingguan</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab("riwayat");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "riwayat"
                  ? "bg-white/20 text-white font-bold shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white font-semibold"
                  }`}
                title="Riwayat Laporan"
              >
                <Clock size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="text-xs">Riwayat Laporan</span>}
              </button>

              <hr className="border-t border-white/15 my-2 mx-2" />

              {/* Section: MASTER DATA */}
              {!sidebarCollapsed && (
                <div className="px-3 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-white/40">
                  MASTER DATA
                </div>
              )}
              <button
                onClick={() => {
                  setActiveTab("sppg");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "sppg"
                  ? "bg-white/20 text-white font-bold shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white font-semibold"
                  }`}
                title="Data SPPG"
              >
                <Database size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="text-xs">Data SPPG</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab("penerima");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "penerima"
                  ? "bg-white/20 text-white font-bold shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white font-semibold"
                  }`}
                title="Penerima Manfaat"
              >
                <Users size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="text-xs">Penerima Manfaat</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab("rekap");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "rekap"
                  ? "bg-white/20 text-white font-bold shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white font-semibold"
                  }`}
                title="Rekap Penerima"
              >
                <BarChart3 size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="text-xs">Rekap Penerima</span>}
              </button>

              <hr className="border-t border-white/15 my-2 mx-2" />

              {/* Section: ADDONS */}
              {!sidebarCollapsed && (
                <div className="px-3 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-white/40">
                  ADDONS & ALAT
                </div>
              )}
              <button
                onClick={() => {
                  setActiveTab("stiker");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "stiker"
                  ? "bg-white/20 text-white font-bold shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white font-semibold"
                  }`}
                title="Stiker Ompreng"
              >
                <Printer size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="text-xs">Stiker Ompreng</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab("menu");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "menu"
                  ? "bg-white/20 text-white font-bold shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white font-semibold"
                  }`}
                title="MBG Maker"
              >
                <ChefHat size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="text-xs">MBG Maker</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab("pengaturan");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "pengaturan"
                  ? "bg-white/20 text-white font-bold shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white font-semibold"
                  }`}
                title="Pengaturan"
              >
                <Settings size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="text-xs">Pengaturan</span>}
              </button>

              <hr className="border-t border-white/15 my-2 mx-2" />

              {/* Circular Toggle Button for SB Admin 2 */}
              <div className="text-center hidden lg:flex justify-center my-3">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors shadow-sm"
                  title={sidebarCollapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
                  aria-label="Toggle Sidebar Collapse"
                >
                  {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
              </div>
            </nav>
          </div>

          {/* Profile Card Bottom (visible when expanded) */}
          {!sidebarCollapsed && (
            <div className="p-3 border-t border-white/15 bg-white/5 overflow-hidden">
              <div className="flex items-center gap-2.5 p-2 bg-white/10 rounded-lg border border-white/10 overflow-hidden whitespace-nowrap">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white shadow-inner shrink-0">
                  {userProfile.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-white truncate">{userProfile.name}</h4>
                  <p className="text-[10px] text-white/70 truncate">{userProfile.email}</p>
                </div>
                <button className="text-white/60 hover:text-red-300 transition-colors p-1" title="Keluar">
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Backdrop for Mobile Sidebar */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          />
        )}

        {/* --- CONTENT CONTAINER --- */}
        <div className={`flex-1 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-56"} flex flex-col min-w-0 transition-all duration-300`}>
          {/* --- TOPBAR / HEADER --- */}
          <header className="h-16 border-b border-[#e3e6f0] dark:border-gray-700 bg-white dark:bg-[#1f2937] shadow-sm sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-[#4e73df] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Buka Menu"
              >
                <Menu size={22} />
              </button>

              {/* SB Admin 2 Search Bar */}
              <div className="hidden sm:flex items-center w-64 md:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari data laporan..."
                  className="w-full bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200 px-3 py-2 rounded-l-md focus:outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors"
                />
                <button
                  type="button"
                  className="bg-[#4e73df] hover:bg-[#2e59d9] text-white px-3.5 py-2 rounded-r-md transition-colors flex items-center justify-center shrink-0 shadow-sm"
                  aria-label="Cari"
                >
                  <Search size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Live indicator */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sistem Terhubung</span>
              </div>

              {/* Notification / PWA Bell */}
              <button
                onClick={async () => {
                  if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === "accepted") { setDeferredPrompt(null); setIsStandalone(true); }
                  }
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
                title={deferredPrompt ? "Install Aplikasi PWA" : "Notifikasi"}
              >
                {deferredPrompt ? <Download size={18} /> : <Bell size={18} />}
                <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-bold text-white bg-[#e74a3b] rounded-full leading-none">
                  {deferredPrompt ? "+" : "3"}
                </span>
              </button>

              {/* Theme Switcher Toggle (Light / Dark Mode) */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 text-gray-400 hover:text-[#4e73df] dark:hover:text-amber-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={theme === "dark" ? "Ganti ke Mode Terang (Light Mode)" : "Ganti ke Mode Gelap (Dark Mode)"}
                aria-label="Toggle Theme"
              >
                {theme === "dark" ? (
                  <Sun size={18} className="text-amber-400 hover:rotate-45 transition-transform" />
                ) : (
                  <Moon size={18} className="text-indigo-600 hover:-rotate-12 transition-transform" />
                )}
              </button>

              <div className="w-px h-8 bg-[#e3e6f0] dark:bg-gray-700 mx-1 hidden sm:block" />

              {/* User Profile dropdown */}
              <div className="flex items-center gap-2 pl-1">
                <div className="text-right hidden sm:block">
                  <span className="block text-xs font-bold text-gray-700 dark:text-gray-200 leading-tight">
                    {userProfile.name}
                  </span>
                  <span className="block text-[10px] text-gray-400 font-medium">
                    {userProfile.region}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#4e73df] text-white flex items-center justify-center font-bold text-xs ring-2 ring-gray-100 dark:ring-gray-700 shadow-sm shrink-0">
                  {userProfile.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
              </div>
            </div>
          </header>

          {/* --- MAIN MAIN CONTENT AREA --- */}
          <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-24 lg:pb-0">
            {/* TAB 1: DASHBOARD UTAMA */}
            {activeTab === "dashboard" && (
              <>
                <SbPageHeader
                  title="Dashboard Utama"
                  subtitle="Ringkasan kinerja distribusi Makanan Bergizi Gratis (MBG) & SPPG hari ini."
                  icon={<LayoutDashboard size={20} className="text-sb-primary" />}
                />

                {/* ROW 1: KEY METRICS - SB ADMIN 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <SbStatCard
                    label="Total Penerima"
                    value={metrics.total.toLocaleString("id-ID")}
                    tone="primary"
                    icon={<Users size={28} />}
                  />
                  <SbStatCard
                    label="Laporan Hari Ini"
                    value={todayCount}
                    tone="success"
                    icon={<ClipboardList size={28} />}
                  />
                  <SbStatCard
                    label="SPPG Aktif"
                    value={activeSppgCount}
                    tone="info"
                    icon={<Database size={28} />}
                  />
                  <SbStatCard
                    label="Total Porsi"
                    value={(metrics.large + metrics.small).toLocaleString("id-ID")}
                    tone="warning"
                    icon={<UtensilsCrossed size={28} />}
                  />
                </div>

                {/* ROW 2: BREAKDOWN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Portion breakdown */}
                  <SbCard
                    title="Distribusi Porsi Makanan"
                    subtitle="Sekolah (PAUD - SMA)"
                  >
                    <div className="space-y-4 pt-1">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-[#4e73df] uppercase tracking-wide">Porsi Besar (SD 4-6, SMP, SMA)</span>
                          <span className="text-xs font-bold text-[#5a5c69] dark:text-gray-200 font-mono">{metrics.large.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="w-full h-4 bg-[#eaecf4] dark:bg-gray-700 rounded-[0.35rem] overflow-hidden">
                          <div
                            className="h-full bg-[#4e73df] transition-all duration-500"
                            style={{ width: `${metrics.large + metrics.small > 0 ? (metrics.large / (metrics.large + metrics.small)) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-[#1cc88a] uppercase tracking-wide">Porsi Kecil (PAUD-TK, SD 1-3)</span>
                          <span className="text-xs font-bold text-[#5a5c69] dark:text-gray-200 font-mono">{metrics.small.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="w-full h-4 bg-[#eaecf4] dark:bg-gray-700 rounded-[0.35rem] overflow-hidden">
                          <div
                            className="h-full bg-[#1cc88a] transition-all duration-500"
                            style={{ width: `${metrics.large + metrics.small > 0 ? (metrics.small / (metrics.large + metrics.small)) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </SbCard>

                  {/* PMT B3 breakdown */}
                  <SbCard
                    title="Penerima PMT B3 (Ibu & Balita)"
                    subtitle="B3 Rentan Gizi"
                  >
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div className="p-3 bg-[#f8f9fc] dark:bg-gray-900 border-l-[0.25rem] border-l-[#f6c23e] border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] text-center shadow-sm">
                        <span className="text-[10px] font-bold text-[#f6c23e] uppercase tracking-wider block">Balita</span>
                        <span className="text-base sm:text-lg font-extrabold text-[#5a5c69] dark:text-gray-100 mt-0.5 block">{b3Totals.balita.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="p-3 bg-[#f8f9fc] dark:bg-gray-900 border-l-[0.25rem] border-l-[#e74a3b] border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] text-center shadow-sm">
                        <span className="text-[10px] font-bold text-[#e74a3b] uppercase tracking-wider block">Bumil</span>
                        <span className="text-base sm:text-lg font-extrabold text-[#5a5c69] dark:text-gray-100 mt-0.5 block">{b3Totals.bumil.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="p-3 bg-[#f8f9fc] dark:bg-gray-900 border-l-[0.25rem] border-l-[#36b9cc] border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] text-center shadow-sm">
                        <span className="text-[10px] font-bold text-[#36b9cc] uppercase tracking-wider block">Busui</span>
                        <span className="text-base sm:text-lg font-extrabold text-[#5a5c69] dark:text-gray-100 mt-0.5 block">{b3Totals.busui.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  </SbCard>
                </div>

                {/* ROW 3: RECENT REPORTS */}
                <SbCard
                  title="Laporan Terbaru"
                  subtitle="5 aktivitas SPPG terkini"
                >
                  <div className="flex items-center justify-between mb-3 -mt-2">
                    <span className="text-xs text-[#858796] dark:text-gray-400">Ringkasan aktivitas hari ini</span>
                    <button
                      onClick={() => setActiveTab("riwayat")}
                      className="text-xs font-bold text-[#4e73df] hover:underline transition-colors"
                    >
                      Lihat Semua &rarr;
                    </button>
                  </div>
                  {reportsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-full p-3 bg-[#f8f9fc] dark:bg-gray-900 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] animate-pulse">
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                        </div>
                      ))}
                    </div>
                  ) : reports.length > 0 ? (
                    <div className="space-y-2">
                      {[...reports]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 5)
                        .map((report) => (
                          <button
                            key={report.id}
                            onClick={() => setSelectedReport(report)}
                            className="w-full flex items-center justify-between p-3 bg-white hover:bg-[#f8f9fc] dark:bg-gray-900 dark:hover:bg-gray-800 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] transition-all text-left shadow-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-[#4e73df] truncate">{report.sppgName}</p>
                              <p className="text-[11px] text-[#858796] dark:text-gray-400 mt-0.5">{report.date} &middot; {report.totalBeneficiaries.toLocaleString("id-ID")} penerima</p>
                            </div>
                            <span className={`shrink-0 ml-3 inline-flex items-center px-2 py-0.5 rounded-[0.25rem] text-[10px] font-bold text-white ${report.status === "Draft" ? "bg-[#f6c23e]" :
                              report.status === "Approved" ? "bg-[#4e73df]" :
                                "bg-[#1cc88a]"
                              }`}>
                              {report.status}
                            </span>
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-xs text-[#858796] dark:text-gray-400">Belum ada laporan tersedia.</p>
                    </div>
                  )}
                </SbCard>
              </>
            )}

            {/* TAB 2: LAPORAN DETAIL */}
            {activeTab === "laporan" && (
              <div className="space-y-6">
                <SbCard
                  title={editingReportId ? "Edit Laporan" : "Form Pembuatan Laporan Baru"}
                  subtitle={editingReportId
                    ? "Ubah data laporan yang sudah ada. Status laporan tidak akan berubah."
                    : "Input data distribusi makanan harian dari SPPG. Harap verifikasi jumlah porsi sebelum disimpan."
                  }
                >

                  <form onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* --- LEFT COLUMN: INFO & BENEFICIARIES (7 COLS) --- */}
                      <div className="lg:col-span-7 space-y-6">
                        {/* Section 1: Data Laporan */}
                        <div className="p-4 sm:p-5 bg-[#f8f9fc] dark:bg-gray-900 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] shadow-sm space-y-4">
                          <div className="flex items-center gap-2 border-b border-[#e3e6f0] dark:border-gray-700 pb-2.5">
                            <span className="w-1 h-3.5 bg-[#4e73df]" />
                            <h4 className="text-xs font-bold text-[#4e73df] uppercase tracking-wide">Informasi Umum SPPG</h4>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Satuan Pelayanan SPPG</label>
                              <select
                                value={sppgList.some(s => s.nama_sppg === formSppgName) ? formSppgName : (formSppgName ? "__custom__" : "")}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "__custom__") {
                                    setFormSppgName("");
                                  } else {
                                    setFormSppgName(val);
                                    const selectedSppg = sppgList.find(s => s.nama_sppg === val);
                                    if (selectedSppg) {
                                      setFormPorsiBesar(selectedSppg.porsi_besar);
                                      setFormPorsiKecil(selectedSppg.porsi_kecil);
                                      setFormBalita(selectedSppg.balita);
                                      setFormBumil(selectedSppg.bumil);
                                      setFormBusui(selectedSppg.busui);
                                    }
                                  }
                                }}
                                className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[#6e707e] dark:text-gray-200 outline-none focus:border-[#bac8f3] focus:ring-1 focus:ring-[#bac8f3] text-xs cursor-pointer"
                              >
                                <option value="">-- Pilih SPPG Terdaftar --</option>
                                {sppgList.map((sppg) => (
                                  <option key={sppg.id} value={sppg.nama_sppg}>
                                    {sppg.nama_sppg}
                                  </option>
                                ))}
                                <option value="__custom__">Input Manual / SPPG Baru...</option>
                              </select>
                              {(!sppgList.some(s => s.nama_sppg === formSppgName) || formSppgName === "") && (
                                <input
                                  type="text"
                                  placeholder="Ketik nama SPPG manual..."
                                  value={formSppgName}
                                  onChange={(e) => setFormSppgName(e.target.value)}
                                  className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[#6e707e] dark:text-gray-200 outline-none focus:border-[#bac8f3] focus:ring-1 focus:ring-[#bac8f3] text-xs mt-2"
                                />
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Tanggal Distribusi</label>
                              <input
                                type="date"
                                value={formTanggal}
                                onChange={(e) => setFormTanggal(e.target.value)}
                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[#6e707e] dark:text-gray-200 outline-none focus:border-[#bac8f3] focus:ring-1 focus:ring-[#bac8f3] text-xs cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Detail Menu Makanan</label>
                              <textarea
                                placeholder="Contoh: Nasi Putih, Ayam Goreng Saos Padang, Tumis Buncis Wortel, Semangka..."
                                rows={2}
                                value={formMenu}
                                onChange={(e) => setFormMenu(e.target.value)}
                                className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[#6e707e] dark:text-gray-200 outline-none focus:border-[#bac8f3] focus:ring-1 focus:ring-[#bac8f3] text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Jumlah Penerima */}
                        <div className="p-4 sm:p-5 bg-[#f8f9fc] dark:bg-gray-900 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] shadow-sm space-y-4">
                          <div className="flex items-center justify-between border-b border-[#e3e6f0] dark:border-gray-700 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-1 h-3.5 bg-[#1cc88a]" />
                              <h4 className="text-xs font-bold text-[#1cc88a] uppercase tracking-wide">Jumlah Penerima Manfaat</h4>
                            </div>
                            <div className="px-2.5 py-1 rounded-[0.35rem] bg-[#1cc88a]/10 border border-[#1cc88a]/30 text-[#1cc88a] font-bold text-[11px]">
                              Total: {(formPorsiBesar || 0) + (formPorsiKecil || 0) + (formBalita || 0) + (formBumil || 0) + (formBusui || 0)} Orang
                            </div>
                          </div>

                          {/* Sekolah */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-[#5a5c69] dark:text-gray-300 uppercase">Porsi Besar (SD-SMP)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={formPorsiBesar || ""}
                                onChange={(e) => setFormPorsiBesar(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                                min="0"
                                className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[#6e707e] dark:text-gray-200 outline-none focus:border-[#bac8f3] focus:ring-1 focus:ring-[#bac8f3] text-xs font-mono font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-[#5a5c69] dark:text-gray-300 uppercase">Porsi Kecil (PAUD-TK)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={formPorsiKecil || ""}
                                onChange={(e) => setFormPorsiKecil(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                                min="0"
                                className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[#6e707e] dark:text-gray-200 outline-none focus:border-[#bac8f3] focus:ring-1 focus:ring-[#bac8f3] text-xs font-mono font-bold"
                              />
                            </div>
                          </div>

                          {/* B3 Rentan */}
                          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#e3e6f0] dark:border-gray-700">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-[#f6c23e] uppercase">PMT Balita</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={formBalita || ""}
                                onChange={(e) => setFormBalita(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                                min="0"
                                className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[#6e707e] dark:text-gray-200 outline-none focus:border-[#f6c23e] focus:ring-1 focus:ring-[#f6c23e] text-xs font-mono font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-[#e74a3b] uppercase">PMT Bumil</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={formBumil || ""}
                                onChange={(e) => setFormBumil(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                                min="0"
                                className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[#6e707e] dark:text-gray-200 outline-none focus:border-[#e74a3b] focus:ring-1 focus:ring-[#e74a3b] text-xs font-mono font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-[#36b9cc] uppercase">PMT Busui</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={formBusui || ""}
                                onChange={(e) => setFormBusui(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                                min="0"
                                className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[#6e707e] dark:text-gray-200 outline-none focus:border-[#36b9cc] focus:ring-1 focus:ring-[#36b9cc] text-xs font-mono font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* --- RIGHT COLUMN: GIZI, PHOTO & ACTIONS (5 COLS) --- */}
                      <div className="lg:col-span-5 space-y-6">
                        {/* Nutrition Card */}
                        <div className="p-4 sm:p-5 bg-[#f8f9fc] dark:bg-gray-900 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] shadow-sm space-y-4">
                          <div className="flex items-center gap-2 border-b border-[#e3e6f0] dark:border-gray-700 pb-2.5">
                            <span className="w-1 h-3.5 bg-[#f6c23e]" />
                            <h4 className="text-xs font-bold text-[#f6c23e] uppercase tracking-wide">Kandungan Gizi</h4>
                          </div>

                          {/* Porsi Besar */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-[#4e73df] uppercase block">Porsi Besar (SD-SMP)</span>
                            <div className="grid grid-cols-5 gap-1.5">
                              <div className="space-y-1 text-center">
                                <label className="text-[9px] font-bold text-[#5a5c69] dark:text-gray-400 uppercase block">Energi</label>
                                <input
                                  type="number"
                                  value={formGiziBesar.Energi || ""}
                                  onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Energi: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] font-mono font-bold text-[#5a5c69] dark:text-gray-200 text-center outline-none focus:border-[#bac8f3]"
                                />
                              </div>
                              <div className="space-y-1 text-center">
                                <label className="text-[9px] font-bold text-[#5a5c69] dark:text-gray-400 uppercase block">Prot</label>
                                <input
                                  type="number"
                                  value={formGiziBesar.Protein || ""}
                                  onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Protein: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] font-mono font-bold text-[#5a5c69] dark:text-gray-200 text-center outline-none focus:border-[#bac8f3]"
                                />
                              </div>
                              <div className="space-y-1 text-center">
                                <label className="text-[9px] font-bold text-[#5a5c69] dark:text-gray-400 uppercase block">Lmk</label>
                                <input
                                  type="number"
                                  value={formGiziBesar.Lemak || ""}
                                  onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Lemak: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] font-mono font-bold text-[#5a5c69] dark:text-gray-200 text-center outline-none focus:border-[#bac8f3]"
                                />
                              </div>
                              <div className="space-y-1 text-center">
                                <label className="text-[9px] font-bold text-[#5a5c69] dark:text-gray-400 uppercase block">Krb</label>
                                <input
                                  type="number"
                                  value={formGiziBesar.Karbohidrat || ""}
                                  onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Karbohidrat: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] font-mono font-bold text-[#5a5c69] dark:text-gray-200 text-center outline-none focus:border-[#bac8f3]"
                                />
                              </div>
                              <div className="space-y-1 text-center">
                                <label className="text-[9px] font-bold text-[#5a5c69] dark:text-gray-400 uppercase block">Srt</label>
                                <input
                                  type="number"
                                  value={formGiziBesar.Serat || ""}
                                  onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Serat: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] font-mono font-bold text-[#5a5c69] dark:text-gray-200 text-center outline-none focus:border-[#bac8f3]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Porsi Kecil */}
                          <div className="space-y-2 pt-2 border-t border-[#e3e6f0] dark:border-gray-700">
                            <span className="text-[11px] font-bold text-[#1cc88a] uppercase block">Porsi Kecil (PAUD-TK)</span>
                            <div className="grid grid-cols-5 gap-1.5">
                              <div className="space-y-1 text-center">
                                <label className="text-[9px] font-bold text-[#5a5c69] dark:text-gray-400 uppercase block">Energi</label>
                                <input
                                  type="number"
                                  value={formGiziKecil.Energi || ""}
                                  onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Energi: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] font-mono font-bold text-[#5a5c69] dark:text-gray-200 text-center outline-none focus:border-[#bac8f3]"
                                />
                              </div>
                              <div className="space-y-1 text-center">
                                <label className="text-[9px] font-bold text-[#5a5c69] dark:text-gray-400 uppercase block">Prot</label>
                                <input
                                  type="number"
                                  value={formGiziKecil.Protein || ""}
                                  onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Protein: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] font-mono font-bold text-[#5a5c69] dark:text-gray-200 text-center outline-none focus:border-[#bac8f3]"
                                />
                              </div>
                              <div className="space-y-1 text-center">
                                <label className="text-[9px] font-bold text-[#5a5c69] dark:text-gray-400 uppercase block">Lmk</label>
                                <input
                                  type="number"
                                  value={formGiziKecil.Lemak || ""}
                                  onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Lemak: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] font-mono font-bold text-[#5a5c69] dark:text-gray-200 text-center outline-none focus:border-[#bac8f3]"
                                />
                              </div>
                              <div className="space-y-1 text-center">
                                <label className="text-[9px] font-bold text-[#5a5c69] dark:text-gray-400 uppercase block">Krb</label>
                                <input
                                  type="number"
                                  value={formGiziKecil.Karbohidrat || ""}
                                  onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Karbohidrat: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] font-mono font-bold text-[#5a5c69] dark:text-gray-200 text-center outline-none focus:border-[#bac8f3]"
                                />
                              </div>
                              <div className="space-y-1 text-center">
                                <label className="text-[9px] font-bold text-[#5a5c69] dark:text-gray-400 uppercase block">Srt</label>
                                <input
                                  type="number"
                                  value={formGiziKecil.Serat || ""}
                                  onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Serat: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] font-mono font-bold text-[#5a5c69] dark:text-gray-200 text-center outline-none focus:border-[#bac8f3]"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Photo Upload & Action Buttons */}
                        <div className="p-4 sm:p-5 bg-[#f8f9fc] dark:bg-gray-900 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] shadow-sm space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase block">Foto Makanan Hari Ini</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[#6e707e] text-xs cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-[0.25rem] file:border-0 file:text-xs file:font-bold file:bg-[#4e73df] file:text-white"
                            />
                            {formImageBase64 ? (
                              <div className="flex items-center gap-3 p-2 bg-[#1cc88a]/10 border border-[#1cc88a]/30 rounded-[0.35rem]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={formImageBase64} alt="Preview" className="w-12 h-12 object-cover rounded-[0.25rem] border border-[#1cc88a]/30" />
                                <span className="text-[11px] text-[#1cc88a] font-bold">Foto baru siap diunggah</span>
                              </div>
                            ) : editingExistingPhotoUrl ? (
                              <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={editingExistingPhotoUrl} alt="Foto saat ini" className="w-12 h-12 object-cover rounded-[0.25rem]" />
                                <span className="text-[11px] text-[#858796] dark:text-gray-400">Foto saat ini dipertahankan</span>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e3e6f0] dark:border-gray-700">
                            <button
                              type="button"
                              onClick={resetReportForm}
                              className="px-4 py-2 bg-[#858796] hover:bg-[#717384] text-white rounded-[0.35rem] text-xs font-bold shadow-sm transition-colors"
                            >
                              {editingReportId ? "Batal" : "Reset"}
                            </button>
                            <button
                              type="button"
                              disabled={formIsSubmitting}
                              onClick={handleSubmitReport}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white rounded-[0.35rem] text-xs font-bold shadow-sm transition-colors disabled:opacity-60"
                            >
                              {formIsSubmitting && <RefreshCw size={14} className="animate-spin" />}
                              <span>{formIsSubmitting ? "Memproses..." : editingReportId ? "Simpan Perubahan" : "Pratinjau Laporan"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                </SbCard>

                {/* Laporan Statistics Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SbCard title="Laporan Terbaru (Hari Ini)" subtitle="3 aktivitas SPPG terakhir">
                    <div className="space-y-2">
                      {reports.slice(0, 3).map((rep) => (
                        <div key={rep.id} className="p-3 bg-white dark:bg-gray-900 rounded-[0.35rem] border border-[#e3e6f0] dark:border-gray-700 flex items-center justify-between shadow-sm">
                          <div>
                            <p className="text-xs font-bold text-[#4e73df]">{rep.sppgName}</p>
                            <p className="text-[11px] text-[#858796] dark:text-gray-400">{rep.totalBeneficiaries} Penerima • {rep.location}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-[0.25rem] text-[10px] font-bold text-white ${
                            rep.status === "Draft" ? "bg-[#f6c23e]" :
                            rep.status === "Approved" ? "bg-[#4e73df]" :
                            "bg-[#1cc88a]"
                          }`}>
                            {rep.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </SbCard>

                  <SbCard
                    title="Persentase Pengiriman Laporan"
                    subtitle="Total laporan yang telah berhasil dikirim (Sent) ke pusat."
                  >
                    <div className="space-y-3 pt-1">
                      <div className="flex justify-between text-xs font-bold text-[#5a5c69] dark:text-gray-300">
                        <span>Progress Laporan</span>
                        <span>
                          {reports.length > 0 ? Math.round(
                            (reports.filter((r) => r.status === "Sent").length / reports.length) * 100
                          ) : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-[#eaecf4] dark:bg-gray-700 h-4 rounded-[0.35rem] overflow-hidden">
                        <div
                          className="bg-[#1cc88a] h-full transition-all duration-500"
                          style={{
                            width: `${reports.length > 0 ? (reports.filter((r) => r.status === "Sent").length / reports.length) * 100 : 0}%`
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-[#858796] dark:text-gray-400 text-center">
                        {reports.filter((r) => r.status === "Sent").length} dari {reports.length} laporan selesai dikirim.
                      </p>
                    </div>
                  </SbCard>
                </div>
              </div>
            )}

            {/* TAB 5: RIWAYAT LAPORAN */}
            {activeTab === "riwayat" && (
              <div className="space-y-6">
                <SbCard
                  title="Riwayat Laporan SPPG"
                  subtitle={`Total ${reports.length} laporan (${reports.filter(r => r.status === "Sent" || r.status === "Approved").length} terkirim, ${reports.filter(r => r.status === "Draft").length} draft)`}
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                        <input
                          type="text"
                          placeholder="Cari SPPG / menu..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 pr-7 py-1.5 w-40 sm:w-52 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df]"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df] cursor-pointer"
                      >
                        <option value="All">Semua Status</option>
                        <option value="Draft">Draft</option>
                        <option value="Approved">Approved</option>
                        <option value="Sent">Sent</option>
                      </select>
                      <button
                        onClick={toggleSort}
                        className="px-2.5 py-1.5 bg-[#f8f9fc] dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-[#d1d3e2] dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5 text-xs font-medium"
                        title="Urutkan Tanggal"
                      >
                        <ArrowUpDown size={13} />
                        <span className="hidden sm:inline">{sortDirection === "asc" ? "Terlama" : "Terbaru"}</span>
                      </button>
                    </div>
                  }
                >
                  {/* Card Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredReports.length > 0 ? (
                      filteredReports.map((report) => {
                        const dbRow = dbReports.find((r) => r.id === report.id);
                        const photoUrl = dbRow?.photo_url || report.photoUrl;

                        return (
                          <div
                            key={report.id}
                            className="bg-white dark:bg-gray-800 border border-[#e3e6f0] dark:border-gray-700 rounded shadow-sm hover:shadow-md transition-shadow p-3.5 flex flex-col justify-between space-y-3"
                          >
                            {/* Image Frame */}
                            <div className="relative w-full aspect-[16/10] rounded overflow-hidden bg-gray-100 dark:bg-gray-900 border border-[#e3e6f0] dark:border-gray-700 shadow-inner flex items-center justify-center">
                              {photoUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={photoUrl}
                                  alt={`Foto ${report.menu}`}
                                  loading="lazy"
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1.5 text-gray-400">
                                  <UtensilsCrossed size={26} />
                                  <span className="text-[10px] font-medium italic">Tidak ada foto</span>
                                </div>
                              )}

                              {/* Status Badge Top Right */}
                              <div className="absolute top-2 right-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${report.status === "Draft"
                                  ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700"
                                  : report.status === "Approved"
                                    ? "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700"
                                  }`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                  <span>{report.status}</span>
                                </span>
                              </div>
                            </div>

                            {/* Date & Menu Title */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#4e73df]">
                                <Calendar size={13} className="shrink-0" />
                                <span>{report.date}</span>
                              </div>

                              <h6 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-snug line-clamp-2" title={report.menu}>
                                {toTitleCase(report.menu || "-")}
                              </h6>

                              {report.sppgName && (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
                                  {report.sppgName}
                                </p>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 border-t border-[#e3e6f0] dark:border-gray-700 flex items-center justify-between gap-1.5">
                              <button
                                onClick={() => setSelectedReport(report)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#4e73df] hover:bg-[#2e59d9] text-white rounded text-xs font-bold transition-colors shadow-sm"
                                title="Lihat Detail"
                              >
                                <Eye size={13} />
                                <span>Lihat</span>
                              </button>
                              <button
                                onClick={() => openStickerFromReport(report)}
                                className="p-1.5 bg-[#f8f9fc] dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 border border-[#d1d3e2] dark:border-gray-600 rounded text-xs transition-colors"
                                title="Cetak Stiker Ompreng"
                              >
                                <Printer size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  if (!dbRow) return;
                                  const ext = dbRow.extracted_data || {};
                                  const besar = ext["Porsi Besar"] || {};
                                  const kecil = ext["Porsi Kecil"] || {};
                                  const b3 = ext["B3"] || {};
                                  setFormSppgName(ext.sppg_name || "");
                                  setFormTanggal(dbRow.tanggal || new Date().toISOString().split("T")[0]);
                                  setFormMenu(dbRow.menu || "");
                                  setFormPorsiBesar(dbRow.porsi_besar || 0);
                                  setFormPorsiKecil(dbRow.porsi_kecil || 0);
                                  setFormBalita(b3.Balita || 0);
                                  setFormBumil(b3.Bumil || 0);
                                  setFormBusui(b3.Busui || 0);
                                  setFormGiziBesar({
                                    Energi: besar.Energi || dbRow.energi || 0,
                                    Protein: besar.Protein || dbRow.protein || 0,
                                    Lemak: besar.Lemak || dbRow.lemak || 0,
                                    Karbohidrat: besar.Karbohidrat || dbRow.karbohidrat || 0,
                                    Serat: besar.Serat || dbRow.serat || 0
                                  });
                                  setFormGiziKecil({
                                    Energi: kecil.Energi || 0,
                                    Protein: kecil.Protein || 0,
                                    Lemak: kecil.Lemak || 0,
                                    Karbohidrat: kecil.Karbohidrat || 0,
                                    Serat: kecil.Serat || 0
                                  });
                                  setFormImageBase64("");
                                  setEditingExistingPhotoUrl(dbRow.photo_url || "");
                                  setEditingReportId(dbRow.id);
                                  setActiveTab("laporan");
                                }}
                                className="p-1.5 bg-[#f8f9fc] dark:bg-gray-700 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-[#d1d3e2] dark:border-gray-600 rounded text-xs transition-colors"
                                title="Edit Laporan"
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm("Yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.")) return;
                                  try {
                                    const res = await fetch(`/api/reports?id=${report.id}`, { method: "DELETE" });
                                    const json = await res.json();
                                    if (res.ok && json.status === "success") {
                                      setDbReports((prev) => prev.filter((r) => r.id !== report.id));
                                      showSettingsToast("Laporan berhasil dihapus.", "success");
                                    } else {
                                      alert("Gagal menghapus: " + json.message);
                                    }
                                  } catch {
                                    alert("Terjadi kesalahan saat menghapus laporan.");
                                  }
                                }}
                                className="p-1.5 bg-[#f8f9fc] dark:bg-gray-700 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-[#d1d3e2] dark:border-gray-600 rounded text-xs transition-colors"
                                title="Hapus Laporan"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-16 px-6 flex flex-col items-center justify-center text-center space-y-3 bg-[#f8f9fc] dark:bg-gray-800/50 rounded border border-dashed border-[#d1d3e2] dark:border-gray-700 my-4">
                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#4e73df] border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h6 className="text-sm font-bold text-gray-800 dark:text-gray-100">Belum Ada Laporan</h6>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                            {searchQuery || statusFilter !== "All"
                              ? "Tidak ada laporan yang sesuai dengan filter atau kata kunci pencarian."
                              : "Belum ada riwayat distribusi makanan harian. Buat laporan pertama Anda sekarang."}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab("laporan");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="mt-2 px-4 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white rounded text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>Buat Laporan Baru</span>
                        </button>
                      </div>
                    )}
                  </div>
                </SbCard>
              </div>
            )}

            {/* TAB 3B: PENERIMA MANFAAT */}
            {activeTab === "penerima" && <PenerimaTab
              beneficiaryView={beneficiaryView}
              setBeneficiaryView={setBeneficiaryView}
              kelompokFilterSppg={kelompokFilterSppg}
              setKelompokFilterSppg={setKelompokFilterSppg}
              sppgList={sppgList}
              loadingKelompok={loadingKelompok}
              kelompokList={kelompokList}
              handleEditKelompok={handleEditKelompok}
              handleDeleteKelompok={handleDeleteKelompok}
              onAddKelompok={() => { setEditingKelompokId(null); setKelompokForm({ sppg_id: kelompokFilterSppg || null, nama_kelompok: "", jenis: "Sekolah", kode: "", kategori: "", nama_kader: "", telepon: "", email: "", alamat: "", kontak: "", catatan: "" }); setShowKelompokModal(true); }}
              onOpenKpmImport={() => { setKpmImportSppgId(kelompokFilterSppg || ""); setShowKpmImportModal(true); }}
              loadingBeneficiary={loadingBeneficiary}
              beneficiaryList={beneficiaryList}
              beneficiarySearch={beneficiarySearch}
              setBeneficiarySearch={setBeneficiarySearch}
              beneficiaryFilterSppg={beneficiaryFilterSppg}
              setBeneficiaryFilterSppg={setBeneficiaryFilterSppg}
              beneficiaryFilterKategori={beneficiaryFilterKategori}
              setBeneficiaryFilterKategori={setBeneficiaryFilterKategori}
              beneficiaryFilterStatus={beneficiaryFilterStatus}
              setBeneficiaryFilterStatus={setBeneficiaryFilterStatus}
              onFetchBeneficiary={fetchBeneficiaryList}
              onAddBeneficiary={() => { setBeneficiaryForm({ sppg_id: beneficiaryFilterSppg || null, kelompok_id: null, nama_lengkap: "", tanggal_lahir: "", gender: "", nik: "", identity_type: "nik", identity_code: "", kategori: "", sub_kategori: "", status: "Aktif", tanggal_mulai: "", tanggal_berhenti: "", catatan: "" }); setEditingBeneficiaryId(null); setShowBeneficiaryModal(true); }}
              onEditBeneficiary={handleEditBeneficiary}
              onDeleteBeneficiary={handleDeleteBeneficiary}
              setKelompokForm={setKelompokForm}
              setEditingKelompokId={setEditingKelompokId}
              setShowKelompokModal={setShowKelompokModal}
              setKpmImportSppgId={setKpmImportSppgId}
              setShowKpmImportModal={setShowKpmImportModal}
              setBeneficiaryForm={setBeneficiaryForm}
              setEditingBeneficiaryId={setEditingBeneficiaryId}
              setShowBeneficiaryModal={setShowBeneficiaryModal}
              setImportSppgId={setImportSppgId}
              setImportKelompokId={setImportKelompokId}
              setImportAutoCreate={setImportAutoCreate}
              setShowImportModal={setShowImportModal}
              handleDownloadTemplate={handleDownloadTemplate}
              fetchBeneficiaryList={fetchBeneficiaryList}
            />}

            {activeTab === "rekap" && <RekapTab sppgList={sppgList} />}

            {/* TAB 3: MASTER DATA SPPG */}
            {activeTab === "sppg" && <SppgTab loading={loadingSppg} sppgList={sppgList} search={sppgSearch} onSearchChange={setSppgSearch} onAdd={() => { setEditingSppgId(null); setSppgForm({ nama_sppg: "", porsi_kecil: 0, porsi_besar: 0, balita: 0, bumil: 0, busui: 0, kepala_sppg: "", pengawas_gizi: "", kontak_pengaduan: "", tiktok: "", instagram: "", sub_wilayah: "" }); setShowSppgModal(true); }} onEdit={handleEditSppg} onDelete={handleDeleteSppg} />}



            {/* TAB: LAPORAN MINGGUAN */}
            {activeTab === "mingguan" && (
              <WeeklyReportView reports={dbReports} sppgList={sppgList} />
            )}

            {/* TAB 4: PENGATURAN */}
            {activeTab === "pengaturan" && <SettingsTab theme={theme} toggleTheme={toggleTheme} notificationsEnabled={notificationsEnabled} setNotificationsEnabled={setNotificationsEnabled} autoSync={autoSync} setAutoSync={setAutoSync} geminiApiKeyInput={geminiApiKeyInput} setGeminiApiKeyInput={setGeminiApiKeyInput} isSavingGeminiKey={isSavingGeminiKey} showGeminiKeySecret={showGeminiKeySecret} setShowGeminiKeySecret={setShowGeminiKeySecret} handleSaveGeminiKey={handleSaveGeminiKey} geminiModelsInput={geminiModelsInput} setGeminiModelsInput={setGeminiModelsInput} isSavingGeminiModels={isSavingGeminiModels} handleSaveGeminiModels={handleSaveGeminiModels} handleResetGeminiModels={handleResetGeminiModels} availableModels={availableModels} isDetectingModels={isDetectingModels} handleDetectModels={handleDetectModels} modelTestResults={modelTestResults} isTestingModel={isTestingModel} handleTestModel={handleTestModel} />}

            {/* TAB: MBG MAKER */}
            {activeTab === "menu" && (
              <MBGMaker sppgList={sppgList} />
            )}

            {/* TAB: STIKER OMPRENG STANDALONE */}
            {activeTab === "stiker" && (
              <div className="space-y-6">
                {/* Header Action Bar */}
                <div className="bg-white dark:bg-gray-800 border border-[#e3e6f0] dark:border-gray-700 p-4 sm:p-5 rounded-[0.35rem] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-[#4e73df] flex items-center gap-2">
                      <Printer size={18} />
                      <span>Generator Label Stiker Ompreng MBG</span>
                    </h3>
                    <p className="text-xs text-[#858796] dark:text-gray-400 mt-0.5">
                      Pilih format ({standaloneStikerPaperSize.toUpperCase()}), sesuaikan jumlah label & gizi, lalu download/cetak.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadStickerPNG}
                      disabled={isDownloadingStickerPNG}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#1cc88a] hover:bg-[#17a673] text-white rounded-[0.35rem] text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                      title="Download lembar stiker sebagai gambar PNG resolusi tinggi"
                    >
                      {isDownloadingStickerPNG ? (
                        <RefreshCw size={14} className="animate-spin text-white" />
                      ) : (
                        <ImageIcon size={14} />
                      )}
                      <span>{isDownloadingStickerPNG ? "Menyimpan PNG..." : "Download PNG"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadStickerPDF}
                      disabled={isDownloadingStickerPDF}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#e74a3b] hover:bg-[#be2617] text-white rounded-[0.35rem] text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                      title="Download lembar stiker siap cetak sebagai dokumen PDF"
                    >
                      {isDownloadingStickerPDF ? (
                        <RefreshCw size={14} className="animate-spin text-white" />
                      ) : (
                        <Download size={14} />
                      )}
                      <span>{isDownloadingStickerPDF ? "Menyimpan PDF..." : "Download PDF"}</span>
                    </button>

                    {standaloneStikerTemplate === "grozziie" && (
                      <button
                        type="button"
                        onClick={handleDirectBluetoothPrint}
                        disabled={isPrintingBle}
                        className="flex items-center justify-center gap-2 px-3.5 py-2 bg-[#36b9cc] hover:bg-[#2c9faf] text-white rounded-[0.35rem] text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                        title="Cetak langsung ke printer Grozziie via Bluetooth tanpa dialog"
                      >
                        {isPrintingBle ? (
                          <RefreshCw size={15} className="animate-spin text-white" />
                        ) : (
                          <Bluetooth size={15} className="text-white" />
                        )}
                        <span>{isPrintingBle ? (bleStatusText || "Mencetak...") : "Direct Print Bluetooth"}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handlePrintSticker}
                      className="flex items-center justify-center gap-2 px-3.5 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white rounded-[0.35rem] text-xs font-bold shadow-sm transition-colors"
                      title="Cetak via browser atau Chrome Kiosk Mode (100% tanpa dialog jika Kiosk aktif)"
                    >
                      <Printer size={15} />
                      <span>
                        {standaloneStikerTemplate === "grozziie"
                          ? `Cetak (${standaloneGrozziieWidth}×${standaloneGrozziieHeight}mm)`
                          : `Cetak (${standaloneStikerPaperSize.toUpperCase()})`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Form Controls (5 Cols) */}
                  <div className="xl:col-span-5 space-y-4">
                    {/* Template Selector Card */}
                    <div className="p-4 bg-white dark:bg-gray-800 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] shadow-sm space-y-3">
                      <label className="text-xs font-bold text-[#4e73df] uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Palette size={14} className="text-[#4e73df]" />
                          <span>Pilih Jenis & Template Stiker</span>
                        </span>
                        <span className="text-[10px] bg-[#4e73df]/10 text-[#4e73df] px-2 py-0.5 rounded-[0.25rem] border border-[#4e73df]/20 font-bold">
                          {standaloneStikerTemplate === "grozziie" ? "Printer Grozziie (Roll)" : standaloneStikerTemplate === "se2026" ? "Lembaran SE BGN" : "Lembaran Klasik"}
                        </span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setStandaloneStikerTemplate("grozziie")}
                          className={`p-2.5 rounded-[0.35rem] border text-left transition-all ${
                            standaloneStikerTemplate === "grozziie"
                              ? "bg-[#1cc88a]/10 border-[#1cc88a] text-[#1cc88a] font-bold shadow-sm ring-1 ring-[#1cc88a]"
                              : "bg-[#f8f9fc] dark:bg-gray-900 border-[#e3e6f0] dark:border-gray-700 text-[#5a5c69] dark:text-gray-400 hover:border-gray-400"
                          }`}
                        >
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <Smartphone size={13} className={standaloneStikerTemplate === "grozziie" ? "text-[#1cc88a]" : "text-gray-400"} />
                            <span>Grozziie (Thermal Roll)</span>
                          </div>
                          <p className="text-[10px] text-[#858796] dark:text-gray-400 mt-1 leading-tight font-normal">
                            Bluetooth & USB (Standar SE BGN 70×50mm / Custom)
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStandaloneStikerTemplate("se2026")}
                          className={`p-2.5 rounded-[0.35rem] border text-left transition-all ${
                            standaloneStikerTemplate === "se2026"
                              ? "bg-[#4e73df]/10 border-[#4e73df] text-[#4e73df] font-bold shadow-sm ring-1 ring-[#4e73df]"
                              : "bg-[#f8f9fc] dark:bg-gray-900 border-[#e3e6f0] dark:border-gray-700 text-[#5a5c69] dark:text-gray-400 hover:border-gray-400"
                          }`}
                        >
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <Sparkles size={13} className={standaloneStikerTemplate === "se2026" ? "text-[#f6c23e]" : "text-gray-400"} />
                            <span>SE BGN 2026</span>
                          </div>
                          <p className="text-[10px] text-[#858796] dark:text-gray-400 mt-1 leading-tight font-normal">
                            Kertas A4/F4/A3 isi banyak (Segel Kiri & Kanan)
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStandaloneStikerTemplate("classic")}
                          className={`p-2.5 rounded-[0.35rem] border text-left transition-all ${
                            standaloneStikerTemplate === "classic"
                              ? "bg-[#4e73df]/10 border-[#4e73df] text-[#4e73df] font-bold shadow-sm ring-1 ring-[#4e73df]"
                              : "bg-[#f8f9fc] dark:bg-gray-900 border-[#e3e6f0] dark:border-gray-700 text-[#5a5c69] dark:text-gray-400 hover:border-gray-400"
                          }`}
                        >
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <FileText size={13} className={standaloneStikerTemplate === "classic" ? "text-[#4e73df]" : "text-gray-400"} />
                            <span>Klasik (Tabel Gizi)</span>
                          </div>
                          <p className="text-[10px] text-[#858796] dark:text-gray-400 mt-1 leading-tight font-normal">
                            Format lama: Rincian energi & zat gizi lengkap
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Source Selector & General Info */}
                    <div className="p-4 sm:p-5 bg-white dark:bg-gray-800 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] shadow-sm space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#4e73df] uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={13} className="text-[#4e73df]" />
                          <span>Pilih Data dari Laporan (Opsional)</span>
                        </label>
                        <select
                          value={standaloneStikerSelectedReportId}
                          onChange={(e) => {
                            const repId = e.target.value;
                            setStandaloneStikerSelectedReportId(repId);
                            if (!repId) return;
                            const rep = reports.find((r) => r.id === repId);
                            if (rep) {
                              loadReportIntoSticker(rep);
                              showSettingsToast("Data laporan berhasil dimuat ke Form Stiker!", "success");
                            }
                          }}
                          className="w-full bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 focus:border-[#bac8f3] rounded-[0.35rem] px-3 py-2 text-xs text-[#5a5c69] dark:text-gray-200 outline-none cursor-pointer"
                        >
                          <option value="">-- Mode Input Manual / Pilih Laporan --</option>
                          {reports.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.date} — {r.sppgName} ({r.menu})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Header SPPG selector with quick-fill from sppgList */}
                      <div className="space-y-1.5 pt-2 border-t border-[#e3e6f0] dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Pilih / Input SPPG</label>
                          {sppgList.length > 0 && (
                            <span className="text-[10px] text-[#4e73df] font-bold">{sppgList.length} SPPG terdaftar</span>
                          )}
                        </div>
                        {sppgList.length > 0 && (
                          <select
                            value={sppgList.some((s) => s.nama_sppg === standaloneStikerSppg) ? standaloneStikerSppg : ""}
                            onChange={(e) => {
                              const chosen = sppgList.find((s) => s.nama_sppg === e.target.value);
                              if (chosen) {
                                setStandaloneStikerSppg(chosen.nama_sppg);
                                if (chosen.kontak_pengaduan) setStandaloneStikerWaPengaduan(chosen.kontak_pengaduan);
                                if (chosen.tiktok) setStandaloneStikerTiktok(chosen.tiktok);
                                if (chosen.instagram) setStandaloneStikerInstagram(chosen.instagram);
                                if (chosen.sub_wilayah) setStandaloneStikerSubWilayah(chosen.sub_wilayah);
                                showSettingsToast(`Data referensi ${chosen.nama_sppg} diterapkan!`, "success");
                              }
                            }}
                            className="w-full p-2 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 focus:border-[#bac8f3] rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none mb-1.5 cursor-pointer"
                          >
                            <option value="">-- Terapkan dari Master SPPG --</option>
                            {sppgList.map((s) => (
                              <option key={s.id || s.nama_sppg} value={s.nama_sppg}>
                                {s.nama_sppg} {s.kontak_pengaduan ? `(${s.kontak_pengaduan})` : ""}
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          type="text"
                          value={standaloneStikerSppg}
                          onChange={(e) => setStandaloneStikerSppg(e.target.value)}
                          placeholder="Nama SPPG..."
                          className="w-full p-2 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#bac8f3]"
                        />
                      </div>

                      {/* Nama Menu (Hanya untuk template lembaran yang memerlukan menu) */}
                      {standaloneStikerTemplate !== "grozziie" && (
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Nama Menu</label>
                          <input
                            type="text"
                            value={standaloneStikerMenu}
                            onChange={(e) => setStandaloneStikerMenu(e.target.value)}
                            placeholder="Menu makanan..."
                            className="w-full p-2 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#bac8f3]"
                          />
                        </div>
                      )}

                      {/* KHUSUS: Setting Kertas Printer Grozziie (Roll) */}
                      {standaloneStikerTemplate === "grozziie" ? (
                        <div className="p-3.5 bg-[#f8f9fc] dark:bg-gray-800/80 border border-emerald-500/30 rounded-[0.35rem] space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <SlidersHorizontal size={13} />
                              <span>Ukuran Kertas Label Roll Thermal</span>
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Standar SE BGN: 70×50 mm</span>
                          </div>

                          {/* Quick Preset Buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setStandaloneGrozziieWidth(70);
                                setStandaloneGrozziieHeight(50);
                              }}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-[0.25rem] border transition-all ${
                                standaloneGrozziieWidth === 70 && standaloneGrozziieHeight === 50
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                  : "bg-white dark:bg-gray-800 border-[#d1d3e2] dark:border-gray-700 text-[#5a5c69] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                            >
                              ⭐ 70 × 50 mm (SE BGN)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStandaloneGrozziieWidth(100);
                                setStandaloneGrozziieHeight(78);
                              }}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded-[0.25rem] border transition-all ${
                                standaloneGrozziieWidth === 100 && standaloneGrozziieHeight === 78
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                  : "bg-white dark:bg-gray-800 border-[#d1d3e2] dark:border-gray-700 text-[#5a5c69] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                            >
                              100 × 78 mm
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStandaloneGrozziieWidth(130);
                                setStandaloneGrozziieHeight(80);
                              }}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded-[0.25rem] border transition-all ${
                                standaloneGrozziieWidth === 130 && standaloneGrozziieHeight === 80
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                  : "bg-white dark:bg-gray-800 border-[#d1d3e2] dark:border-gray-700 text-[#5a5c69] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                            >
                              130 × 80 mm
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">Lebar (mm)</label>
                              <input
                                type="number"
                                min={40}
                                max={250}
                                value={standaloneGrozziieWidth}
                                onChange={(e) => setStandaloneGrozziieWidth(parseInt(e.target.value) || 70)}
                                className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500 text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">Tinggi (mm)</label>
                              <input
                                type="number"
                                min={30}
                                max={200}
                                value={standaloneGrozziieHeight}
                                onChange={(e) => setStandaloneGrozziieHeight(parseInt(e.target.value) || 50)}
                                className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500 text-center"
                              />
                            </div>
                          </div>

                          {/* Orientasi Roll Kertas Fisik */}
                          <div className="space-y-1.5 pt-1 border-t border-[#e3e6f0] dark:border-gray-700">
                            <label className="text-[10px] font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider flex items-center justify-between">
                              <span>Orientasi Gulungan Kertas di Printer</span>
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                                {standaloneGrozziieRollOrientation === "horizontal"
                                  ? "Horizontal (Lebar Roll 70mm)"
                                  : "Vertikal (Lebar Roll 50mm)"}
                              </span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setStandaloneGrozziieRollOrientation("horizontal")}
                                className={`p-2 rounded-[0.35rem] border text-left transition-all ${
                                  standaloneGrozziieRollOrientation === "horizontal"
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/50"
                                    : "bg-white dark:bg-gray-800 border-[#d1d3e2] dark:border-gray-700 text-[#5a5c69] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                              >
                                <div className="text-[11px] font-bold">↔ Horizontal (Lebar 70mm)</div>
                                <div className="text-[9px] text-[#858796] dark:text-gray-400 mt-0.5 leading-tight">
                                  Kertas keluar mendatar sejajar desain (Feed panjang 50mm)
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => setStandaloneGrozziieRollOrientation("vertical")}
                                className={`p-2 rounded-[0.35rem] border text-left transition-all ${
                                  standaloneGrozziieRollOrientation === "vertical"
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/50"
                                    : "bg-white dark:bg-gray-800 border-[#d1d3e2] dark:border-gray-700 text-[#5a5c69] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                              >
                                <div className="text-[11px] font-bold">↕ Vertikal (Lebar 50mm)</div>
                                <div className="text-[9px] text-[#858796] dark:text-gray-400 mt-0.5 leading-tight">
                                  Kertas keluar tegak sempit (Feed panjang 70mm, auto-rotate 90°)
                                </div>
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 pt-1">
                            <label className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">Format Cetak Segel</label>
                            <select
                              value={standaloneGrozziiePairMode}
                              onChange={(e) => setStandaloneGrozziiePairMode(e.target.value as "both" | "left_only" | "right_only")}
                              className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-gray-700 dark:text-gray-200 outline-none focus:border-emerald-500 cursor-pointer"
                            >
                              <option value="both">Pasangan (Kiri & Kanan)</option>
                              <option value="left_only">Hanya Segel Kiri</option>
                              <option value="right_only">Hanya Segel Kanan</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">Geser Horizontal (X)</label>
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">{standaloneGrozziieXOffset > 0 ? `+${standaloneGrozziieXOffset}mm` : `${standaloneGrozziieXOffset}mm`}</span>
                              </div>
                              <input
                                type="number"
                                min={-30}
                                max={30}
                                step={0.5}
                                value={standaloneGrozziieXOffset}
                                onChange={(e) => setStandaloneGrozziieXOffset(parseFloat(e.target.value) || 0)}
                                placeholder="0 mm"
                                className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500 text-center"
                                title="Nilai positif (+) geser ke kanan. Nilai negatif (-) geser ke kiri."
                              />
                              <p className="text-[9px] text-[#858796] text-center">+ kanan | − kiri</p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">Geser Vertikal (Y)</label>
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">{standaloneGrozziieYOffset > 0 ? `+${standaloneGrozziieYOffset}mm` : `${standaloneGrozziieYOffset}mm`}</span>
                              </div>
                              <input
                                type="number"
                                min={-30}
                                max={30}
                                step={0.5}
                                value={standaloneGrozziieYOffset}
                                onChange={(e) => setStandaloneGrozziieYOffset(parseFloat(e.target.value) || 0)}
                                placeholder="0 mm"
                                className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500 text-center"
                                title="Nilai negatif (-) geser ke atas. Nilai positif (+) geser ke bawah."
                              />
                              <p className="text-[9px] text-[#858796] text-center">− ke atas | + bawah</p>
                            </div>
                          </div>

                          {/* Test Print Button */}
                          <div className="pt-1">
                            <button
                              type="button"
                              disabled={isPrintingBle}
                              onClick={async () => {
                                setIsPrintingBle(true);
                                setBleStatusText("Mencetak pola test diagnostik...");
                                try {
                                  const isRollHorizontal = standaloneGrozziieRollOrientation === "horizontal";
                                  const physW = isRollHorizontal ? (standaloneGrozziieWidth || 70) : (standaloneGrozziieHeight || 50);
                                  const physH = isRollHorizontal ? (standaloneGrozziieHeight || 50) : (standaloneGrozziieWidth || 70);
                                  await printTestPatternViaBle(
                                    physW,
                                    physH,
                                    standaloneGrozziieDirection,
                                    (msg) => setBleStatusText(msg)
                                  );
                                  showSettingsToast("Test pattern terkirim! Lihat nomor mm yang tercetak.", "success");
                                } catch (err: unknown) {
                                  const msg = err instanceof Error ? err.message : "Gagal test print.";
                                  showSettingsToast(msg, "error");
                                } finally {
                                  setIsPrintingBle(false);
                                  setBleStatusText("");
                                }
                              }}
                              className="w-full p-2 text-xs rounded-[0.35rem] border font-bold bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all disabled:opacity-50"
                            >
                              🔬 Cetak Pola Test (Diagnostik Area Cetak)
                            </button>
                            <p className="text-[9px] text-[#858796] mt-1">Lihat nomor mm yang tercetak → tentukan offset & area cetak aktual printer</p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">Rotasi Desain (90°)</label>
                              <button
                                type="button"
                                onClick={() => setStandaloneGrozziieRotate90(!standaloneGrozziieRotate90)}
                                className={`w-full p-2 text-xs rounded-[0.35rem] border font-bold transition-all ${
                                  standaloneGrozziieRotate90
                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                    : "bg-white dark:bg-gray-800 border-[#d1d3e2] dark:border-gray-700 text-[#5a5c69] dark:text-gray-300"
                                }`}
                              >
                                {standaloneGrozziieRotate90 ? "Aktif (Putar 90°)" : "Nonaktif (0°)"}
                              </button>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">Arah Printhead</label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setStandaloneGrozziieDirection(0)}
                                  className={`p-2 text-[11px] rounded-[0.25rem] border font-semibold transition-all ${
                                    standaloneGrozziieDirection === 0
                                      ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                      : "bg-white dark:bg-gray-800 border-[#d1d3e2] dark:border-gray-700 text-[#5a5c69] dark:text-gray-300"
                                  }`}
                                >
                                  0°
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStandaloneGrozziieDirection(1)}
                                  className={`p-2 text-[11px] rounded-[0.25rem] border font-semibold transition-all ${
                                    standaloneGrozziieDirection === 1
                                      ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                      : "bg-white dark:bg-gray-800 border-[#d1d3e2] dark:border-gray-700 text-[#5a5c69] dark:text-gray-300"
                                  }`}
                                >
                                  180°
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Ukuran Kertas</label>
                            <select
                              value={standaloneStikerPaperSize}
                              onChange={(e) => {
                                const size = e.target.value as "a4" | "f4" | "a3";
                                setStandaloneStikerPaperSize(size);
                                let defCap = 12;
                                if (size === "f4") defCap = 14;
                                if (size === "a3") defCap = 24;
                                setStandaloneStikerCapacity(defCap);
                                setStandaloneStikerCountBesar(Math.floor(defCap / 2));
                              }}
                              className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df] cursor-pointer"
                            >
                              <option value="a4">Kertas A4 (210×297 mm)</option>
                              <option value="f4">Kertas F4 / Folio (215×330 mm)</option>
                              <option value="a3">Kertas A3 (297×420 mm)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Jumlah Label / Lembar</label>
                            <select
                              value={standaloneStikerCapacity}
                              onChange={(e) => {
                                const cap = parseInt(e.target.value);
                                setStandaloneStikerCapacity(cap);
                                setStandaloneStikerCountBesar(Math.floor(cap / 2));
                              }}
                              className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df] cursor-pointer"
                            >
                              {standaloneStikerPaperSize === "a4" && (
                                <>
                                  <option value="6">6 Label (2x3 - Jumbo)</option>
                                  <option value="8">8 Label (2x4 - Sangat Besar)</option>
                                  <option value="10">10 Label (2x5 - Besar)</option>
                                  <option value="12">12 Label (2x6 - Standar 7x5cm)</option>
                                  <option value="16">16 Label (2x8 - Kompak)</option>
                                  <option value="24">24 Label (3x8 - Padat)</option>
                                </>
                              )}
                              {standaloneStikerPaperSize === "f4" && (
                                <>
                                  <option value="6">6 Label (2x3 - Jumbo)</option>
                                  <option value="8">8 Label (2x4 - Sangat Besar)</option>
                                  <option value="10">10 Label (2x5 - Besar)</option>
                                  <option value="14">14 Label (2x7 - Standar Folio)</option>
                                  <option value="18">18 Label (2x9 - Sedang)</option>
                                  <option value="28">28 Label (3x10 - Padat)</option>
                                </>
                              )}
                              {standaloneStikerPaperSize === "a3" && (
                                <>
                                  <option value="8">8 Label (2x4 - Super Jumbo)</option>
                                  <option value="12">12 Label (3x4 - Sangat Besar)</option>
                                  <option value="16">16 Label (2x8 - Besar)</option>
                                  <option value="24">24 Label (3x8 - Standar A3)</option>
                                  <option value="32">32 Label (4x8 - Padat)</option>
                                  <option value="48">48 Label (4x12 - Maksimal)</option>
                                </>
                              )}
                            </select>
                          </div>

                          {standaloneStikerTemplate === "se2026" && (
                            <div className="space-y-1 sm:col-span-2">
                              <label className="text-[11px] font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Format Cetak Segel SE</label>
                              <select
                                value={standaloneStikerSEPairMode}
                                onChange={(e) => setStandaloneStikerSEPairMode(e.target.value as "pair" | "left_only" | "right_only")}
                                className="w-full p-2 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df] cursor-pointer"
                              >
                                <option value="pair">Pasangan Segel (Kiri Jam Batas & Kanan Edukasi Berdampingan)</option>
                                <option value="left_only">Semua Segel Kiri (Jam Batas Konsumsi)</option>
                                <option value="right_only">Semua Segel Kanan (Edukasi & Pengaduan)</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tanggal & Jam Batas */}
                      <div className={`grid gap-2 pt-2 border-t border-[#e3e6f0] dark:border-gray-700 ${standaloneStikerTemplate === "grozziie" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">Tanggal</label>
                          <input
                            type="date"
                            value={standaloneStikerTanggal}
                            onChange={(e) => setStandaloneStikerTanggal(e.target.value)}
                            className="w-full p-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df]"
                          />
                        </div>
                        {standaloneStikerTemplate !== "grozziie" && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">Selesai Produksi</label>
                            <input
                              type="time"
                              value={standaloneStikerJamSelesai}
                              onChange={(e) => setStandaloneStikerJamSelesai(e.target.value)}
                              className="w-full p-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df]"
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#e74a3b] uppercase tracking-wider">Batas Konsumsi</label>
                          <input
                            type="time"
                            value={standaloneStikerJamBatas}
                            onChange={(e) => setStandaloneStikerJamBatas(e.target.value)}
                            className="w-full p-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* KONTROL KHUSUS: Template SE 2026 & Grozziie (Kotak Pengaduan & Wilayah) */}
                    {(standaloneStikerTemplate === "se2026" || standaloneStikerTemplate === "grozziie") && (
                      <div className="p-4 sm:p-5 bg-white dark:bg-gray-800 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-[#e3e6f0] dark:border-gray-700 pb-2">
                          <h4 className="text-xs font-bold text-[#1cc88a] uppercase tracking-wide flex items-center gap-1.5">
                            <span>Informasi Segel & Pengaduan SPPG</span>
                          </h4>
                          <span className="text-[10px] text-[#858796] dark:text-gray-400">Auto dari referensi SPPG</span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Keterangan Wilayah / Pelayanan (Kop Kiri)</label>
                          <input
                            type="text"
                            value={standaloneStikerSubWilayah}
                            onChange={(e) => setStandaloneStikerSubWilayah(e.target.value)}
                            placeholder="Contoh: Kawasan Pelayanan Mandiri"
                            className="w-full p-2 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#bac8f3]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Nomor Telepon / WhatsApp Pengaduan (Segel Kanan)</label>
                          <input
                            type="text"
                            value={standaloneStikerWaPengaduan}
                            onChange={(e) => setStandaloneStikerWaPengaduan(e.target.value)}
                            placeholder="Contoh: 081234567890"
                            className="w-full p-2 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#bac8f3]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Akun Instagram</label>
                            <input
                              type="text"
                              value={standaloneStikerInstagram}
                              onChange={(e) => setStandaloneStikerInstagram(e.target.value)}
                              placeholder="sppg_official"
                              className="w-full p-2 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#bac8f3]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Akun TikTok</label>
                            <input
                              type="text"
                              value={standaloneStikerTiktok}
                              onChange={(e) => setStandaloneStikerTiktok(e.target.value)}
                              placeholder="sppg_official"
                              className="w-full p-2 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#bac8f3]"
                            />
                          </div>
                        </div>

                        {/* Tips Cetak di Android & iOS */}
                        {standaloneStikerTemplate === "grozziie" && (
                          <div className="p-3 bg-[#f8f9fc] dark:bg-gray-900 border-l-[0.25rem] border-l-[#1cc88a] border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-300 leading-relaxed mt-2 space-y-1.5 shadow-sm">
                            <strong className="block text-[#1cc88a] font-bold">💡 Opsi Cetak 1-Klik Tanpa Dialog:</strong>
                            <p>
                              • <strong>Direct Print Bluetooth:</strong> Mengirim data stiker langsung ke printer Grozziie via Web Bluetooth tanpa membuka dialog cetak (didukung di Google Chrome PC & Android).
                            </p>
                            <p>
                              • <strong>Chrome Kiosk Mode:</strong> Tambahkan <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded text-[11px]">--kiosk-printing</code> di shortcut Chrome Anda untuk mencetak instan tanpa konfirmasi dialog.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* KONTROL KHUSUS: Template Klasik (Tabel Kandungan Gizi) */}
                    {standaloneStikerTemplate === "classic" && (
                      <div className="p-4 sm:p-5 bg-white dark:bg-gray-800 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-[#e3e6f0] dark:border-gray-700 pb-2">
                          <h4 className="text-xs font-bold text-[#4e73df] uppercase tracking-wide">Kandungan Gizi Label</h4>
                          <select
                            value={standaloneStikerMode}
                            onChange={(e) => setStandaloneStikerMode(e.target.value as "all_besar" | "all_kecil" | "split")}
                            className="p-1 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-[#4e73df]"
                          >
                            <option value="all_besar">Semua Porsi Besar</option>
                            <option value="all_kecil">Semua Porsi Kecil</option>
                            <option value="split">Campuran (Split)</option>
                          </select>
                        </div>

                        {/* Porsi Besar Grid */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-[#4e73df] uppercase block">Porsi Besar:</span>
                          <div className="grid grid-cols-5 gap-1.5">
                            <input type="text" value={standaloneStikerGiziBesar.energi} onChange={(e) => setStandaloneStikerGiziBesar({ ...standaloneStikerGiziBesar, energi: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Energi" className="w-full p-1 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] text-center font-bold text-[#5a5c69] dark:text-gray-200" />
                            <input type="text" value={standaloneStikerGiziBesar.protein} onChange={(e) => setStandaloneStikerGiziBesar({ ...standaloneStikerGiziBesar, protein: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Prot" className="w-full p-1 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] text-center font-bold text-[#5a5c69] dark:text-gray-200" />
                            <input type="text" value={standaloneStikerGiziBesar.lemak} onChange={(e) => setStandaloneStikerGiziBesar({ ...standaloneStikerGiziBesar, lemak: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Lemak" className="w-full p-1 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] text-center font-bold text-[#5a5c69] dark:text-gray-200" />
                            <input type="text" value={standaloneStikerGiziBesar.karbohidrat} onChange={(e) => setStandaloneStikerGiziBesar({ ...standaloneStikerGiziBesar, karbohidrat: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Karbo" className="w-full p-1 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] text-center font-bold text-[#5a5c69] dark:text-gray-200" />
                            <input type="text" value={standaloneStikerGiziBesar.serat} onChange={(e) => setStandaloneStikerGiziBesar({ ...standaloneStikerGiziBesar, serat: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Serat" className="w-full p-1 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] text-center font-bold text-[#5a5c69] dark:text-gray-200" />
                          </div>
                        </div>

                        {/* Porsi Kecil Grid */}
                        <div className="space-y-1.5 pt-1.5 border-t border-[#e3e6f0] dark:border-gray-700">
                          <span className="text-xs font-bold text-[#1cc88a] uppercase block">Porsi Kecil:</span>
                          <div className="grid grid-cols-5 gap-1.5">
                            <input type="text" value={standaloneStikerGiziKecil.energi} onChange={(e) => setStandaloneStikerGiziKecil({ ...standaloneStikerGiziKecil, energi: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Energi" className="w-full p-1 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] text-center font-bold text-[#5a5c69] dark:text-gray-200" />
                            <input type="text" value={standaloneStikerGiziKecil.protein} onChange={(e) => setStandaloneStikerGiziKecil({ ...standaloneStikerGiziKecil, protein: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Prot" className="w-full p-1 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] text-center font-bold text-[#5a5c69] dark:text-gray-200" />
                            <input type="text" value={standaloneStikerGiziKecil.lemak} onChange={(e) => setStandaloneStikerGiziKecil({ ...standaloneStikerGiziKecil, lemak: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Lemak" className="w-full p-1 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] text-center font-bold text-[#5a5c69] dark:text-gray-200" />
                            <input type="text" value={standaloneStikerGiziKecil.karbohidrat} onChange={(e) => setStandaloneStikerGiziKecil({ ...standaloneStikerGiziKecil, karbohidrat: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Karbo" className="w-full p-1 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] text-center font-bold text-[#5a5c69] dark:text-gray-200" />
                            <input type="text" value={standaloneStikerGiziKecil.serat} onChange={(e) => setStandaloneStikerGiziKecil({ ...standaloneStikerGiziKecil, serat: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Serat" className="w-full p-1 bg-[#f8f9fc] dark:bg-gray-900 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-[11px] text-center font-bold text-[#5a5c69] dark:text-gray-200" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Live Sheet Preview (7 Cols) */}
                  <div className="xl:col-span-7 bg-white dark:bg-gray-800 border border-[#e3e6f0] dark:border-gray-700 p-5 rounded-[0.35rem] shadow-sm space-y-3 sticky top-24">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#4e73df] uppercase tracking-wide flex items-center gap-2">
                        <Printer size={15} />
                        <span>
                          {standaloneStikerTemplate === "grozziie"
                            ? `Pratinjau Label Grozziie (${standaloneGrozziieWidth}×${standaloneGrozziieHeight} mm)`
                            : `Pratinjau Lembar ${standaloneStikerPaperSize.toUpperCase()} (${standaloneStikerCapacity} Label)`}
                        </span>
                      </h4>
                      <span className="text-[11px] text-[#1cc88a] font-bold">
                        {standaloneStikerTemplate === "grozziie"
                          ? "Format Segel Roll (Kiri & Kanan)"
                          : standaloneStikerTemplate === "se2026"
                          ? "Template SE BGN 2026"
                          : "Template Klasik"}
                      </span>
                    </div>
                    <div className="p-3 bg-[#f8f9fc] dark:bg-gray-900 rounded-[0.35rem] border border-[#e3e6f0] dark:border-gray-700 flex justify-center shadow-inner">
                      <StickerPreview
                        templateType={standaloneStikerTemplate}
                        paperSize={standaloneStikerPaperSize}
                        grozziieWidthMm={standaloneGrozziieWidth}
                        grozziieHeightMm={standaloneGrozziieHeight}
                        grozziiePairMode={standaloneGrozziiePairMode}
                        capacity={standaloneStikerCapacity}
                        mode={standaloneStikerMode}
                        countBesar={standaloneStikerCountBesar}
                        sppgName={standaloneStikerSppg}
                        subWilayah={standaloneStikerSubWilayah}
                        menu={standaloneStikerMenu}
                        tanggal={standaloneStikerTanggal}
                        jamSelesai={standaloneStikerJamSelesai}
                        jamBatas={standaloneStikerJamBatas}
                        giziBesar={standaloneStikerGiziBesar}
                        giziKecil={standaloneStikerGiziKecil}
                        pairMode={standaloneStikerSEPairMode}
                        waPengaduan={standaloneStikerWaPengaduan}
                        tiktokPengaduan={standaloneStikerTiktok}
                        igPengaduan={standaloneStikerInstagram}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>

          {/* --- STICKY FOOTER (SB ADMIN 2) --- */}
          <footer className="sticky-footer bg-white dark:bg-[#1f2937] py-4 border-t border-[#e3e6f0] dark:border-gray-800 text-center mt-auto">
            <div className="container mx-auto px-4 text-center text-xs text-[#858796] dark:text-gray-400 font-medium">
              <span>Copyright &copy; MBG Reporter 2026 &bull; Badan Gizi Nasional</span>
            </div>
          </footer>
          {/* --- REVIEW MODAL DETAIL DIALOG (SB ADMIN 2) --- */}
          <ReportDetailModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onUpdateStatus={updateReportStatus}
            onOpenSticker={openStickerFromReport}
            showToast={showSettingsToast}
            generateCaption={generateReportCaption}
            onReportUpdated={(updated) => {
              setSelectedReport(updated);
              setDbReports((prev) =>
                prev.map((r) => (r.id === updated.id && updated.posterUrl ? { ...r, poster_url: updated.posterUrl } : r))
              );
            }}
          />

          {/* --- PREVIEW MODAL --- */}
          {showPreviewModal && formPreviewData && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/50 transition-opacity duration-300">
              <div className="bg-white dark:bg-gray-800 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col">
                {/* Modal Header */}
                <div className="px-6 py-3.5 border-b border-[#e3e6f0] dark:border-gray-700 bg-[#f8f9fc] dark:bg-gray-800/90 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-[#4e73df] text-sm uppercase tracking-wide">Pratinjau Poster & Teks Laporan</h3>
                    <p className="text-xs text-[#858796] dark:text-gray-400">Tinjau poster dan caption. Setelah disetujui, download poster lalu copy caption untuk dikirim ke grup WhatsApp.</p>
                  </div>
                  <button
                    onClick={() => handleConfirmReport("cancel")}
                    className="p-1.5 rounded-[0.25rem] text-[#858796] hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto">
                  {/* Left Column: Poster Image Preview */}
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between">
                      <span className="text-xs font-bold text-[#4e73df] uppercase tracking-wider">Draft Poster Laporan</span>
                      {isGeneratingPosterTemplate && (
                        <span className="text-xs text-[#4e73df] font-bold animate-pulse flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin" /> Merubah...
                        </span>
                      )}
                    </div>

                    {/* Template Selector Dropdown */}
                    <div className="w-full bg-[#f8f9fc] dark:bg-gray-900 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] p-3 space-y-1 shadow-sm">
                      <span className="text-[11px] text-[#5a5c69] dark:text-gray-400 font-bold block uppercase tracking-wider">Pilih Template Poster (6 Variasi)</span>
                      <select
                        value={selectedTemplate}
                        disabled={isGeneratingPosterTemplate}
                        onChange={async (e) => {
                          const tId = e.target.value;
                          setSelectedTemplate(tId);
                          if (!formPreviewData?.reportId) return;
                          setIsGeneratingPosterTemplate(true);
                          try {
                            const res = await fetch(`/api/generate-poster?id=${formPreviewData.reportId}&template=${tId}`);
                            const json = await res.json();
                            if (json.success && json.url) {
                              setFormPreviewData({
                                ...formPreviewData,
                                posterUrl: json.url
                              });
                              showSettingsToast(`Poster diperbarui ke Template ${tId}!`, "success");
                            }
                          } catch {
                            showSettingsToast("Gagal merubah template poster.", "error");
                          } finally {
                            setIsGeneratingPosterTemplate(false);
                          }
                        }}
                        className="w-full bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 focus:border-[#bac8f3] rounded-[0.35rem] px-2.5 py-1.5 text-xs font-bold text-[#4e73df] outline-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="1">Template 1: Modern Classic (Teal & Royal Blue - Default)</option>
                        <option value="2">Template 2: Classic Beige & Sticky Note</option>
                        <option value="3">Template 3: Sky Blue Grid & Yellow Gizi Table</option>
                        <option value="4">Template 4: Bold Royal Blue & Starburst Badge</option>
                        <option value="5">Template 5: Eco Green Fresh & Nutrition Grid</option>
                        <option value="6">Template 6: Executive Gold & 5 Column Stat Pills</option>
                      </select>
                    </div>

                    <div className="w-full max-w-[400px] aspect-[800/1100] bg-[#f8f9fc] dark:bg-gray-900 rounded-[0.35rem] overflow-hidden border border-[#e3e6f0] dark:border-gray-700 flex items-center justify-center relative shadow-sm">
                      {formPreviewData.posterUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={formPreviewData.posterUrl}
                          alt="Laporan Poster"
                          loading="lazy"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-[#858796]">
                          <RefreshCw size={24} className="animate-spin text-[#4e73df]" />
                          <span className="text-xs font-semibold">Membuat Poster...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Caption Preview */}
                  <div className="space-y-2 flex flex-col">
                    <span className="text-xs font-bold text-[#4e73df] uppercase tracking-wider">Caption / Teks Laporan</span>
                    <div className="flex-1 p-4 bg-[#f8f9fc] dark:bg-gray-900 border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] font-mono text-xs text-[#5a5c69] dark:text-gray-300 overflow-y-auto whitespace-pre-wrap select-all leading-relaxed shadow-sm">
                      {formPreviewData.caption}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3 bg-[#f8f9fc] dark:bg-gray-800/90 border-t border-[#e3e6f0] dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={formIsConfirming || !formPreviewData.posterUrl || previewLoadingAction !== null}
                      onClick={async () => {
                        if (!formPreviewData.posterUrl) return;
                        setPreviewLoadingAction("download");
                        try {
                          const res = await fetch(formPreviewData.posterUrl);
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `poster-mbg-${formPreviewData.reportId}.png`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          showSettingsToast("Poster berhasil didownload!", "success");
                        } catch {
                          showSettingsToast("Gagal download poster.", "error");
                        } finally { setPreviewLoadingAction(null); }
                      }}
                      className="flex items-center gap-2 px-3.5 py-2 bg-[#1cc88a] hover:bg-[#17a673] disabled:opacity-50 text-xs font-bold text-white rounded-[0.35rem] shadow-sm transition-colors"
                    >
                      {previewLoadingAction === "download" ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                      <span>{previewLoadingAction === "download" ? "Mengunduh..." : "Download Poster"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={!formPreviewData.caption || previewLoadingAction !== null}
                      onClick={async () => {
                        if (!formPreviewData.caption) return;
                        setPreviewLoadingAction("copy");
                        try {
                          await navigator.clipboard.writeText(formPreviewData.caption);
                          showSettingsToast("Caption berhasil dicopy! Tempel di WhatsApp.", "success");
                        } catch {
                          showSettingsToast("Gagal copy caption. Silakan select & copy manual.", "error");
                        } finally { setPreviewLoadingAction(null); }
                      }}
                      className="flex items-center gap-2 px-3.5 py-2 bg-[#4e73df] hover:bg-[#2e59d9] disabled:opacity-50 text-xs font-bold text-white rounded-[0.35rem] shadow-sm transition-colors"
                    >
                      {previewLoadingAction === "copy" ? <RefreshCw size={14} className="animate-spin" /> : <Copy size={14} />}
                      <span>{previewLoadingAction === "copy" ? "Menyalin..." : "Copy Caption"}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={formIsConfirming}
                      onClick={() => handleConfirmReport("cancel")}
                      className="px-4 py-2 bg-[#858796] hover:bg-[#717384] text-white rounded-[0.35rem] text-xs font-bold shadow-sm transition-colors"
                    >
                      Revisi / Batal
                    </button>
                    <button
                      type="button"
                      disabled={formIsConfirming}
                      onClick={() => handleConfirmReport("confirm")}
                      className="px-4 py-2 bg-[#1cc88a] hover:bg-[#17a673] text-white rounded-[0.35rem] text-xs font-bold shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2"
                    >
                      {formIsConfirming && <RefreshCw size={14} className="animate-spin" />}
                      <span>{formIsConfirming ? "Menyimpan..." : "Setujui & Simpan"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- SPPG MODAL --- */}
          {showSppgModal && (
            <SbModal
              open={showSppgModal}
              onClose={() => {
                setShowSppgModal(false);
                setEditingSppgId(null);
                setSppgForm({ nama_sppg: '', porsi_kecil: 0, porsi_besar: 0, balita: 0, bumil: 0, busui: 0, kepala_sppg: '', pengawas_gizi: '' });
              }}
              title={editingSppgId ? 'Edit Data SPPG' : 'Tambah SPPG Baru'}
              subtitle='Isi data SPPG, kontak referensi, kuota porsi, dan PMT B3.'
              widthClassName='max-w-lg'
              className='max-h-[90dvh] overflow-y-auto'
            >
              <form onSubmit={handleSaveSppg} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Nama SPPG</label>
                  <input
                    type="text"
                    placeholder="Contoh: SPPG Lombok Timur"
                    value={sppgForm.nama_sppg}
                    onChange={(e) => setSppgForm({ ...sppgForm, nama_sppg: e.target.value })}
                    className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={12} className="text-[#858796]" />
                      Nama Kepala SPPG
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Kepala SPPG..."
                      value={sppgForm.kepala_sppg}
                      onChange={(e) => setSppgForm({ ...sppgForm, kepala_sppg: e.target.value })}
                      className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={12} className="text-[#858796]" />
                      Nama Pengawas Gizi
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Pengawas Gizi..."
                      value={sppgForm.pengawas_gizi}
                      onChange={(e) => setSppgForm({ ...sppgForm, pengawas_gizi: e.target.value })}
                      className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors"
                    />
                  </div>
                </div>

                {/* Kontak Pengaduan & Keterangan Sub Wilayah (Untuk Label SE 2026) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1cc88a] uppercase tracking-wider flex items-center gap-1.5">
                      <span>WA Kontak Pengaduan</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 081234567890"
                      value={sppgForm.kontak_pengaduan || ""}
                      onChange={(e) => setSppgForm({ ...sppgForm, kontak_pengaduan: e.target.value })}
                      className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#1cc88a] focus:ring-1 focus:ring-[#1cc88a] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Keterangan Wilayah / Pelayanan</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Kawasan Pelayanan Mandiri"
                      value={sppgForm.sub_wilayah || ""}
                      onChange={(e) => setSppgForm({ ...sppgForm, sub_wilayah: e.target.value })}
                      className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors"
                    />
                  </div>
                </div>

                {/* Akun Media Sosial SPPG */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#e74a3b] uppercase tracking-wider flex items-center gap-1.5">
                      <span>Instagram SPPG</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: sppg_bandung"
                      value={sppgForm.instagram || ""}
                      onChange={(e) => setSppgForm({ ...sppgForm, instagram: e.target.value })}
                      className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>TikTok SPPG</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: sppg_bandung"
                      value={sppgForm.tiktok || ""}
                      onChange={(e) => setSppgForm({ ...sppgForm, tiktok: e.target.value })}
                      className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Porsi Besar (SD-SMP)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={sppgForm.porsi_besar || ""}
                      onChange={(e) => setSppgForm({ ...sppgForm, porsi_besar: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                      min="0"
                      className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Porsi Kecil (PAUD-TK)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={sppgForm.porsi_kecil || ""}
                      onChange={(e) => setSppgForm({ ...sppgForm, porsi_kecil: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                      min="0"
                      className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors"
                    />
                  </div>
                </div>

                <div className="border-t border-[#e3e6f0] dark:border-gray-700 pt-3">
                  <span className="text-xs font-bold text-[#4e73df] uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Users size={14} />
                    PMT B3
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">Balita</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={sppgForm.balita || ""}
                        onChange={(e) => setSppgForm({ ...sppgForm, balita: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                        min="0"
                        className="w-full p-2 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">Bumil</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={sppgForm.bumil || ""}
                        onChange={(e) => setSppgForm({ ...sppgForm, bumil: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                        min="0"
                        className="w-full p-2 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#858796] dark:text-gray-400 uppercase tracking-wider">Busui</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={sppgForm.busui || ""}
                        onChange={(e) => setSppgForm({ ...sppgForm, busui: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                        min="0"
                        className="w-full p-2 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-[#e3e6f0] dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSppgModal(false);
                      setEditingSppgId(null);
                      setSppgForm({ nama_sppg: "", porsi_kecil: 0, porsi_besar: 0, balita: 0, bumil: 0, busui: 0, kepala_sppg: "", pengawas_gizi: "" });
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-[#858796] hover:bg-[#717384] text-white rounded-[0.35rem] text-xs font-bold shadow-sm transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={sppgSubmitting}
                    className="w-full sm:w-auto px-4 py-2 bg-[#4e73df] hover:bg-[#2e59d9] disabled:opacity-50 disabled:cursor-not-allowed rounded-[0.35rem] text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {sppgSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>{sppgSubmitting ? "Menyimpan..." : editingSppgId ? "Simpan Perubahan" : "Tambah SPPG"}</span>
                  </button>
                </div>
              </form>
            </SbModal>
          )}

          {/* --- KELOMPOK PENERIMA MANFAAT MODAL --- */}
          {showKelompokModal && (
            <SbModal
              open={showKelompokModal}
              onClose={() => { setShowKelompokModal(false); setEditingKelompokId(null); }}
              title={editingKelompokId ? 'Edit Kelompok' : 'Tambah Kelompok Baru'}
              subtitle='Kelola data kelompok & PIC penerima manfaat.'
              widthClassName='max-w-lg'
              className='max-h-[90dvh] overflow-y-auto'
            >
              <form onSubmit={(e) => { e.preventDefault(); handleSaveKelompok(); }} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">SPPG</label>
                  <select value={kelompokForm.sppg_id || ""} onChange={(e) => setKelompokForm({ ...kelompokForm, sppg_id: e.target.value || null })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" required>
                    <option value="">Pilih SPPG</option>
                    {sppgList.map((s) => <option key={s.id} value={s.id}>{s.nama_sppg}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Nama Kelompok</label>
                  <input type="text" value={kelompokForm.nama_kelompok} onChange={(e) => setKelompokForm({ ...kelompokForm, nama_kelompok: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Jenis</label>
                  <select value={kelompokForm.jenis} onChange={(e) => setKelompokForm({ ...kelompokForm, jenis: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors">
                    {JENIS_KELOMPOK.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Kode</label>
                    <input type="text" value={kelompokForm.kode} onChange={(e) => setKelompokForm({ ...kelompokForm, kode: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Nama PIC</label>
                    <input type="text" value={kelompokForm.nama_kader} onChange={(e) => setKelompokForm({ ...kelompokForm, nama_kader: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">No. Telpon</label>
                    <input type="text" value={kelompokForm.telepon} onChange={(e) => setKelompokForm({ ...kelompokForm, telepon: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Email</label>
                    <input type="email" value={kelompokForm.email} onChange={(e) => setKelompokForm({ ...kelompokForm, email: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Kategori</label>
                  <input type="text" value={kelompokForm.kategori} onChange={(e) => setKelompokForm({ ...kelompokForm, kategori: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Alamat</label>
                  <input type="text" value={kelompokForm.alamat} onChange={(e) => setKelompokForm({ ...kelompokForm, alamat: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Kontak</label>
                  <input type="text" value={kelompokForm.kontak} onChange={(e) => setKelompokForm({ ...kelompokForm, kontak: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Catatan</label>
                  <textarea value={kelompokForm.catatan} onChange={(e) => setKelompokForm({ ...kelompokForm, catatan: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" rows={2} />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-[#e3e6f0] dark:border-gray-700">
                  <button type="button" onClick={() => { setShowKelompokModal(false); setEditingKelompokId(null); }} className="px-4 py-2 bg-[#858796] hover:bg-[#717384] text-white rounded-[0.35rem] text-xs font-bold shadow-sm transition-colors">Batal</button>
                  <button type="submit" disabled={kelompokSubmitting} className="px-4 py-2 bg-[#4e73df] hover:bg-[#2e59d9] disabled:opacity-50 text-white rounded-[0.35rem] text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors">
                    {kelompokSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {kelompokSubmitting ? "Menyimpan..." : editingKelompokId ? "Simpan" : "Tambah"}
                  </button>
                </div>
              </form>
            </SbModal>
          )}

          {/* --- PENERIMA MANFAAT MODAL (ringkas) --- */}
          {showBeneficiaryModal && (
            <SbModal
              open={showBeneficiaryModal}
              onClose={() => { setShowBeneficiaryModal(false); setEditingBeneficiaryId(null); }}
              title={editingBeneficiaryId ? 'Edit Penerima Manfaat' : 'Tambah Penerima Manfaat'}
              subtitle='Isi data penerima manfaat dan status kelompok.'
              widthClassName='max-w-2xl'
              className='max-h-[90dvh] overflow-y-auto'
            >
              <form onSubmit={(e) => { e.preventDefault(); handleSaveBeneficiary(); }} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">SPPG</label>
                    <select value={beneficiaryForm.sppg_id || ""} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, sppg_id: e.target.value || null })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" required>
                      <option value="">Pilih SPPG</option>
                      {sppgList.map((s) => <option key={s.id} value={s.id}>{s.nama_sppg}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Kelompok</label>
                    <select value={beneficiaryForm.kelompok_id || ""} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, kelompok_id: e.target.value || null })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors">
                      <option value="">Tanpa kelompok</option>
                      {kelompokList.filter((k) => !beneficiaryForm.sppg_id || k.sppg_id === beneficiaryForm.sppg_id).map((k) => <option key={k.id} value={k.id}>{k.nama_kelompok}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Nama Lengkap</label>
                  <input type="text" value={beneficiaryForm.nama_lengkap} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, nama_lengkap: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Tgl Lahir</label>
                    <input type="date" value={beneficiaryForm.tanggal_lahir} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, tanggal_lahir: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Gender</label>
                    <select value={beneficiaryForm.gender} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, gender: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors">
                      <option value="">-</option>
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Status</label>
                    <select value={beneficiaryForm.status} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, status: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors">
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">NIK (16 digit)</label>
                    <input type="text" value={beneficiaryForm.nik} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, nik: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" maxLength={16} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Tipe Identitas</label>
                    <select value={beneficiaryForm.identity_type} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, identity_type: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors">
                      <option value="nik">NIK</option>
                      <option value="nisn">NISN</option>
                      <option value="student-id">ID Siswa</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Nomor Identitas</label>
                  <input type="text" value={beneficiaryForm.identity_code} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, identity_code: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Kategori</label>
                    <select value={beneficiaryForm.kategori} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, kategori: e.target.value, sub_kategori: "" })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" required>
                      <option value="">Pilih Kategori</option>
                      {KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Sub Kategori</label>
                    <select value={beneficiaryForm.sub_kategori} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, sub_kategori: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" required disabled={!beneficiaryForm.kategori}>
                      <option value="">Pilih Sub Kategori</option>
                      {getSubKategoriOptions(beneficiaryForm.kategori).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Tgl Mulai</label>
                    <input type="date" value={beneficiaryForm.tanggal_mulai} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, tanggal_mulai: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Tgl Berhenti</label>
                    <input type="date" value={beneficiaryForm.tanggal_berhenti} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, tanggal_berhenti: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Catatan</label>
                  <textarea value={beneficiaryForm.catatan} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, catatan: e.target.value })} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors" rows={2} />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-[#e3e6f0] dark:border-gray-700">
                  <button type="button" onClick={() => { setShowBeneficiaryModal(false); setEditingBeneficiaryId(null); }} className="px-4 py-2 bg-[#858796] hover:bg-[#717384] text-white rounded-[0.35rem] text-xs font-bold shadow-sm transition-colors">Batal</button>
                  <button type="submit" disabled={beneficiarySubmitting} className="px-4 py-2 bg-[#4e73df] hover:bg-[#2e59d9] disabled:opacity-50 text-white rounded-[0.35rem] text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors">
                    {beneficiarySubmitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {beneficiarySubmitting ? "Menyimpan..." : editingBeneficiaryId ? "Simpan" : "Tambah"}
                  </button>
                </div>
              </form>
            </SbModal>
          )}

          {/* --- IMPORT CSV MODAL --- */}
          {showImportModal && (
            <SbModal
              open={showImportModal}
              onClose={() => setShowImportModal(false)}
              title="Import Penerima Manfaat (CSV)"
              subtitle="Upload file CSV/Excel untuk menambahkan penerima manfaat secara massal."
              widthClassName="max-w-3xl"
              className="max-h-[90dvh] overflow-y-auto"
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">SPPG (wajib)</label>
                  <select value={importSppgId} onChange={(e) => setImportSppgId(e.target.value)} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors">
                    <option value="">Pilih SPPG</option>
                    {sppgList.map((s) => <option key={s.id} value={s.id}>{s.nama_sppg}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">Kelompok default (opsional)</label>
                  <select value={importKelompokId} onChange={(e) => setImportKelompokId(e.target.value)} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors">
                    <option value="">Tanpa kelompok / auto-match nama</option>
                    {kelompokList.filter((k) => !importSppgId || k.sppg_id === importSppgId).map((k) => <option key={k.id} value={k.id}>{k.nama_kelompok}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs text-[#5a5c69] dark:text-gray-300">
                  <input type="checkbox" checked={importAutoCreate} onChange={(e) => setImportAutoCreate(e.target.checked)} />
                  Buat kelompok otomatis jika nama_kelompok ada di CSV
                </label>
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider mb-1 block">File CSV</label>
                  <input type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={(e) => handleCsvFileChange(e.target.files?.[0] || null)} className="w-full text-xs text-[#5a5c69] dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-[0.25rem] file:border-0 file:text-xs file:font-bold file:bg-[#4e73df] file:text-white cursor-pointer" />
                </div>
                {beneficiaryReviewRows.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs text-[#858796] dark:text-gray-400">
                      Header terdeteksi: <span className="font-semibold text-gray-900 dark:text-white">{importHeaders.join(", ")}</span> — Total {beneficiaryReviewRows.length} baris
                    </div>
                    <div className="overflow-x-auto border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem]">
                      <table className="w-full text-xs">
                        <thead className="bg-[#f8f9fc] dark:bg-gray-800/90 text-[#4e73df] dark:text-gray-300 font-bold uppercase border-b border-[#e3e6f0] dark:border-gray-700">
                          <tr>
                            <th className="px-2 py-2"><input type="checkbox" checked={beneficiaryReviewRows.filter((r) => r.status === "valid").length > 0 && beneficiaryReviewRows.filter((r) => r.status === "valid").every((r) => r.selected)} onChange={(e) => {
                              const checked = e.target.checked;
                              setBeneficiaryReviewRows((prev) => prev.map((r) => (r.status === "valid" ? { ...r, selected: checked } : r)));
                            }} /></th>
                            <th className="px-2 py-2">No</th>
                            <th className="px-2 py-2">Nama</th>
                            <th className="px-2 py-2">Tgl Lahir</th>
                            <th className="px-2 py-2">Kategori</th>
                            <th className="px-2 py-2">Sub</th>
                            <th className="px-2 py-2">Gender</th>
                            <th className="px-2 py-2">KPM</th>
                            <th className="px-2 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e3e6f0] dark:divide-gray-700">
                          {beneficiaryReviewRows
                            .slice((beneficiaryReviewPage - 1) * 40, beneficiaryReviewPage * 40)
                            .map((r) => (
                              <tr key={r.id} className={r.status === "error" ? "bg-rose-500/5 text-gray-700 dark:text-gray-300" : "hover:bg-[#f8f9fc]/80 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300"}>
                                <td className="px-2 py-2"><input type="checkbox" checked={r.selected} disabled={r.status === "error"} onChange={(e) => setBeneficiaryReviewRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, selected: e.target.checked } : x)))} /></td>
                                <td className="px-2 py-2 text-[#858796] dark:text-gray-400">{beneficiaryReviewRows.indexOf(r) + 1}</td>
                                <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">{r.row.nama_lengkap || "-"}</td>
                                <td className="px-2 py-2 text-[#5a5c69] dark:text-gray-300">{r.row.tanggal_lahir ? (r.row.tanggal_lahir.includes("-") ? r.row.tanggal_lahir.split("-").reverse().join("/") : r.row.tanggal_lahir) : "-"}</td>
                                <td className="px-2 py-2 text-[#5a5c69] dark:text-gray-300">{r.row.kategori || "-"}</td>
                                <td className="px-2 py-2 text-[#5a5c69] dark:text-gray-300">{r.row.sub_kategori || "-"}</td>
                                <td className="px-2 py-2 text-[#5a5c69] dark:text-gray-300">{r.row.gender || "-"}</td>
                                <td className="px-2 py-2 text-[#5a5c69] dark:text-gray-300">{r.row.nama_kpm || "-"}</td>
                                <td className="px-2 py-2">
                                  <span className={`text-xs font-semibold ${r.status === "valid" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{r.status === "valid" ? "Valid" : "Error"}</span>
                                  {r.errors.length ? <div className="text-rose-600 dark:text-rose-400">{r.errors.join(", ")}</div> : null}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#858796] dark:text-gray-400">
                      <div>Dipilih: <span className="font-bold text-gray-800 dark:text-gray-200">{beneficiaryReviewRows.filter((r) => r.selected && r.status === "valid").length}</span></div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setBeneficiaryReviewPage((p) => Math.max(1, p - 1))} className="px-2.5 py-1 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-[#5a5c69] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50" disabled={beneficiaryReviewPage <= 1}>Prev</button>
                        <button type="button" onClick={() => setBeneficiaryReviewPage((p) => p + 1)} className="px-2.5 py-1 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-[#5a5c69] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50" disabled={beneficiaryReviewPage * 40 >= beneficiaryReviewRows.length}>Next</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-[#e3e6f0] dark:border-gray-700">
                  <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 bg-[#858796] hover:bg-[#717384] text-white rounded-[0.35rem] text-xs font-bold shadow-sm transition-colors">Batal</button>
                  <button type="button" onClick={handleImportSubmit} disabled={importing || !importSppgId || beneficiaryReviewRows.filter((r) => r.selected && r.status === "valid").length === 0} className="px-4 py-2 bg-[#1cc88a] hover:bg-[#17a673] disabled:opacity-50 text-white rounded-[0.35rem] text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors">
                    {importing ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                    {importing ? "Mengimport..." : `Import (${beneficiaryReviewRows.filter((r) => r.selected && r.status === "valid").length})`}
                  </button>
                </div>
              </div>
            </SbModal>
          )}

          {/* --- IMPORT KPM (KELOMPOK) MODAL --- */}
          {showKpmImportModal && (
            <SbModal
              open={showKpmImportModal}
              onClose={() => setShowKpmImportModal(false)}
              title="Import KPM (Kelompok Penerima Manfaat)"
              subtitle="Upload file Excel/CSV untuk import data kelompok dan kontak PIC."
              widthClassName="max-w-4xl"
              className="max-h-[90dvh] overflow-y-auto"
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider">SPPG (wajib)</label>
                  <select value={kpmImportSppgId} onChange={(e) => setKpmImportSppgId(e.target.value)} className="w-full p-2.5 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs text-[#5a5c69] dark:text-gray-200 outline-none focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-colors">
                    <option value="">Pilih SPPG</option>
                    {sppgList.map((s) => <option key={s.id} value={s.id}>{s.nama_sppg}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5a5c69] dark:text-gray-300 uppercase tracking-wider mb-1 block">File Excel/CSV</label>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleKpmFileChange(e.target.files?.[0] || null)} className="w-full text-xs text-[#5a5c69] dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-[0.25rem] file:border-0 file:text-xs file:font-bold file:bg-[#4e73df] file:text-white cursor-pointer" />
                </div>
                {kpmReviewRows.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs text-[#858796] dark:text-gray-400">
                        Header terdeteksi: <span className="font-semibold text-gray-900 dark:text-white">{kpmImportHeaders.join(", ")}</span> — Total {kpmReviewRows.length} baris
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <select value={kpmReviewFilter} onChange={(e) => setKpmReviewFilter(e.target.value as any)} className="bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] px-2.5 py-1 text-xs text-[#5a5c69] dark:text-gray-200 outline-none">
                          <option value="all">Semua</option>
                          <option value="valid">Valid ({kpmReviewRows.filter((r) => r.status === "valid").length})</option>
                          <option value="error">Error ({kpmReviewRows.filter((r) => r.status === "error").length})</option>
                        </select>
                        <label className="flex items-center gap-1 text-xs text-[#5a5c69] dark:text-gray-300">
                          <input type="checkbox" checked={kpmReviewEdit} onChange={(e) => setKpmReviewEdit(e.target.checked)} /> Edit manual
                        </label>
                        <button type="button" onClick={() => setKpmReviewRows((prev) => prev.map((r) => ({ ...r, selected: r.status === "valid" })))} className="px-2.5 py-1 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-[#5a5c69] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          Pilih Valid
                        </button>
                        <button type="button" onClick={() => setKpmReviewRows((prev) => prev.map((r) => ({ ...r, selected: false })))} className="px-2.5 py-1 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-[#5a5c69] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          Batal Pilih
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const filtered = kpmReviewRows.filter((r) => (kpmReviewFilter === "all" ? true : r.status === kpmReviewFilter));
                      const pageSize = 40;
                      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
                      const safePage = Math.min(kpmReviewPage, totalPages);
                      const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
                      return (
                        <>
                          <div className="overflow-x-auto border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem]">
                            <table className="w-full text-xs">
                              <thead className="bg-[#f8f9fc] dark:bg-gray-800/90 text-[#4e73df] dark:text-gray-300 font-bold uppercase border-b border-[#e3e6f0] dark:border-gray-700">
                                <tr>
                                  <th className="px-2 py-2"><input type="checkbox" checked={pageRows.length > 0 && pageRows.every((r) => r.selected)} onChange={(e) => {
                                    const checked = e.target.checked;
                                    setKpmReviewRows((prev) => prev.map((r) => (filtered.includes(r) ? { ...r, selected: checked && r.status === "valid" } : r)));
                                  }} /></th>
                                  <th className="px-2 py-2">No</th>
                                  <th className="px-2 py-2">Jenis</th>
                                  <th className="px-2 py-2">Nama KPM</th>
                                  <th className="px-2 py-2">Kode</th>
                                  <th className="px-2 py-2">Nama PIC</th>
                                  <th className="px-2 py-2">Telpon</th>
                                  <th className="px-2 py-2">Email</th>
                                  <th className="px-2 py-2">Alamat</th>
                                  <th className="px-2 py-2">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e3e6f0] dark:divide-gray-700">
                                {pageRows.map((r) => (
                                  <tr key={r.id} className={r.status === "error" ? "bg-rose-500/5 text-gray-700 dark:text-gray-300" : "hover:bg-[#f8f9fc]/80 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300"}>
                                    <td className="px-2 py-2">
                                      <input type="checkbox" checked={r.selected} disabled={r.status === "error"} onChange={(e) => setKpmReviewRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, selected: e.target.checked } : x)))} />
                                    </td>
                                    <td className="px-2 py-2 text-[#858796] dark:text-gray-400">{kpmReviewRows.indexOf(r) + 1}</td>
                                    {kpmReviewEdit ? (
                                      <>
                                        <td className="px-2 py-2"><input value={r.row.jenis} onChange={(e) => {
                                          const v = e.target.value;
                                          setKpmReviewRows((prev) => prev.map((x) => {
                                            if (x.id !== r.id) return x;
                                            const row = { ...x.row, jenis: v };
                                            const errs = validateKpmReviewRow(row);
                                            return { ...x, row, errors: errs, status: errs.length ? "error" : "valid" };
                                          }));
                                        }} className="w-24 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded px-1.5 py-0.5 text-[#5a5c69] dark:text-gray-200 text-xs" /></td>
                                        <td className="px-2 py-2"><input value={r.row.nama_kelompok} onChange={(e) => {
                                          const v = e.target.value;
                                          setKpmReviewRows((prev) => prev.map((x) => {
                                            if (x.id !== r.id) return x;
                                            const row = { ...x.row, nama_kelompok: v };
                                            const errs = validateKpmReviewRow(row);
                                            return { ...x, row, errors: errs, status: errs.length ? "error" : "valid" };
                                          }));
                                        }} className="w-32 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded px-1.5 py-0.5 text-[#5a5c69] dark:text-gray-200 text-xs" /></td>
                                        <td className="px-2 py-2"><input value={r.row.kode} onChange={(e) => {
                                          const v = e.target.value;
                                          setKpmReviewRows((prev) => prev.map((x) => x.id === r.id ? { ...x, row: { ...x.row, kode: v } } : x));
                                        }} className="w-24 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded px-1.5 py-0.5 text-[#5a5c69] dark:text-gray-200 text-xs" /></td>
                                        <td className="px-2 py-2"><input value={r.row.nama_kader} onChange={(e) => {
                                          const v = e.target.value;
                                          setKpmReviewRows((prev) => prev.map((x) => x.id === r.id ? { ...x, row: { ...x.row, nama_kader: v } } : x));
                                        }} className="w-28 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded px-1.5 py-0.5 text-[#5a5c69] dark:text-gray-200 text-xs" /></td>
                                        <td className="px-2 py-2"><input value={r.row.telepon} onChange={(e) => {
                                          const v = e.target.value;
                                          setKpmReviewRows((prev) => prev.map((x) => x.id === r.id ? { ...x, row: { ...x.row, telepon: v } } : x));
                                        }} className="w-24 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded px-1.5 py-0.5 text-[#5a5c69] dark:text-gray-200 text-xs" /></td>
                                        <td className="px-2 py-2"><input value={r.row.email} onChange={(e) => {
                                          const v = e.target.value;
                                          setKpmReviewRows((prev) => prev.map((x) => x.id === r.id ? { ...x, row: { ...x.row, email: v } } : x));
                                        }} className="w-32 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded px-1.5 py-0.5 text-[#5a5c69] dark:text-gray-200 text-xs" /></td>
                                        <td className="px-2 py-2"><input value={r.row.alamat} onChange={(e) => {
                                          const v = e.target.value;
                                          setKpmReviewRows((prev) => prev.map((x) => x.id === r.id ? { ...x, row: { ...x.row, alamat: v } } : x));
                                        }} className="w-28 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded px-1.5 py-0.5 text-[#5a5c69] dark:text-gray-200 text-xs" /></td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="px-2 py-2 text-[#5a5c69] dark:text-gray-300">{r.row.jenis || "-"}</td>
                                        <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">{r.row.nama_kelompok || "-"}</td>
                                        <td className="px-2 py-2 text-[#5a5c69] dark:text-gray-300 font-mono">{r.row.kode || "-"}</td>
                                        <td className="px-2 py-2 text-[#5a5c69] dark:text-gray-300">{r.row.nama_kader || "-"}</td>
                                        <td className="px-2 py-2 text-[#5a5c69] dark:text-gray-300 font-mono">{r.row.telepon || "-"}</td>
                                        <td className="px-2 py-2 text-[#5a5c69] dark:text-gray-300">{r.row.email || "-"}</td>
                                        <td className="px-2 py-2 text-[#5a5c69] dark:text-gray-300">{r.row.alamat || "-"}</td>
                                      </>
                                    )}
                                    <td className="px-2 py-2">
                                      <span className={`text-xs font-semibold ${r.status === "valid" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{r.status === "valid" ? "Valid" : "Error"}</span>
                                      {r.errors.length ? <div className="text-rose-600 dark:text-rose-400">{r.errors.join(", ")}</div> : null}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[#858796] dark:text-gray-400">
                            <div>Halaman {safePage} / {totalPages} — Dipilih: <span className="font-bold text-gray-800 dark:text-gray-200">{kpmReviewRows.filter((r) => r.selected).length}</span></div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => setKpmReviewPage(Math.max(1, safePage - 1))} className="px-2.5 py-1 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-[#5a5c69] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50" disabled={safePage <= 1}>Prev</button>
                              <button type="button" onClick={() => setKpmReviewPage(Math.min(totalPages, safePage + 1))} className="px-2.5 py-1 bg-[#f8f9fc] dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded-[0.35rem] text-xs font-bold text-[#5a5c69] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50" disabled={safePage >= totalPages}>Next</button>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-[#e3e6f0] dark:border-gray-700">
                  <button type="button" onClick={() => setShowKpmImportModal(false)} className="px-4 py-2 bg-[#858796] hover:bg-[#717384] text-white rounded-[0.35rem] text-xs font-bold shadow-sm transition-colors">Batal</button>
                  <button type="button" onClick={handleKpmImportSubmit} disabled={kpmImporting || !kpmImportSppgId || kpmReviewRows.filter((r) => r.selected && r.status === "valid").length === 0} className="px-4 py-2 bg-[#1cc88a] hover:bg-[#17a673] disabled:opacity-50 text-white rounded-[0.35rem] text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors">
                    {kpmImporting ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                    {kpmImporting ? "Mengimport..." : `Import (${kpmReviewRows.filter((r) => r.selected && r.status === "valid").length})`}
                  </button>
                </div>
              </div>
            </SbModal>
          )}

          {/* Settings Toast Notification */}
          <div className={`print:hidden fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-[0.35rem] border bg-white dark:bg-gray-800 shadow-xl transition-all duration-300 transform ${settingsToast.show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"
            } ${settingsToast.type === "success" ? "border-[#1cc88a] text-[#1cc88a]" : "border-[#e74a3b] text-[#e74a3b]"
            }`}>
            {settingsToast.type === "success" ? (
              <CheckCircle2 className="text-[#1cc88a] flex-shrink-0" size={18} />
            ) : (
              <span className="text-[#e74a3b] flex-shrink-0 font-bold text-base">!</span>
            )}
            <span className="text-xs font-bold text-[#5a5c69] dark:text-gray-200">{settingsToast.message}</span>
          </div>

          {/* --- BOTTOM NAV BAR (MOBILE ONLY) --- */}
          <nav className="print:hidden lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-[#e3e6f0] dark:border-gray-700 pb-[env(safe-area-inset-bottom)] shadow-[0_-0.15rem_1.75rem_0_rgba(58,59,69,0.1)]">
            <div className="flex items-center justify-around h-16 px-2">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${activeTab === "dashboard" ? "text-[#4e73df]" : "text-[#858796] dark:text-gray-400"
                  }`}
              >
                <LayoutDashboard size={20} />
                <span className="text-[10px] font-bold">Dashboard</span>
                {activeTab === "dashboard" && <span className="w-1.5 h-1.5 rounded-full bg-[#4e73df] mt-0.5" />}
              </button>

              <button
                onClick={() => setActiveTab("sppg")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${activeTab === "sppg" ? "text-[#4e73df]" : "text-[#858796] dark:text-gray-400"
                  }`}
              >
                <Database size={20} />
                <span className="text-[10px] font-bold">SPPG</span>
                {activeTab === "sppg" && <span className="w-1.5 h-1.5 rounded-full bg-[#4e73df] mt-0.5" />}
              </button>

              <button
                onClick={() => { setActiveTab("laporan"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="flex flex-col items-center justify-center flex-none w-14 -mt-4"
              >
                <div className="w-12 h-12 rounded-[0.35rem] bg-[#4e73df] shadow-md flex items-center justify-center text-white transition-all hover:bg-[#2e59d9] active:scale-95">
                  <Plus size={22} strokeWidth={3} />
                </div>
                <span className="text-[9px] font-bold text-[#4e73df] mt-1 tracking-tight">Tambah</span>
              </button>

              <button
                onClick={() => setActiveTab("riwayat")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${activeTab === "riwayat" ? "text-[#4e73df]" : "text-[#858796] dark:text-gray-400"
                  }`}
              >
                <Clock size={20} />
                <span className="text-[10px] font-bold">Riwayat</span>
                {activeTab === "riwayat" && <span className="w-1.5 h-1.5 rounded-full bg-[#4e73df] mt-0.5" />}
              </button>

              <button
                onClick={() => setActiveTab("menu")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${activeTab === "menu" ? "text-[#4e73df]" : "text-[#858796] dark:text-gray-400"
                  }`}
              >
                <ChefHat size={20} />
                <span className="text-[10px] font-bold">Menu</span>
                {activeTab === "menu" && <span className="w-1.5 h-1.5 rounded-full bg-[#4e73df] mt-0.5" />}
              </button>

              <button
                onClick={() => setActiveTab("pengaturan")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${activeTab === "pengaturan" ? "text-[#4e73df]" : "text-[#858796] dark:text-gray-400"
                  }`}
              >
                <Settings size={20} />
                <span className="text-[10px] font-bold">Atur</span>
                {activeTab === "pengaturan" && <span className="w-1.5 h-1.5 rounded-full bg-[#4e73df] mt-0.5" />}
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Print-only sticker sheet — body-level SIBLING of #app-root (must NOT be
        inside it, since #app-root is display:none during sticker print) */}
      {activeTab === "stiker" && (
        <div id="sticker-print-root" className="hidden print:block">
          {standaloneStikerTemplate === "grozziie" ? (
            <StickerRollGrozziie
              widthMm={standaloneGrozziieWidth}
              heightMm={standaloneGrozziieHeight}
              pairMode={standaloneGrozziiePairMode}
              sppgName={standaloneStikerSppg}
              subWilayah={standaloneStikerSubWilayah}
              menu={standaloneStikerMenu}
              tanggal={standaloneStikerTanggal}
              jamSelesai={standaloneStikerJamSelesai}
              jamBatas={standaloneStikerJamBatas}
              waPengaduan={standaloneStikerWaPengaduan}
              tiktokPengaduan={standaloneStikerTiktok}
              igPengaduan={standaloneStikerInstagram}
            />
          ) : standaloneStikerTemplate === "se2026" ? (
            <StickerPrintSheetSE
              paperSize={standaloneStikerPaperSize}
              capacity={standaloneStikerCapacity}
              pairMode={standaloneStikerSEPairMode}
              sppgName={standaloneStikerSppg}
              subWilayah={standaloneStikerSubWilayah}
              menu={standaloneStikerMenu}
              tanggal={standaloneStikerTanggal}
              jamBatas={standaloneStikerJamBatas}
              waPengaduan={standaloneStikerWaPengaduan}
              tiktokPengaduan={standaloneStikerTiktok}
              igPengaduan={standaloneStikerInstagram}
            />
          ) : (
            <StickerPrintSheet
              paperSize={standaloneStikerPaperSize}
              capacity={standaloneStikerCapacity}
              mode={standaloneStikerMode}
              countBesar={standaloneStikerCountBesar}
              sppgName={standaloneStikerSppg}
              menu={standaloneStikerMenu}
              tanggal={standaloneStikerTanggal}
              jamSelesai={standaloneStikerJamSelesai}
              jamBatas={standaloneStikerJamBatas}
              giziBesar={standaloneStikerGiziBesar}
              giziKecil={standaloneStikerGiziKecil}
            />
          )}
        </div>
      )}
    </>
  );
}
