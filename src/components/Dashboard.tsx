"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Phone,
  Plus
} from "lucide-react";

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

export default function Dashboard() {
  const { reports: dbReports, setReports: setDbReports } = useLaporanRealtime();

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
        giziBesar: r.extracted_data?.gizi_besar || undefined,
        giziKecil: r.extracted_data?.gizi_kecil || undefined
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
      `📢 *LAPORAN HARIAN MBG (MAKANAN BERGIZI GRATIS)*\n\n` +
      `🏫 *SPPG:* ${report.sppgName}\n` +
      `📅 *Tanggal:* ${dateFormatted}\n` +
      `🍴 *Menu:* ${report.menu}\n` +
      `👥 *Jumlah Penerima:* ${total} Orang\n` +
      `   - Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru/Tendik): ${report.largePortions} Orang\n` +
      `   - Porsi Kecil (PAUD-TK, SD Kelas 1-3): ${report.smallPortions} Orang\n` +
      `   - PMT B3 Balita: ${balita} Anak\n` +
      `   - PMT B3 Bumil: ${bumil} Ibu\n` +
      `   - PMT B3 Busui: ${busui} Ibu\n\n`;

    if (gb) {
      caption +=
        `🍱 *Nilai Gizi Porsi Besar (SD Kelas 4-6, SMP, SMA, Guru/Tendik):*\n` +
        `   - Energi: ${gb.Energi || 0} kcal\n` +
        `   - Protein: ${gb.Protein || 0} g\n` +
        `   - Lemak: ${gb.Lemak || 0} g\n` +
        `   - Karbohidrat: ${gb.Karbohidrat || 0} g\n` +
        `   - Serat: ${gb.Serat || 0} g\n\n`;
    }

    if (gk) {
      caption +=
        `🍱 *Nilai Gizi Porsi Kecil (PAUD-TK, SD Kelas 1-3):*\n` +
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

  const [activeTab, setActiveTab] = useState<"dashboard" | "laporan" | "pengaturan" | "sppg" | "riwayat">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Toast notification state for settings
  const [settingsToast, setSettingsToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false, message: "", type: "success"
  });
  const showSettingsToast = (message: string, type: "success" | "error" = "success") => {
    setSettingsToast({ show: true, message, type });
    setTimeout(() => setSettingsToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // SPPG States
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
    pengawas_gizi: ""
  });
  const [editingSppgId, setEditingSppgId] = useState<string | null>(null);
  const [showSppgModal, setShowSppgModal] = useState(false);
  const [sppgSearch, setSppgSearch] = useState("");

  const fetchSppgList = useCallback(async () => {
    setLoadingSppg(true);
    try {
      const res = await fetch("/api/sppg");
      const json = await res.json();
      if (json.status === "success") {
        setSppgList(json.data || []);
      }
    } catch (err) {
      console.error("Gagal mengambil data SPPG:", err);
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
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  // Helper to handle image file input to base64 conversion
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImageBase64(reader.result as string);
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
          pengawas_gizi: ""
        });
        setEditingSppgId(null);
        setShowSppgModal(false);
        fetchSppgList();
      } else {
        alert("Gagal menyimpan data SPPG: " + json.message);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
      alert("Error: " + errMsg);
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
      pengawas_gizi: sppg.pengawas_gizi || ""
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
          setEditingReportId(null);
          setFormMenu("");
          setFormPorsiBesar(0);
          setFormPorsiKecil(0);
          setFormBalita(0);
          setFormBumil(0);
          setFormBusui(0);
          setFormImageBase64("");
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
          setFormMenu("");
          setFormPorsiBesar(0);
          setFormPorsiKecil(0);
          setFormBalita(0);
          setFormBumil(0);
          setFormBusui(0);
          setFormImageBase64("");
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
  const [userProfile, setUserProfile] = useState({
    name: "Admin SPPG Nasional",
    email: "admin@mbg-sppg.go.id",
    region: "DKI Jakarta & Jawa Barat"
  });

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
      }

      // Update selectedReport state so modal changes instantly
      setSelectedReport((prev) => (prev && prev.id === id ? { ...prev, status: nextStatus } : prev));
    } catch (err) {
      console.error("Failed to update status in Supabase:", err);
      alert("Gagal memperbarui status di database.");
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans antialiased">
      {/* Dynamic Futuristic Gradient Background Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_45%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_40%)] pointer-events-none" />

      {/* --- SIDEBAR FOR DESKTOP --- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col justify-between`}
      >
        <div>
          {/* Logo Brand */}
          <div className="h-20 flex items-center px-6 border-b border-slate-900 bg-slate-950/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                <UtensilsCrossed size={20} className="animate-pulse" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
                  MBG Reporter
                </h1>
                <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">
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
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => {
                setActiveTab("dashboard");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === "dashboard"
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard Utama</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("laporan");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === "laporan"
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <ClipboardList size={18} />
              <span>Laporan Harian</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("sppg");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === "sppg"
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <Database size={18} />
              <span>Data SPPG</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("riwayat");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === "riwayat"
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <Clock size={18} />
              <span>Riwayat Laporan</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("pengaturan");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === "pengaturan"
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <Settings size={18} />
              <span>Pengaturan</span>
            </button>
          </nav>
        </div>

        {/* Profile Card Bottom */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/20">
          <div className="flex items-center gap-3 p-2 bg-slate-900/40 rounded-xl border border-slate-800/40">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center font-bold text-white shadow-inner">
              {userProfile.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-white truncate">{userProfile.name}</h4>
              <p className="text-[10px] text-slate-400 truncate">{userProfile.email}</p>
            </div>
            <button className="text-slate-400 hover:text-red-400 transition-colors p-1" title="Keluar">
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
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 relative z-10">
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

            <button className="p-2.5 rounded-xl bg-slate-800/85 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />
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
              {/* ROW 1: KEY METRICS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                    <Users size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Penerima</p>
                    <h4 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">{metrics.total.toLocaleString("id-ID")}</h4>
                  </div>
                </div>
                <div className="p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <ClipboardList size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Laporan Hari Ini</p>
                    <h4 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">{todayCount}</h4>
                  </div>
                </div>
                <div className="p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">
                    <Database size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">SPPG Aktif</p>
                    <h4 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">{activeSppgCount}</h4>
                  </div>
                </div>
                <div className="p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    <UtensilsCrossed size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Total Porsi</p>
                    <h4 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">{(metrics.large + metrics.small).toLocaleString("id-ID")}</h4>
                  </div>
                </div>
              </div>

              {/* ROW 2: BREAKDOWN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Portion breakdown */}
                <div className="p-4 sm:p-5 bg-slate-950/40 border border-slate-800 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Distribusi Porsi</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-indigo-400">Porsi Besar (SD-SMP)</span>
                        <span className="text-xs font-bold text-white">{metrics.large.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${metrics.large + metrics.small > 0 ? (metrics.large / (metrics.large + metrics.small)) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-emerald-400">Porsi Kecil (PAUD-TK)</span>
                        <span className="text-xs font-bold text-white">{metrics.small.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${metrics.large + metrics.small > 0 ? (metrics.small / (metrics.large + metrics.small)) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* PMT B3 breakdown */}
                <div className="p-4 sm:p-5 bg-slate-950/40 border border-slate-800 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">PMT B3</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-xs font-semibold text-slate-200">Balita</span>
                      </div>
                      <span className="text-sm font-bold text-white">{b3Totals.balita.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        <span className="text-xs font-semibold text-slate-200">Bumil</span>
                      </div>
                      <span className="text-sm font-bold text-white">{b3Totals.bumil.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        <span className="text-xs font-semibold text-slate-200">Busui</span>
                      </div>
                      <span className="text-sm font-bold text-white">{b3Totals.busui.toLocaleString("id-ID")}</span>
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
                {reports.length > 0 ? (
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
                          <span className={`shrink-0 ml-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            report.status === "Draft" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
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

                <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => e.preventDefault()}>
                  {/* --- SECTION 1: INFORMASI UMUM --- */}
                  <div className="md:col-span-2 border-b border-slate-800 pb-2">
                    <h4 className="text-sm font-semibold text-indigo-400">Informasi Umum Laporan</h4>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Satuan Pelayanan SPPG</label>
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
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs cursor-pointer mb-2"
                    >
                      <option value="">-- Pilih SPPG --</option>
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
                        className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Tanggal Distribusi</label>
                    <input
                      type="date"
                      value={formTanggal}
                      onChange={(e) => setFormTanggal(e.target.value)}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Detail Menu Makanan</label>
                    <textarea
                      placeholder="Contoh: Nasi Putih, Ayam Goreng Saos Padang, Tumis Buncis Wortel, Melon..."
                      rows={3}
                      value={formMenu}
                      onChange={(e) => setFormMenu(e.target.value)}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  {/* --- SECTION 2: PENERIMA MANFAAT SEKOLAH --- */}
                  <div className="md:col-span-2 border-b border-slate-800 pb-2 pt-2">
                    <h4 className="text-sm font-semibold text-indigo-400">Penerima Manfaat Sekolah</h4>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Porsi Besar (SD-SMP) - Anak</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formPorsiBesar || ""}
                      onChange={(e) => setFormPorsiBesar(Number(e.target.value))}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Porsi Kecil (PAUD-TK) - Anak</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formPorsiKecil || ""}
                      onChange={(e) => setFormPorsiKecil(Number(e.target.value))}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  {/* --- SECTION 3: PENERIMA MANFAAT PMT B3 --- */}
                  <div className="md:col-span-2 border-b border-slate-800 pb-2 pt-2">
                    <h4 className="text-sm font-semibold text-indigo-400">Penerima Manfaat PMT B3</h4>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Balita - Anak</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formBalita || ""}
                      onChange={(e) => setFormBalita(Number(e.target.value))}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Ibu Hamil (Bumil) - Orang</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formBumil || ""}
                      onChange={(e) => setFormBumil(Number(e.target.value))}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Ibu Menyusui (Busui) - Orang</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formBusui || ""}
                      onChange={(e) => setFormBusui(Number(e.target.value))}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Total Penerima Manfaat (Otomatis)</label>
                    <div className="w-full p-3 bg-slate-950/80 border border-slate-850 rounded-xl text-indigo-400 font-extrabold text-sm shadow-inner">
                      {(formPorsiBesar || 0) + (formPorsiKecil || 0) + (formBalita || 0) + (formBumil || 0) + (formBusui || 0)} Orang
                    </div>
                  </div>

                  {/* --- SECTION 4: NILAI GIZI PORSI BESAR --- */}
                  <div className="md:col-span-2 border-b border-slate-800 pb-2 pt-2">
                    <h4 className="text-sm font-semibold text-indigo-400">Nilai Gizi Porsi Besar (SD-SMP)</h4>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:col-span-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Energi (kcal)</label>
                      <input
                        type="number"
                        value={formGiziBesar.Energi || ""}
                        onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Energi: Number(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Protein (g)</label>
                      <input
                        type="number"
                        value={formGiziBesar.Protein || ""}
                        onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Protein: Number(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Lemak (g)</label>
                      <input
                        type="number"
                        value={formGiziBesar.Lemak || ""}
                        onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Lemak: Number(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Karbo (g)</label>
                      <input
                        type="number"
                        value={formGiziBesar.Karbohidrat || ""}
                        onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Karbohidrat: Number(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Serat (g)</label>
                      <input
                        type="number"
                        value={formGiziBesar.Serat || ""}
                        onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Serat: Number(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* --- SECTION 5: NILAI GIZI PORSI KECIL --- */}
                  <div className="md:col-span-2 border-b border-slate-800 pb-2 pt-2">
                    <h4 className="text-sm font-semibold text-indigo-400">Nilai Gizi Porsi Kecil (PAUD-TK)</h4>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:col-span-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Energi (kcal)</label>
                      <input
                        type="number"
                        value={formGiziKecil.Energi || ""}
                        onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Energi: Number(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Protein (g)</label>
                      <input
                        type="number"
                        value={formGiziKecil.Protein || ""}
                        onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Protein: Number(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Lemak (g)</label>
                      <input
                        type="number"
                        value={formGiziKecil.Lemak || ""}
                        onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Lemak: Number(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Karbo (g)</label>
                      <input
                        type="number"
                        value={formGiziKecil.Karbohidrat || ""}
                        onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Karbohidrat: Number(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Serat (g)</label>
                      <input
                        type="number"
                        value={formGiziKecil.Serat || ""}
                        onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Serat: Number(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* --- SECTION 6: FOTO MAKANAN & TUJUAN --- */}
                  <div className="md:col-span-2 border-b border-slate-800 pb-2 pt-2">
                    <h4 className="text-sm font-semibold text-indigo-400">Foto & Pengiriman ke Personal</h4>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Foto Makanan</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 outline-none text-xs cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-650 file:text-white hover:file:bg-indigo-600"
                    />
                    {formImageBase64 && (
                      <>
                        <div className="mt-2 flex items-start gap-3">
                          <img
                            src={formImageBase64}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded-lg border border-emerald-500/30 shadow-sm"
                          />
                          <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            <span>Gambar siap diunggah</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingReportId(null);
                        setFormMenu("");
                        setFormPorsiBesar(0);
                        setFormPorsiKecil(0);
                        setFormBalita(0);
                        setFormBumil(0);
                        setFormBusui(0);
                        setFormImageBase64("");
                      }}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300"
                    >
                      {editingReportId ? "Batal Edit" : "Reset Form"}
                    </button>
                    <button
                      type="button"
                      disabled={formIsSubmitting}
                      onClick={handleSubmitReport}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 ${
                        formIsSubmitting ? "bg-indigo-700/60 cursor-not-allowed" : "bg-indigo-650 hover:bg-indigo-600 shadow-md shadow-indigo-600/10"
                      }`}
                    >
                      {formIsSubmitting && <RefreshCw size={14} className="animate-spin" />}
                      <span>{formIsSubmitting ? "Memproses..." : editingReportId ? "Simpan Perubahan" : "Pratinjau Laporan"}</span>
                    </button>
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
                          <p className="text-[10px] text-slate-400">{rep.totalBeneficiaries} Penerima • {rep.location}</p>
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
                          width: `${
                            (reports.filter((r) => r.status === "Sent").length / reports.length) * 100
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
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-base">Semua Laporan SPPG</h4>
                    <p className="text-xs text-slate-400">Kelola, edit, hapus, atau download poster & caption dari semua laporan.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="text"
                        placeholder="Cari SPPG..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full sm:w-60 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-xs outline-none transition-colors"
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
                        className="pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-xs focus:border-indigo-500 outline-none cursor-pointer appearance-none"
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
                      return (
                        <div key={report.id} className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/5">
                          {/* Top: Date + Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Calendar size={14} className="text-indigo-400" />
                              <span>{report.date}</span>
                            </div>
                            <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              report.status === "Draft" && "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            } ${
                              report.status === "Approved" && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            } ${
                              report.status === "Sent" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                report.status === "Draft" && "bg-amber-400"
                              } ${report.status === "Approved" && "bg-indigo-400"} ${
                                report.status === "Sent" && "bg-emerald-400"
                              }`} />
                              {report.status}
                            </span>
                          </div>

                          {/* SPPG Name */}
                          <p className="font-semibold text-white text-sm">{report.sppgName}</p>

                          {/* Menu */}
                          <p className="text-xs text-slate-400 truncate" title={report.menu}>
                            Menu: {report.menu}
                          </p>

                          {/* Divider */}
                          <div className="h-px bg-slate-800" />

                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                              <p className="text-[10px] text-slate-500">Total</p>
                              <p className="text-sm font-bold text-white">{report.totalBeneficiaries}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500">Besar</p>
                              <p className="text-sm font-bold text-indigo-400">{report.largePortions}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500">Kecil</p>
                              <p className="text-sm font-bold text-emerald-400">{report.smallPortions}</p>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-slate-800" />

                          {/* Action Buttons */}
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              onClick={() => setSelectedReport(report)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all"
                              title="Lihat Detail"
                            >
                              <Eye size={14} />
                              Lihat
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
                                setEditingReportId(dbRow.id);
                                setActiveTab("laporan");
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold transition-all"
                              title="Edit Laporan"
                            >
                              <Edit size={14} />
                              Edit
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
                              className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all"
                              title="Hapus Laporan"
                            >
                              <Trash2 size={14} />
                              Hapus
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full py-12 px-6 text-center text-slate-500">
                      Tidak ada laporan ditemukan.
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
              <div className="bg-slate-950/40 border border-slate-800 p-4 sm:p-6 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">Daftar SPPG</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Total terdaftar: {sppgList.length} SPPG</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                      <input
                        type="text"
                        placeholder="Cari SPPG..."
                        value={sppgSearch}
                        onChange={(e) => setSppgSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-xs outline-none w-full sm:w-56"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setEditingSppgId(null);
                        setSppgForm({ nama_sppg: "", porsi_kecil: 0, porsi_besar: 0, balita: 0, bumil: 0, busui: 0, kepala_sppg: "", pengawas_gizi: "" });
                        setShowSppgModal(true);
                      }}
                      className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/10"
                    >
                      <Plus size={14} />
                      <span className="hidden sm:inline">Tambah SPPG</span>
                    </button>
                  </div>
                </div>

                {loadingSppg ? (
                  <div className="py-12 flex justify-center items-center text-slate-400 text-xs gap-2">
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Memuat data SPPG...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-950/20">
                          <th className="py-3 px-4">Nama SPPG</th>
                          <th className="py-3 px-4 text-center">Kepala SPPG</th>
                          <th className="py-3 px-4 text-center">Pengawas Gizi</th>
                          <th className="py-3 px-4 text-center">Porsi Bsr / Kcl</th>
                          <th className="py-3 px-4 text-center">PMT (Balita/Bml/Bsi)</th>
                          <th className="py-3 px-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {sppgList.filter(s => s.nama_sppg.toLowerCase().includes(sppgSearch.toLowerCase())).length > 0 ? (
                          sppgList
                            .filter(s => s.nama_sppg.toLowerCase().includes(sppgSearch.toLowerCase()))
                            .map((sppg) => (
                              <tr key={sppg.id} className="text-xs text-slate-300 hover:bg-slate-900/20 transition-colors">
                                <td className="py-3.5 px-4 font-semibold text-white">{sppg.nama_sppg}</td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="text-indigo-400 font-medium">{sppg.kepala_sppg || "-"}</span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="text-emerald-400 font-medium">{sppg.pengawas_gizi || "-"}</span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="text-indigo-400 font-medium">{sppg.porsi_besar}</span>
                                  <span className="text-slate-500 mx-1">/</span>
                                  <span className="text-emerald-400 font-medium">{sppg.porsi_kecil}</span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span>{sppg.balita}</span>
                                  <span className="text-slate-600 mx-1">|</span>
                                  <span>{sppg.bumil}</span>
                                  <span className="text-slate-600 mx-1">|</span>
                                  <span>{sppg.busui}</span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleEditSppg(sppg)}
                                      className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-indigo-400 hover:text-indigo-300 rounded-lg transition-colors"
                                      title="Edit SPPG"
                                    >
                                      <Edit size={12} />
                                    </button>
                                    <button
                                      onClick={() => sppg.id && handleDeleteSppg(sppg.id)}
                                      className="p-1.5 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/30 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                                      title="Hapus SPPG"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 px-4 text-center text-slate-500">
                              Tidak ada data SPPG yang ditemukan.
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


          {/* TAB 4: PENGATURAN */}
          {activeTab === "pengaturan" && (
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl space-y-8">
              {/* Profile Config */}
              <div>
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <User size={18} className="text-indigo-400" />
                  <span>Profil Pengguna & Wilayah Tugas</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Nama Lengkap</label>
                    <input
                      type="text"
                      value={userProfile.name}
                      onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                      className="w-full p-3 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Email Sistem</label>
                    <input
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                      className="w-full p-3 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Wilayah Penugasan</label>
                    <input
                      type="text"
                      value={userProfile.region}
                      onChange={(e) => setUserProfile({ ...userProfile, region: e.target.value })}
                      className="w-full p-3 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-800" />

              {/* System Config */}
              <div className="space-y-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield size={18} className="text-indigo-400" />
                  <span>Sistem & Sinkronisasi</span>
                </h3>

                <div className="space-y-4">
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
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${
                        notificationsEnabled ? "bg-indigo-600 justify-end" : "bg-slate-800 justify-start"
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
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${
                        autoSync ? "bg-indigo-600 justify-end" : "bg-slate-800 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow" />
                    </button>
                  </div>
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
        </main>
      </div>

      {/* --- REVIEW MODAL DETAIL DIALOG --- */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          {/* Backdrop */}
          <div onClick={() => setSelectedReport(null)} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

          {/* Modal */}
          <div className="relative w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/50 rounded-xl md:rounded-2xl shadow-2xl shadow-indigo-500/5 overflow-hidden z-10">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                  <ClipboardList size={16} className="text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/25 uppercase tracking-wider">
                      Detail Laporan
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white mt-0.5 truncate">{selectedReport.sppgName}</h4>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 max-h-[85vh] md:max-h-[75vh] overflow-y-auto">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left Column - Photos */}
                <div className="flex-shrink-0 w-full md:w-56">
                  <div className="grid grid-cols-2 md:flex md:flex-col gap-4">
                  {/* Food Photo */}
                  <div className="group relative rounded-xl overflow-hidden border border-slate-700/50 bg-slate-950/60 shadow-lg">
                    {selectedReport.photoUrl ? (
                      <img
                        src={selectedReport.photoUrl}
                        alt="Foto Makanan"
                        loading="lazy"
                        className="w-full aspect-[4/3] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800/50 to-slate-950/50">
                        <Camera size={24} className="text-slate-600" />
                        <span className="text-[10px] text-slate-500 font-medium">Foto belum tersedia</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white/90 tracking-wide">
                      Foto Asli
                    </div>
                  </div>

                  {/* Poster Preview */}
                  <div className="group relative rounded-xl overflow-hidden border border-slate-700/50 bg-slate-950/60 shadow-lg">
                    {selectedReport.posterUrl ? (
                      <img
                        src={selectedReport.posterUrl}
                        alt="Poster Laporan"
                        loading="lazy"
                        className="w-full aspect-[4/5] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[4/5] flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800/50 to-slate-950/50">
                        <ImageIcon size={24} className="text-slate-600" />
                        <span className="text-[10px] text-slate-500 font-medium">Poster belum tersedia</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white/90 tracking-wide">
                      Poster
                    </div>
                  </div>
                  </div>
                </div>

                {/* Right Column - Info */}
                <div className="flex-1 min-w-0 flex flex-col gap-5">
                  {/* Date & Time row */}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-indigo-400" />
                      {(() => {
                        const d = selectedReport.date ? new Date(selectedReport.date + "T00:00:00") : new Date();
                        return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
                      })()}
                    </span>
                    <span className="text-slate-700">|</span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-emerald-400" />
                      {selectedReport.distributionTime}
                    </span>
                  </div>

                  {/* Menu */}
                  <div className="p-4 bg-slate-950/40 border border-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Utensils size={14} className="text-indigo-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Menu Makanan</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200 leading-relaxed">{selectedReport.menu}</p>
                  </div>

                  {/* Portion Metrics */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={14} className="text-indigo-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Penerima Manfaat</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 bg-gradient-to-b from-slate-950/60 to-slate-950/30 border border-slate-800/50 rounded-xl text-center">
                        <p className="text-[10px] font-medium text-slate-400">Total</p>
                        <p className="text-xl font-extrabold text-white mt-1">{selectedReport.totalBeneficiaries.toLocaleString("id-ID")}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-b from-indigo-950/30 to-slate-950/30 border border-indigo-800/30 rounded-xl text-center">
                        <p className="text-[10px] font-medium text-slate-400">Porsi Besar</p>
                        <p className="text-xl font-extrabold text-indigo-400 mt-1">{selectedReport.largePortions.toLocaleString("id-ID")}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-b from-emerald-950/30 to-slate-950/30 border border-emerald-800/30 rounded-xl text-center">
                        <p className="text-[10px] font-medium text-slate-400">Porsi Kecil</p>
                        <p className="text-xl font-extrabold text-emerald-400 mt-1">{selectedReport.smallPortions.toLocaleString("id-ID")}</p>
                      </div>
                    </div>

                    {/* B3 Pills */}
                    {(selectedReport.balita ?? 0) > 0 || (selectedReport.bumil ?? 0) > 0 || (selectedReport.busui ?? 0) > 0 ? (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mr-1">PMT B3:</span>
                        {(selectedReport.balita ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-semibold text-amber-400">
                            {selectedReport.balita} Balita
                          </span>
                        )}
                        {(selectedReport.bumil ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-semibold text-rose-400">
                            {selectedReport.bumil} Bumil
                          </span>
                        )}
                        {(selectedReport.busui ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-semibold text-purple-400">
                            {selectedReport.busui} Busui
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Notes */}
                  {selectedReport.notes && (
                    <div className="p-4 bg-slate-950/20 border border-slate-800/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Catatan</span>
                      </div>
                      <p className="text-xs text-slate-400 italic leading-relaxed">&ldquo;{selectedReport.notes}&rdquo;</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-4 bg-slate-950/50 border-t border-slate-800/80">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    disabled={!selectedReport.posterUrl}
                    onClick={async () => {
                      if (!selectedReport.posterUrl) return;
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
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition-all hover:scale-105 active:scale-95"
                  >
                    <Download size={14} />
                    Download Poster
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const caption = generateReportCaption(selectedReport);
                        await navigator.clipboard.writeText(caption);
                        showSettingsToast("Caption berhasil dicopy! Tempel di WhatsApp.", "success");
                      } catch {
                        showSettingsToast("Gagal copy caption. Silakan select & copy manual.", "error");
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-xl text-xs font-bold text-slate-200 transition-all hover:scale-105 active:scale-95"
                  >
                    <Copy size={14} />
                    Copy Caption
                  </button>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${
                    selectedReport.status === "Draft" && "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  } ${
                    selectedReport.status === "Approved" && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  } ${
                    selectedReport.status === "Sent" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      selectedReport.status === "Draft" && "bg-amber-400"
                    } ${selectedReport.status === "Approved" && "bg-indigo-400"} ${
                      selectedReport.status === "Sent" && "bg-emerald-400"
                    }`} />
                    {selectedReport.status}
                  </span>

                  {selectedReport.status === "Draft" && (
                    <button
                      onClick={() => updateReportStatus(selectedReport.id, "Approved")}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all hover:scale-105 active:scale-95"
                    >
                      <CheckCircle2 size={14} />
                      Approve
                    </button>
                  )}

                  {selectedReport.status === "Approved" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => updateReportStatus(selectedReport.id, "Draft")}
                        className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                      >
                        Kembalikan ke Draft
                      </button>
                      <button
                        onClick={() => updateReportStatus(selectedReport.id, "Sent")}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all hover:scale-105 active:scale-95"
                      >
                        <Send size={14} />
                        Kirim Laporan
                      </button>
                    </div>
                  )}

                  {selectedReport.status === "Sent" && (
                    <button
                      onClick={() => updateReportStatus(selectedReport.id, "Approved")}
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-350 border border-slate-700/50 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                    >
                      Batalkan Pengiriman
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PREVIEW MODAL --- */}
      {showPreviewModal && formPreviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-850 bg-slate-950/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-bold text-white text-base">Pratinjau Poster & Teks Laporan</h3>
                <p className="text-[10px] text-slate-500">Tinjau poster dan caption. Setelah disetujui, download poster lalu copy caption untuk dikirim ke grup WhatsApp.</p>
              </div>
              <button
                onClick={() => handleConfirmReport("cancel")}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-850 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto">
              {/* Left Column: Poster Image Preview */}
              <div className="space-y-2 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-start">Draft Poster Laporan</span>
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
                <div className="flex-1 p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-350 overflow-y-auto whitespace-pre-wrap select-all leading-relaxed shadow-inner">
                  {formPreviewData.caption}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-850 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={formIsConfirming || !formPreviewData.posterUrl}
                  onClick={async () => {
                    if (!formPreviewData.posterUrl) return;
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
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  <span>Download Poster</span>
                </button>
                <button
                  type="button"
                  disabled={!formPreviewData.caption}
                  onClick={async () => {
                    if (!formPreviewData.caption) return;
                    try {
                      await navigator.clipboard.writeText(formPreviewData.caption);
                      showSettingsToast("Caption berhasil dicopy! Tempel di WhatsApp.", "success");
                    } catch {
                      showSettingsToast("Gagal copy caption. Silakan select & copy manual.", "error");
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 border border-slate-600 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  <span>Copy Caption</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={formIsConfirming}
                  onClick={() => handleConfirmReport("cancel")}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300"
                >
                  Revisi / Batal
                </button>
                <button
                  type="button"
                  disabled={formIsConfirming}
                  onClick={() => handleConfirmReport("confirm")}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 ${
                    formIsConfirming ? "bg-indigo-700/60 cursor-not-allowed" : "bg-indigo-650 hover:bg-indigo-600 shadow-md"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div onClick={() => {
            setShowSppgModal(false);
            setEditingSppgId(null);
            setSppgForm({ nama_sppg: "", porsi_kecil: 0, porsi_besar: 0, balita: 0, bumil: 0, busui: 0, kepala_sppg: "", pengawas_gizi: "" });
          }} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/50 rounded-xl md:rounded-2xl shadow-2xl shadow-indigo-500/5 overflow-hidden z-10">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/30">
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
            <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">
              <form onSubmit={handleSaveSppg} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Nama SPPG</label>
                  <input
                    type="text"
                    placeholder="Contoh: SPPG Lombok Timur"
                    value={sppgForm.nama_sppg}
                    onChange={(e) => setSppgForm({ ...sppgForm, nama_sppg: e.target.value })}
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                      <Phone size={11} className="text-slate-500" />
                      Kepala SPPG
                    </label>
                    <input
                      type="text"
                      placeholder="6281234567890"
                      value={sppgForm.kepala_sppg}
                      onChange={(e) => setSppgForm({ ...sppgForm, kepala_sppg: e.target.value.replace(/\D/g, "") })}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                      <Phone size={11} className="text-slate-500" />
                      Pengawas Gizi
                    </label>
                    <input
                      type="text"
                      placeholder="6281234567890"
                      value={sppgForm.pengawas_gizi}
                      onChange={(e) => setSppgForm({ ...sppgForm, pengawas_gizi: e.target.value.replace(/\D/g, "") })}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
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
                      onChange={(e) => setSppgForm({ ...sppgForm, porsi_besar: Number(e.target.value) })}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase">Porsi Kecil (PAUD-TK)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={sppgForm.porsi_kecil || ""}
                      onChange={(e) => setSppgForm({ ...sppgForm, porsi_kecil: Number(e.target.value) })}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
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
                        onChange={(e) => setSppgForm({ ...sppgForm, balita: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Bumil</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={sppgForm.bumil || ""}
                        onChange={(e) => setSppgForm({ ...sppgForm, bumil: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Busui</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={sppgForm.busui || ""}
                        onChange={(e) => setSppgForm({ ...sppgForm, busui: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-indigo-500 text-xs"
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
                    className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 size={14} />
                    <span>{editingSppgId ? "Simpan Perubahan" : "Tambah SPPG"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Settings Toast Notification */}
      <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border bg-slate-950/90 backdrop-blur-md shadow-2xl transition-all duration-300 transform ${
        settingsToast.show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"
      } ${
        settingsToast.type === "success" ? "border-emerald-500/20" : "border-red-500/20"
      }`}>
        {settingsToast.type === "success" ? (
          <CheckCircle2 className="text-emerald-400 flex-shrink-0" size={18} />
        ) : (
          <span className="text-red-400 flex-shrink-0 font-bold text-base">!</span>
        )}
        <span className="text-xs font-semibold text-slate-200">{settingsToast.message}</span>
      </div>

      {/* --- BOTTOM NAV BAR (MOBILE ONLY) --- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
              activeTab === "dashboard" ? "text-indigo-400" : "text-slate-500"
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[9px] font-semibold">Dashboard</span>
            {activeTab === "dashboard" && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
          </button>

          <button
            onClick={() => setActiveTab("sppg")}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
              activeTab === "sppg" ? "text-indigo-400" : "text-slate-500"
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
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
              activeTab === "riwayat" ? "text-indigo-400" : "text-slate-500"
            }`}
          >
            <Clock size={20} />
            <span className="text-[9px] font-semibold">Riwayat</span>
            {activeTab === "riwayat" && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
          </button>

          <button
            onClick={() => setActiveTab("pengaturan")}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
              activeTab === "pengaturan" ? "text-indigo-400" : "text-slate-500"
            }`}
          >
            <Settings size={20} />
            <span className="text-[9px] font-semibold">Atur</span>
            {activeTab === "pengaturan" && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
          </button>
        </div>
      </nav>
    </div>
  );
}
