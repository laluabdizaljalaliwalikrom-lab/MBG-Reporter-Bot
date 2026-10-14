"use client";

import { Database, Edit, Loader2, Plus, Search, Trash2 } from "lucide-react";
import type { SppgData } from "@/types/sppg";
import SbPageHeader from "@/components/ui/SbPageHeader";
import SbTable from "@/components/ui/SbTable";
import SbCard from "@/components/ui/SbCard";

interface SppgTabProps {
  loading: boolean;
  sppgList: SppgData[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (sppg: SppgData) => void;
  onDelete: (id: string) => void;
}

export default function SppgTab({
  loading,
  sppgList,
  search,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
}: SppgTabProps) {
  const filtered = sppgList.filter((s) =>
    s.nama_sppg.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SbCard
        title="Data Master SPPG"
        subtitle={`Total terdaftar: ${sppgList.length} SPPG`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={13}
              />
              <input
                type="text"
                placeholder="Cari nama SPPG..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] rounded text-gray-700 dark:text-gray-200 text-xs outline-none w-full sm:w-56"
              />
            </div>
            <button
              onClick={onAdd}
              className="shrink-0 px-3.5 py-1.5 bg-[#4e73df] hover:bg-[#2e59d9] rounded text-xs font-bold text-white flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Tambah SPPG</span>
            </button>
          </div>
        }
      >
        {loading ? (
          <div className="py-16 flex flex-col justify-center items-center text-gray-500 dark:text-gray-400 text-xs gap-3">
            <Loader2 className="w-7 h-7 text-[#4e73df] animate-spin" />
            <span>Memuat data master SPPG...</span>
          </div>
        ) : (
          <SbTable>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e3e6f0] dark:border-gray-700 text-[11px] uppercase font-bold text-[#4e73df] dark:text-gray-300 tracking-wider bg-[#f8f9fc] dark:bg-gray-800/80">
                  <th className="py-3 px-4">Nama SPPG</th>
                  <th className="py-3 px-4 text-center">Kepala SPPG</th>
                  <th className="py-3 px-4 text-center">Pengawas Gizi</th>
                  <th className="py-3 px-4 text-center">Porsi (Besar / Kecil)</th>
                  <th className="py-3 px-4 text-center">PMT (Balita / Bumil / Busui)</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3e6f0] dark:divide-gray-700">
                {filtered.length > 0 ? (
                  filtered.map((sppg) => (
                    <tr
                      key={sppg.id}
                      className="text-xs text-gray-700 dark:text-gray-300 hover:bg-[#f8f9fc]/80 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#4e73df] shrink-0" />
                          <span>{sppg.nama_sppg}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                          {sppg.kepala_sppg || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                          {sppg.pengawas_gizi || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[#4e73df] dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold">
                          {sppg.porsi_besar}
                        </span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                          {sppg.porsi_kecil}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-amber-500 font-bold">{sppg.balita}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-rose-500 font-bold">{sppg.bumil}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-purple-500 font-bold">{sppg.busui}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onEdit(sppg)}
                            className="p-1.5 bg-[#f8f9fc] dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-[#d1d3e2] dark:border-gray-600 text-[#4e73df] rounded transition-colors"
                            title="Edit SPPG"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => sppg.id && onDelete(sppg.id)}
                            className="p-1.5 bg-[#f8f9fc] dark:bg-gray-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-[#d1d3e2] dark:border-gray-600 text-rose-500 rounded transition-colors"
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
                    <td colSpan={6} className="py-12 px-4 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Database size={24} className="text-gray-400" />
                        <span>Tidak ada data SPPG yang sesuai kata kunci.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </SbTable>
        )}
      </SbCard>
    </div>
  );
}
