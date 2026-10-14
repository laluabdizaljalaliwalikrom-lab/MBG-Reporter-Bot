import { useCallback, useRef, useState } from "react";
import type { SppgData } from "@/types/sppg";
import { fetchSppgListApi } from "@/lib/api/sppg";

interface UseSppgManagerOptions {
  showToast?: (message: string, type?: "success" | "error") => void;
  onLoaded?: (list: SppgData[]) => void;
}

export function useSppgManager(options: UseSppgManagerOptions = {}) {
  const { showToast, onLoaded } = options;

  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

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
    sub_wilayah: "",
  });
  const [editingSppgId, setEditingSppgId] = useState<string | null>(null);
  const [showSppgModal, setShowSppgModal] = useState(false);
  const [sppgSubmitting, setSppgSubmitting] = useState(false);
  const [sppgSearch, setSppgSearch] = useState("");

  const fetchSppgList = useCallback(async () => {
    setLoadingSppg(true);
    try {
      const list = await fetchSppgListApi();
      setSppgList(list);
      onLoadedRef.current?.(list);
    } catch (err) {
      console.error("Gagal mengambil data SPPG:", err);
      showToastRef.current?.("Gagal memuat data SPPG. Periksa koneksi.", "error");
    } finally {
      setLoadingSppg(false);
    }
  }, []);

  const handleSaveSppg = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!sppgForm.nama_sppg.trim()) {
        showToastRef.current?.("Nama SPPG wajib diisi.", "error");
        return;
      }
      setSppgSubmitting(true);
      try {
        const method = editingSppgId ? "PUT" : "POST";
        const body = editingSppgId
          ? { id: editingSppgId, ...sppgForm }
          : sppgForm;
        const res = await fetch("/api/sppg", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.status === "success") {
          showToastRef.current?.(
            editingSppgId
              ? "Data SPPG berhasil diperbarui!"
              : "Data SPPG baru berhasil ditambahkan!",
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
            sub_wilayah: "",
          });
          setEditingSppgId(null);
          setShowSppgModal(false);
          await fetchSppgList();
        } else {
          showToastRef.current?.(json.message || "Gagal menyimpan data SPPG.", "error");
        }
      } catch (err) {
        console.error("handleSaveSppg error:", err);
        showToastRef.current?.("Terjadi kesalahan saat menyimpan data SPPG.", "error");
      } finally {
        setSppgSubmitting(false);
      }
    },
    [editingSppgId, sppgForm, fetchSppgList]
  );

  const handleEditSppg = useCallback((sppg: SppgData) => {
    setEditingSppgId(sppg.id || null);
    setSppgForm({
      nama_sppg: sppg.nama_sppg || "",
      porsi_kecil: sppg.porsi_kecil || 0,
      porsi_besar: sppg.porsi_besar || 0,
      balita: sppg.balita || 0,
      bumil: sppg.bumil || 0,
      busui: sppg.busui || 0,
      kepala_sppg: sppg.kepala_sppg || "",
      pengawas_gizi: sppg.pengawas_gizi || "",
      kontak_pengaduan: sppg.kontak_pengaduan || "",
      tiktok: sppg.tiktok || "",
      instagram: sppg.instagram || "",
      sub_wilayah: sppg.sub_wilayah || "",
    });
    setShowSppgModal(true);
  }, []);

  const handleDeleteSppg = useCallback(
    async (id: string) => {
      if (!window.confirm("Hapus data SPPG ini? Tindakan tidak bisa dibatalkan.")) {
        return;
      }
      try {
        const res = await fetch(`/api/sppg?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (json.status === "success") {
          showToastRef.current?.("Data SPPG berhasil dihapus.", "success");
          await fetchSppgList();
        } else {
          showToastRef.current?.(json.message || "Gagal menghapus data SPPG.", "error");
        }
      } catch (err) {
        console.error("handleDeleteSppg error:", err);
        showToastRef.current?.("Terjadi kesalahan saat menghapus data SPPG.", "error");
      }
    },
    [fetchSppgList]
  );

  return {
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
  };
}
