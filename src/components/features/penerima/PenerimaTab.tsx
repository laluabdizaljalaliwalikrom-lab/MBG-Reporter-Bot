"use client";

import React from "react";
import {
  Download,
  Edit,
  Filter,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import type { BeneficiaryData, KelompokData } from "@/types/penerima";
import type { SppgData } from "@/types/sppg";
import { getSubKategoriOptions, KATEGORI_OPTIONS } from "@/lib/penerima-options";
import SbTable from "@/components/ui/SbTable";
import SbCard from "@/components/ui/SbCard";
import SbStatCard from "@/components/ui/SbStatCard";

interface PenerimaTabProps {
  beneficiaryView: "kelompok" | "individu";
  setBeneficiaryView: (value: "kelompok" | "individu") => void;
  kelompokFilterSppg: string;
  setKelompokFilterSppg: (value: string) => void;
  sppgList: SppgData[];
  loadingKelompok: boolean;
  kelompokList: KelompokData[];
  handleEditKelompok: (value: KelompokData) => void;
  handleDeleteKelompok: (id: string) => void;
  onAddKelompok: () => void;
  onOpenKpmImport: () => void;
  loadingBeneficiary: boolean;
  beneficiaryList: BeneficiaryData[];
  beneficiarySearch: string;
  setBeneficiarySearch: (value: string) => void;
  beneficiaryFilterSppg: string;
  setBeneficiaryFilterSppg: (value: string) => void;
  beneficiaryFilterKategori: string;
  setBeneficiaryFilterKategori: (value: string) => void;
  beneficiaryFilterStatus: string;
  setBeneficiaryFilterStatus: (value: string) => void;
  onFetchBeneficiary: () => void;
  onAddBeneficiary: () => void;
  onEditBeneficiary: (value: BeneficiaryData) => void;
  onDeleteBeneficiary: (id: string) => void;

  setKelompokForm: (value: any) => void;
  setEditingKelompokId: (value: string | null) => void;
  setShowKelompokModal: (value: boolean) => void;
  setKpmImportSppgId: (value: string) => void;
  setShowKpmImportModal: (value: boolean) => void;
  setBeneficiaryForm: (value: any) => void;
  setEditingBeneficiaryId: (value: string | null) => void;
  setShowBeneficiaryModal: (value: boolean) => void;
  setImportSppgId: (value: string) => void;
  setImportKelompokId: (value: string) => void;
  setImportAutoCreate: (value: boolean) => void;
  setShowImportModal: (value: boolean) => void;
  handleDownloadTemplate: () => void;
  fetchBeneficiaryList: () => void;
}

export default function PenerimaTab(props: PenerimaTabProps) {
  const {
    beneficiaryView,
    setBeneficiaryView,
    kelompokFilterSppg,
    setKelompokFilterSppg,
    sppgList,
    loadingKelompok,
    kelompokList,
    handleEditKelompok,
    handleDeleteKelompok,
    onAddKelompok,
    onOpenKpmImport,
    loadingBeneficiary,
    beneficiaryList,
    beneficiarySearch,
    setBeneficiarySearch,
    beneficiaryFilterSppg,
    setBeneficiaryFilterSppg,
    beneficiaryFilterKategori,
    setBeneficiaryFilterKategori,
    beneficiaryFilterStatus,
    setBeneficiaryFilterStatus,
    onFetchBeneficiary,
    onAddBeneficiary,
    onEditBeneficiary: handleEditBeneficiary,
    onDeleteBeneficiary: handleDeleteBeneficiary,
  } = props;

  const {
    setKelompokForm,
    setEditingKelompokId,
    setShowKelompokModal,
    setKpmImportSppgId,
    setShowKpmImportModal,
    setBeneficiaryForm,
    setEditingBeneficiaryId,
    setShowBeneficiaryModal,
    setImportSppgId,
    setImportKelompokId,
    setImportAutoCreate,
    setShowImportModal,
    handleDownloadTemplate,
    fetchBeneficiaryList,
  } = props;

  const totalBeneficiaries = (beneficiaryList || []).length;
  const aktifCount = (beneficiaryList || []).filter((b: any) => b.status === "Aktif").length;
  const nonaktifCount = totalBeneficiaries - aktifCount;

  return (
    <div className="space-y-6">
      {/* Sub toggle */}
      <div className="inline-flex rounded border border-[#d1d3e2] dark:border-gray-700 bg-white dark:bg-gray-800 p-1 shadow-sm">
        <button
          onClick={() => setBeneficiaryView("kelompok")}
          className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${
            beneficiaryView === "kelompok"
              ? "bg-[#4e73df] text-white shadow-sm"
              : "text-[#858796] hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Kelompok
        </button>
        <button
          onClick={() => setBeneficiaryView("individu")}
          className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${
            beneficiaryView === "individu"
              ? "bg-[#4e73df] text-white shadow-sm"
              : "text-[#858796] hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Individu
        </button>
      </div>

      {beneficiaryView === "kelompok" && (
        <SbCard
          title="Kelompok Penerima Manfaat"
          subtitle={`Total terdaftar: ${kelompokList.length} kelompok`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={kelompokFilterSppg}
                onChange={(e) => setKelompokFilterSppg(e.target.value)}
                className="bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df]"
              >
                <option value="">Semua SPPG</option>
                {sppgList.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama_sppg}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setKelompokForm({ sppg_id: kelompokFilterSppg || null, nama_kelompok: "", jenis: "Sekolah", kode: "", kategori: "", nama_kader: "", telepon: "", email: "", alamat: "", kontak: "", catatan: "" });
                  setEditingKelompokId(null);
                  setShowKelompokModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#4e73df] hover:bg-[#2e59d9] text-white text-xs font-bold transition-colors shadow-sm"
              >
                <Plus size={14} /> Tambah Kelompok
              </button>
              <button
                onClick={() => {
                  setKpmImportSppgId(kelompokFilterSppg || "");
                  setShowKpmImportModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#1cc88a] hover:bg-[#17a673] text-white text-xs font-bold transition-colors shadow-sm"
              >
                <Upload size={14} /> Import Excel/CSV
              </button>
            </div>
          }
        >
          {loadingKelompok ? (
            <p className="text-gray-400 text-xs py-8 text-center">Memuat kelompok...</p>
          ) : kelompokList.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-xs py-8 text-center">Belum ada kelompok. Klik Tambah Kelompok untuk membuat.</p>
          ) : (
            <SbTable>
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-[#4e73df] dark:text-gray-300 uppercase font-bold bg-[#f8f9fc] dark:bg-gray-800/80 border-b border-[#e3e6f0] dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">Nama Kelompok</th>
                    <th className="px-4 py-3">Jenis</th>
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Nama PIC</th>
                    <th className="px-4 py-3">No. Telpon</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">SPPG</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e6f0] dark:divide-gray-700">
                  {kelompokList.map((k) => {
                    const sppg = sppgList.find((s) => s.id === k.sppg_id);
                    return (
                      <tr key={k.id} className="hover:bg-[#f8f9fc]/80 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300">
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{k.nama_kelompok}</td>
                        <td className="px-4 py-3">{k.jenis}</td>
                        <td className="px-4 py-3 font-mono">{k.kode || "-"}</td>
                        <td className="px-4 py-3">{k.nama_kader || "-"}</td>
                        <td className="px-4 py-3 font-mono">{k.telepon || "-"}</td>
                        <td className="px-4 py-3">{k.email || "-"}</td>
                        <td className="px-4 py-3">{sppg?.nama_sppg || "-"}</td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          <button onClick={() => handleEditKelompok(k)} className="p-1.5 rounded bg-[#f8f9fc] dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[#4e73df] border border-[#d1d3e2] dark:border-gray-600 transition-colors inline-block" title="Edit"><Edit size={13} /></button>
                          <button onClick={() => k.id && handleDeleteKelompok(k.id)} className="p-1.5 rounded bg-[#f8f9fc] dark:bg-gray-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 border border-[#d1d3e2] dark:border-gray-600 transition-colors inline-block" title="Hapus"><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </SbTable>
          )}
        </SbCard>
      )}

      {beneficiaryView === "individu" && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SbStatCard label="Total Penerima" value={beneficiaryList.length} tone="primary" />
            <SbStatCard label="Penerima Aktif" value={aktifCount} tone="success" />
            <SbStatCard label="Nonaktif" value={nonaktifCount} tone="danger" />
            <SbStatCard label="Total Kelompok" value={kelompokList.length} tone="info" />
          </div>

          <SbCard
            title="Daftar Penerima Manfaat"
            subtitle="Data individual penerima manfaat makanan bergizi gratis"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={beneficiarySearch}
                  onChange={(e) => setBeneficiarySearch(e.target.value)}
                  placeholder="Cari nama..."
                  className="bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df] min-w-[140px]"
                />
                <select
                  value={beneficiaryFilterSppg}
                  onChange={(e) => setBeneficiaryFilterSppg(e.target.value)}
                  className="bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df]"
                >
                  <option value="">Semua SPPG</option>
                  {sppgList.map((s) => (
                    <option key={s.id} value={s.id}>{s.nama_sppg}</option>
                  ))}
                </select>
                <select
                  value={beneficiaryFilterKategori}
                  onChange={(e) => setBeneficiaryFilterKategori(e.target.value)}
                  className="bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df]"
                >
                  <option value="">Semua Kategori</option>
                  {Array.from(new Set(beneficiaryList.map((b) => b.kategori).filter(Boolean))).map((k) => (
                    <option key={k as string} value={k as string}>{k as string}</option>
                  ))}
                </select>
                <select
                  value={beneficiaryFilterStatus}
                  onChange={(e) => setBeneficiaryFilterStatus(e.target.value)}
                  className="bg-white dark:bg-gray-800 border border-[#d1d3e2] dark:border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-[#4e73df]"
                >
                  <option value="All">Semua Status</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
                <button
                  onClick={fetchBeneficiaryList}
                  className="px-3 py-1.5 rounded bg-[#f8f9fc] dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-[#d1d3e2] dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold"
                >
                  Refresh
                </button>
                <button
                  onClick={() => {
                    setBeneficiaryForm({ sppg_id: beneficiaryFilterSppg || null, kelompok_id: null, nama_lengkap: "", tanggal_lahir: "", gender: "", nik: "", identity_type: "nik", identity_code: "", kategori: "", sub_kategori: "", status: "Aktif", tanggal_mulai: "", tanggal_berhenti: "", catatan: "" });
                    setEditingBeneficiaryId(null);
                    setShowBeneficiaryModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#4e73df] hover:bg-[#2e59d9] text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <Plus size={14} /> Tambah
                </button>
                <button
                  onClick={() => {
                    setImportSppgId(beneficiaryFilterSppg || "");
                    setImportKelompokId("");
                    setImportAutoCreate(false);
                    setShowImportModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#1cc88a] hover:bg-[#17a673] text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <Upload size={14} /> Import CSV
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#f8f9fc] dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-[#d1d3e2] dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold"
                >
                  <Download size={14} /> Template
                </button>
              </div>
            }
          >
            {/* Detail table */}
            {loadingBeneficiary ? (
              <p className="text-gray-400 text-xs py-8 text-center">Memuat penerima manfaat...</p>
            ) : beneficiaryList.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-xs py-8 text-center">Belum ada penerima manfaat.</p>
            ) : (
              <SbTable>
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-[#4e73df] dark:text-gray-300 uppercase font-bold bg-[#f8f9fc] dark:bg-gray-800/80 border-b border-[#e3e6f0] dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Nama</th>
                      <th className="px-4 py-3 text-left">Tgl Lahir</th>
                      <th className="px-4 py-3 text-left">Gender</th>
                      <th className="px-4 py-3 text-left">Identitas</th>
                      <th className="px-4 py-3 text-left">Kategori</th>
                      <th className="px-4 py-3 text-left">Kelompok</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e3e6f0] dark:divide-gray-700">
                    {beneficiaryList.map((b) => (
                      <tr key={b.id} className="hover:bg-[#f8f9fc]/80 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300">
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{(b.nama_lengkap || "").toUpperCase()}</td>
                        <td className="px-4 py-3 font-mono">{b.tanggal_lahir || "-"}</td>
                        <td className="px-4 py-3 font-mono">{b.gender || "-"}</td>
                        <td className="px-4 py-3 font-mono">
                          {b.nik ? `NIK ${b.nik}` : ""}
                          {b.identity_code ? (b.nik ? " / " : "") + `${b.identity_type} ${b.identity_code}` : ""}
                          {!b.nik && !b.identity_code ? "-" : ""}
                        </td>
                        <td className="px-4 py-3">{b.kategori}{b.sub_kategori ? ` - ${b.sub_kategori}` : ""}</td>
                        <td className="px-4 py-3 font-medium">
                          {b.kelompok_nama ||
                            (b.kelompok && !Array.isArray(b.kelompok) ? b.kelompok.nama_kelompok : null) ||
                            (Array.isArray(b.kelompok) && b.kelompok[0]?.nama_kelompok) ||
                            kelompokList.find((k) => k.id === b.kelompok_id)?.nama_kelompok ||
                            "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === "Aktif"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          <button onClick={() => handleEditBeneficiary(b)} className="p-1.5 rounded bg-[#f8f9fc] dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[#4e73df] border border-[#d1d3e2] dark:border-gray-600 transition-colors inline-block" title="Edit"><Edit size={13} /></button>
                          <button onClick={() => b.id && handleDeleteBeneficiary(b.id)} className="p-1.5 rounded bg-[#f8f9fc] dark:bg-gray-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 border border-[#d1d3e2] dark:border-gray-600 transition-colors inline-block" title="Hapus"><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SbTable>
            )}
          </SbCard>

          {/* Ringkasan per kategori */}
          <SbCard
            title="Ringkasan per Kategori"
            subtitle="Statistik jumlah penerima berdasarkan kategori"
          >
            <SbTable>
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-[#4e73df] dark:text-gray-300 uppercase font-bold bg-[#f8f9fc] dark:bg-gray-800/80 border-b border-[#e3e6f0] dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Kategori</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5 text-right">Aktif</th>
                    <th className="px-4 py-2.5 text-right">Nonaktif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e6f0] dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                  {Array.from(new Set(beneficiaryList.map((b) => b.kategori).filter(Boolean))).map((k) => {
                    const grp = beneficiaryList.filter((b) => b.kategori === k);
                    return (
                      <tr key={k as string} className="hover:bg-[#f8f9fc]/80 dark:hover:bg-gray-700/40">
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{k as string}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900 dark:text-white">{grp.length}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{grp.filter((b) => b.status === "Aktif").length}</td>
                        <td className="px-4 py-2.5 text-right text-rose-600 dark:text-rose-400 font-semibold">{grp.filter((b) => b.status !== "Aktif").length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </SbTable>
          </SbCard>
        </div>
      )}
    </div>
  );
}