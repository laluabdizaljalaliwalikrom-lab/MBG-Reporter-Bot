export interface SppgData {
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

export type SppgListResponse = {
  status: "success" | "error";
  data?: SppgData[];
  message?: string;
};