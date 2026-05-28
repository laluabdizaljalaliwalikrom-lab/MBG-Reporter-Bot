"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  TrendingUp,
  Clock,
  MapPin,
  Calendar,
  Sparkles,
  ArrowUpDown,
  LogOut,
  Bell,
  User,
  Shield,
  Locate,
  Bot,
  MessageSquare,
  RefreshCw,
  Database,
  Plus,
  Trash2,
  Edit
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
      const total = large + small;

      const cleanPhone = r.whatsapp_from ? r.whatsapp_from.replace("@c.us", "") : "";
      const formattedPhone = cleanPhone ? `+${cleanPhone}` : "Unknown";

      let sppgName = "SPPG Wilayah";
      let location = "Operasional Lapangan";

      if (cleanPhone.includes("812") || cleanPhone.includes("811")) {
        sppgName = "SPPG Menteng Jaya";
        location = "Jakarta Pusat";
      } else if (cleanPhone.includes("821") || cleanPhone.includes("822")) {
        sppgName = "SPPG Kebayoran Baru";
        location = "Jakarta Selatan";
      } else if (cleanPhone.includes("877") || cleanPhone.includes("878")) {
        sppgName = "SPPG Pajajaran";
        location = "Kota Bogor";
      } else if (cleanPhone.includes("813") || cleanPhone.includes("814")) {
        sppgName = "SPPG Margonda";
        location = "Kota Depok";
      } else if (cleanPhone.includes("852") || cleanPhone.includes("853")) {
        sppgName = "SPPG Cisadane";
        location = "Kota Tangerang";
      } else if (cleanPhone.includes("819") || cleanPhone.includes("818")) {
        sppgName = "SPPG Dago Elok";
        location = "Kota Bandung";
      }

      let dateStr = r.tanggal || "";
      if (!dateStr && r.created_at) {
        dateStr = r.created_at.split("T")[0];
      }

      return {
        id: r.id,
        date: dateStr || new Date().toISOString().split("T")[0],
        sppgName: `${sppgName} (${formattedPhone})`,
        location: location,
        totalBeneficiaries: total,
        largePortions: large,
        smallPortions: small,
        status: statusStr,
        menu: r.menu || "Belum ditentukan",
        picName: r.extracted_data?.PIC || `Petugas (${formattedPhone})`,
        picPhone: formattedPhone,
        distributionTime: r.created_at ? new Date(r.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB" : "11:30 WIB",
        temperatureServed: "62°C",
        notes: r.raw_message || undefined
      };
    });

    return dbMapped;
  }, [dbReports]);

  // Derived state from reportsList
  const reports = reportsList;

  const [activeTab, setActiveTab] = useState<"dashboard" | "laporan" | "pengaturan" | "sppg">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // WhatsApp Gateway Settings (MPWA) States
  const [whatsappApiKey, setWhatsappApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("mpwa_api_key") || "";
    }
    return "";
  });
  const [whatsappSender, setWhatsappSender] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("mpwa_sender") || "";
    }
    return "";
  });
  const [showApiKey, setShowApiKey] = useState(false);

  // Toast notification state for settings
  const [settingsToast, setSettingsToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false, message: "", type: "success"
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const showSettingsToast = (message: string, type: "success" | "error" = "success") => {
    setSettingsToast({ show: true, message, type });
    setTimeout(() => setSettingsToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // Load mpwa_sender from server-side API on mount
  useEffect(() => {
    async function loadSenderFromDb() {
      try {
        const res = await fetch("/api/settings?key=mpwa_sender");
        const data = await res.json();
        if (res.ok && data.value) {
          setWhatsappSender(data.value);
        }
      } catch (err) {
        console.error("Failed to load mpwa_sender:", err);
      }
    }
    loadSenderFromDb();
  }, []);

  // Connection Test States
  const [checkingConnections, setCheckingConnections] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<"idle" | "OK" | "ERROR">("idle");
  const [geminiMessage, setGeminiMessage] = useState("");
  const [whatsappStatus, setWhatsappStatus] = useState<"idle" | "OK" | "ERROR">("idle");
  const [whatsappMessage, setWhatsappMessage] = useState("");

  const handleCheckConnections = async () => {
    setCheckingConnections(true);
    setGeminiStatus("idle");
    setWhatsappStatus("idle");
    setGeminiMessage("Memeriksa...");
    setWhatsappMessage("Memeriksa...");

    try {
      const response = await fetch("/api/check-connections");
      const data = await response.json();

      if (response.ok && data) {
        if (data.gemini) {
          setGeminiStatus(data.gemini.status);
          setGeminiMessage(data.gemini.message);
        } else {
          setGeminiStatus("ERROR");
          setGeminiMessage("Tidak ada respons status Gemini.");
        }

        if (data.whatsapp) {
          setWhatsappStatus(data.whatsapp.status);
          setWhatsappMessage(data.whatsapp.message);
        } else {
          setWhatsappStatus("ERROR");
          setWhatsappMessage("Tidak ada respons status WhatsApp.");
        }
      } else {
        setGeminiStatus("ERROR");
        setWhatsappStatus("ERROR");
        setGeminiMessage(data.message || "Gagal mengambil status koneksi.");
        setWhatsappMessage(data.message || "Gagal mengambil status koneksi.");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan jaringan.";
      setGeminiStatus("ERROR");
      setWhatsappStatus("ERROR");
      setGeminiMessage(errorMsg);
      setWhatsappMessage(errorMsg);
    } finally {
      setCheckingConnections(false);
    }
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
  }
  const [sppgList, setSppgList] = useState<SppgData[]>([]);
  const [loadingSppg, setLoadingSppg] = useState(false);
  const [sppgForm, setSppgForm] = useState<SppgData>({
    nama_sppg: "",
    porsi_kecil: 0,
    porsi_besar: 0,
    balita: 0,
    bumil: 0,
    busui: 0
  });
  const [editingSppgId, setEditingSppgId] = useState<string | null>(null);
  const [sppgSearch, setSppgSearch] = useState("");

  const fetchSppgList = async () => {
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
  };

  useEffect(() => {
    fetchSppgList();
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
    Energi: 650, Protein: 30, Lemak: 15, Karbohidrat: 90, Serat: 6
  });
  const [formGiziKecil, setFormGiziKecil] = useState({
    Energi: 450, Protein: 25, Lemak: 12, Karbohidrat: 60, Serat: 4
  });
  
  const [formImageBase64, setFormImageBase64] = useState("");
  const [formTargetNumber, setFormTargetNumber] = useState("");
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);
  const [formPreviewData, setFormPreviewData] = useState<{ reportId: string; posterUrl: string; caption: string } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [formIsConfirming, setFormIsConfirming] = useState(false);

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
          busui: 0
        });
        setEditingSppgId(null);
        fetchSppgList();
      } else {
        alert("Gagal menyimpan data SPPG: " + json.message);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
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
      busui: sppg.busui
    });
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
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleSubmitReport = async () => {
    if (!formMenu.trim()) {
      alert("Detail Menu Makanan harus diisi!");
      return;
    }
    setFormIsSubmitting(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
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
          bufferImage: formImageBase64,
          targetNumber: formTargetNumber
        })
      });

      const resData = await response.json();
      if (response.ok && resData.action === "preview_ready") {
        setFormPreviewData({
          reportId: resData.reportId,
          posterUrl: resData.posterUrl,
          caption: resData.caption
        });
        setShowPreviewModal(true);
      } else {
        alert("Gagal membuat pratinjau: " + resData.message);
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
          reportId: formPreviewData.reportId,
          targetNumber: formTargetNumber
        })
      });

      const resData = await response.json();
      if (response.ok) {
        if (confirmAction === "confirm") {
          showSettingsToast("Laporan sukses disetujui & dikirim ke WhatsApp!", "success");
          // Reset form
          setFormMenu("");
          setFormPorsiBesar(0);
          setFormPorsiKecil(0);
          setFormBalita(0);
          setFormBumil(0);
          setFormBusui(0);
          setFormImageBase64("");
          setFormTargetNumber("");
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans overflow-x-hidden antialiased">
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
        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* TAB 1: DASHBOARD UTAMA */}
          {activeTab === "dashboard" && (
            <>
              {/* Top Welcome Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/60 to-slate-900 border border-indigo-500/20 relative overflow-hidden shadow-xl">
                <div className="absolute right-0 top-0 w-96 h-full opacity-10 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.6),transparent_70%)] pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Sparkles size={12} />
                      Dashboard Operasional
                    </span>
                    <h3 className="text-2xl font-bold text-white">Selamat Datang, Koordinator Wilayah</h3>
                    <p className="text-sm text-slate-400">
                      Berikut ringkasan statistik harian program Makanan Bergizi Gratis (MBG) hari ini.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <Calendar className="text-indigo-400" size={16} />
                    <span className="text-xs font-semibold text-slate-300">
                      {new Date().toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* THREE METRICS CARDS WITH GLASSMORPHISM */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Penerima */}
                <div className="relative group overflow-hidden rounded-2xl backdrop-blur-md bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 p-6 transition-all duration-300 hover:scale-[1.02] shadow-xl">
                  {/* Subtle card glow */}
                  <div className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full bg-blue-500/5 blur-xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Penerima</p>
                      <h4 className="text-3xl font-extrabold text-white mt-2">
                        {metrics.total.toLocaleString("id-ID")}
                      </h4>
                      <p className="text-xs text-indigo-400 mt-2 flex items-center gap-1">
                        <TrendingUp size={14} />
                        <span>+8.2% dari minggu lalu</span>
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner group-hover:scale-110 transition-transform">
                      <Users size={22} />
                    </div>
                  </div>
                </div>

                {/* Porsi Besar */}
                <div className="relative group overflow-hidden rounded-2xl backdrop-blur-md bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 p-6 transition-all duration-300 hover:scale-[1.02] shadow-xl">
                  <div className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full bg-indigo-500/5 blur-xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Porsi Besar (SD-SMP)</p>
                      <h4 className="text-3xl font-extrabold text-white mt-2">
                        {metrics.large.toLocaleString("id-ID")}
                      </h4>
                      <p className="text-xs text-indigo-400 mt-2 flex items-center gap-1">
                        <span>Porsi tinggi kalori & protein</span>
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner group-hover:scale-110 transition-transform">
                      <UtensilsCrossed size={22} />
                    </div>
                  </div>
                </div>

                {/* Porsi Kecil */}
                <div className="relative group overflow-hidden rounded-2xl backdrop-blur-md bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 p-6 transition-all duration-300 hover:scale-[1.02] shadow-xl">
                  <div className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full bg-emerald-500/5 blur-xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Porsi Kecil (PAUD-TK)</p>
                      <h4 className="text-3xl font-extrabold text-white mt-2">
                        {metrics.small.toLocaleString("id-ID")}
                      </h4>
                      <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                        <span>Porsi ramah balita & nutrisi mikro</span>
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform">
                      <Utensils size={22} />
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLE CONTAINER: RIWAYAT LAPORAN HARIAN */}
              <div className="bg-slate-950/40 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                {/* Search & Filter Header Panel */}
                <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-base">Riwayat Laporan SPPG</h4>
                    <p className="text-xs text-slate-400">Daftar laporan harian distribusi makanan bergizi gratis.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search Bar */}
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

                    {/* Status Dropdown */}
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
                      {/* Custom dropdown caret */}
                      <div className="absolute right-3 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-400" />
                    </div>

                    {/* Sort Order Toggle */}
                    <button
                      onClick={toggleSort}
                      className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-xs font-medium"
                      title="Urutkan Tanggal"
                    >
                      <ArrowUpDown size={14} />
                      <span className="hidden sm:inline">
                        {sortDirection === "asc" ? "Terlama" : "Terbaru"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Table Data list */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-950/20">
                        <th className="py-4 px-6">ID / Tanggal</th>
                        <th className="py-4 px-6">Satuan Pelayanan (SPPG)</th>
                        <th className="py-4 px-6 text-right">Penerima</th>
                        <th className="py-4 px-6 text-right">Porsi Besar</th>
                        <th className="py-4 px-6 text-right">Porsi Kecil</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredReports.length > 0 ? (
                        filteredReports.map((report) => (
                          <tr
                            key={report.id}
                            className="text-xs text-slate-300 hover:bg-slate-900/30 transition-colors"
                          >
                            <td className="py-4 px-6">
                              <div className="font-semibold text-white">{report.id}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <Calendar size={10} />
                                <span>{report.date}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-semibold text-slate-200">{report.sppgName}</div>
                              <div className="text-[10px] text-indigo-400 mt-0.5 flex items-center gap-1">
                                <MapPin size={10} />
                                <span>{report.location}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right font-medium text-white">
                              {report.totalBeneficiaries.toLocaleString("id-ID")}
                            </td>
                            <td className="py-4 px-6 text-right text-slate-400">
                              {report.largePortions.toLocaleString("id-ID")}
                            </td>
                            <td className="py-4 px-6 text-right text-slate-400">
                              {report.smallPortions.toLocaleString("id-ID")}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  report.status === "Draft" &&
                                  "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                } ${
                                  report.status === "Approved" &&
                                  "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                } ${
                                  report.status === "Sent" &&
                                  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    report.status === "Draft" && "bg-amber-400"
                                  } ${report.status === "Approved" && "bg-indigo-400"} ${
                                    report.status === "Sent" && "bg-emerald-400"
                                  }`}
                                />
                                <span>{report.status}</span>
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => setSelectedReport(report)}
                                className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-semibold tracking-wide transition-all"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 px-6 text-center text-slate-500">
                            Tidak ada laporan yang sesuai filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: LAPORAN DETAIL */}
          {activeTab === "laporan" && (
            <div className="space-y-6">
              <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-2">Form Pembuatan Laporan Baru</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Input data distribusi makanan harian dari SPPG. Harap verifikasi jumlah porsi sebelum disimpan.
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

                  <div className="grid grid-cols-5 gap-2 md:col-span-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Energi (kcal)</label>
                      <input
                        type="number"
                        value={formGiziBesar.Energi || ""}
                        onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Energi: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Protein (g)</label>
                      <input
                        type="number"
                        value={formGiziBesar.Protein || ""}
                        onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Protein: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Lemak (g)</label>
                      <input
                        type="number"
                        value={formGiziBesar.Lemak || ""}
                        onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Lemak: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Karbo (g)</label>
                      <input
                        type="number"
                        value={formGiziBesar.Karbohidrat || ""}
                        onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Karbohidrat: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Serat (g)</label>
                      <input
                        type="number"
                        value={formGiziBesar.Serat || ""}
                        onChange={(e) => setFormGiziBesar({ ...formGiziBesar, Serat: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* --- SECTION 5: NILAI GIZI PORSI KECIL --- */}
                  <div className="md:col-span-2 border-b border-slate-800 pb-2 pt-2">
                    <h4 className="text-sm font-semibold text-indigo-400">Nilai Gizi Porsi Kecil (PAUD-TK)</h4>
                  </div>

                  <div className="grid grid-cols-5 gap-2 md:col-span-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Energi (kcal)</label>
                      <input
                        type="number"
                        value={formGiziKecil.Energi || ""}
                        onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Energi: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Protein (g)</label>
                      <input
                        type="number"
                        value={formGiziKecil.Protein || ""}
                        onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Protein: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Lemak (g)</label>
                      <input
                        type="number"
                        value={formGiziKecil.Lemak || ""}
                        onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Lemak: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Karbo (g)</label>
                      <input
                        type="number"
                        value={formGiziKecil.Karbohidrat || ""}
                        onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Karbohidrat: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Serat (g)</label>
                      <input
                        type="number"
                        value={formGiziKecil.Serat || ""}
                        onChange={(e) => setFormGiziKecil({ ...formGiziKecil, Serat: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* --- SECTION 6: FOTO MAKANAN & TUJUAN --- */}
                  <div className="md:col-span-2 border-b border-slate-800 pb-2 pt-2">
                    <h4 className="text-sm font-semibold text-indigo-400">Media & Tujuan Pengiriman</h4>
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
                      <div className="mt-2 text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>Gambar siap diunggah</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">No. WhatsApp Tujuan (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Kosongkan untuk kirim ke Grup Pemangku Kepentingan"
                      value={formTargetNumber}
                      onChange={(e) => setFormTargetNumber(e.target.value)}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setFormMenu("");
                        setFormPorsiBesar(0);
                        setFormPorsiKecil(0);
                        setFormBalita(0);
                        setFormBumil(0);
                        setFormBusui(0);
                        setFormImageBase64("");
                        setFormTargetNumber("");
                      }}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300"
                    >
                      Reset Form
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
                      <span>{formIsSubmitting ? "Memproses..." : "Pratinjau Laporan"}</span>
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
          )}          {/* TAB 3: MASTER DATA SPPG */}
          {activeTab === "sppg" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form SPPG */}
              <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl h-fit">
                <h3 className="text-lg font-bold text-white mb-2">
                  {editingSppgId ? "Edit Data SPPG" : "Tambah SPPG Baru"}
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Input data master SPPG beserta jumlah penerima manfaat bawaannya.
                </p>

                <form onSubmit={handleSaveSppg} className="space-y-4">
                  <div className="space-y-2">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">Porsi Besar (SD-SMP)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={sppgForm.porsi_besar || ""}
                        onChange={(e) => setSppgForm({ ...sppgForm, porsi_besar: Number(e.target.value) })}
                        className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
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
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-3">PMT B3</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Balita</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={sppgForm.balita || ""}
                          onChange={(e) => setSppgForm({ ...sppgForm, balita: Number(e.target.value) })}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-250 outline-none focus:border-indigo-500 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Bumil</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={sppgForm.bumil || ""}
                          onChange={(e) => setSppgForm({ ...sppgForm, bumil: Number(e.target.value) })}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-250 outline-none focus:border-indigo-500 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Busui</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={sppgForm.busui || ""}
                          onChange={(e) => setSppgForm({ ...sppgForm, busui: Number(e.target.value) })}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-250 outline-none focus:border-indigo-500 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                    {editingSppgId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSppgId(null);
                          setSppgForm({
                            nama_sppg: "",
                            porsi_kecil: 0,
                            porsi_besar: 0,
                            balita: 0,
                            bumil: 0,
                            busui: 0
                          });
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 rounded-xl text-xs font-semibold text-white shadow-md shadow-indigo-600/10 flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      <span>{editingSppgId ? "Simpan Perubahan" : "Tambah SPPG"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabel SPPG */}
              <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl lg:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">Daftar SPPG</h3>
                    <p className="text-xs text-slate-400">Total terdaftar: {sppgList.length} SPPG</p>
                  </div>
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
                              <tr key={sppg.id} className="text-xs text-slate-350 hover:bg-slate-900/20 transition-colors">
                                <td className="py-3.5 px-4 font-semibold text-white">{sppg.nama_sppg}</td>
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
                            <td colSpan={4} className="py-8 px-4 text-center text-slate-500">
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

              {/* WhatsApp Gateway Settings (MPWA) */}
              <div className="space-y-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Locate size={18} className="text-indigo-400" />
                  <span>Pengaturan WhatsApp Gateway (MPWA)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-400 uppercase">MPWA API Key</label>
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        {showApiKey ? "Sembunyikan" : "Tampilkan"}
                      </button>
                    </div>
                    <input
                      type={showApiKey ? "text" : "password"}
                      placeholder="Masukkan MPWA API Key..."
                      value={whatsappApiKey}
                      onChange={(e) => setWhatsappApiKey(e.target.value)}
                      className="w-full p-3 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-xs outline-none"
                    />
                    <p className="text-[10px] text-slate-500">
                      Jika dikosongkan, sistem akan menggunakan key dari environment variable (`WHATSAPP_API_KEY` / `MPWA_API_KEY`).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Sender Phone ID / Number</label>
                    <input
                      type="text"
                      placeholder="Contoh: 6281234567890"
                      value={whatsappSender}
                      onChange={(e) => setWhatsappSender(e.target.value)}
                      className="w-full p-3 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-xs outline-none"
                    />
                    <p className="text-[10px] text-slate-500">
                      Nomor pengirim atau ID perangkat yang terdaftar di MPWA. Format angka lengkap beserta kode negara (misal: 6281234567890). Disimpan ke database Supabase.
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-800" />

              {/* API Connection Check */}
              <div className="space-y-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield size={18} className="text-indigo-400" />
                  <span>Status Koneksi Integrasi</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status AI (Gemini) */}
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 flex flex-col justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        geminiStatus === "OK" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : geminiStatus === "ERROR"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-slate-800/80 text-slate-400 border border-slate-700"
                      }`}>
                        <Bot size={20} />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-white">Status AI (Gemini)</h4>
                        <p className="text-[10px] text-slate-500">Koneksi model analisis AI Gemini</p>
                      </div>
                    </div>
                    <div>
                      {geminiStatus !== "idle" ? (
                        <div className="flex items-start gap-1.5 mt-1">
                          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            geminiStatus === "OK" ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : "bg-red-500 shadow-lg shadow-red-500/50"
                          }`} />
                          <span className={`text-xs font-medium leading-relaxed ${
                            geminiStatus === "OK" ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {geminiMessage}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum diperiksa</span>
                      )}
                    </div>
                  </div>

                  {/* Status Gateway (MPWA) */}
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 flex flex-col justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        whatsappStatus === "OK" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : whatsappStatus === "ERROR"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-slate-800/80 text-slate-400 border border-slate-700"
                      }`}>
                        <MessageSquare size={20} />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-white">Status Gateway (MPWA)</h4>
                        <p className="text-[10px] text-slate-500">Koneksi pengiriman pesan WhatsApp</p>
                      </div>
                    </div>
                    <div>
                      {whatsappStatus !== "idle" ? (
                        <div className="flex items-start gap-1.5 mt-1">
                          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            whatsappStatus === "OK" ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : "bg-red-500 shadow-lg shadow-red-500/50"
                          }`} />
                          <span className={`text-xs font-medium leading-relaxed ${
                            whatsappStatus === "OK" ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {whatsappMessage}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum diperiksa</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-start">
                  <button
                    type="button"
                    disabled={checkingConnections}
                    onClick={handleCheckConnections}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <RefreshCw size={14} className={checkingConnections ? "animate-spin" : ""} />
                    <span>Segarkan Status Koneksi</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-800" />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (typeof window !== "undefined") {
                      window.localStorage.removeItem("mpwa_api_key");
                      window.localStorage.removeItem("mpwa_sender");
                    }
                    setWhatsappApiKey("");
                    setWhatsappSender("");
                    showSettingsToast("Pengaturan lokal di-reset ke nilai default.", "success");
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300"
                >
                  Reset Default
                </button>
                <button
                  type="button"
                  disabled={savingSettings}
                  onClick={async () => {
                    setSavingSettings(true);
                    try {
                      // Save API key to localStorage (client-side only)
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem("mpwa_api_key", whatsappApiKey);
                      }

                      // Save sender via server-side API route
                      const cleanedSender = whatsappSender.replace(/\D/g, "");
                      if (cleanedSender) {
                        const res = await fetch("/api/settings", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ key: "mpwa_sender", value: cleanedSender })
                        });
                        const result = await res.json();
                        if (!res.ok) {
                          throw new Error(result.error || "Gagal menyimpan ke database.");
                        }
                        setWhatsappSender(cleanedSender);
                      }

                      showSettingsToast("Pengaturan berhasil disimpan!", "success");
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message
                        : (typeof err === "object" && err !== null && "message" in err)
                        ? String((err as { message: unknown }).message)
                        : JSON.stringify(err);
                      showSettingsToast(msg || "Gagal menyimpan pengaturan.", "error");
                    } finally {
                      setSavingSettings(false);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-xs font-bold text-white transition-all"
                >
                  {savingSettings ? "Menyimpan..." : "Simpan Pengaturan"}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- REVIEW MODAL DETAIL DIALOG (GLASSMORPHISM PANEL) --- */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Modal Backdrop overlay */}
          <div
            onClick={() => setSelectedReport(null)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
          />

          {/* Modal Body Card */}
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-10 transition-all">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-wide">
                  Detail Laporan SPPG
                </span>
                <h4 className="text-base font-bold text-white mt-1">{selectedReport.sppgName}</h4>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-850 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* ID & Date grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ID Laporan</span>
                  <p className="text-xs font-semibold text-slate-200">{selectedReport.id}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Distribusi</span>
                  <p className="text-xs font-semibold text-slate-200">{selectedReport.date}</p>
                </div>
              </div>

              <div className="h-px bg-slate-800" />

              {/* Portion Metrics */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jumlah Porsi Terdistribusi</span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl text-center">
                    <p className="text-[10px] font-medium text-slate-400">Total Penerima</p>
                    <p className="text-base font-extrabold text-white mt-1">
                      {selectedReport.totalBeneficiaries.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl text-center">
                    <p className="text-[10px] font-medium text-slate-400">Porsi Besar</p>
                    <p className="text-base font-extrabold text-indigo-400 mt-1">
                      {selectedReport.largePortions.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl text-center">
                    <p className="text-[10px] font-medium text-slate-400">Porsi Kecil</p>
                    <p className="text-base font-extrabold text-emerald-400 mt-1">
                      {selectedReport.smallPortions.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Details */}
              <div className="space-y-1.5 p-4 bg-slate-950/30 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Utensils size={12} className="text-indigo-400" /> Menu Makanan Bergizi
                </span>
                <p className="text-xs text-slate-350 leading-relaxed font-medium mt-1">{selectedReport.menu}</p>
              </div>

              {/* Extra log metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jam Distribusi</span>
                  <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" />
                    {selectedReport.distributionTime}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Suhu Makanan Saat Disajikan</span>
                  <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-emerald-400" />
                    {selectedReport.temperatureServed} (Sesuai Standar)
                  </p>
                </div>
              </div>

              {/* PIC Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama PIC Lapangan</span>
                  <p className="text-xs font-semibold text-slate-200">{selectedReport.picName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kontak Telpon PIC</span>
                  <p className="text-xs font-semibold text-indigo-450">{selectedReport.picPhone}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedReport.notes && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Catatan Lapangan</span>
                  <p className="text-xs text-slate-400 italic">&ldquo;{selectedReport.notes}&rdquo;</p>
                </div>
              )}
            </div>

            {/* Footer with Status Actions */}
            <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Status Saat Ini:</span>
                <span className={`text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full ${
                  selectedReport.status === "Draft" && "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                } ${
                  selectedReport.status === "Approved" && "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                } ${
                  selectedReport.status === "Sent" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}>
                  {selectedReport.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedReport.status === "Draft" && (
                  <button
                    onClick={() => updateReportStatus(selectedReport.id, "Approved")}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <CheckCircle2 size={14} />
                    Approve
                  </button>
                )}

                {selectedReport.status === "Approved" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateReportStatus(selectedReport.id, "Draft")}
                      className="px-3 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition-all"
                    >
                      Kembalikan ke Draft
                    </button>
                    <button
                      onClick={() => updateReportStatus(selectedReport.id, "Sent")}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      <Send size={14} />
                      Kirim Laporan
                    </button>
                  </div>
                )}

                {selectedReport.status === "Sent" && (
                  <button
                    onClick={() => updateReportStatus(selectedReport.id, "Approved")}
                    className="px-3 py-2 bg-slate-850 hover:bg-slate-800 text-slate-350 border border-slate-800 rounded-xl text-xs font-bold transition-all"
                  >
                    Batalkan Pengiriman
                  </button>
                )}
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
                <p className="text-[10px] text-slate-500">Tinjau poster dan teks laporan sebelum dikirim ke grup pemangku kepentingan.</p>
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

              {/* Right Column: WhatsApp Caption Preview */}
              <div className="space-y-2 flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teks Laporan WhatsApp</span>
                <div className="flex-1 p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-350 overflow-y-auto whitespace-pre-wrap select-all leading-relaxed shadow-inner">
                  {formPreviewData.caption}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-850 flex items-center justify-end gap-3">
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
                <span>{formIsConfirming ? "Mengirim..." : "Setujui & Kirim ke WhatsApp"}</span>
              </button>
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
    </div>
  );
}
