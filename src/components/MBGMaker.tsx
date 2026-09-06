"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ChefHat,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Save,
  FileText,
  ShoppingCart,
  Printer,
  BookTemplate,
  Bookmark,
  RefreshCw,
  ArrowLeft,
  GripVertical,
  Utensils,
  Baby,
  Heart,
  Milk,
  AlertCircle,
  CheckCircle2,
  Layers,
  Sparkles,
  Wand2,
  CheckSquare,
  Square,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface Ingredient {
  bahan: string;
  jumlah_per_porsi: number;
  satuan: string;
}

interface NilaiGizi {
  energi: number;
  protein: number;
  lemak: number;
  karbohidrat: number;
  serat: number;
}

interface MenuVariant {
  nama_menu: string;
  komposisi: Ingredient[];
  resep: string;
  langkah_persiapan: string[];
  langkah_pengolahan: string[];
  nilai_gizi: NilaiGizi;
  jumlah_porsi: number;
}

interface MenuVariantWithRef extends MenuVariant {
  sama_dengan: string | null; // null = beda, or "porsi_besar" | "porsi_kecil" | etc.
}

interface MenuData {
  porsi_besar: MenuVariant;
  porsi_kecil: MenuVariantWithRef;
  pmt_balita: MenuVariantWithRef;
  pmt_bumil: MenuVariantWithRef;
  pmt_busui: MenuVariantWithRef;
}

interface MBGMenu {
  id: string;
  created_at: string;
  updated_at: string;
  nama_menu: string;
  tanggal: string | null;
  sppg_id: string | null;
  menu_data: MenuData;
  status: string;
  catatan: string | null;
  is_template: boolean;
  template_name: string | null;
  sppg_data?: {
    nama_sppg: string;
    porsi_besar: number;
    porsi_kecil: number;
    balita: number;
    bumil: number;
    busui: number;
  } | null;
}

interface MBGMakerProps {
  sppgList: SppgData[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_GIZI: NilaiGizi = { energi: 0, protein: 0, lemak: 0, karbohidrat: 0, serat: 0 };

const EMPTY_VARIANT: MenuVariant = {
  nama_menu: "",
  komposisi: [],
  resep: "",
  langkah_persiapan: [],
  langkah_pengolahan: [],
  nilai_gizi: { ...EMPTY_GIZI },
  jumlah_porsi: 0,
};

const EMPTY_VARIANT_REF: MenuVariantWithRef = { ...EMPTY_VARIANT, sama_dengan: null };

const EMPTY_MENU_DATA: MenuData = {
  porsi_besar: { ...EMPTY_VARIANT },
  porsi_kecil: { ...EMPTY_VARIANT_REF },
  pmt_balita: { ...EMPTY_VARIANT_REF },
  pmt_bumil: { ...EMPTY_VARIANT_REF },
  pmt_busui: { ...EMPTY_VARIANT_REF },
};

type VariantKey = keyof MenuData;

const VARIANT_CONFIG: { key: VariantKey; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { key: "porsi_besar", label: "Porsi Besar", desc: "SD Kelas 4-6, SMP, SMA, Guru/Tendik", icon: <Utensils size={18} />, color: "indigo" },
  { key: "porsi_kecil", label: "Porsi Kecil", desc: "PAUD-TK, SD Kelas 1-3", icon: <Utensils size={16} />, color: "sky" },
  { key: "pmt_balita", label: "PMT Balita", desc: "Pemberian Makanan Tambahan Balita", icon: <Baby size={18} />, color: "amber" },
  { key: "pmt_bumil", label: "PMT Bumil", desc: "Pemberian Makanan Tambahan Ibu Hamil", icon: <Heart size={18} />, color: "pink" },
  { key: "pmt_busui", label: "PMT Busui", desc: "Pemberian Makanan Tambahan Ibu Menyusui", icon: <Milk size={18} />, color: "emerald" },
];

const SATUAN_OPTIONS = ["gram", "kg", "ml", "liter", "butir", "buah", "batang", "lembar", "siung", "sdm", "sdt", "bungkus", "potong", "ekor", "ikat"];

// The list of variants that can be referenced via "sama_dengan"
const REFERENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "porsi_besar", label: "Porsi Besar" },
  { value: "porsi_kecil", label: "Porsi Kecil" },
  { value: "pmt_balita", label: "PMT Balita" },
  { value: "pmt_bumil", label: "PMT Bumil" },
  { value: "pmt_busui", label: "PMT Busui" },
];

// ─── Helper ──────────────────────────────────────────────────────────────────

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function getVariantLabel(key: string): string {
  return VARIANT_CONFIG.find((v) => v.key === key)?.label ?? key;
}

/** Resolve a variant: if it references another, follow the chain (max depth 5). Preserves own jumlah_porsi if specified. */
function resolveVariant(menuData: MenuData, key: VariantKey, depth = 0): MenuVariant {
  if (!menuData) return EMPTY_VARIANT;
  if (depth > 5) return EMPTY_VARIANT;
  const v = menuData[key];
  if (!v) return EMPTY_VARIANT;

  if ("sama_dengan" in v && v.sama_dengan) {
    const target = resolveVariant(menuData, v.sama_dengan as VariantKey, depth + 1);
    // Inherit recipe, composition, steps, nutrition from target, but keep this variant's own jumlah_porsi if > 0
    return {
      ...target,
      jumlah_porsi: (v.jumlah_porsi && v.jumlah_porsi > 0) ? v.jumlah_porsi : target.jumlah_porsi,
    };
  }
  return v;
}

function detectKategoriBahan(bahan: string): string {
  const b = bahan.toLowerCase();
  if (b.includes("beras") || b.includes("nasi") || b.includes("roti") || b.includes("kentang") || b.includes("ubi") || b.includes("singkong") || b.includes("jagung") || b.includes("mie") || b.includes("bihun") || b.includes("oat")) {
    return "Karbohidrat & Pokok";
  }
  if (b.includes("ayam") || b.includes("daging") || b.includes("sapi") || b.includes("ikan") || b.includes("telur") || b.includes("udang") || b.includes("cumi") || b.includes("bakso") || b.includes("sosis") || b.includes("kornet")) {
    return "Lauk Hewani (Protein)";
  }
  if (b.includes("tahu") || b.includes("tempe") || b.includes("kacang") || b.includes("kedelai") || b.includes("oncom")) {
    return "Lauk Nabati";
  }
  if (b.includes("sayur") || b.includes("bayam") || b.includes("kangkung") || b.includes("wortel") || b.includes("buncis") || b.includes("labu") || b.includes("kubis") || b.includes("kol") || b.includes("sawi") || b.includes("tomat") || b.includes("brokoli") || b.includes("tauge") || b.includes("katuk") || b.includes("kelor")) {
    return "Sayuran Segar";
  }
  if (b.includes("pisang") || b.includes("semangka") || b.includes("melon") || b.includes("jeruk") || b.includes("pepaya") || b.includes("apel") || b.includes("anggur") || b.includes("buah")) {
    return "Buah-Buahan";
  }
  if (b.includes("bawang") || b.includes("cabai") || b.includes("cabe") || b.includes("garam") || b.includes("gula") || b.includes("merica") || b.includes("lada") || b.includes("ketumbar") || b.includes("kemiri") || b.includes("kunyit") || b.includes("jahe") || b.includes("lengkuas") || b.includes("salam") || b.includes("serai") || b.includes("kecap") || b.includes("saus") || b.includes("minyak")) {
    return "Bumbu & Minyak";
  }
  return "Bahan Lainnya";
}

export interface ShoppingListItem {
  bahan: string;
  totalJumlah: number;
  satuan: string;
  sources: string[];
  kategori: string;
  isStandarPorsi?: boolean;
}

/** Build combined shopping list from all variants. */
function buildShoppingList(menuData: MenuData | null | undefined): ShoppingListItem[] {
  if (!menuData) return [];
  const map = new Map<string, { totalJumlah: number; satuan: string; sources: string[]; kategori: string }>();

  // Calculate total portions across all variants
  let totalPorsiSemua = 0;
  for (const vc of VARIANT_CONFIG) {
    const rawV = menuData[vc.key];
    const resolved = resolveVariant(menuData, vc.key);
    const porsi = Number((rawV && rawV.jumlah_porsi) || resolved.jumlah_porsi || 0);
    totalPorsiSemua += porsi;
  }

  // If all portions are 0 (e.g. template or unassigned SPPG), calculate per standard 1 portion each variant
  const useStandarPerPorsi = totalPorsiSemua === 0;

  for (const vc of VARIANT_CONFIG) {
    const rawV = menuData[vc.key];
    const resolved = resolveVariant(menuData, vc.key);
    const porsi = useStandarPerPorsi ? 1 : Number((rawV && rawV.jumlah_porsi) || resolved.jumlah_porsi || 0);

    if (porsi <= 0) continue;

    if (Array.isArray(resolved.komposisi)) {
      for (const rawIng of resolved.komposisi) {
        if (!rawIng) continue;
        const ing = rawIng as Partial<Ingredient> & { nama_bahan?: string; jumlah?: number; kategori?: string };
        const namaBahan = (ing.bahan || ing.nama_bahan || "").trim();
        if (!namaBahan) continue;

        const satuan = (ing.satuan || "gram").trim();
        const mapKey = `${namaBahan.toLowerCase()}||${satuan}`;
        const existing = map.get(mapKey);
        const jumlahPerPorsi = Number(ing.jumlah_per_porsi ?? ing.jumlah ?? 0);
        const total = jumlahPerPorsi * porsi;
        const kategori = ing.kategori ? ing.kategori.replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase()) : detectKategoriBahan(namaBahan);

        if (existing) {
          existing.totalJumlah += total;
          if (!existing.sources.includes(vc.label)) existing.sources.push(vc.label);
        } else {
          map.set(mapKey, { totalJumlah: total, satuan: satuan, sources: [vc.label], kategori });
        }
      }
    }
  }

  return Array.from(map.entries()).map(([k, v]) => ({
    bahan: k.split("||")[0].replace(/^\w/, (c) => c.toUpperCase()),
    ...v,
    isStandarPorsi: useStandarPerPorsi,
  }));
}

function formatNumber(n: number): string {
  if (n >= 1000) return n.toLocaleString("id-ID");
  return String(n);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MBGMaker({ sppgList }: MBGMakerProps) {
  // ── State ────────────────────────────────────────────────────────────────
  const [menus, setMenus] = useState<MBGMenu[]>([]);
  const [templates, setTemplates] = useState<MBGMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Views: "list" | "create" | "edit" | "detail" | "shopping"
  const [view, setView] = useState<"list" | "create" | "edit" | "detail" | "shopping">("list");
  const [selectedMenu, setSelectedMenu] = useState<MBGMenu | null>(null);

  // List filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "FINALIZED">("ALL");
  const [showTemplates, setShowTemplates] = useState(false);

  // Shopping list filters & checklist
  const [shoppingCategoryFilter, setShoppingCategoryFilter] = useState<string>("ALL");
  const [shoppingCheckedItems, setShoppingCheckedItems] = useState<Set<string>>(new Set());

  // Form state
  const [formNamaMenu, setFormNamaMenu] = useState("");
  const [formTanggal, setFormTanggal] = useState(() => new Date().toISOString().split("T")[0]);
  const [formSppgId, setFormSppgId] = useState<string>("");
  const [formMenuData, setFormMenuData] = useState<MenuData>(deepClone(EMPTY_MENU_DATA));
  const [formCatatan, setFormCatatan] = useState("");
  const [formStatus, setFormStatus] = useState<"DRAFT" | "FINALIZED">("DRAFT");
  const [allSameMenu, setAllSameMenu] = useState(false);

  // Accordion expand state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["info", "porsi_besar"]));

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // Template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateSaveName, setTemplateSaveName] = useState("");
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);

  // AI State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTargetVariant, setAiTargetVariant] = useState<"all" | VariantKey>("all");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCalculatingGizi, setAiCalculatingGizi] = useState<VariantKey | null>(null);
  const [aiAdaptingVariant, setAiAdaptingVariant] = useState<VariantKey | null>(null);

  // AI Suggestions modal
  const [showAiSuggestionsModal, setShowAiSuggestionsModal] = useState(false);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);
  const [aiSuggestionsData, setAiSuggestionsData] = useState<{
    skor_kebugaran_gizi?: number;
    status_evaluasi?: string;
    ringkasan?: string;
    kelebihan?: string[];
    kekurangan?: string[];
    saran_ahli_gizi?: string[];
    tips_keamanan_pangan?: string[];
  } | null>(null);

  // Print ref
  const printRef = useRef<HTMLDivElement>(null);

  // ── Toast helper ─────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Data Fetching ────────────────────────────────────────────────────────
  const fetchMenus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/menus");
      const json = await res.json();
      if (json.status === "success") {
        const all: MBGMenu[] = json.data || [];
        setMenus(all.filter((m: MBGMenu) => !m.is_template));
        setTemplates(all.filter((m: MBGMenu) => m.is_template));
      }
    } catch (err) {
      console.error("Gagal memuat menu:", err);
      showToast("Gagal memuat data menu.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchMenus();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMenus]);

  // Handlers for SPPG selection and All-Same-Menu toggle
  const handleSppgChange = useCallback((sppgId: string) => {
    setFormSppgId(sppgId);
    if (!sppgId) return;
    const sppg = sppgList.find((s) => s.id === sppgId);
    if (!sppg) return;

    setFormMenuData((prev) => {
      const next = deepClone(prev);
      next.porsi_besar.jumlah_porsi = sppg.porsi_besar;
      next.porsi_kecil.jumlah_porsi = sppg.porsi_kecil;
      next.pmt_balita.jumlah_porsi = sppg.balita;
      next.pmt_bumil.jumlah_porsi = sppg.bumil;
      next.pmt_busui.jumlah_porsi = sppg.busui;
      return next;
    });
  }, [sppgList]);

  const handleAllSameMenuToggle = useCallback((checked: boolean) => {
    setAllSameMenu(checked);
    if (checked) {
      setFormMenuData((prev) => {
        const next = deepClone(prev);
        (["porsi_kecil", "pmt_balita", "pmt_bumil", "pmt_busui"] as VariantKey[]).forEach((k) => {
          (next[k] as MenuVariantWithRef).sama_dengan = "porsi_besar";
        });
        return next;
      });
    }
  }, []);

  // ── Form helpers ─────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setFormNamaMenu("");
    setFormTanggal(new Date().toISOString().split("T")[0]);
    setFormSppgId("");
    setFormMenuData(deepClone(EMPTY_MENU_DATA));
    setFormCatatan("");
    setFormStatus("DRAFT");
    setAllSameMenu(false);
    setExpandedSections(new Set(["info", "porsi_besar"]));
  }, []);

  const loadMenuIntoForm = useCallback((menu: MBGMenu) => {
    setFormNamaMenu(menu.nama_menu);
    setFormTanggal(menu.tanggal || new Date().toISOString().split("T")[0]);
    setFormSppgId(menu.sppg_id || "");
    setFormMenuData(deepClone(menu.menu_data || EMPTY_MENU_DATA));
    setFormCatatan(menu.catatan || "");
    setFormStatus(menu.status as "DRAFT" | "FINALIZED");

    // Detect if "all same"
    const md = menu.menu_data;
    if (md) {
      const allRef = (["porsi_kecil", "pmt_balita", "pmt_bumil", "pmt_busui"] as VariantKey[]).every(
        (k) => (md[k] as MenuVariantWithRef).sama_dengan === "porsi_besar"
      );
      setAllSameMenu(allRef);
    }
    setExpandedSections(new Set(["info", "porsi_besar"]));
  }, []);

  // ── Variant update helper ────────────────────────────────────────────────
  const updateVariant = useCallback((key: VariantKey, updater: (v: MenuVariant | MenuVariantWithRef) => void) => {
    setFormMenuData((prev) => {
      const next = deepClone(prev);
      updater(next[key]);
      return next;
    });
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (asTemplate = false) => {
    if (!formNamaMenu.trim()) {
      showToast("Nama menu wajib diisi!", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nama_menu: formNamaMenu.trim(),
        tanggal: formTanggal || null,
        sppg_id: formSppgId || null,
        menu_data: formMenuData,
        status: formStatus,
        catatan: formCatatan || null,
        is_template: asTemplate,
        template_name: asTemplate ? (templateSaveName.trim() || formNamaMenu.trim()) : null,
      };

      let res: Response;
      if (view === "edit" && selectedMenu) {
        res = await fetch("/api/menus", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedMenu.id, ...payload }),
        });
      } else {
        res = await fetch("/api/menus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (json.status === "success") {
        showToast(asTemplate ? "Template berhasil disimpan!" : (view === "edit" ? "Menu berhasil diperbarui!" : "Menu berhasil dibuat!"));
        await fetchMenus();
        if (!asTemplate) {
          resetForm();
          setView("list");
        }
        setShowTemplateModal(false);
        setTemplateSaveName("");
      } else {
        showToast(json.message || "Gagal menyimpan.", "error");
      }
    } catch (err) {
      console.error("Save error:", err);
      showToast("Terjadi kesalahan saat menyimpan.", "error");
    } finally {
      setSaving(false);
    }
  }, [formNamaMenu, formTanggal, formSppgId, formMenuData, formStatus, formCatatan, templateSaveName, view, selectedMenu, showToast, fetchMenus, resetForm]);

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Yakin ingin menghapus menu ini?")) return;
    try {
      const res = await fetch(`/api/menus?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status === "success") {
        showToast("Menu berhasil dihapus!");
        await fetchMenus();
        if (selectedMenu?.id === id) {
          setView("list");
          setSelectedMenu(null);
        }
      } else {
        showToast(json.message || "Gagal menghapus.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan.", "error");
    }
  }, [showToast, fetchMenus, selectedMenu]);

  // ── Duplicate ────────────────────────────────────────────────────────────
  const handleDuplicate = useCallback((menu: MBGMenu) => {
    loadMenuIntoForm(menu);
    setFormNamaMenu(menu.nama_menu + " (Salinan)");
    setView("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [loadMenuIntoForm]);

  // ── Load Template ────────────────────────────────────────────────────────
  const handleLoadTemplate = useCallback((tmpl: MBGMenu) => {
    loadMenuIntoForm(tmpl);
    setFormNamaMenu("");
    setFormTanggal(new Date().toISOString().split("T")[0]);
    setFormSppgId("");
    setShowLoadTemplateModal(false);
    showToast(`Template "${tmpl.template_name || tmpl.nama_menu}" dimuat!`);
  }, [loadMenuIntoForm, showToast]);

  // ── AI Handlers ──────────────────────────────────────────────────────────
  const handleAiGenerateMenu = useCallback(async () => {
    if (!aiPrompt.trim()) {
      showToast("Tuliskan tema atau ide menu terlebih dahulu!", "error");
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/menu-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_menu",
          prompt: aiPrompt.trim(),
          targetVariant: aiTargetVariant,
        }),
      });

      const json = await res.json();
      if (json.status !== "success" || !json.data) {
        showToast(json.message || "Gagal membuat menu dengan AI.", "error");
        return;
      }

      const aiData = json.data;
      if (aiData.nama_menu) {
        setFormNamaMenu(aiData.nama_menu);
      }
      if (aiData.catatan) {
        setFormCatatan((prev) => (prev ? `${prev}\n\n[Saran AI]: ${aiData.catatan}` : `[Saran AI]: ${aiData.catatan}`));
      }

      if (aiData.menu) {
        setFormMenuData((prev) => {
          const next = deepClone(prev);
          interface RawAiIngredient {
            bahan?: string;
            nama_bahan?: string;
            jumlah_per_porsi?: number | string;
            jumlah?: number | string;
            satuan?: string;
          }
          interface RawAiVariant {
            nama_menu?: string;
            komposisi?: RawAiIngredient[];
            resep?: string;
            langkah_persiapan?: string[];
            langkah_pengolahan?: string[];
            nilai_gizi?: Partial<NilaiGizi>;
          }
          const applyDataToVariant = (k: VariantKey, varData: RawAiVariant) => {
            const current = next[k];
            current.nama_menu = varData.nama_menu || current.nama_menu || aiData.nama_menu;
            if (Array.isArray(varData.komposisi)) {
              current.komposisi = varData.komposisi.map((item: RawAiIngredient) => ({
                bahan: (item.bahan || item.nama_bahan || "").trim(),
                jumlah_per_porsi: Number(item.jumlah_per_porsi || item.jumlah || 0),
                satuan: item.satuan || "gram",
              }));
            }
            if (varData.resep) current.resep = varData.resep;
            if (Array.isArray(varData.langkah_persiapan)) current.langkah_persiapan = varData.langkah_persiapan;
            if (Array.isArray(varData.langkah_pengolahan)) current.langkah_pengolahan = varData.langkah_pengolahan;
            if (varData.nilai_gizi) {
              current.nilai_gizi = { ...current.nilai_gizi, ...varData.nilai_gizi };
            }
            if (k !== "porsi_besar") {
              (current as MenuVariantWithRef).sama_dengan = null;
            }
          };

          if (aiTargetVariant === "all") {
            (["porsi_besar", "porsi_kecil", "pmt_balita", "pmt_bumil", "pmt_busui"] as VariantKey[]).forEach((k) => {
              if (aiData.menu[k]) {
                applyDataToVariant(k, aiData.menu[k]);
              }
            });
          } else {
            const k = aiTargetVariant;
            if (aiData.menu[k] || aiData.menu.porsi_besar) {
              applyDataToVariant(k, aiData.menu[k] || aiData.menu.porsi_besar);
            }
          }
          return next;
        });
      }

      setExpandedSections((prev) => new Set([...prev, "info", "porsi_besar"]));
      setShowAiModal(false);
      showToast("✨ Menu berhasil dibuat oleh AI!");
    } catch (err) {
      console.error("AI Generate error:", err);
      showToast("Terjadi kesalahan saat memanggil AI.", "error");
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiTargetVariant, showToast]);

  const handleAiEstimateGizi = useCallback(async (key: VariantKey) => {
    const variant = formMenuData[key];
    if (!variant.komposisi || variant.komposisi.length === 0) {
      showToast("Tambahkan minimal 1 bahan komposisi terlebih dahulu!", "error");
      return;
    }

    setAiCalculatingGizi(key);
    try {
      const res = await fetch("/api/ai/menu-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "estimate_nutrition",
          currentVariant: variant,
        }),
      });

      const json = await res.json();
      if (json.status !== "success" || !json.data?.nilai_gizi) {
        showToast(json.message || "Gagal menghitung nilai gizi dengan AI.", "error");
        return;
      }

      const gizi = json.data.nilai_gizi;
      updateVariant(key, (v) => {
        v.nilai_gizi = {
          energi: Number(gizi.energi) || 0,
          protein: Number(gizi.protein) || 0,
          lemak: Number(gizi.lemak) || 0,
          karbohidrat: Number(gizi.karbohidrat) || 0,
          serat: Number(gizi.serat) || 0,
        };
      });

      showToast(`✨ Nilai gizi dihitung oleh AI (${json.data.analisis_singkat || "Selesai"})`);
    } catch (err) {
      console.error("Estimate gizi error:", err);
      showToast("Terjadi kesalahan kalkulasi gizi AI.", "error");
    } finally {
      setAiCalculatingGizi(null);
    }
  }, [formMenuData, showToast, updateVariant]);

  const handleAiAdaptVariant = useCallback(async (targetKey: VariantKey) => {
    const sourceVariant = resolveVariant(formMenuData, "porsi_besar");
    if (!sourceVariant.komposisi || sourceVariant.komposisi.length === 0) {
      showToast("Isi komposisi Porsi Besar terlebih dahulu sebagai acuan!", "error");
      return;
    }

    const config = VARIANT_CONFIG.find((c) => c.key === targetKey);
    setAiAdaptingVariant(targetKey);
    try {
      const res = await fetch("/api/ai/menu-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adapt_variant",
          sourceVariant,
          targetKey,
          targetLabel: config?.label || targetKey,
        }),
      });

      const json = await res.json();
      if (json.status !== "success" || !json.data) {
        showToast(json.message || "Gagal mengadaptasi varian dengan AI.", "error");
        return;
      }

      const adapted = json.data;
      updateVariant(targetKey, (v) => {
        (v as MenuVariantWithRef).sama_dengan = null;
        v.nama_menu = adapted.nama_menu || `${sourceVariant.nama_menu} (${config?.label || targetKey})`;
        if (Array.isArray(adapted.komposisi)) {
          interface RawAdaptedItem {
            bahan?: string;
            nama_bahan?: string;
            jumlah_per_porsi?: number | string;
            jumlah?: number | string;
            satuan?: string;
          }
          v.komposisi = adapted.komposisi.map((item: RawAdaptedItem) => ({
            bahan: (item.bahan || item.nama_bahan || "").trim(),
            jumlah_per_porsi: Number(item.jumlah_per_porsi || item.jumlah || 0),
            satuan: item.satuan || "gram",
          }));
        }
        if (adapted.resep) v.resep = adapted.resep;
        if (Array.isArray(adapted.langkah_persiapan)) v.langkah_persiapan = adapted.langkah_persiapan;
        if (Array.isArray(adapted.langkah_pengolahan)) v.langkah_pengolahan = adapted.langkah_pengolahan;
        if (adapted.nilai_gizi) {
          v.nilai_gizi = {
            energi: Number(adapted.nilai_gizi.energi) || 0,
            protein: Number(adapted.nilai_gizi.protein) || 0,
            lemak: Number(adapted.nilai_gizi.lemak) || 0,
            karbohidrat: Number(adapted.nilai_gizi.karbohidrat) || 0,
            serat: Number(adapted.nilai_gizi.serat) || 0,
          };
        }
      });

      showToast(`✨ Varian ${config?.label} berhasil diadaptasi oleh AI!`);
    } catch (err) {
      console.error("Adapt variant error:", err);
      showToast("Terjadi kesalahan adaptasi AI.", "error");
    } finally {
      setAiAdaptingVariant(null);
    }
  }, [formMenuData, showToast, updateVariant]);

  const handleAiGetSuggestions = useCallback(async () => {
    setAiSuggestionsLoading(true);
    setShowAiSuggestionsModal(true);
    setAiSuggestionsData(null);
    try {
      const res = await fetch("/api/ai/menu-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "give_suggestions",
          fullMenuData: formMenuData,
        }),
      });

      const json = await res.json();
      if (json.status !== "success" || !json.data) {
        showToast(json.message || "Gagal mendapatkan telaah gizi.", "error");
        setShowAiSuggestionsModal(false);
        return;
      }

      setAiSuggestionsData(json.data);
    } catch (err) {
      console.error("AI Suggestions error:", err);
      showToast("Terjadi kesalahan saat memproses telaah gizi.", "error");
      setShowAiSuggestionsModal(false);
    } finally {
      setAiSuggestionsLoading(false);
    }
  }, [formMenuData, showToast]);

  // ── Filtered list ────────────────────────────────────────────────────────
  const displayList = useMemo(() => {
    const source = showTemplates ? templates : menus;
    return source.filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = m.nama_menu.toLowerCase().includes(q);
        const matchTemplate = m.template_name?.toLowerCase().includes(q);
        if (!matchName && !matchTemplate) return false;
      }
      if (!showTemplates && statusFilter !== "ALL" && m.status !== statusFilter) return false;
      return true;
    });
  }, [menus, templates, searchQuery, statusFilter, showTemplates]);

  // ── Toggle section ───────────────────────────────────────────────────────
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  // ── Shopping list ────────────────────────────────────────────────────────
  const shoppingList = useMemo(() => {
    if ((view === "detail" || view === "shopping") && selectedMenu) {
      return buildShoppingList(selectedMenu.menu_data);
    }
    if (view === "create" || view === "edit") {
      return buildShoppingList(formMenuData);
    }
    return [];
  }, [view, selectedMenu, formMenuData]);

  // ── Render helpers ───────────────────────────────────────────────────────

  // Ingredient row editor
  const renderIngredientEditor = (key: VariantKey, ingredients: Ingredient[]) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300">Komposisi Bahan</label>
        <button
          type="button"
          onClick={() => updateVariant(key, (v) => v.komposisi.push({ bahan: "", jumlah_per_porsi: 0, satuan: "gram" }))}
          className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-colors"
        >
          <Plus size={12} /> Tambah Bahan
        </button>
      </div>

      {ingredients.length === 0 && (
        <p className="text-xs text-slate-500 italic py-3 text-center">Belum ada bahan. Klik &quot;Tambah Bahan&quot; untuk mulai.</p>
      )}

      {ingredients.map((ing, idx) => (
        <div key={idx} className="flex items-center gap-2 group">
          <GripVertical size={14} className="text-slate-600 shrink-0" />
          <input
            type="text"
            value={ing.bahan}
            onChange={(e) =>
              updateVariant(key, (v) => {
                v.komposisi[idx].bahan = e.target.value;
              })
            }
            placeholder="Nama bahan"
            className="flex-1 min-w-0 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
          />
          <input
            type="number"
            value={ing.jumlah_per_porsi || ""}
            onChange={(e) =>
              updateVariant(key, (v) => {
                v.komposisi[idx].jumlah_per_porsi = Number(e.target.value) || 0;
              })
            }
            placeholder="Qty"
            className="w-20 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 text-right focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
          />
          <select
            value={ing.satuan}
            onChange={(e) =>
              updateVariant(key, (v) => {
                v.komposisi[idx].satuan = e.target.value;
              })
            }
            className="w-24 bg-slate-800/60 border border-slate-700/60 rounded-lg px-2 py-2 text-sm text-slate-200 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors appearance-none"
          >
            {SATUAN_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => updateVariant(key, (v) => v.komposisi.splice(idx, 1))}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );

  // Step list editor (persiapan / pengolahan)
  const renderStepEditor = (key: VariantKey, field: "langkah_persiapan" | "langkah_pengolahan", label: string) => {
    const variant = formMenuData[key];
    const steps = variant[field] as string[];

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">{label}</label>
          <button
            type="button"
            onClick={() => updateVariant(key, (v) => (v[field] as string[]).push(""))}
            className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-colors"
          >
            <Plus size={12} /> Tambah Langkah
          </button>
        </div>

        {steps.length === 0 && (
          <p className="text-xs text-slate-500 italic py-2 text-center">Belum ada langkah.</p>
        )}

        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-2 group">
            <span className="w-6 h-8 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{idx + 1}.</span>
            <textarea
              value={step}
              onChange={(e) =>
                updateVariant(key, (v) => {
                  (v[field] as string[])[idx] = e.target.value;
                })
              }
              placeholder={`Langkah ${idx + 1}...`}
              rows={2}
              className="flex-1 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors resize-none"
            />
            <button
              type="button"
              onClick={() => updateVariant(key, (v) => (v[field] as string[]).splice(idx, 1))}
              className="p-1.5 mt-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  // Gizi editor
  const renderGiziEditor = (key: VariantKey) => {
    const variant = formMenuData[key];
    const gizi = variant.nilai_gizi;
    const isCalculating = aiCalculatingGizi === key;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">Nilai Gizi (per porsi)</label>
          <button
            type="button"
            onClick={() => handleAiEstimateGizi(key)}
            disabled={isCalculating}
            className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            title="Hitung otomatis nilai gizi dari bahan komposisi menggunakan AI"
          >
            {isCalculating ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            <span>{isCalculating ? "Menghitung..." : "Hitung Gizi dengan AI"}</span>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(["energi", "protein", "lemak", "karbohidrat", "serat"] as (keyof NilaiGizi)[]).map((field) => (
            <div key={field}>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider">{field} {field === "energi" ? "(kcal)" : "(g)"}</label>
              <input
                type="number"
                value={gizi[field] || ""}
                onChange={(e) =>
                  updateVariant(key, (v) => {
                    v.nilai_gizi[field] = Number(e.target.value) || 0;
                  })
                }
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 text-right focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Full variant form (for porsi_besar or standalone variants)
  const renderVariantForm = (key: VariantKey) => {
    const variant = formMenuData[key];
    const config = VARIANT_CONFIG.find((c) => c.key === key)!;
    const isRef = key !== "porsi_besar";
    const varRef = isRef ? (variant as MenuVariantWithRef) : null;
    const isSame = varRef?.sama_dengan != null;

    return (
      <div className="space-y-4">
        {/* "Same as" toggle for non-primary variants */}
        {isRef && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSame}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateVariant(key, (v) => {
                        (v as MenuVariantWithRef).sama_dengan = "porsi_besar";
                      });
                    } else {
                      updateVariant(key, (v) => {
                        (v as MenuVariantWithRef).sama_dengan = null;
                      });
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500/30 bg-slate-800"
                />
                <span className="text-sm text-slate-300">Sama dengan</span>
              </label>
              {isSame && (
                <select
                  value={varRef!.sama_dengan || "porsi_besar"}
                  onChange={(e) =>
                    updateVariant(key, (v) => {
                      (v as MenuVariantWithRef).sama_dengan = e.target.value;
                    })
                  }
                  className="bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                >
                  {REFERENCE_OPTIONS.filter((o) => o.value !== key).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </div>

            {/* AI Adapt Button for this variant */}
            <button
              type="button"
              onClick={() => handleAiAdaptVariant(key)}
              disabled={aiAdaptingVariant === key}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
              title="Gunakan AI untuk mengadaptasi takaran dan tekstur dari Porsi Besar khusus untuk kelompok ini"
            >
              {aiAdaptingVariant === key ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Wand2 size={12} />
              )}
              <span>{aiAdaptingVariant === key ? "Mengadaptasi..." : "✨ Adaptasikan dari Porsi Besar"}</span>
            </button>
          </div>
        )}

        {isSame ? (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-800/30 border border-dashed border-slate-700/40">
            <Layers size={16} className="text-slate-500" />
            <p className="text-sm text-slate-400">
              Menu {config.label} menggunakan menu yang sama dengan <strong className="text-slate-300">{getVariantLabel(varRef!.sama_dengan!)}</strong>
            </p>
          </div>
        ) : (
          <>
            {/* Menu name */}
            <div>
              <label className="text-xs font-semibold text-slate-300">Nama Menu</label>
              <input
                type="text"
                value={variant.nama_menu}
                onChange={(e) => updateVariant(key, (v) => { v.nama_menu = e.target.value; })}
                placeholder={`Contoh: Nasi Ayam Goreng, Tumis Buncis, Buah`}
                className="w-full mt-1 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
              />
            </div>

            {/* Jumlah porsi */}
            <div>
              <label className="text-xs font-semibold text-slate-300">Jumlah Porsi</label>
              <input
                type="number"
                value={variant.jumlah_porsi || ""}
                onChange={(e) => updateVariant(key, (v) => { v.jumlah_porsi = Number(e.target.value) || 0; })}
                placeholder="0"
                className="w-full mt-1 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
              />
              {formSppgId && (
                <p className="text-[10px] text-slate-500 mt-1">Auto-fill dari data SPPG</p>
              )}
            </div>

            {/* Ingredients */}
            {renderIngredientEditor(key, variant.komposisi)}

            {/* Auto-calculated total */}
            {variant.komposisi.length > 0 && variant.jumlah_porsi > 0 && (
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                  <ShoppingCart size={13} /> Total Bahan untuk {formatNumber(variant.jumlah_porsi)} Porsi
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {variant.komposisi.filter((i) => i.bahan).map((ing, idx) => (
                    <div key={idx} className="text-xs text-slate-300">
                      <span className="text-emerald-400 font-semibold">{formatNumber(ing.jumlah_per_porsi * variant.jumlah_porsi)}</span>
                      <span className="text-slate-500"> {ing.satuan}</span>
                      <span className="text-slate-400"> — {ing.bahan}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recipe */}
            <div>
              <label className="text-xs font-semibold text-slate-300">Resep / Deskripsi Menu</label>
              <textarea
                value={variant.resep}
                onChange={(e) => updateVariant(key, (v) => { v.resep = e.target.value; })}
                placeholder="Deskripsi singkat resep menu..."
                rows={3}
                className="w-full mt-1 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors resize-none"
              />
            </div>

            {/* Preparation steps */}
            {renderStepEditor(key, "langkah_persiapan", "Langkah Persiapan")}

            {/* Cooking steps */}
            {renderStepEditor(key, "langkah_pengolahan", "Langkah Pengolahan")}

            {/* Nutrition */}
            {renderGiziEditor(key)}
          </>
        )}
      </div>
    );
  };

  // ── Render: Detail View ──────────────────────────────────────────────────
  const renderDetailVariant = (menuData: MenuData, key: VariantKey) => {
    const resolved = resolveVariant(menuData, key);
    const variant = menuData[key];
    const isSame = "sama_dengan" in variant && variant.sama_dengan != null;

    if (isSame) {
      return (
        <div className="flex items-center gap-2 text-sm text-slate-400 italic">
          <Layers size={14} className="text-slate-500" />
          Sama dengan {getVariantLabel((variant as MenuVariantWithRef).sama_dengan!)}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {resolved.nama_menu && (
          <p className="text-sm font-semibold text-slate-200">{resolved.nama_menu}</p>
        )}

        {resolved.jumlah_porsi > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users size={13} /> {formatNumber(resolved.jumlah_porsi)} porsi
          </div>
        )}

        {/* Ingredients */}
        {resolved.komposisi.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1.5">Komposisi Bahan:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {resolved.komposisi.map((ing, i) => (
                <div key={i} className="text-xs text-slate-300 flex items-baseline gap-1">
                  <span className="text-slate-500">•</span>
                  <span>{ing.bahan}</span>
                  <span className="text-slate-500">— {ing.jumlah_per_porsi} {ing.satuan}/porsi</span>
                  {resolved.jumlah_porsi > 0 && (
                    <span className="text-emerald-400 font-medium">(Total: {formatNumber(ing.jumlah_per_porsi * resolved.jumlah_porsi)} {ing.satuan})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recipe */}
        {resolved.resep && (
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1">Resep:</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{resolved.resep}</p>
          </div>
        )}

        {/* Preparation */}
        {resolved.langkah_persiapan.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1">Langkah Persiapan:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              {resolved.langkah_persiapan.map((s, i) => (
                <li key={i} className="text-sm text-slate-300">{s}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Cooking */}
        {resolved.langkah_pengolahan.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1">Langkah Pengolahan:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              {resolved.langkah_pengolahan.map((s, i) => (
                <li key={i} className="text-sm text-slate-300">{s}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Nutrition */}
        {(resolved.nilai_gizi.energi > 0 || resolved.nilai_gizi.protein > 0) && (
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1.5">Nilai Gizi (per porsi):</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(resolved.nilai_gizi).map(([k, v]) => (
                <div key={k} className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40">
                  <span className="text-[10px] text-slate-500 uppercase">{k}</span>
                  <p className="text-sm font-semibold text-slate-200">{v} {k === "energi" ? "kcal" : "g"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-24 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-right duration-300 ${
          toast.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          LIST VIEW
          ════════════════════════════════════════════════════════════════════ */}
      {view === "list" && (
        <>
          {/* Top actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ChefHat size={22} className="text-amber-400" />
                {showTemplates ? "Template Menu" : "Daftar Menu"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {showTemplates
                  ? `${templates.length} template tersimpan`
                  : `${menus.length} menu dibuat`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  showTemplates
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:text-slate-200"
                }`}
              >
                <Bookmark size={14} />
                {showTemplates ? "Lihat Menu" : "Template"}
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setView("create");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={16} strokeWidth={2.5} /> Buat Menu Baru
              </button>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
              />
            </div>
            {!showTemplates && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                {(["ALL", "DRAFT", "FINALIZED"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      statusFilter === s
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {s === "ALL" ? "Semua" : s === "DRAFT" ? "Draft" : "Final"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={24} className="text-indigo-400 animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {!loading && displayList.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4">
                <ChefHat size={32} className="text-slate-600" />
              </div>
              <h4 className="text-sm font-semibold text-slate-400">
                {showTemplates ? "Belum ada template" : "Belum ada menu"}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {showTemplates ? "Simpan menu sebagai template untuk dipakai ulang." : "Klik \"Buat Menu Baru\" untuk memulai."}
              </p>
            </div>
          )}

          {/* Menu Cards */}
          {!loading && displayList.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayList.map((menu) => {
                const md = menu.menu_data;
                const totalPorsi = md
                  ? (resolveVariant(md, "porsi_besar").jumlah_porsi || 0) +
                    (resolveVariant(md, "porsi_kecil").jumlah_porsi || 0) +
                    (resolveVariant(md, "pmt_balita").jumlah_porsi || 0) +
                    (resolveVariant(md, "pmt_bumil").jumlah_porsi || 0) +
                    (resolveVariant(md, "pmt_busui").jumlah_porsi || 0)
                  : 0;
                const sppgName = menu.sppg_data?.nama_sppg;

                return (
                  <div
                    key={menu.id}
                    className="group bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 hover:border-indigo-500/30 hover:bg-slate-800/60 transition-all cursor-pointer relative overflow-hidden"
                    onClick={() => {
                      setSelectedMenu(menu);
                      setView("detail");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    {/* Gradient accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-amber-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{menu.is_template ? (menu.template_name || menu.nama_menu) : menu.nama_menu}</h4>
                        {sppgName && (
                          <p className="text-[10px] text-indigo-400 font-medium mt-0.5 truncate">{sppgName}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ml-2 ${
                        menu.is_template
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                          : menu.status === "FINALIZED"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
                      }`}>
                        {menu.is_template ? "TEMPLATE" : menu.status}
                      </span>
                    </div>

                    {/* Quick info */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {menu.tanggal && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar size={11} /> {menu.tanggal}
                        </span>
                      )}
                      {totalPorsi > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Users size={11} /> {formatNumber(totalPorsi)} porsi
                        </span>
                      )}
                    </div>

                    {/* Variant pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {md && VARIANT_CONFIG.map((vc) => {
                        const resolved = resolveVariant(md, vc.key);
                        if (!resolved.nama_menu) return null;
                        const isSame = vc.key !== "porsi_besar" && (md[vc.key] as MenuVariantWithRef).sama_dengan != null;
                        return (
                          <span key={vc.key} className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                            isSame
                              ? "bg-slate-800/40 text-slate-500 border-slate-700/30"
                              : `bg-${vc.color}-500/10 text-${vc.color}-400 border-${vc.color}-500/20`
                          }`}>
                            {vc.label}
                          </span>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-700/30 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedMenu(menu);
                          loadMenuIntoForm(menu);
                          setView("edit");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      >
                        <Edit size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(menu)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                      >
                        <Copy size={12} /> Duplikat
                      </button>
                      <button
                        onClick={() => handleDelete(menu.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
                      >
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          CREATE / EDIT VIEW
          ════════════════════════════════════════════════════════════════════ */}
      {(view === "create" || view === "edit") && (
        <>
          {/* Back + Title */}
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => {
                resetForm();
                setView("list");
              }}
              className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h3 className="text-lg font-bold text-white">
                {view === "edit" ? "Edit Menu" : "Buat Menu Baru"}
              </h3>
              <p className="text-xs text-slate-400">Isi detail menu dan komposisi bahan</p>
            </div>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleAiGetSuggestions()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                title="Dapatkan evaluasi gizi dan rekomendasi keamanan pangan dari AI Ahli Gizi"
              >
                <Sparkles size={14} className="text-emerald-400" /> Telaah Gizi AI
              </button>
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                title="Buka asisten AI untuk membuat resep dan komposisi otomatis"
              >
                <Wand2 size={14} /> ✨ Buat dengan AI
              </button>
              <button
                type="button"
                onClick={() => setShowLoadTemplateModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              >
                <BookTemplate size={14} /> Muat Template
              </button>
            </div>
          </div>

          {/* ── Section: Info Umum ───────────────────────────────────────── */}
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("info")}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                  <FileText size={16} className="text-indigo-400" />
                </div>
                <span className="text-sm font-bold text-white">Informasi Umum</span>
              </div>
              {expandedSections.has("info") ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>

            {expandedSections.has("info") && (
              <div className="px-5 pb-5 space-y-4 border-t border-slate-700/30 pt-4">
                {/* Nama Menu */}
                <div>
                  <label className="text-xs font-semibold text-slate-300">Nama Menu <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={formNamaMenu}
                    onChange={(e) => setFormNamaMenu(e.target.value)}
                    placeholder="Contoh: Menu Senin - Ayam Goreng Kuning"
                    className="w-full mt-1 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tanggal */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Tanggal</label>
                    <input
                      type="date"
                      value={formTanggal}
                      onChange={(e) => setFormTanggal(e.target.value)}
                      className="w-full mt-1 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                    />
                  </div>

                  {/* SPPG Selection */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300">SPPG (opsional)</label>
                    <select
                      value={formSppgId}
                      onChange={(e) => handleSppgChange(e.target.value)}
                      className="w-full mt-1 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                    >
                      <option value="">— Pilih SPPG —</option>
                      {sppgList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama_sppg} (B:{s.porsi_besar} K:{s.porsi_kecil})
                        </option>
                      ))}
                    </select>
                    {formSppgId && (
                      <p className="text-[10px] text-emerald-400 mt-1">✓ Jumlah porsi akan otomatis terisi dari data SPPG</p>
                    )}
                  </div>
                </div>

                {/* All same toggle */}
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSameMenu}
                      onChange={(e) => handleAllSameMenuToggle(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500/30 bg-slate-800"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-200">Semua jenis porsi menggunakan menu yang sama</span>
                      <p className="text-[10px] text-slate-500">Porsi Kecil, PMT Balita, Bumil, dan Busui akan mengikuti Porsi Besar</p>
                    </div>
                  </label>
                </div>

                {/* Catatan */}
                <div>
                  <label className="text-xs font-semibold text-slate-300">Catatan (opsional)</label>
                  <textarea
                    value={formCatatan}
                    onChange={(e) => setFormCatatan(e.target.value)}
                    placeholder="Catatan tambahan..."
                    rows={2}
                    className="w-full mt-1 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Section: Each Variant ────────────────────────────────────── */}
          {VARIANT_CONFIG.map((vc) => (
            <div key={vc.key} className="bg-slate-800/30 border border-slate-700/40 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleSection(vc.key)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-${vc.color}-500/20 flex items-center justify-center text-${vc.color}-400`}>
                    {vc.icon}
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-white">{vc.label}</span>
                    <p className="text-[10px] text-slate-500">{vc.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {formMenuData[vc.key].jumlah_porsi > 0 && (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md">
                      {formatNumber(resolveVariant(formMenuData, vc.key).jumlah_porsi)} porsi
                    </span>
                  )}
                  {expandedSections.has(vc.key)
                    ? <ChevronUp size={18} className="text-slate-400" />
                    : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </button>

              {expandedSections.has(vc.key) && (
                <div className="px-5 pb-5 border-t border-slate-700/30 pt-4">
                  {renderVariantForm(vc.key)}
                </div>
              )}
            </div>
          ))}

          {/* ── Shopping List Preview ────────────────────────────────────── */}
          {shoppingList.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg">
              <button
                type="button"
                onClick={() => toggleSection("shopping")}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShoppingCart size={18} />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-white block">Estimasi Daftar Belanja Gabungan</span>
                    <p className="text-[11px] text-slate-400">Akumulasi otomatis seluruh varian untuk persiapan logistik</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                    {shoppingList.length} Bahan
                  </span>
                  {expandedSections.has("shopping")
                    ? <ChevronUp size={18} className="text-slate-400" />
                    : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </button>

              {expandedSections.has("shopping") && (
                <div className="px-5 pb-5 border-t border-slate-700/40 pt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {shoppingList.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700/40 hover:border-emerald-500/30 transition-all">
                        <div className="min-w-0 pr-2">
                          <span className="text-xs font-semibold text-slate-200 block truncate">{item.bahan}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-medium">
                              {item.kategori}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate">
                              ({item.sources.join(", ")})
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-emerald-400">{formatNumber(item.totalJumlah)}</span>
                          <span className="text-xs text-slate-400 ml-1 font-medium">{item.satuan}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Action Buttons ───────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sticky bottom-20 lg:bottom-4 z-30 bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl border border-slate-700/40 shadow-2xl">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Status:</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as "DRAFT" | "FINALIZED")}
                className="bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-indigo-500/60 focus:outline-none transition-colors"
              >
                <option value="DRAFT">Draft</option>
                <option value="FINALIZED">Finalized</option>
              </select>
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
              >
                <Bookmark size={14} /> Simpan Template
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {view === "edit" ? "Perbarui Menu" : "Simpan Menu"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          DETAIL VIEW
          ════════════════════════════════════════════════════════════════════ */}
      {view === "detail" && selectedMenu && (
        <>
          {/* Back + Title */}
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => {
                setView("list");
                setSelectedMenu(null);
              }}
              className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">{selectedMenu.nama_menu}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {selectedMenu.tanggal && (
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={11} /> {selectedMenu.tanggal}</span>
                )}
                {selectedMenu.sppg_data?.nama_sppg && (
                  <span className="text-xs text-indigo-400 font-medium">{selectedMenu.sppg_data.nama_sppg}</span>
                )}
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  selectedMenu.status === "FINALIZED"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-slate-700/50 text-slate-400"
                }`}>
                  {selectedMenu.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  loadMenuIntoForm(selectedMenu);
                  setView("edit");
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
              >
                <Edit size={13} /> Edit
              </button>
              <button
                onClick={() => handleDuplicate(selectedMenu)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-colors"
              >
                <Copy size={13} /> Duplikat
              </button>
              <button
                onClick={() => {
                  setView("shopping");
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              >
                <ShoppingCart size={13} /> Belanja
              </button>
            </div>
          </div>

          {/* Catatan */}
          {selectedMenu.catatan && (
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm text-amber-300">
              <span className="text-xs font-semibold text-amber-400">Catatan:</span> {selectedMenu.catatan}
            </div>
          )}

          {/* Variants */}
          {VARIANT_CONFIG.map((vc) => {
            const resolved = resolveVariant(selectedMenu.menu_data, vc.key);
            if (!resolved.nama_menu && resolved.komposisi.length === 0) return null;

            return (
              <div key={vc.key} className="bg-slate-800/30 border border-slate-700/40 rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleSection(`detail_${vc.key}`)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-${vc.color}-500/20 flex items-center justify-center text-${vc.color}-400`}>
                      {vc.icon}
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-white">{vc.label}</span>
                      <p className="text-[10px] text-slate-500">{vc.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {resolved.jumlah_porsi > 0 && (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md">
                        {formatNumber(resolved.jumlah_porsi)} porsi
                      </span>
                    )}
                    {expandedSections.has(`detail_${vc.key}`)
                      ? <ChevronUp size={18} className="text-slate-400" />
                      : <ChevronDown size={18} className="text-slate-400" />}
                  </div>
                </button>

                {expandedSections.has(`detail_${vc.key}`) && (
                  <div className="px-5 pb-5 border-t border-slate-700/30 pt-4">
                    {renderDetailVariant(selectedMenu.menu_data, vc.key)}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Shopping List Preview in Detail View ─────────────────────── */}
          {shoppingList.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg">
              <button
                type="button"
                onClick={() => toggleSection("detail_shopping")}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShoppingCart size={18} />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-white block">Ringkasan Estimasi Bahan Belanja</span>
                    <p className="text-[11px] text-slate-400">Akumulasi otomatis seluruh varian porsi</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                    {shoppingList.length} Bahan
                  </span>
                  {expandedSections.has("detail_shopping")
                    ? <ChevronUp size={18} className="text-slate-400" />
                    : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </button>

              {expandedSections.has("detail_shopping") && (
                <div className="px-5 pb-5 border-t border-slate-700/40 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Rincian bahan yang diperlukan berdasarkan porsi SPPG:
                    </p>
                    <button
                      type="button"
                      onClick={() => setView("shopping")}
                      className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-semibold transition-colors"
                    >
                      <Printer size={13} /> Buka Format Cetak & Ceklis
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {shoppingList.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700/40 hover:border-emerald-500/30 transition-all">
                        <div className="min-w-0 pr-2">
                          <span className="text-xs font-semibold text-slate-200 block truncate">{item.bahan}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-medium">
                              {item.kategori}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate">
                              ({item.sources.join(", ")})
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-emerald-400">{formatNumber(item.totalJumlah)}</span>
                          <span className="text-xs text-slate-400 ml-1 font-medium">{item.satuan}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SHOPPING LIST VIEW (Printable)
          ════════════════════════════════════════════════════════════════════ */}
      {view === "shopping" && selectedMenu && (
        <>
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 print:hidden">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("detail")}
                className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingCart size={22} className="text-emerald-400" />
                  Daftar Belanja & Logistik
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedMenu.nama_menu} — {selectedMenu.sppg_data?.nama_sppg || "Semua SPPG"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
              <button
                onClick={() => {
                  if (shoppingCheckedItems.size === shoppingList.length) {
                    setShoppingCheckedItems(new Set());
                  } else {
                    setShoppingCheckedItems(new Set(shoppingList.map((i) => i.bahan)));
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <CheckSquare size={14} className="text-emerald-400" />
                {shoppingCheckedItems.size === shoppingList.length ? "Reset Centang" : "Centang Semua"}
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-95 transition-all shadow-lg shadow-emerald-600/20"
              >
                <Printer size={15} /> Cetak Daftar Belanja
              </button>
            </div>
          </div>

          {/* Category Filter Pills (Screen only) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 print:hidden scrollbar-thin">
            {["ALL", "Karbohidrat & Pokok", "Lauk Hewani (Protein)", "Lauk Nabati", "Sayuran Segar", "Buah-Buahan", "Bumbu & Minyak", "Bahan Lainnya"].map((cat) => {
              const count = cat === "ALL" ? shoppingList.length : shoppingList.filter((i) => i.kategori === cat).length;
              if (cat !== "ALL" && count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setShoppingCategoryFilter(cat)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    shoppingCategoryFilter === cat
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white"
                  }`}
                >
                  <span>{cat === "ALL" ? "Semua Kategori" : cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    shoppingCategoryFilter === cat ? "bg-slate-950/30 text-slate-950" : "bg-slate-700 text-slate-400"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Printable & Interactive Shopping Container */}
          <div ref={printRef} className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-6 print:p-4 print:bg-white print:text-black print:border-none print:shadow-none space-y-6">
            
            {/* Header Document */}
            <div className="border-b border-slate-700/60 pb-5 print:border-gray-800 print:pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 print:text-gray-700 bg-emerald-500/10 print:bg-gray-100 px-2.5 py-1 rounded-md">
                  Badan Gizi Nasional (BGN) • Rekap Logistik SPPG
                </span>
                <h2 className="text-xl font-black text-white print:text-black mt-2">DAFTAR BELANJA BAHAN MAKANAN</h2>
                <p className="text-sm font-semibold text-slate-300 print:text-gray-800">{selectedMenu.nama_menu}</p>
              </div>
              <div className="text-left sm:text-right space-y-0.5 text-xs text-slate-400 print:text-gray-600">
                {selectedMenu.tanggal && <p><strong className="text-slate-300 print:text-black">Tanggal Rencana:</strong> {selectedMenu.tanggal}</p>}
                {selectedMenu.sppg_data?.nama_sppg && <p><strong className="text-slate-300 print:text-black">Dapur SPPG:</strong> {selectedMenu.sppg_data.nama_sppg}</p>}
                <p className="text-emerald-400 print:text-gray-800 font-semibold">Total: {shoppingList.length} Item Bahan</p>
              </div>
            </div>

            {/* Target Beneficiary Badges */}
            <div className="bg-slate-900/60 print:bg-gray-50 border border-slate-700/50 print:border-gray-300 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block mb-2">
                Rincian Porsi Penerima Manfaat:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {VARIANT_CONFIG.map((vc) => {
                  const rawV = selectedMenu.menu_data[vc.key];
                  const resolved = resolveVariant(selectedMenu.menu_data, vc.key);
                  const porsi = Number((rawV && rawV.jumlah_porsi) || resolved.jumlah_porsi || 0);
                  return (
                    <div key={vc.key} className="p-2 rounded-lg bg-slate-800/60 print:bg-white border border-slate-700/40 print:border-gray-200">
                      <span className="text-[10px] text-slate-400 print:text-gray-500 block truncate">{vc.label}</span>
                      <span className="text-sm font-black text-white print:text-black mt-0.5 block">
                        {formatNumber(porsi)} <span className="text-[11px] font-normal text-slate-400 print:text-gray-600">porsi</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {shoppingList.some((i) => i.isStandarPorsi) && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span>
                    <strong>Catatan:</strong> Jumlah porsi di SPPG belum diset atau bernilai 0. Nilai total bahan di bawah ini dihitung berdasarkan estimasi <strong>standar 1 porsi</strong> per kategori.
                  </span>
                </div>
              )}
            </div>

            {/* Modern Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-700 print:border-black text-left text-xs uppercase tracking-wider text-slate-400 print:text-gray-800 bg-slate-900/40 print:bg-gray-100">
                    <th className="py-2.5 px-3 print:hidden w-10 text-center">Cek</th>
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-4 font-bold">Nama Bahan Baku</th>
                    <th className="py-2.5 px-4 font-bold">Kategori</th>
                    <th className="py-2.5 px-4 text-right font-bold">Total Kebutuhan</th>
                    <th className="py-2.5 px-4">Satuan</th>
                    <th className="py-2.5 px-4">Diperuntukkan Untuk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40 print:divide-gray-300">
                  {(() => {
                    const filtered = shoppingList.filter((item) => shoppingCategoryFilter === "ALL" || item.kategori === shoppingCategoryFilter);
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500 print:text-gray-500">
                            <ShoppingCart size={24} className="mx-auto mb-2 opacity-40 text-slate-400" />
                            {shoppingList.length === 0
                              ? "Belum ada bahan komposisi yang tercatat pada menu ini."
                              : "Tidak ada bahan yang cocok dengan kategori filter ini."}
                          </td>
                        </tr>
                      );
                    }
                    return filtered.map((item, i) => {
                      const isChecked = shoppingCheckedItems.has(item.bahan);
                      return (
                        <tr
                          key={i}
                          onClick={() => {
                            setShoppingCheckedItems((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.bahan)) next.delete(item.bahan);
                              else next.add(item.bahan);
                              return next;
                            });
                          }}
                          className={`cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-emerald-950/20 text-slate-400 line-through print:no-underline"
                              : "hover:bg-slate-800/40 print:hover:bg-transparent text-slate-200 print:text-black"
                          }`}
                        >
                          <td className="py-3 px-3 print:hidden text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setShoppingCheckedItems((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.bahan)) next.delete(item.bahan);
                                  else next.add(item.bahan);
                                  return next;
                                });
                              }}
                              className="text-slate-400 hover:text-emerald-400 transition-colors"
                            >
                              {isChecked ? <CheckSquare size={16} className="text-emerald-400" /> : <Square size={16} />}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center text-xs text-slate-500 print:text-gray-700 font-mono">{i + 1}</td>
                          <td className="py-3 px-4 font-semibold text-white print:text-black">
                            <span className={isChecked ? "opacity-60" : ""}>{item.bahan}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 print:bg-gray-200 text-slate-300 print:text-gray-800 border border-slate-700/50 print:border-gray-300 font-medium">
                              {item.kategori}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-400 print:text-black text-base">
                            {formatNumber(item.totalJumlah)}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold text-slate-300 print:text-gray-800">
                            {item.satuan}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400 print:text-gray-600">
                            {item.sources.join(", ")}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Signature box for print */}
            <div className="hidden print:grid grid-cols-3 gap-6 pt-10 mt-6 border-t border-gray-400 text-center text-xs text-black">
              <div>
                <p className="font-semibold">Petugas Logistik / Pengadaan</p>
                <div className="h-16" />
                <p className="border-t border-gray-400 inline-block px-8 pt-1">( ........................................ )</p>
              </div>
              <div>
                <p className="font-semibold">Pengawas Gizi SPPG</p>
                <div className="h-16" />
                <p className="border-t border-gray-400 inline-block px-8 pt-1">( ........................................ )</p>
              </div>
              <div>
                <p className="font-semibold">Kepala SPPG</p>
                <div className="h-16" />
                <p className="border-t border-gray-400 inline-block px-8 pt-1">( ........................................ )</p>
              </div>
            </div>
          </div>

          {/* Recipe Cards for print */}
          <div className="space-y-4 print:break-before-page">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 print:text-black">
              <Utensils size={18} className="text-amber-400 print:text-gray-600" />
              Kartu Resep
            </h3>

            {VARIANT_CONFIG.map((vc) => {
              const resolved = resolveVariant(selectedMenu.menu_data, vc.key);
              if (!resolved.nama_menu) return null;
              const variant = selectedMenu.menu_data[vc.key];
              const isSame = "sama_dengan" in variant && variant.sama_dengan != null;
              if (isSame) return null; // Skip duplicates

              return (
                <div key={vc.key} className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-5 print:bg-white print:border-gray-300 print:break-inside-avoid">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full bg-${vc.color}-400`} />
                    <h4 className="text-sm font-bold text-white print:text-black">{vc.label} — {resolved.nama_menu}</h4>
                  </div>

                  {resolved.komposisi.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-400 print:text-gray-600 mb-1">Bahan (per porsi):</p>
                      <div className="grid grid-cols-2 gap-1">
                        {resolved.komposisi.map((ing, i) => (
                          <p key={i} className="text-xs text-slate-300 print:text-gray-700">• {ing.bahan}: {ing.jumlah_per_porsi} {ing.satuan}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {resolved.resep && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-400 print:text-gray-600 mb-1">Resep:</p>
                      <p className="text-xs text-slate-300 print:text-gray-700 whitespace-pre-wrap">{resolved.resep}</p>
                    </div>
                  )}

                  {resolved.langkah_persiapan.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-400 print:text-gray-600 mb-1">Persiapan:</p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        {resolved.langkah_persiapan.map((s, i) => <li key={i} className="text-xs text-slate-300 print:text-gray-700">{s}</li>)}
                      </ol>
                    </div>
                  )}

                  {resolved.langkah_pengolahan.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-400 print:text-gray-600 mb-1">Pengolahan:</p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        {resolved.langkah_pengolahan.map((s, i) => <li key={i} className="text-xs text-slate-300 print:text-gray-700">{s}</li>)}
                      </ol>
                    </div>
                  )}

                  {(resolved.nilai_gizi.energi > 0 || resolved.nilai_gizi.protein > 0) && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/30 print:border-gray-200">
                      {Object.entries(resolved.nilai_gizi).map(([k, v]) => (
                        <span key={k} className="text-[10px] text-slate-400 print:text-gray-600">
                          <strong className="text-slate-300 print:text-gray-800">{v}</strong> {k === "energi" ? "kcal" : "g"} {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TEMPLATE SAVE MODAL
          ════════════════════════════════════════════════════════════════════ */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Bookmark size={16} className="text-amber-400" /> Simpan sebagai Template
              </h4>
              <button onClick={() => setShowTemplateModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Nama Template</label>
              <input
                type="text"
                value={templateSaveName}
                onChange={(e) => setTemplateSaveName(e.target.value)}
                placeholder={formNamaMenu || "Nama template..."}
                className="w-full mt-1 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 mt-4 justify-end">
              <button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors">
                Batal
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-500 transition-colors disabled:opacity-50"
              >
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Bookmark size={13} />}
                Simpan Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          LOAD TEMPLATE MODAL
          ════════════════════════════════════════════════════════════════════ */}
      {showLoadTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowLoadTemplateModal(false)}>
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BookTemplate size={16} className="text-amber-400" /> Muat dari Template
              </h4>
              <button onClick={() => setShowLoadTemplateModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {templates.length === 0 && (
                <div className="text-center py-8">
                  <Bookmark size={24} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Belum ada template tersimpan.</p>
                </div>
              )}

              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleLoadTemplate(tmpl)}
                  className="w-full text-left p-3 rounded-xl border border-slate-700/40 hover:border-amber-500/30 hover:bg-slate-800/60 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">{tmpl.template_name || tmpl.nama_menu}</h5>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                  {tmpl.menu_data?.porsi_besar?.nama_menu && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{tmpl.menu_data.porsi_besar.nama_menu}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          AI MENU GENERATOR MODAL
          ════════════════════════════════════════════════════════════════════ */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => !aiLoading && setShowAiModal(false)}>
          <div className="bg-slate-900 border border-slate-700/70 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">AI Menu & Recipe Generator</h4>
                  <p className="text-[11px] text-slate-400">Didukung Gemini AI standar gizi BGN</p>
                </div>
              </div>
              <button
                disabled={aiLoading}
                onClick={() => setShowAiModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Ide / Tema Menu atau Preferensi Bahan <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Contoh: Menu ayam fillet saus tiram, tumis buncis wortel, tempe orek, dan buah semangka. Bahan lokal ekonomis dan tinggi protein."
                  rows={3}
                  disabled={aiLoading}
                  className="w-full mt-1.5 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors resize-none"
                />
              </div>

              {/* Quick suggestions */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Inspirasi Cepat</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {[
                    "Ayam Bakar Madu & Sayur Asem",
                    "Ikan Kembung Bumbu Kuning & Sayur Sop",
                    "Rolade Daging Sapi & Capcay Bakso",
                    "Nasi Kuning Ayam Suwir & Telur Balado",
                    "Menu Tinggi Zat Besi untuk Balita & Bumil",
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      disabled={aiLoading}
                      onClick={() => setAiPrompt(sug)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target variant */}
              <div>
                <label className="text-xs font-semibold text-slate-300">Target Varian</label>
                <select
                  value={aiTargetVariant}
                  onChange={(e) => setAiTargetVariant(e.target.value as "all" | VariantKey)}
                  disabled={aiLoading}
                  className="w-full mt-1.5 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                >
                  <option value="all">✨ Seluruh Varian Lengkap (Besar, Kecil, Balita, Bumil, Busui)</option>
                  <option value="porsi_besar">Porsi Besar Saja (SD 4-6, SMP, SMA)</option>
                  <option value="porsi_kecil">Porsi Kecil Saja (PAUD-TK, SD 1-3)</option>
                  <option value="pmt_balita">PMT Balita Saja</option>
                  <option value="pmt_bumil">PMT Bumil Saja</option>
                  <option value="pmt_busui">PMT Busui Saja</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 justify-end">
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAiGenerateMenu}
                disabled={aiLoading || !aiPrompt.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-95 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>AI sedang meracik menu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Generate Menu dengan AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          AI SUGGESTIONS / TELAAH GIZI MODAL
          ════════════════════════════════════════════════════════════════════ */}
      {showAiSuggestionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => !aiSuggestionsLoading && setShowAiSuggestionsModal(false)}>
          <div className="bg-slate-900 border border-slate-700/70 rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-400">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Telaah Gizi & Saran Ahli Gizi BGN</h4>
                  <p className="text-[11px] text-slate-400">Evaluasi gizi dan keamanan pangan SPPG</p>
                </div>
              </div>
              <button
                disabled={aiSuggestionsLoading}
                onClick={() => setShowAiSuggestionsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {aiSuggestionsLoading && (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={24} className="animate-spin text-emerald-400" />
                  <p className="text-xs text-slate-400">Menganalisis komposisi gizi dan keamanan pangan...</p>
                </div>
              )}

              {!aiSuggestionsLoading && aiSuggestionsData && (
                <>
                  {/* Status & Score Banner */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800/80 to-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Status Evaluasi</span>
                      <h5 className="text-base font-bold text-white mt-0.5">{aiSuggestionsData.status_evaluasi || "BAIK"}</h5>
                      {aiSuggestionsData.ringkasan && (
                        <p className="text-xs text-slate-300 mt-1">{aiSuggestionsData.ringkasan}</p>
                      )}
                    </div>
                    {typeof aiSuggestionsData.skor_kebugaran_gizi === "number" && (
                      <div className="text-center px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                        <span className="text-2xl font-black text-emerald-400">{aiSuggestionsData.skor_kebugaran_gizi}</span>
                        <p className="text-[10px] text-slate-400">/ 100 Skor</p>
                      </div>
                    )}
                  </div>

                  {/* Kelebihan */}
                  {aiSuggestionsData.kelebihan && aiSuggestionsData.kelebihan.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> Kelebihan Menu
                      </label>
                      <ul className="space-y-1 bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
                        {aiSuggestionsData.kelebihan.map((point, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Kekurangan / Gap */}
                  {aiSuggestionsData.kekurangan && aiSuggestionsData.kekurangan.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <AlertCircle size={13} /> Catatan & Hal Perlu Diperhatikan
                      </label>
                      <ul className="space-y-1 bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
                        {aiSuggestionsData.kekurangan.map((point, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Saran Ahli Gizi */}
                  {aiSuggestionsData.saran_ahli_gizi && aiSuggestionsData.saran_ahli_gizi.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                        <Sparkles size={13} /> Rekomendasi Ahli Gizi BGN
                      </label>
                      <ul className="space-y-1 bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
                        {aiSuggestionsData.saran_ahli_gizi.map((saran, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-indigo-400 font-bold">{idx + 1}.</span>
                            <span>{saran}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tips Keamanan Pangan */}
                  {aiSuggestionsData.tips_keamanan_pangan && aiSuggestionsData.tips_keamanan_pangan.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <Utensils size={13} /> Keamanan Pangan & Sanitasi Dapur SPPG
                      </label>
                      <ul className="space-y-1 bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
                        {aiSuggestionsData.tips_keamanan_pangan.map((tip, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-sky-400 font-bold">✓</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAiSuggestionsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
