"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import type { SppgData } from "@/types/sppg";
import type { KelompokData, BeneficiaryData } from "@/types/penerima";
import { fetchKelompokListApi } from "@/lib/api/kelompok";
import { fetchBeneficiaryListApi } from "@/lib/api/penerima";
import SbStatCard from "@/components/ui/SbStatCard";
import SbPageHeader from "@/components/ui/SbPageHeader";
import SbTable from "@/components/ui/SbTable";
import SbCard from "@/components/ui/SbCard";

interface RekapRow {
  key: string;
  sppgNama: string;
  kelompokNama: string;
  jenis: string;
  total: number;
  aktif: number;
  nonaktif: number;
  l: number;
  p: number;
}

interface KategoriRow {
  kategori: string;
  total: number;
  aktif: number;
  nonaktif: number;
}

interface RekapTabProps {
  sppgList: SppgData[];
}

export default function RekapTab({ sppgList }: RekapTabProps) {
  const [rekapFilterSppg, setRekapFilterSppg] = useState<string>("");
  const [rekapKelompokList, setRekapKelompokList] = useState<KelompokData[]>([]);
  const [rekapBeneficiaryList, setRekapBeneficiaryList] = useState<BeneficiaryData[]>([]);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [rekapError, setRekapError] = useState<string | null>(null);

  const fetchRekapData = useCallback(async () => {
    setLoadingRekap(true);
    setRekapError(null);
    try {
      const [kData, bData] = await Promise.all([
        fetchKelompokListApi(rekapFilterSppg),
        fetchBeneficiaryListApi({ sppgId: rekapFilterSppg })
      ]);
      setRekapKelompokList(kData);
      setRekapBeneficiaryList(bData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuat rekap penerima manfaat.";
      setRekapError(msg);
      console.error("Gagal memuat rekap penerima manfaat:", err);
    } finally {
      setLoadingRekap(false);
    }
  }, [rekapFilterSppg]);

  useEffect(() => {
    fetchRekapData();
  }, [fetchRekapData]);

  const rekapRows = useMemo<RekapRow[]>(() => {
    const groups = rekapKelompokList;
    const membersAll = rekapBeneficiaryList;
    const rows: RekapRow[] = groups.map((k) => {
      const members = membersAll.filter((b) => b.kelompok_id === k.id);
      const sppg = sppgList.find((s) => s.id === k.sppg_id);
      return {
        key: k.id || k.nama_kelompok,
        sppgNama: sppg?.nama_sppg || "-",
        kelompokNama: k.nama_kelompok,
        jenis: k.jenis || "-",
        total: members.length,
        aktif: members.filter((m) => m.status === "Aktif").length,
        nonaktif: members.filter((m) => m.status !== "Aktif").length,
        l: members.filter((m) => m.gender === "L").length,
        p: members.filter((m) => m.gender === "P").length
      };
    });
    const assignedIds = new Set(groups.map((g) => g.id).filter(Boolean));
    const unassigned = membersAll.filter((b) => !b.kelompok_id || !assignedIds.has(b.kelompok_id));
    if (unassigned.length > 0) {
      rows.push({
        key: "tanpa-kelompok",
        sppgNama: "-",
        kelompokNama: "Tanpa Kelompok",
        jenis: "-",
        total: unassigned.length,
        aktif: unassigned.filter((m) => m.status === "Aktif").length,
        nonaktif: unassigned.filter((m) => m.status !== "Aktif").length,
        l: unassigned.filter((m) => m.gender === "L").length,
        p: unassigned.filter((m) => m.gender === "P").length
      });
    }
    return rows;
  }, [rekapKelompokList, rekapBeneficiaryList, sppgList]);

  const rekapKategoriRows = useMemo<KategoriRow[]>(() => {
    const map = new Map<string, KategoriRow>();
    for (const b of rekapBeneficiaryList) {
      const key = b.kategori || "Tanpa Kategori";
      const cur = map.get(key) || { kategori: key, total: 0, aktif: 0, nonaktif: 0 };
      cur.total += 1;
      if (b.status === "Aktif") cur.aktif += 1;
      else cur.nonaktif += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [rekapBeneficiaryList]);

  const rekapSummary = useMemo(() => {
    return rekapRows.reduce(
      (acc, r) => {
        acc.kelompok += 1;
        acc.total += r.total;
        acc.aktif += r.aktif;
        acc.nonaktif += r.nonaktif;
        acc.l += r.l;
        acc.p += r.p;
        return acc;
      },
      { kelompok: 0, total: 0, aktif: 0, nonaktif: 0, l: 0, p: 0 }
    );
  }, [rekapRows]);

  return (
    <div className="space-y-6">
      <SbCard
        title="Rekap Penerima Manfaat per Kelompok"
        subtitle="Distribusi data penerima per kelompok SPPG dan kategori"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={rekapFilterSppg}
              onChange={(e) => setRekapFilterSppg(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df]"
            >
              <option value="">Semua SPPG</option>
              {sppgList.map((s) => (
                <option key={s.id} value={s.id}>{s.nama_sppg}</option>
              ))}
            </select>
            <button
              onClick={fetchRekapData}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#4e73df] hover:bg-[#2e59d9] text-white text-xs font-bold transition-colors shadow-sm"
            >
              <RefreshCw size={14} /> Muat Ulang
            </button>
          </div>
        }
      >
        {rekapError && (
          <p className="text-rose-500 text-xs mb-3">{rekapError}</p>
        )}

        {loadingRekap ? (
          <p className="text-gray-400 text-xs py-8 text-center">Memuat rekap...</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SbStatCard label="Kelompok" value={rekapSummary.kelompok} tone="primary" />
              <SbStatCard label="Total Penerima" value={rekapSummary.total} tone="info" />
              <SbStatCard label="Aktif" value={rekapSummary.aktif} tone="success" />
              <SbStatCard label="Nonaktif" value={rekapSummary.nonaktif} tone="danger" />
            </div>

            <SbTable>
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-[#4e73df] dark:text-gray-300 uppercase font-bold bg-[#f8f9fc] dark:bg-gray-800/80 border-b border-[#e3e6f0] dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    {rekapFilterSppg === "" && <th className="px-4 py-3">SPPG</th>}
                    <th className="px-4 py-3">Kelompok</th>
                    <th className="px-4 py-3">Jenis</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Aktif</th>
                    <th className="px-4 py-3 text-right">Nonaktif</th>
                    <th className="px-4 py-3 text-right">L</th>
                    <th className="px-4 py-3 text-right">P</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e6f0] dark:divide-gray-700">
                  {rekapRows.length === 0 ? (
                    <tr>
                      <td colSpan={rekapFilterSppg === "" ? 9 : 8} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                        Belum ada data kelompok/penerima. Pilih SPPG lain atau muat ulang.
                      </td>
                    </tr>
                  ) : (
                    rekapRows.map((r, idx) => (
                      <tr key={r.key} className="hover:bg-[#f8f9fc]/80 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300">
                        <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                        {rekapFilterSppg === "" && <td className="px-4 py-3 font-medium">{r.sppgNama}</td>}
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{r.kelompokNama}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.jenis}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{r.total}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{r.aktif}</td>
                        <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-semibold">{r.nonaktif}</td>
                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{r.l}</td>
                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{r.p}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rekapRows.length > 0 && (
                  <tfoot className="bg-[#f8f9fc] dark:bg-gray-800/80 text-xs font-bold text-gray-900 dark:text-white border-t-2 border-[#e3e6f0] dark:border-gray-700">
                    <tr>
                      <td className="px-4 py-3" colSpan={rekapFilterSppg === "" ? 4 : 3}>Total</td>
                      <td className="px-4 py-3 text-right">{rekapSummary.total}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{rekapSummary.aktif}</td>
                      <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400">{rekapSummary.nonaktif}</td>
                      <td className="px-4 py-3 text-right">{rekapSummary.l}</td>
                      <td className="px-4 py-3 text-right">{rekapSummary.p}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </SbTable>

            <SbCard
              title="Breakdown per Kategori"
              subtitle="Rincian status penerima per kategori gizi & sekolah"
              className="mt-4"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-[#4e73df] dark:text-gray-300 uppercase font-bold bg-[#f8f9fc] dark:bg-gray-800/80 border-b border-[#e3e6f0] dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-2.5">Kategori</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                      <th className="px-4 py-2.5 text-right">Aktif</th>
                      <th className="px-4 py-2.5 text-right">Nonaktif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e3e6f0] dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                    {rekapKategoriRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-gray-400 text-xs">Belum ada data.</td>
                      </tr>
                    ) : (
                      rekapKategoriRows.map((r) => (
                        <tr key={r.kategori} className="hover:bg-[#f8f9fc]/80 dark:hover:bg-gray-700/40">
                          <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{r.kategori}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-gray-900 dark:text-white">{r.total}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{r.aktif}</td>
                          <td className="px-4 py-2.5 text-right text-rose-600 dark:text-rose-400 font-semibold">{r.nonaktif}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </SbCard>
          </div>
        )}
      </SbCard>
    </div>
  );
}
