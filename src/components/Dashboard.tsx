"use client";

import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from "react";
import { useLaporanRealtime } from "@/lib/hooks/useLaporanRealtime";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  Menu,
  X,
  Users,
  Utensils,
  UtensilsCrossed,
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
} from "lucide-react";
import WeeklyReportView from "@/components/WeeklyReportView";
import StickerPrintSheet from "@/components/StickerPrintSheet";
import StickerPrintSheetSE from "@/components/StickerPrintSheetSE";
import StickerRollGrozziie from "@/components/StickerRollGrozziie";
import StickerPreview from "@/components/StickerPreview";
import MBGMaker from "@/components/MBGMaker";
import { directPrintElementViaBle, isWebBluetoothSupported } from "@/lib/thermal-ble";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Interfaces
interface Report {
  id: string;
  date: string;
  sppgName: string;
  location: string;
  totalBeneficiaries: number;
  largePortions: number;
  smallPortions: number;
  status: "Draft" | "Approved" | "Sent";
  menu: string;
  picName: string;
  picPhone: string;
  distributionTime: string;
  temperatureServed: string; // Celsius
  notes?: string;
  photoUrl?: string;
  posterUrl?: string;
  balita?: number;
  bumil?: number;
  busui?: number;
  giziBesar?: { Energi: number; Protein: number; Lemak: number; Karbohidrat: number; Serat: number };
  giziKecil?: { Energi: number; Protein: number; Lemak: number; Karbohidrat: number; Serat: number };
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
        temperatureServed: "62Â°C",
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

  const [activeTab, setActiveTab] = useState<"dashboard" | "laporan" | "mingguan" | "pengaturan" | "sppg" | "riwayat" | "stiker" | "menu">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailLoadingAction, setDetailLoadingAction] = useState<"download" | "copy" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // SPPG States & Interfaces
  interface SppgData {
    id?: string;
    nama_sppg: string;
    porsi_kecil: number;
    porsi_besar: number;
    balita: number;
    bumil: number;
    busui: number;
    kepala_sppg: string;
    pengawas_gizi: string;
    kontak_pengaduan?: string;
    tiktok?: string;
    instagram?: string;
    sub_wilayah?: string;
  }
  const [sppgList, setSppgList] = useState<SppgData[]>([]);
  const [loadingSppg, setLoadingSppg] = useState(false);
  const [sppgForm, setSppgForm] = useState<SppgData>({
    nama_sppg: "",
    porsi_kecil: 0,
    porsi_besar: 0,
    balita: 0,
    bumil: 0,
    busui: 0,
    kepala_sppg: "",
    pengawas_gizi: "",
    kontak_pengaduan: "",
    tiktok: "",
    instagram: "",
    sub_wilayah: ""
  });
  const [editingSppgId, setEditingSppgId] = useState<string | null>(null);
  const [showSppgModal, setShowSppgModal] = useState(false);
  const [sppgSubmitting, setSppgSubmitting] = useState(false);
  const [sppgSearch, setSppgSearch] = useState("");

  // Standalone Stiker Tab States
  const [standaloneStikerTemplate, setStandaloneStikerTemplate] = useState<"se2026" | "classic" | "grozziie">("grozziie");
  const [standaloneStikerSEPairMode, setStandaloneStikerSEPairMode] = useState<"pair" | "left_only" | "right_only">("pair");
  const [standaloneGrozziieWidth, setStandaloneGrozziieWidth] = useState<number>(78);
  const [standaloneGrozziieHeight, setStandaloneGrozziieHeight] = useState<number>(100);
  const [standaloneGrozziiePairMode, setStandaloneGrozziiePairMode] = useState<"both" | "left_only" | "right_only">("both");
  const [standaloneGrozziieXOffset, setStandaloneGrozziieXOffset] = useState<number>(0);
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
  const [standaloneStikerJamBatas, setStandaloneStikerJamBatas] = useState<string>("10:00");
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

      const w = standaloneGrozziieWidth || 130;
      const h = standaloneGrozziieHeight || 80;

      // Print each rendered label sequentially
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        setBleStatusText(`Mencetak label ${i + 1} dari ${pages.length}...`);
        await directPrintElementViaBle(pageEl, w, h, (msg) => setBleStatusText(msg), {
          xOffsetDots: Math.round(standaloneGrozziieXOffset * 8), // convert mm to dots
          direction: standaloneGrozziieDirection,
          rotate90: standaloneGrozziieRotate90,
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
        widthMm: standaloneGrozziieWidth || 130,
        heightMm: standaloneGrozziieHeight || 80,
        format: [standaloneGrozziieWidth || 130, standaloneGrozziieHeight || 80] as [number, number],
      };
    }
    if (standaloneStikerPaperSize === "a3") return { widthMm: 297, heightMm: 420, format: "a3" as const };
    if (standaloneStikerPaperSize === "f4") return { widthMm: 215, heightMm: 330, format: [215, 330] as [number, number] };
    return { widthMm: 210, heightMm: 297, format: "a4" as const };
  };

  const handlePrintSticker = () => {
    // Dynamically inject @page rule for Grozziie custom dimensions if active
    let dynamicStyleEl = document.getElementById("dynamic-grozziie-page-style");
    if (standaloneStikerTemplate === "grozziie") {
      const w = standaloneGrozziieWidth || 130;
      const h = standaloneGrozziieHeight || 80;
      if (!dynamicStyleEl) {
        dynamicStyleEl = document.createElement("style");
        dynamicStyleEl.id = "dynamic-grozziie-page-style";
        document.head.appendChild(dynamicStyleEl);
      }
      dynamicStyleEl.innerHTML = `
        @media print {
          @page {
            size: ${w}mm ${h}mm !important;
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          #sticker-print-root {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .grozziie-label-page {
            width: ${w}mm !important;
            height: ${h}mm !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `;
    } else {
      if (dynamicStyleEl) {
        dynamicStyleEl.remove();
      }
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

  // Toast notification state for settings
  const [settingsToast, setSettingsToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false, message: "", type: "success"
  });
  const showSettingsToast = (message: string, type: "success" | "error" = "success") => {
    setSettingsToast({ show: true, message, type });
    setTimeout(() => setSettingsToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // Gemini API Key state
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState("");
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);
  const [showGeminiKeySecret, setShowGeminiKeySecret] = useState(false);

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
    loadKey();
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

  const fetchSppgList = useCallback(async () => {
    setLoadingSppg(true);
    try {
      const res = await fetch("/api/sppg");
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data)) {
        const list: SppgData[] = json.data;
        setSppgList(list);
        if (list.length > 0) {
          // Otomatis sinkronkan form stiker dengan SPPG pertama dari database jika masih default
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
      }
    } catch (err) {
      console.error("Gagal mengambil data SPPG:", err);
      showSettingsToast("Gagal memuat data SPPG. Periksa koneksi.", "error");
    } finally {
      setLoadingSppg(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSppgList();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchSppgList]);

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

  const handleSaveSppg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sppgForm.nama_sppg.trim()) {
      alert("Nama SPPG harus diisi!");
      return;
    }
    setSppgSubmitting(true);
    try {
      const method = editingSppgId ? "PUT" : "POST";
      const res = await fetch("/api/sppg", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSppgId ? { id: editingSppgId, ...sppgForm } : sppgForm)
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        showSettingsToast(
          editingSppgId ? "Data SPPG berhasil diperbarui!" : "Data SPPG baru berhasil ditambahkan!",
          "success"
        );
        setSppgForm({
          nama_sppg: "",
          porsi_kecil: 0,
          porsi_besar: 0,
          balita: 0,
          bumil: 0,
          busui: 0,
          kepala_sppg: "",
          pengawas_gizi: "",
          kontak_pengaduan: "",
          tiktok: "",
          instagram: "",
          sub_wilayah: ""
        });
        setEditingSppgId(null);
        setShowSppgModal(false);
        fetchSppgList();
      } else {
        alert("Gagal menyimpan data SPPG: " + json.message);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
      showSettingsToast(errMsg, "error");
    } finally {
      setSppgSubmitting(false);
    }
  };

  const handleEditSppg = (sppg: SppgData) => {
    if (!sppg.id) return;
    setEditingSppgId(sppg.id);
    setSppgForm({
      nama_sppg: sppg.nama_sppg,
      porsi_kecil: sppg.porsi_kecil,
      porsi_besar: sppg.porsi_besar,
      balita: sppg.balita,
      bumil: sppg.bumil,
      busui: sppg.busui,
      kepala_sppg: sppg.kepala_sppg || "",
      pengawas_gizi: sppg.pengawas_gizi || "",
      kontak_pengaduan: sppg.kontak_pengaduan || "",
      tiktok: sppg.tiktok || "",
      instagram: sppg.instagram || "",
      sub_wilayah: sppg.sub_wilayah || ""
    });
    setShowSppgModal(true);
  };

  const handleDeleteSppg = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data SPPG ini?")) return;

    try {
      const res = await fetch(`/api/sppg?id=${id}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        showSettingsToast("Data SPPG berhasil dihapus!", "success");
        fetchSppgList();
      } else {
        alert("Gagal menghapus data SPPG: " + json.message);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
      alert("Error: " + errMsg);
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
        className={`min-h-screen bg-slate-900 text-slate-100 flex font-sans antialiased ${activeTab === "stiker" ? "print:hidden" : ""
          }`}
      >
        {/* Dynamic Futuristic Gradient Background Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_45%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_40%)] pointer-events-none" />

        {/* --- SIDEBAR FOR DESKTOP (AUTO-COLLAPSIBLE ON HOVER / EXPANDABLE) --- */}
        <aside
          className={`group fixed inset-y-0 left-0 z-40 w-64 lg:w-20 lg:hover:w-64 bg-slate-950/90 backdrop-blur-xl border-r border-slate-800/80 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } lg:translate-x-0 transition-all duration-300 ease-in-out flex flex-col justify-between overflow-hidden shadow-2xl`}
        >
          <div>
            {/* Logo Brand */}
            <div className="sidebar-logo-header h-20 flex items-center px-5 border-b border-slate-900 bg-slate-950/30 overflow-hidden whitespace-nowrap">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
                  <UtensilsCrossed size={20} className="animate-pulse" />
                </div>
                <div className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 min-w-0">
                  <h1 className="font-bold text-lg leading-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent truncate">
                    MBG Reporter
                  </h1>
                  <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase truncate">
                    Sistem SPPG
                  </p>
                </div>
              </div>
              {/* Close sidebar on Mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto max-h-[calc(100vh-10rem)]">
              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "dashboard"
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                title="Dashboard Utama"
              >
                <LayoutDashboard size={20} className="shrink-0" />
                <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 text-xs font-semibold">Dashboard Utama</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("laporan");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "laporan"
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                title="Laporan Harian"
              >
                <ClipboardList size={20} className="shrink-0" />
                <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 text-xs font-semibold">Laporan Harian</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("mingguan");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "mingguan"
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                title="Laporan Mingguan"
              >
                <FileText size={20} className="shrink-0" />
                <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 text-xs font-semibold">Laporan Mingguan</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("sppg");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "sppg"
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                title="Data SPPG"
              >
                <Database size={20} className="shrink-0" />
                <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 text-xs font-semibold">Data SPPG</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("riwayat");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "riwayat"
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                title="Riwayat Laporan"
              >
                <Clock size={20} className="shrink-0" />
                <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 text-xs font-semibold">Riwayat Laporan</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("stiker");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "stiker"
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                title="Stiker Ompreng"
              >
                <Printer size={20} className="shrink-0" />
                <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 text-xs font-semibold">Stiker Ompreng</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("menu");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "menu"
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                title="MBG Maker"
              >
                <ChefHat size={20} className="shrink-0" />
                <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 text-xs font-semibold">MBG Maker</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("pengaturan");
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 whitespace-nowrap overflow-hidden ${activeTab === "pengaturan"
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                title="Pengaturan"
              >
                <Settings size={20} className="shrink-0" />
                <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 text-xs font-semibold">Pengaturan</span>
              </button>
            </nav>
          </div>

          {/* Profile Card Bottom */}
          <div className="p-3 border-t border-slate-900 bg-slate-950/20 overflow-hidden">
            <div className="flex items-center gap-3 p-2 bg-slate-900/40 rounded-xl border border-slate-800/40 overflow-hidden whitespace-nowrap">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center font-bold text-white shadow-inner shrink-0">
                {userProfile.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="min-w-0 flex-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                <h4 className="text-xs font-semibold text-white truncate">{userProfile.name}</h4>
                <p className="text-[10px] text-slate-400 truncate">{userProfile.email}</p>
              </div>
              <button className="text-slate-400 hover:text-red-400 transition-colors p-1 lg:opacity-0 lg:group-hover:opacity-100 duration-300" title="Keluar">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* Backdrop for Mobile Sidebar */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}

        {/* --- CONTENT CONTAINER --- */}
        <div className="flex-1 lg:pl-20 flex flex-col min-w-0 relative z-10 transition-all duration-300">
          {/* --- HEADER --- */}
          <header className="h-20 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20 px-4 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-300 hover:bg-slate-800"
              >
                <Menu size={22} />
              </button>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white capitalize">
                  {activeTab === "dashboard" && "Dashboard Utama"}
                  {activeTab === "laporan" && "Manajemen Laporan"}
                  {activeTab === "pengaturan" && "Pengaturan Sistem"}
                  {activeTab === "sppg" && "Data Master SPPG"}
                  {activeTab === "riwayat" && "Riwayat Laporan"}
                  {activeTab === "stiker" && "Generator Stiker Ompreng"}
                  {activeTab === "menu" && "MBG Maker"}
                </h2>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Sistem Pemantauan Makanan Bergizi Gratis (MBG) & Satuan Pelayanan Peningkatan Gizi (SPPG)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Live indicator */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sistem Terhubung</span>
              </div>

              <button
                onClick={async () => {
                  if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === "accepted") { setDeferredPrompt(null); setIsStandalone(true); }
                  }
                }}
                className="p-2.5 rounded-xl bg-slate-800/85 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors relative"
              >
                {deferredPrompt ? <Download size={18} /> : <Bell size={18} />}
                {deferredPrompt ? (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] font-bold text-white shadow-lg shadow-emerald-500/30 animate-pulse">
                    +
                  </span>
                ) : (
                  !isStandalone && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </button>

              {/* Theme Switcher Toggle (Light / Dark Mode) */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-slate-800/85 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-sm"
                title={theme === "dark" ? "Ganti ke Mode Terang (Light Mode)" : "Ganti ke Mode Gelap (Dark Mode)"}
                aria-label="Toggle Theme"
              >
                {theme === "dark" ? (
                  <Sun size={18} className="text-amber-400 hover:rotate-45 transition-transform" />
                ) : (
                  <Moon size={18} className="text-indigo-600 hover:-rotate-12 transition-transform" />
                )}
              </button>

              <div className="h-10 w-px bg-slate-800 hidden sm:block" />

              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-400">Wilayah Tugas</p>
                <p className="text-xs font-semibold text-indigo-400">{userProfile.region}</p>
              </div>
            </div>
          </header>

          {/* --- MAIN MAIN CONTENT AREA --- */}
          <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-24 lg:pb-0">
            {/* TAB 1: DASHBOARD UTAMA */}
            {activeTab === "dashboard" && (
              <>
                {/* ROW 1: KEY METRICS - CLEAN & CRISP */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 hover:border-indigo-500/30 rounded-2xl flex items-center gap-3.5 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 group">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Users size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">Total Penerima</p>
                      <h4 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">{metrics.total.toLocaleString("id-ID")}</h4>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 hover:border-emerald-500/30 rounded-2xl flex items-center gap-3.5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 group">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <ClipboardList size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">Laporan Hari Ini</p>
                      <h4 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">{todayCount}</h4>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 hover:border-violet-500/30 rounded-2xl flex items-center gap-3.5 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5 group">
                    <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Database size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">SPPG Aktif</p>
                      <h4 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">{activeSppgCount}</h4>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 hover:border-amber-500/30 rounded-2xl flex items-center gap-3.5 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 group">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <UtensilsCrossed size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">Total Porsi</p>
                      <h4 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">{(metrics.large + metrics.small).toLocaleString("id-ID")}</h4>
                    </div>
                  </div>
                </div>

                {/* ROW 2: BREAKDOWN - CLEAN & MODERN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Portion breakdown */}
                  <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span>Distribusi Porsi Makanan</span>
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">Sekolah (PAUD-SMA)</span>
                      </div>
                      <div className="space-y-4 pt-1">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-indigo-400">Porsi Besar (SD 4-6, SMP, SMA)</span>
                            <span className="text-xs font-bold text-white font-mono">{metrics.large.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500"
                              style={{ width: `${metrics.large + metrics.small > 0 ? (metrics.large / (metrics.large + metrics.small)) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-emerald-400">Porsi Kecil (PAUD-TK, SD 1-3)</span>
                            <span className="text-xs font-bold text-white font-mono">{metrics.small.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${metrics.large + metrics.small > 0 ? (metrics.small / (metrics.large + metrics.small)) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PMT B3 breakdown */}
                  <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>Penerima PMT B3 (Ibu & Balita)</span>
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">B3 Rentan Gizi</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2.5 pt-1">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Balita</span>
                          <span className="text-base sm:text-lg font-extrabold text-white mt-0.5 block">{b3Totals.balita.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Bumil</span>
                          <span className="text-base sm:text-lg font-extrabold text-white mt-0.5 block">{b3Totals.bumil.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
                          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Busui</span>
                          <span className="text-base sm:text-lg font-extrabold text-white mt-0.5 block">{b3Totals.busui.toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ROW 3: RECENT REPORTS */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Laporan Terbaru</h4>
                    <button
                      onClick={() => setActiveTab("riwayat")}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Lihat Semua &rarr;
                    </button>
                  </div>
                  {reportsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-full p-3 bg-slate-900/50 border border-slate-800 rounded-xl animate-pulse">
                          <div className="h-3 bg-slate-800 rounded w-2/3 mb-2" />
                          <div className="h-2 bg-slate-800 rounded w-1/3" />
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
                            className="w-full flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl transition-all text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white truncate">{report.sppgName}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{report.date} &middot; {report.totalBeneficiaries.toLocaleString("id-ID")} penerima</p>
                            </div>
                            <span className={`shrink-0 ml-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${report.status === "Draft" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                              report.status === "Approved" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                                "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              }`}>
                              {report.status}
                            </span>
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-xs text-slate-500">Belum ada laporan tersedia.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB 2: LAPORAN DETAIL */}
            {activeTab === "laporan" && (
              <div className="space-y-6">
                <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-2">
                    {editingReportId ? "Edit Laporan" : "Form Pembuatan Laporan Baru"}
                  </h3>
                  <p className="text-xs text-slate-400 mb-6">
                    {editingReportId
                      ? "Ubah data laporan yang sudah ada. Status laporan tidak akan berubah."
                      : "Input data distribusi makanan harian dari SPPG. Harap verifikasi jumlah porsi sebelum disimpan."
                    }
                  </p>

                  <form onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* --- LEFT COLUMN: INFO & BENEFICIARIES (7 COLS) --- */}
                      <div className="lg:col-span-7 space-y-6">
                        {/* Section 1: Data Laporan */}
                        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
                            <span className="w-1.5 h-4 rounded-full bg-indigo-500" />
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Informasi Umum SPPG</h4>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-400">Satuan Pelayanan SPPG</label>
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
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50 text-xs cursor-pointer"
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
                                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                                />
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-400">Tanggal Distribusi</label>
                              <input
                                type="date"
                                value={formTanggal}
                                onChange={(e) => setFormTanggal(e.target.value)}
                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs [color-scheme:dark] cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-400">Detail Menu Makanan</label>
                              <textarea
                                placeholder="Contoh: Nasi Putih, Ayam Goreng Saos Padang, Tumis Buncis Wortel, Semangka..."
                                rows={2}
                                value={formMenu}
                                onChange={(e) => setFormMenu(e.target.value)}
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Jumlah Penerima */}
                        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-4 rounded-full bg-emerald-500" />
                              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Jumlah Penerima Manfaat</h4>
                            </div>
                            <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-[11px]">
                              Total: {(formPorsiBesar || 0) + (formPorsiKecil || 0) + (formBalita || 0) + (formBumil || 0) + (formBusui || 0)} Orang
                            </div>
                          </div>

                          {/* Sekolah */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-slate-400">Porsi Besar (SD-SMP)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={formPorsiBesar || ""}
                                onChange={(e) => setFormPorsiBesar(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                                min="0"
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-slate-400">Porsi Kecil (PAUD-TK)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={formPorsiKecil || ""}
                                onChange={(e) => setFormPorsiKecil(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                                min="0"
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                              />
                            </div>
                          </div>

                          {/* B3 Rentan */}
                          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-800/50">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-amber-400">PMT Balita</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={formBalita || ""}
                                onChange={(e) => setFormBalita(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                                min="0"
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-amber-500 text-xs"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-rose-400">PMT Bumil</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={formBumil || ""}
                                onChange={(e) => setFormBumil(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                                min="0"
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-rose-500 text-xs"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-purple-400">PMT Busui</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={formBusui || ""}
                                onChange={(e) => setFormBusui(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                                min="0"
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-purple-500 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* --- RIGHT COLUMN: GIZI, PHOTO & ACTIONS (5 COLS) --- */}
                      <div className="lg:col-span-5 space-y-6">
                        {/* Nutrition Card */}
                        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
                            <span className="w-1.5 h-4 rounded-full bg-amber-400" />
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Kandungan Gizi</h4>
                          </div>

                          {/* Porsi Besar */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-indigo-400 block">Porsi Besar (SD-SMP)</span>
                            <div className="grid grid-cols-5 gap-1.5">
                              <div className="space-y-1">
                                <label className="text-[9px] font-semibold text-slate-500 block">Energi</label>
                                <input
                                  type="number"
                                  value={formGiziBesar.Energi || ""}
                                  onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Energi: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-semibold text-slate-500 block">Prot</label>
                                <input
                                  type="number"
                                  value={formGiziBesar.Protein || ""}
                                  onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Protein: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-semibold text-slate-500 block">Lmk</label>
                                <input
                                  type="number"
                                  value={formGiziBesar.Lemak || ""}
                                  onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Lemak: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-semibold text-slate-500 block">Krb</label>
                                <input
                                  type="number"
                                  value={formGiziBesar.Karbohidrat || ""}
                                  onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Karbohidrat: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-semibold text-slate-500 block">Srt</label>
                                <input
                                  type="number"
                                  value={formGiziBesar.Serat || ""}
                                  onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Serat: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Porsi Kecil */}
                          <div className="space-y-2 pt-2 border-t border-slate-800/50">
                            <span className="text-[11px] font-bold text-emerald-400 block">Porsi Kecil (PAUD-TK)</span>
                            <div className="grid grid-cols-5 gap-1.5">
                              <div className="space-y-1">
                                <label className="text-[9px] font-semibold text-slate-500 block">Energi</label>
                                <input
                                  type="number"
                                  value={formGiziKecil.Energi || ""}
                                  onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Energi: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-semibold text-slate-500 block">Prot</label>
                                <input
                                  type="number"
                                  value={formGiziKecil.Protein || ""}
                                  onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Protein: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-semibold text-slate-500 block">Lmk</label>
                                <input
                                  type="number"
                                  value={formGiziKecil.Lemak || ""}
                                  onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Lemak: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-semibold text-slate-500 block">Krb</label>
                                <input
                                  type="number"
                                  value={formGiziKecil.Karbohidrat || ""}
                                  onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Karbohidrat: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-semibold text-slate-500 block">Srt</label>
                                <input
                                  type="number"
                                  value={formGiziKecil.Serat || ""}
                                  onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Serat: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Photo Upload & Action Buttons */}
                        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 block">Foto Makanan Hari Ini</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-xs cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white"
                            />
                            {formImageBase64 ? (
                              <div className="flex items-center gap-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={formImageBase64} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-emerald-500/30" />
                                <span className="text-[11px] text-emerald-400 font-semibold">Foto baru siap diunggah</span>
                              </div>
                            ) : editingExistingPhotoUrl ? (
                              <div className="flex items-center gap-3 p-2 bg-slate-950 border border-slate-800 rounded-xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={editingExistingPhotoUrl} alt="Foto saat ini" className="w-12 h-12 object-cover rounded-lg" />
                                <span className="text-[11px] text-slate-400">Foto saat ini dipertahankan</span>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={resetReportForm}
                              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-colors"
                            >
                              {editingReportId ? "Batal" : "Reset"}
                            </button>
                            <button
                              type="button"
                              disabled={formIsSubmitting}
                              onClick={handleSubmitReport}
                              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all ${formIsSubmitting ? "bg-indigo-700/60 cursor-not-allowed" : "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-600/20"
                                }`}
                            >
                              {formIsSubmitting && <RefreshCw size={14} className="animate-spin" />}
                              <span>{formIsSubmitting ? "Memproses..." : editingReportId ? "Simpan Perubahan" : "Pratinjau Laporan"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Laporan Statistics Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl">
                    <h4 className="font-bold text-white text-sm mb-4">Laporan Terbaru (Hari Ini)</h4>
                    <div className="space-y-3">
                      {reports.slice(0, 3).map((rep) => (
                        <div key={rep.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-white">{rep.sppgName}</p>
                            <p className="text-[10px] text-slate-400">{rep.totalBeneficiaries} Penerima â€¢ {rep.location}</p>
                          </div>
                          <span className="text-[10px] font-semibold text-indigo-400">{rep.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm mb-2">Persentase Pengiriman Laporan</h4>
                      <p className="text-xs text-slate-400">Total laporan yang telah berhasil dikirim (Sent) ke pusat.</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Progress Laporan</span>
                        <span>
                          {Math.round(
                            (reports.filter((r) => r.status === "Sent").length / reports.length) * 100
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(reports.filter((r) => r.status === "Sent").length / reports.length) * 100
                              }%`
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 text-center">
                        {reports.filter((r) => r.status === "Sent").length} dari {reports.length} laporan selesai dikirim.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: RIWAYAT LAPORAN */}
            {activeTab === "riwayat" && (
              <div className="space-y-6">
                <div className="bg-slate-950/40 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Header Panel */}
                  <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-white text-base">Semua Laporan SPPG</h4>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">Total: {reports.length}</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">Draft: {reports.filter(r => r.status === "Draft").length}</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">Terkirim: {reports.filter(r => r.status === "Sent" || r.status === "Approved").length}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                          type="text"
                          placeholder="Cari SPPG / menu..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-4 py-2 w-full sm:w-60 bg-slate-900 border border-slate-800 focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-xl text-slate-200 text-xs outline-none transition-colors"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <Filter className="absolute left-3 text-slate-500 pointer-events-none" size={14} />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-xs focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50 outline-none cursor-pointer appearance-none"
                        >
                          <option value="All">Semua Status</option>
                          <option value="Draft">Draft</option>
                          <option value="Approved">Approved</option>
                          <option value="Sent">Sent</option>
                        </select>
                        <div className="absolute right-3 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-400" />
                      </div>
                      <button
                        onClick={toggleSort}
                        className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-xs font-medium"
                        title="Urutkan Tanggal"
                      >
                        <ArrowUpDown size={14} />
                        <span className="hidden sm:inline">{sortDirection === "asc" ? "Terlama" : "Terbaru"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {filteredReports.length > 0 ? (
                      filteredReports.map((report) => {
                        const dbRow = dbReports.find((r) => r.id === report.id);
                        const photoUrl = dbRow?.photo_url || report.photoUrl;

                        return (
                          <div
                            key={report.id}
                            className="group bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between space-y-3"
                          >
                            {/* Elegant Image Frame */}
                            <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-slate-950 border border-slate-800/90 group-hover:border-slate-700 transition-colors shadow-inner flex items-center justify-center">
                              {photoUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={photoUrl}
                                  alt={`Foto ${report.menu}`}
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1.5 text-slate-600">
                                  <UtensilsCrossed size={26} className="text-slate-700" />
                                  <span className="text-[10px] font-medium italic text-slate-500">Tidak ada foto</span>
                                </div>
                              )}

                              {/* Status Badge Top Right */}
                              <div className="absolute top-2.5 right-2.5 backdrop-blur-md bg-slate-950/75 border border-slate-800/80 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-slate-200 flex items-center gap-1.5 shadow-md">
                                <span className={`w-1.5 h-1.5 rounded-full ${report.status === "Draft" ? "bg-amber-400" : report.status === "Approved" ? "bg-indigo-400" : "bg-emerald-400"
                                  }`} />
                                <span>{report.status}</span>
                              </div>

                              {/* Subtle Overlay Gradient */}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
                            </div>

                            {/* Date & Menu Title */}
                            <div className="space-y-1 px-0.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400">
                                <Calendar size={13} className="shrink-0 text-indigo-400" />
                                <span>{report.date}</span>
                              </div>

                              <h5 className="font-bold text-white text-sm leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors" title={report.menu}>
                                {toTitleCase(report.menu || "-")}
                              </h5>

                              {report.sppgName && (
                                <p className="text-[11px] text-slate-400 font-medium truncate pt-0.5">
                                  {report.sppgName}
                                </p>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                              <button
                                onClick={() => setSelectedReport(report)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all active:scale-95"
                                title="Lihat Detail"
                              >
                                <Eye size={14} />
                                <span>Lihat</span>
                              </button>
                              <button
                                onClick={() => openStickerFromReport(report)}
                                className="p-2 bg-slate-900 hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-400 border border-slate-800 hover:border-indigo-500/30 rounded-xl text-xs transition-all active:scale-95"
                                title="Cetak Stiker Ompreng"
                              >
                                <Printer size={14} />
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
                                className="p-2 bg-slate-900 hover:bg-amber-600/20 text-slate-400 hover:text-amber-400 border border-slate-800 hover:border-amber-500/30 rounded-xl text-xs transition-all active:scale-95"
                                title="Edit Laporan"
                              >
                                <Edit size={14} />
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
                                className="p-2 bg-slate-900 hover:bg-red-600/20 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 rounded-xl text-xs transition-all active:scale-95"
                                title="Hapus Laporan"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-16 px-6 flex flex-col items-center justify-center text-center space-y-3 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800/80 my-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-white">Belum Ada Laporan</h5>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm">
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
                          className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>Buat Laporan Baru</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MASTER DATA SPPG */}
            {activeTab === "sppg" && (
              <div className="space-y-6">
                {/* Tabel SPPG */}
                <div className="bg-slate-900/80 border border-slate-800 p-5 sm:p-6 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <Database size={18} className="text-indigo-400" />
                        <span>Data Master SPPG</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Total terdaftar: {sppgList.length} SPPG</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                          type="text"
                          placeholder="Cari nama SPPG..."
                          value={sppgSearch}
                          onChange={(e) => setSppgSearch(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-xl text-slate-200 text-xs outline-none w-full sm:w-56"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setEditingSppgId(null);
                          setSppgForm({ nama_sppg: "", porsi_kecil: 0, porsi_besar: 0, balita: 0, bumil: 0, busui: 0, kepala_sppg: "", pengawas_gizi: "" });
                          setShowSppgModal(true);
                        }}
                        className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                      >
                        <Plus size={14} />
                        <span className="hidden sm:inline">Tambah SPPG</span>
                      </button>
                    </div>
                  </div>

                  {loadingSppg ? (
                    <div className="py-16 flex flex-col justify-center items-center text-slate-400 text-xs gap-2">
                      <RefreshCw className="animate-spin text-indigo-400" size={20} />
                      <span>Memuat data master SPPG...</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-900/60">
                            <th className="py-3 px-4">Nama SPPG</th>
                            <th className="py-3 px-4 text-center">Kepala SPPG</th>
                            <th className="py-3 px-4 text-center">Pengawas Gizi</th>
                            <th className="py-3 px-4 text-center">Porsi (Besar / Kecil)</th>
                            <th className="py-3 px-4 text-center">PMT (Balita / Bumil / Busui)</th>
                            <th className="py-3 px-4 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {sppgList.filter(s => s.nama_sppg.toLowerCase().includes(sppgSearch.toLowerCase())).length > 0 ? (
                            sppgList
                              .filter(s => s.nama_sppg.toLowerCase().includes(sppgSearch.toLowerCase()))
                              .map((sppg) => (
                                <tr key={sppg.id} className="text-xs text-slate-300 hover:bg-slate-900/40 transition-colors">
                                  <td className="py-3.5 px-4 font-semibold text-white">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                      <span>{sppg.nama_sppg}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className="text-slate-300 font-mono text-[11px]">{sppg.kepala_sppg || "-"}</span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className="text-slate-300 font-mono text-[11px]">{sppg.pengawas_gizi || "-"}</span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">{sppg.porsi_besar}</span>
                                    <span className="text-slate-600 mx-1">/</span>
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">{sppg.porsi_kecil}</span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className="text-amber-400 font-bold">{sppg.balita}</span>
                                    <span className="text-slate-600 mx-1">Â·</span>
                                    <span className="text-rose-400 font-bold">{sppg.bumil}</span>
                                    <span className="text-slate-600 mx-1">Â·</span>
                                    <span className="text-purple-400 font-bold">{sppg.busui}</span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleEditSppg(sppg)}
                                        className="p-1.5 bg-slate-900 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors"
                                        title="Edit SPPG"
                                      >
                                        <Edit size={13} />
                                      </button>
                                      <button
                                        onClick={() => sppg.id && handleDeleteSppg(sppg.id)}
                                        className="p-1.5 bg-slate-900 hover:bg-red-600/20 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                                        title="Hapus SPPG"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-12 px-4 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Database size={24} className="text-slate-600" />
                                  <span>Tidak ada data SPPG yang sesuai kata kunci.</span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* TAB: LAPORAN MINGGUAN */}
            {activeTab === "mingguan" && (
              <WeeklyReportView reports={dbReports} sppgList={sppgList} />
            )}

            {/* TAB 4: PENGATURAN */}
            {activeTab === "pengaturan" && (
              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-8">
                {/* System Config */}
                <div className="space-y-6">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Shield size={18} className="text-indigo-400" />
                    <span>Sistem & Sinkronisasi</span>
                  </h3>

                  <div className="space-y-4">
                    {/* Theme Preference */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 gap-3">
                      <div className="space-y-1 pr-4">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          {theme === "dark" ? <Moon size={14} className="text-indigo-400" /> : <Sun size={14} className="text-amber-400" />}
                          Tema Tampilan Antarmuka
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Pilih antara Mode Gelap (Dark Mode) atau Mode Terang (Light Mode) sesuai kenyamanan visual Anda.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (theme !== "dark") toggleTheme();
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${theme === "dark"
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                              : "bg-slate-800 text-slate-400 hover:text-white"
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
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${theme === "light"
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                            }`}
                        >
                          <Sun size={13} />
                          <span>Light</span>
                        </button>
                      </div>
                    </div>

                    {/* Notifications toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-800/80">
                      <div className="space-y-1 pr-4">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Bell size={14} className="text-slate-400" />
                          Notifikasi Alert Laporan Harian
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Kirim notifikasi ke Telegram bot / Email ketika ada laporan SPPG yang terlambat terkirim.
                        </p>
                      </div>
                      <button
                        onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${notificationsEnabled ? "bg-indigo-600 justify-end" : "bg-slate-800 justify-start"
                          }`}
                      >
                        <span className="w-4 h-4 bg-white rounded-full shadow" />
                      </button>
                    </div>

                    {/* Auto Sync toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-800/80">
                      <div className="space-y-1 pr-4">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          Sinkronisasi Otomatis Supabase
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Sinkronisasikan draft laporan secara otomatis ke database cloud setiap 5 menit sekali.
                        </p>
                      </div>
                      <button
                        onClick={() => setAutoSync(!autoSync)}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${autoSync ? "bg-indigo-600 justify-end" : "bg-slate-800 justify-start"
                          }`}
                      >
                        <span className="w-4 h-4 bg-white rounded-full shadow" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-800" />

                {/* Pengaturan Gemini AI */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Sparkles size={18} className="text-amber-400" />
                        <span>Kecerdasan Buatan (Gemini AI API)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Konfigurasi API Key Google Gemini untuk fitur pembuatan resep, komposisi menu MBG Maker, kalkulasi nilai gizi, dan saran ahli gizi BGN.
                      </p>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-4">
                    <form onSubmit={handleSaveGeminiKey} className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Key size={13} className="text-amber-400" />
                            <span>Gemini API Key</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowGeminiKeySecret(!showGeminiKeySecret)}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
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
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none font-mono"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          Dapatkan kunci API gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Google AI Studio</a>. Kunci disimpan dengan aman di database pengaturan sistem.
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-xs">
                          {geminiApiKeyInput ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle2 size={13} /> Terpasang
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Belum disetel</span>
                          )}
                        </div>
                        <button
                          type="submit"
                          disabled={isSavingGeminiKey}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
                        >
                          {isSavingGeminiKey ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                          <span>{isSavingGeminiKey ? "Menyimpan..." : "Simpan API Key"}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="h-px bg-slate-800" />

                {/* Pengaturan Pengiriman */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Send size={18} className="text-indigo-400" />
                    <span>Pengiriman Laporan</span>
                  </h3>
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-3">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Laporan dikirim <span className="text-white font-bold">manual</span> ke grup WhatsApp melalui halaman Dashboard.
                    </p>
                    <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1.5">
                      <li>Buka tab <span className="text-white font-semibold">Laporan Harian</span>, isi form, klik <span className="text-white font-semibold">Buat Pratinjau</span>.</li>
                      <li>Di modal pratinjau, klik <span className="text-white font-semibold">Download Poster</span> untuk menyimpan gambar poster.</li>
                      <li>Klik <span className="text-white font-semibold">Copy Caption</span> untuk menyalin teks laporan.</li>
                      <li>Buka WhatsApp, pilih grup tujuan, tempel caption, unggah poster, lalu kirim.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MBG MAKER */}
            {activeTab === "menu" && (
              <MBGMaker sppgList={sppgList} />
            )}

            {/* TAB: STIKER OMPRENG STANDALONE */}
            {activeTab === "stiker" && (
              <div className="space-y-6">
                {/* Header Action Bar */}
                <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Printer size={18} className="text-indigo-400" />
                      <span>Generator Label Stiker Ompreng MBG</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pilih format ({standaloneStikerPaperSize.toUpperCase()}), sesuaikan jumlah label & gizi, lalu download/cetak.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadStickerPNG}
                      disabled={isDownloadingStickerPNG}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      title="Download lembar stiker sebagai gambar PNG resolusi tinggi"
                    >
                      {isDownloadingStickerPNG ? (
                        <RefreshCw size={14} className="animate-spin text-emerald-400" />
                      ) : (
                        <ImageIcon size={14} className="text-emerald-400" />
                      )}
                      <span>{isDownloadingStickerPNG ? "Menyimpan PNG..." : "Download PNG"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadStickerPDF}
                      disabled={isDownloadingStickerPDF}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      title="Download lembar stiker siap cetak sebagai dokumen PDF"
                    >
                      {isDownloadingStickerPDF ? (
                        <RefreshCw size={14} className="animate-spin text-rose-400" />
                      ) : (
                        <Download size={14} className="text-rose-400" />
                      )}
                      <span>{isDownloadingStickerPDF ? "Menyimpan PDF..." : "Download PDF"}</span>
                    </button>

                    {standaloneStikerTemplate === "grozziie" && (
                      <button
                        type="button"
                        onClick={handleDirectBluetoothPrint}
                        disabled={isPrintingBle}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-650/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
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
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
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
                    <div className="p-4 bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-900 border border-indigo-500/30 rounded-2xl space-y-3">
                      <label className="text-xs font-bold text-indigo-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Palette size={14} className="text-indigo-400" />
                          <span>Pilih Jenis & Template Stiker</span>
                        </span>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-semibold">
                          {standaloneStikerTemplate === "grozziie" ? "Printer Grozziie (Roll)" : standaloneStikerTemplate === "se2026" ? "Lembaran SE BGN" : "Lembaran Klasik"}
                        </span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setStandaloneStikerTemplate("grozziie")}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            standaloneStikerTemplate === "grozziie"
                              ? "bg-emerald-600/20 border-emerald-500 text-white shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-500/50"
                              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                          }`}
                        >
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <Smartphone size={13} className={standaloneStikerTemplate === "grozziie" ? "text-emerald-400" : "text-slate-500"} />
                            <span>Grozziie (Thermal Roll)</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                            Bluetooth & USB (Horizontal 130×80mm / Custom), cetak via Android/iOS/PC
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStandaloneStikerTemplate("se2026")}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            standaloneStikerTemplate === "se2026"
                              ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-500/50"
                              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                          }`}
                        >
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <Sparkles size={13} className={standaloneStikerTemplate === "se2026" ? "text-amber-400" : "text-slate-500"} />
                            <span>SE BGN 2026 (Lembaran)</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                            Kertas A4/F4/A3 isi banyak (Segel Kiri & Kanan)
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStandaloneStikerTemplate("classic")}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            standaloneStikerTemplate === "classic"
                              ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-500/50"
                              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                          }`}
                        >
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <FileText size={13} className={standaloneStikerTemplate === "classic" ? "text-indigo-400" : "text-slate-500"} />
                            <span>Klasik (Tabel Gizi)</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                            Format lama: Rincian energi & zat gizi lengkap
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Source Selector & General Info */}
                    <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <FileText size={13} className="text-indigo-400" />
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
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
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
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-400">Pilih / Input SPPG</label>
                          {sppgList.length > 0 && (
                            <span className="text-[10px] text-indigo-400">{sppgList.length} SPPG terdaftar</span>
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
                            className="w-full p-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-slate-300 outline-none mb-1.5 cursor-pointer"
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
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Nama Menu (Hanya untuk template lembaran yang memerlukan menu) */}
                      {standaloneStikerTemplate !== "grozziie" && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400">Nama Menu</label>
                          <input
                            type="text"
                            value={standaloneStikerMenu}
                            onChange={(e) => setStandaloneStikerMenu(e.target.value)}
                            placeholder="Menu makanan..."
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}

                      {/* KHUSUS: Setting Kertas Printer Grozziie (Roll) */}
                      {standaloneStikerTemplate === "grozziie" ? (
                        <div className="p-3.5 bg-slate-950/80 border border-emerald-500/30 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                              <SlidersHorizontal size={13} />
                              <span>Ukuran Kertas Label Roll Grozziie (Horizontal)</span>
                            </span>
                            <span className="text-[10px] text-slate-400">Dapat diubah</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-slate-400">Lebar (mm)</label>
                              <input
                                type="number"
                                min={40}
                                max={250}
                                value={standaloneGrozziieWidth}
                                onChange={(e) => setStandaloneGrozziieWidth(parseInt(e.target.value) || 78)}
                                className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-emerald-300 outline-none focus:border-emerald-500 text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-slate-400">Tinggi (mm)</label>
                              <input
                                type="number"
                                min={30}
                                max={200}
                                value={standaloneGrozziieHeight}
                                onChange={(e) => setStandaloneGrozziieHeight(parseInt(e.target.value) || 100)}
                                className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-emerald-300 outline-none focus:border-emerald-500 text-center"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-slate-400">Format Cetak Segel</label>
                              <select
                                value={standaloneGrozziiePairMode}
                                onChange={(e) => setStandaloneGrozziiePairMode(e.target.value as "both" | "left_only" | "right_only")}
                                className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white outline-none focus:border-emerald-500 cursor-pointer"
                              >
                                <option value="both">Pasangan (Kiri & Kanan)</option>
                                <option value="left_only">Hanya Segel Kiri</option>
                                <option value="right_only">Hanya Segel Kanan</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-semibold text-slate-400">Geser Posisi (X-Offset)</label>
                                <span className="text-[9px] text-emerald-400 font-mono">{standaloneGrozziieXOffset > 0 ? `+${standaloneGrozziieXOffset}mm` : `${standaloneGrozziieXOffset}mm`}</span>
                              </div>
                              <input
                                type="number"
                                min={-30}
                                max={50}
                                step={1}
                                value={standaloneGrozziieXOffset}
                                onChange={(e) => setStandaloneGrozziieXOffset(parseInt(e.target.value) || 0)}
                                placeholder="0 mm"
                                className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-emerald-300 outline-none focus:border-emerald-500 text-center"
                                title="Gunakan nilai positif (+mm) jika hasil cetak terpotong di kiri, atau negatif (-mm) jika berlebih ke kanan"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-slate-400">Rotasi Desain (90°)</label>
                              <button
                                type="button"
                                onClick={() => setStandaloneGrozziieRotate90(!standaloneGrozziieRotate90)}
                                className={`w-full p-2 text-xs rounded-lg border font-bold transition-all ${
                                  standaloneGrozziieRotate90
                                    ? "bg-emerald-600/30 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                                    : "bg-slate-900 border-slate-800 text-slate-400"
                                }`}
                              >
                                {standaloneGrozziieRotate90 ? "Aktif (Putar 90°)" : "Nonaktif (0°)"}
                              </button>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-slate-400">Arah Printhead (Direction)</label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setStandaloneGrozziieDirection(0)}
                                  className={`p-2 text-[11px] rounded-lg border font-semibold transition-all ${
                                    standaloneGrozziieDirection === 0
                                      ? "bg-emerald-600/30 border-emerald-500 text-emerald-300"
                                      : "bg-slate-900 border-slate-800 text-slate-400"
                                  }`}
                                >
                                  0°
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStandaloneGrozziieDirection(1)}
                                  className={`p-2 text-[11px] rounded-lg border font-semibold transition-all ${
                                    standaloneGrozziieDirection === 1
                                      ? "bg-emerald-600/30 border-emerald-500 text-emerald-300"
                                      : "bg-slate-900 border-slate-800 text-slate-400"
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
                            <label className="text-[11px] font-semibold text-slate-400">Ukuran Kertas</label>
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
                              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-300 outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="a4">Kertas A4 (210×297 mm)</option>
                              <option value="f4">Kertas F4 / Folio (215×330 mm)</option>
                              <option value="a3">Kertas A3 (297×420 mm)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-400">Jumlah Label / Lembar</label>
                            <select
                              value={standaloneStikerCapacity}
                              onChange={(e) => {
                                const cap = parseInt(e.target.value);
                                setStandaloneStikerCapacity(cap);
                                setStandaloneStikerCountBesar(Math.floor(cap / 2));
                              }}
                              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-indigo-300 outline-none focus:border-indigo-500 cursor-pointer"
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
                              <label className="text-[11px] font-semibold text-slate-400">Format Cetak Segel SE</label>
                              <select
                                value={standaloneStikerSEPairMode}
                                onChange={(e) => setStandaloneStikerSEPairMode(e.target.value as "pair" | "left_only" | "right_only")}
                                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-emerald-300 outline-none focus:border-indigo-500 cursor-pointer"
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
                      <div className={`grid gap-2 pt-2 border-t border-slate-800/60 ${standaloneStikerTemplate === "grozziie" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400">Tanggal</label>
                          <input
                            type="date"
                            value={standaloneStikerTanggal}
                            onChange={(e) => setStandaloneStikerTanggal(e.target.value)}
                            className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none [color-scheme:dark]"
                          />
                        </div>
                        {standaloneStikerTemplate !== "grozziie" && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400">Selesai Produksi</label>
                            <input
                              type="time"
                              value={standaloneStikerJamSelesai}
                              onChange={(e) => setStandaloneStikerJamSelesai(e.target.value)}
                              className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none [color-scheme:dark]"
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-rose-400">Batas Konsumsi</label>
                          <input
                            type="time"
                            value={standaloneStikerJamBatas}
                            onChange={(e) => setStandaloneStikerJamBatas(e.target.value)}
                            className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none [color-scheme:dark]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* KONTROL KHUSUS: Template SE 2026 & Grozziie (Kotak Pengaduan & Wilayah) */}
                    {(standaloneStikerTemplate === "se2026" || standaloneStikerTemplate === "grozziie") && (
                      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>Informasi Segel & Pengaduan SPPG</span>
                          </h4>
                          <span className="text-[10px] text-slate-400">Auto dari referensi SPPG</span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400">Keterangan Wilayah / Pelayanan (Kop Kiri)</label>
                          <input
                            type="text"
                            value={standaloneStikerSubWilayah}
                            onChange={(e) => setStandaloneStikerSubWilayah(e.target.value)}
                            placeholder="Contoh: Kawasan Pelayanan Mandiri"
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400">Nomor Telepon / WhatsApp Pengaduan (Segel Kanan)</label>
                          <input
                            type="text"
                            value={standaloneStikerWaPengaduan}
                            onChange={(e) => setStandaloneStikerWaPengaduan(e.target.value)}
                            placeholder="Contoh: 081234567890"
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-400">Akun Instagram</label>
                            <input
                              type="text"
                              value={standaloneStikerInstagram}
                              onChange={(e) => setStandaloneStikerInstagram(e.target.value)}
                              placeholder="sppg_official"
                              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-pink-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-400">Akun TikTok</label>
                            <input
                              type="text"
                              value={standaloneStikerTiktok}
                              onChange={(e) => setStandaloneStikerTiktok(e.target.value)}
                              placeholder="sppg_official"
                              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Tips Cetak di Android & iOS */}
                        {standaloneStikerTemplate === "grozziie" && (
                          <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 leading-relaxed mt-2 space-y-1.5">
                            <strong className="block text-emerald-200 font-bold">💡 Opsi Cetak 1-Klik Tanpa Dialog:</strong>
                            <p>
                              • <strong>Direct Print Bluetooth (Tombol Hijau):</strong> Mengirim data stiker langsung ke printer Grozziie via Web Bluetooth tanpa membuka jendela dialog cetak sama sekali (didukung di Google Chrome PC & Chrome Android).
                            </p>
                            <p>
                              • <strong>Chrome Kiosk Mode (PC Kasir):</strong> Tambahkan <code>--kiosk-printing</code> di shortcut Chrome Anda. Tombol <em>Cetak</em> akan langsung memproses cetak instan 1 detik tanpa memunculkan dialog preview.
                            </p>
                            <p>
                              • <strong>QR Code Terintegrasi:</strong> Otomatis menampilkan menu makanan dan rincian gizi terbaru saat discan.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* KONTROL KHUSUS: Template Klasik (Tabel Kandungan Gizi) */}
                    {standaloneStikerTemplate === "classic" && (
                      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Kandungan Gizi Label</h4>
                          <select
                            value={standaloneStikerMode}
                            onChange={(e) => setStandaloneStikerMode(e.target.value as "all_besar" | "all_kecil" | "split")}
                            className="p-1 bg-slate-950 border border-slate-800 rounded text-[11px] font-semibold text-indigo-300"
                          >
                            <option value="all_besar">Semua Porsi Besar</option>
                            <option value="all_kecil">Semua Porsi Kecil</option>
                            <option value="split">Campuran (Split)</option>
                          </select>
                        </div>

                        {/* Porsi Besar Grid */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-indigo-400 block">Porsi Besar:</span>
                          <div className="grid grid-cols-5 gap-1.5">
                            <input type="text" value={standaloneStikerGiziBesar.energi} onChange={(e) => setStandaloneStikerGiziBesar({ ...standaloneStikerGiziBesar, energi: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Energi" className="w-full p-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-center text-white" />
                            <input type="text" value={standaloneStikerGiziBesar.protein} onChange={(e) => setStandaloneStikerGiziBesar({ ...standaloneStikerGiziBesar, protein: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Prot" className="w-full p-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-center text-white" />
                            <input type="text" value={standaloneStikerGiziBesar.lemak} onChange={(e) => setStandaloneStikerGiziBesar({ ...standaloneStikerGiziBesar, lemak: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Lemak" className="w-full p-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-center text-white" />
                            <input type="text" value={standaloneStikerGiziBesar.karbohidrat} onChange={(e) => setStandaloneStikerGiziBesar({ ...standaloneStikerGiziBesar, karbohidrat: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Karbo" className="w-full p-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-center text-white" />
                            <input type="text" value={standaloneStikerGiziBesar.serat} onChange={(e) => setStandaloneStikerGiziBesar({ ...standaloneStikerGiziBesar, serat: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Serat" className="w-full p-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-center text-white" />
                          </div>
                        </div>

                        {/* Porsi Kecil Grid */}
                        <div className="space-y-1.5 pt-1.5 border-t border-slate-800/40">
                          <span className="text-[10px] font-bold text-emerald-400 block">Porsi Kecil:</span>
                          <div className="grid grid-cols-5 gap-1.5">
                            <input type="text" value={standaloneStikerGiziKecil.energi} onChange={(e) => setStandaloneStikerGiziKecil({ ...standaloneStikerGiziKecil, energi: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Energi" className="w-full p-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-center text-white" />
                            <input type="text" value={standaloneStikerGiziKecil.protein} onChange={(e) => setStandaloneStikerGiziKecil({ ...standaloneStikerGiziKecil, protein: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Prot" className="w-full p-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-center text-white" />
                            <input type="text" value={standaloneStikerGiziKecil.lemak} onChange={(e) => setStandaloneStikerGiziKecil({ ...standaloneStikerGiziKecil, lemak: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Lemak" className="w-full p-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-center text-white" />
                            <input type="text" value={standaloneStikerGiziKecil.karbohidrat} onChange={(e) => setStandaloneStikerGiziKecil({ ...standaloneStikerGiziKecil, karbohidrat: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Karbo" className="w-full p-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-center text-white" />
                            <input type="text" value={standaloneStikerGiziKecil.serat} onChange={(e) => setStandaloneStikerGiziKecil({ ...standaloneStikerGiziKecil, serat: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Serat" className="w-full p-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-center text-white" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Live Sheet Preview (7 Cols) */}
                  <div className="xl:col-span-7 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-3 sticky top-24">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <Printer size={15} className="text-indigo-400" />
                        <span>
                          {standaloneStikerTemplate === "grozziie"
                            ? `Pratinjau Label Grozziie (${standaloneGrozziieWidth}×${standaloneGrozziieHeight} mm)`
                            : `Pratinjau Lembar ${standaloneStikerPaperSize.toUpperCase()} (${standaloneStikerCapacity} Label)`}
                        </span>
                      </h4>
                      <span className="text-[11px] text-emerald-400 font-medium">
                        {standaloneStikerTemplate === "grozziie"
                          ? "Format Segel Roll (Kiri & Kanan)"
                          : standaloneStikerTemplate === "se2026"
                          ? "Template SE BGN 2026"
                          : "Template Klasik"}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex justify-center">
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
          {/* --- REVIEW MODAL DETAIL DIALOG --- */}
          {selectedReport && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
              {/* Backdrop */}
              <div
                onClick={() => setSelectedReport(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />

              {/* Modal */}
              <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/60 rounded-t-3xl md:rounded-2xl shadow-2xl shadow-black/50 z-10 flex flex-col max-h-[92dvh] md:max-h-[88vh] overflow-hidden">

                {/* ── HEADER ─────────────────────────────── */}
                <div className="shrink-0 bg-gradient-to-r from-slate-900 via-slate-900/95 to-indigo-950/60 border-b border-slate-800/80 px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <ClipboardList size={18} className="text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                          Detail Laporan
                        </span>
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${selectedReport.status === "Draft"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                            : selectedReport.status === "Sent"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                              : "bg-indigo-500/10 text-indigo-400 border-indigo-500/25"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedReport.status === "Draft" ? "bg-amber-400" : selectedReport.status === "Sent" ? "bg-emerald-400" : "bg-indigo-400"
                            }`} />
                          {selectedReport.status}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white truncate leading-tight">{selectedReport.sppgName}</h4>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="shrink-0 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-all flex items-center justify-center"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* ── BODY ────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-0">

                    {/* Left Panel: Media & Template */}
                    <div className="bg-slate-950/40 border-b md:border-b-0 md:border-r border-slate-800/60 p-4 flex flex-col gap-3">
                      {/* Food Photo */}
                      <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-slate-950 shadow-inner group">
                        {selectedReport.photoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={selectedReport.photoUrl}
                            alt="Foto Makanan"
                            loading="lazy"
                            className="w-full aspect-[4/3] object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-2 bg-slate-900/50">
                            <Camera size={22} className="text-slate-600" />
                            <span className="text-[10px] text-slate-500">Foto belum tersedia</span>
                          </div>
                        )}
                        <span className="absolute top-2 left-2 text-[9px] font-bold text-white/90 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                          <Camera size={10} className="text-emerald-400" />
                          Foto Asli
                        </span>
                      </div>

                      {/* Poster Thumbnail */}
                      <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-slate-950 shadow-inner group">
                        {selectedReport.posterUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={selectedReport.posterUrl}
                            alt="Poster Laporan"
                            loading="lazy"
                            className="w-full aspect-[4/5] object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full aspect-[4/5] flex flex-col items-center justify-center gap-2 bg-slate-900/50">
                            <ImageIcon size={22} className="text-slate-600" />
                            <span className="text-[10px] text-slate-500">Poster belum dibuat</span>
                          </div>
                        )}
                        <span className="absolute top-2 left-2 text-[9px] font-bold text-white/90 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                          <ImageIcon size={10} className="text-indigo-400" />
                          Poster
                        </span>
                      </div>

                      {/* Template Selector */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Palette size={11} className="text-indigo-400" />
                            Template Poster
                          </span>
                          {isGeneratingPosterTemplate && (
                            <span className="text-[9px] text-indigo-400 flex items-center gap-1 animate-pulse font-bold">
                              <RefreshCw size={9} className="animate-spin" /> Memproses...
                            </span>
                          )}
                        </div>
                        <select
                          value={selectedTemplate}
                          disabled={isGeneratingPosterTemplate}
                          onChange={async (e) => {
                            const tId = e.target.value;
                            setSelectedTemplate(tId);
                            if (!selectedReport?.id) return;
                            setIsGeneratingPosterTemplate(true);
                            try {
                              const res = await fetch(`/api/generate-poster?id=${selectedReport.id}&template=${tId}`);
                              const json = await res.json();
                              if (json.success && json.url) {
                                setSelectedReport({ ...selectedReport, posterUrl: json.url });
                                setDbReports((prev) =>
                                  prev.map((r) => (r.id === selectedReport.id ? { ...r, poster_url: json.url } : r))
                                );
                                showSettingsToast(`Poster diperbarui ke Template ${tId}!`, "success");
                              }
                            } catch {
                              showSettingsToast("Gagal merubah template poster.", "error");
                            } finally {
                              setIsGeneratingPosterTemplate(false);
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-indigo-300 outline-none cursor-pointer disabled:opacity-50"
                        >
                          <option value="1">Template 1: Modern Classic</option>
                          <option value="2">Template 2: Classic Beige</option>
                          <option value="3">Template 3: Sky Blue Grid</option>
                          <option value="4">Template 4: Bold Royal Blue</option>
                          <option value="5">Template 5: Eco Green</option>
                          <option value="6">Template 6: Executive Gold</option>
                        </select>
                      </div>
                    </div>

                    {/* Right Panel: Report Info */}
                    <div className="p-5 space-y-5">
                      {/* Date & Time */}
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1.5 font-medium text-slate-300">
                          <Calendar size={13} className="text-indigo-400" />
                          <span>
                            {(() => {
                              const d = selectedReport.date ? new Date(selectedReport.date + "T00:00:00") : new Date();
                              return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
                            })()}
                          </span>
                        </span>
                        <span className="text-slate-600 font-bold">•</span>
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Clock size={13} className="text-emerald-400" />
                          <span className="font-mono font-medium">{selectedReport.distributionTime}</span>
                        </span>
                      </div>

                      {/* Menu */}
                      <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Utensils size={13} className="text-indigo-400" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu Makanan</span>
                        </div>
                        <p className="text-sm font-semibold text-white leading-relaxed tracking-wide">{selectedReport.menu}</p>
                      </div>

                      {/* Penerima Manfaat */}
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <Users size={13} className="text-indigo-400" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Penerima Manfaat</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="bg-slate-950/60 border border-slate-800/50 rounded-xl p-3.5 text-center">
                            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Total</p>
                            <p className="text-xl font-extrabold text-white mt-1 leading-none">{selectedReport.totalBeneficiaries.toLocaleString("id-ID")}</p>
                          </div>
                          <div className="bg-indigo-950/30 border border-indigo-800/25 rounded-xl p-3.5 text-center">
                            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Porsi Besar</p>
                            <p className="text-xl font-extrabold text-indigo-400 mt-1 leading-none">{selectedReport.largePortions.toLocaleString("id-ID")}</p>
                          </div>
                          <div className="bg-emerald-950/30 border border-emerald-800/25 rounded-xl p-3.5 text-center">
                            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Porsi Kecil</p>
                            <p className="text-xl font-extrabold text-emerald-400 mt-1 leading-none">{selectedReport.smallPortions.toLocaleString("id-ID")}</p>
                          </div>
                        </div>

                        {/* PMT B3 Pills */}
                        {(selectedReport.balita ?? 0) > 0 || (selectedReport.bumil ?? 0) > 0 || (selectedReport.busui ?? 0) > 0 ? (
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">PMT B3:</span>
                            {(selectedReport.balita ?? 0) > 0 && (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-[10px] font-bold text-amber-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                {selectedReport.balita} Balita
                              </span>
                            )}
                            {(selectedReport.bumil ?? 0) > 0 && (
                              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-[10px] font-bold text-rose-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                {selectedReport.bumil} Bumil
                              </span>
                            )}
                            {(selectedReport.busui ?? 0) > 0 && (
                              <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-[10px] font-bold text-purple-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                {selectedReport.busui} Busui
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {/* Catatan */}
                      {selectedReport.notes && (
                        <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-3.5">
                          <span className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest block mb-1">Catatan</span>
                          <p className="text-xs text-slate-300 italic leading-relaxed">&ldquo;{selectedReport.notes}&rdquo;</p>
                        </div>
                      )}

                      {/* Status & Workflow Actions */}
                      <div className="pt-2 border-t border-slate-800/60">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Status & Alur Kerja</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {selectedReport.status === "Draft" && (
                            <button
                              onClick={() => updateReportStatus(selectedReport.id, "Approved")}
                              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all hover:scale-105 active:scale-95"
                            >
                              <CheckCircle2 size={13} />
                              Setujui Laporan
                            </button>
                          )}
                          {selectedReport.status === "Approved" && (
                            <>
                              <button
                                onClick={() => updateReportStatus(selectedReport.id, "Draft")}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                              >
                                Kembalikan ke Draft
                              </button>
                              <button
                                onClick={() => updateReportStatus(selectedReport.id, "Sent")}
                                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all hover:scale-105 active:scale-95"
                              >
                                <Send size={13} />
                                Tandai Terkirim
                              </button>
                            </>
                          )}
                          {selectedReport.status === "Sent" && (
                            <button
                              onClick={() => updateReportStatus(selectedReport.id, "Approved")}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700/60 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                            >
                              Batalkan Pengiriman
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── FOOTER ──────────────────────────────── */}
                <div className="shrink-0 px-5 sm:px-6 py-3.5 bg-slate-950/60 border-t border-slate-800/80 flex flex-wrap items-center gap-2.5">
                  {/* Download Poster */}
                  <button
                    disabled={!selectedReport.posterUrl || detailLoadingAction !== null}
                    onClick={async () => {
                      if (!selectedReport.posterUrl) return;
                      setDetailLoadingAction("download");
                      try {
                        const res = await fetch(selectedReport.posterUrl);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `poster-mbg-${selectedReport.id}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        showSettingsToast("Poster berhasil didownload!", "success");
                      } catch {
                        showSettingsToast("Gagal download poster.", "error");
                      } finally { setDetailLoadingAction(null); }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all hover:scale-105 active:scale-95"
                  >
                    {detailLoadingAction === "download" ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                    {detailLoadingAction === "download" ? "Mengunduh..." : "Download Poster"}
                  </button>

                  {/* Copy Caption */}
                  <button
                    disabled={detailLoadingAction !== null}
                    onClick={async () => {
                      setDetailLoadingAction("copy");
                      try {
                        const caption = generateReportCaption(selectedReport);
                        await navigator.clipboard.writeText(caption);
                        showSettingsToast("Caption berhasil dicopy! Tempel di WhatsApp.", "success");
                      } catch {
                        showSettingsToast("Gagal copy caption.", "error");
                      } finally { setDetailLoadingAction(null); }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/50 text-slate-200 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                  >
                    {detailLoadingAction === "copy" ? <RefreshCw size={13} className="animate-spin" /> : <Copy size={13} />}
                    {detailLoadingAction === "copy" ? "Menyalin..." : "Copy Caption"}
                  </button>

                  {/* Stiker Ompreng */}
                  <button
                    onClick={() => selectedReport && openStickerFromReport(selectedReport)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                  >
                    <Printer size={13} />
                    Stiker Ompreng
                  </button>

                  <div className="ml-auto text-[10px] text-slate-600 font-mono hidden sm:block">ID: {selectedReport.id?.slice(0, 8)}...</div>
                </div>
              </div>
            </div>
          )}

          {/* --- PREVIEW MODAL --- */}
          {showPreviewModal && formPreviewData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-950/40 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-white text-base">Pratinjau Poster & Teks Laporan</h3>
                    <p className="text-[10px] text-slate-500">Tinjau poster dan caption. Setelah disetujui, download poster lalu copy caption untuk dikirim ke grup WhatsApp.</p>
                  </div>
                  <button
                    onClick={() => handleConfirmReport("cancel")}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto">
                  {/* Left Column: Poster Image Preview */}
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Draft Poster Laporan</span>
                      {isGeneratingPosterTemplate && (
                        <span className="text-[10px] text-indigo-400 font-bold animate-pulse flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin" /> Merubah...
                        </span>
                      )}
                    </div>

                    {/* Template Selector Dropdown */}
                    <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">Pilih Template Poster (5 Variasi)</span>
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
                        className="w-full bg-slate-900 border border-slate-700/60 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-300 outline-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="1">Template 1: Modern Classic (Teal & Royal Blue - Default)</option>
                        <option value="2">Template 2: Classic Beige & Sticky Note</option>
                        <option value="3">Template 3: Sky Blue Grid & Yellow Gizi Table</option>
                        <option value="4">Template 4: Bold Royal Blue & Starburst Badge</option>
                        <option value="5">Template 5: Eco Green Fresh & Nutrition Grid</option>
                        <option value="6">Template 6: Executive Gold & 5 Column Stat Pills</option>
                      </select>
                    </div>

                    <div className="w-full max-w-[400px] aspect-[800/1100] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center relative shadow-inner">
                      {formPreviewData.posterUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={formPreviewData.posterUrl}
                          alt="Laporan Poster"
                          loading="lazy"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          <RefreshCw size={24} className="animate-spin text-indigo-500" />
                          <span className="text-xs">Membuat Poster...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Caption Preview */}
                  <div className="space-y-2 flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Caption / Teks Laporan</span>
                    <div className="flex-1 p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-400 overflow-y-auto whitespace-pre-wrap select-all leading-relaxed shadow-inner">
                      {formPreviewData.caption}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-3">
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
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-xs font-bold text-white transition-all shadow-md"
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
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 border border-slate-600 rounded-xl text-xs font-bold text-white transition-all shadow-md"
                    >
                      {previewLoadingAction === "copy" ? <RefreshCw size={14} className="animate-spin" /> : <Copy size={14} />}
                      <span>{previewLoadingAction === "copy" ? "Menyalin..." : "Copy Caption"}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={formIsConfirming}
                      onClick={() => handleConfirmReport("cancel")}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300"
                    >
                      Revisi / Batal
                    </button>
                    <button
                      type="button"
                      disabled={formIsConfirming}
                      onClick={() => handleConfirmReport("confirm")}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 ${formIsConfirming ? "bg-indigo-700/60 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-600 shadow-md"
                        }`}
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
            <div className="fixed inset-0 bottom-16 md:inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center p-0 md:p-4">
              <div onClick={() => {
                setShowSppgModal(false);
                setEditingSppgId(null);
                setSppgForm({ nama_sppg: "", porsi_kecil: 0, porsi_besar: 0, balita: 0, bumil: 0, busui: 0, kepala_sppg: "", pengawas_gizi: "" });
              }} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
              <div className="relative w-full max-w-lg bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/50 rounded-t-2xl md:rounded-2xl shadow-2xl shadow-indigo-500/5 z-10 flex flex-col max-h-[90dvh] md:max-h-[85vh]">
                {/* Header */}
                <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                      <Database size={16} className="text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{editingSppgId ? "Edit Data SPPG" : "Tambah SPPG Baru"}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowSppgModal(false);
                      setEditingSppgId(null);
                      setSppgForm({ nama_sppg: "", porsi_kecil: 0, porsi_besar: 0, balita: 0, bumil: 0, busui: 0, kepala_sppg: "", pengawas_gizi: "" });
                    }}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  <form onSubmit={handleSaveSppg} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase">Nama SPPG</label>
                      <input
                        type="text"
                        placeholder="Contoh: SPPG Lombok Timur"
                        value={sppgForm.nama_sppg}
                        onChange={(e) => setSppgForm({ ...sppgForm, nama_sppg: e.target.value })}
                        className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50 text-xs"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                          <User size={11} className="text-slate-500" />
                          Nama Kepala SPPG
                        </label>
                        <input
                          type="text"
                          placeholder="Nama Kepala SPPG..."
                          value={sppgForm.kepala_sppg}
                          onChange={(e) => setSppgForm({ ...sppgForm, kepala_sppg: e.target.value })}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                          <User size={11} className="text-slate-500" />
                          Nama Pengawas Gizi
                        </label>
                        <input
                          type="text"
                          placeholder="Nama Pengawas Gizi..."
                          value={sppgForm.pengawas_gizi}
                          onChange={(e) => setSppgForm({ ...sppgForm, pengawas_gizi: e.target.value })}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50 text-xs"
                        />
                      </div>
                    </div>

                    {/* Kontak Pengaduan & Keterangan Sub Wilayah (Untuk Label SE 2026) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                          <span>WA Kontak Pengaduan</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: 081234567890"
                          value={sppgForm.kontak_pengaduan || ""}
                          onChange={(e) => setSppgForm({ ...sppgForm, kontak_pengaduan: e.target.value })}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/50 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                          <span>Keterangan Wilayah / Pelayanan</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Kawasan Pelayanan Mandiri"
                          value={sppgForm.sub_wilayah || ""}
                          onChange={(e) => setSppgForm({ ...sppgForm, sub_wilayah: e.target.value })}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50 text-xs"
                        />
                      </div>
                    </div>

                    {/* Akun Media Sosial SPPG */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-pink-400 uppercase flex items-center gap-1.5">
                          <span>Instagram SPPG</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: sppg_bandung"
                          value={sppgForm.instagram || ""}
                          onChange={(e) => setSppgForm({ ...sppgForm, instagram: e.target.value })}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-pink-500 focus-visible:ring-2 focus-visible:ring-pink-500/50 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                          <span>TikTok SPPG</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: sppg_bandung"
                          value={sppgForm.tiktok || ""}
                          onChange={(e) => setSppgForm({ ...sppgForm, tiktok: e.target.value })}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-500/50 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Porsi Besar (SD-SMP)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={sppgForm.porsi_besar || ""}
                          onChange={(e) => setSppgForm({ ...sppgForm, porsi_besar: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                          min="0"
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Porsi Kecil (PAUD-TK)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={sppgForm.porsi_kecil || ""}
                          onChange={(e) => setSppgForm({ ...sppgForm, porsi_kecil: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                          min="0"
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50 text-xs"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-2">
                      <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-3">
                        <Users size={12} className="text-slate-500" />
                        PMT B3
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase">Balita</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={sppgForm.balita || ""}
                            onChange={(e) => setSppgForm({ ...sppgForm, balita: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                            min="0"
                            className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase">Bumil</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={sppgForm.bumil || ""}
                            onChange={(e) => setSppgForm({ ...sppgForm, bumil: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                            min="0"
                            className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase">Busui</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={sppgForm.busui || ""}
                            onChange={(e) => setSppgForm({ ...sppgForm, busui: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                            min="0"
                            className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSppgModal(false);
                          setEditingSppgId(null);
                          setSppgForm({ nama_sppg: "", porsi_kecil: 0, porsi_besar: 0, balita: 0, bumil: 0, busui: 0, kepala_sppg: "", pengawas_gizi: "" });
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={sppgSubmitting}
                        className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-semibold text-white shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {sppgSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        <span>{sppgSubmitting ? "Menyimpan..." : editingSppgId ? "Simpan Perubahan" : "Tambah SPPG"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Settings Toast Notification */}
          <div className={`print:hidden fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border bg-slate-950/90 backdrop-blur-md shadow-2xl transition-all duration-300 transform ${settingsToast.show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"
            } ${settingsToast.type === "success" ? "border-emerald-500/20" : "border-red-500/20"
            }`}>
            {settingsToast.type === "success" ? (
              <CheckCircle2 className="text-emerald-400 flex-shrink-0" size={18} />
            ) : (
              <span className="text-red-400 flex-shrink-0 font-bold text-base">!</span>
            )}
            <span className="text-xs font-semibold text-slate-200">{settingsToast.message}</span>
          </div>

          {/* --- BOTTOM NAV BAR (MOBILE ONLY) --- */}
          <nav className="print:hidden lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-16 px-2">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${activeTab === "dashboard" ? "text-indigo-400" : "text-slate-500"
                  }`}
              >
                <LayoutDashboard size={20} />
                <span className="text-[9px] font-semibold">Dashboard</span>
                {activeTab === "dashboard" && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
              </button>

              <button
                onClick={() => setActiveTab("sppg")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${activeTab === "sppg" ? "text-indigo-400" : "text-slate-500"
                  }`}
              >
                <Database size={20} />
                <span className="text-[9px] font-semibold">SPPG</span>
                {activeTab === "sppg" && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
              </button>

              <button
                onClick={() => { setActiveTab("laporan"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="flex flex-col items-center justify-center flex-none w-14 -mt-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 hover:shadow-indigo-500/50">
                  <Plus size={24} strokeWidth={3} />
                </div>
                <span className="text-[8px] font-bold text-indigo-400 mt-1 tracking-tight">Tambah</span>
              </button>

              <button
                onClick={() => setActiveTab("riwayat")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${activeTab === "riwayat" ? "text-indigo-400" : "text-slate-500"
                  }`}
              >
                <Clock size={20} />
                <span className="text-[9px] font-semibold">Riwayat</span>
                {activeTab === "riwayat" && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
              </button>

              <button
                onClick={() => setActiveTab("menu")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${activeTab === "menu" ? "text-indigo-400" : "text-slate-500"
                  }`}
              >
                <ChefHat size={20} />
                <span className="text-[9px] font-semibold">Menu</span>
                {activeTab === "menu" && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
              </button>

              <button
                onClick={() => setActiveTab("pengaturan")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${activeTab === "pengaturan" ? "text-indigo-400" : "text-slate-500"
                  }`}
              >
                <Settings size={20} />
                <span className="text-[9px] font-semibold">Atur</span>
                {activeTab === "pengaturan" && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
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
