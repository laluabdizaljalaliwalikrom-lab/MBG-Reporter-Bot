import { useCallback, useState } from "react";
import type { SppgData } from "@/types/sppg";
import { fetchSppgListApi } from "@/lib/api/sppg";

export function useSppgList() {
  const [sppgList, setSppgList] = useState<SppgData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSppgListApi();
      setSppgList(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data SPPG.";
      setError(msg);
      console.error("useSppgList error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { sppgList, setSppgList, loading, error, refresh };
}