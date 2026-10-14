export interface KelompokData {
  id?: string;
  sppg_id?: string | null;
  nama_kelompok: string;
  jenis: string;
  kode: string;
  kategori: string;
  nama_kader: string;
  telepon: string;
  email: string;
  alamat: string;
  kontak: string;
  catatan: string;
}

export interface BeneficiaryData {
  id?: string;
  sppg_id?: string | null;
  kelompok_id?: string | null;
  kelompok_nama?: string;
  kelompok?: {
    id?: string;
    nama_kelompok?: string;
    jenis?: string;
  } | {
    id?: string;
    nama_kelompok?: string;
    jenis?: string;
  }[] | null;
  nama_lengkap: string;
  tanggal_lahir: string;
  gender: string;
  nik: string;
  identity_type: string;
  identity_code: string;
  kategori: string;
  sub_kategori: string;
  status: string;
  tanggal_mulai: string;
  tanggal_berhenti: string;
  catatan: string;
}

export type KelompokListResponse = {
  status: "success" | "error";
  data?: KelompokData[];
  message?: string;
};

export type BeneficiaryListResponse = {
  status: "success" | "error";
  data?: BeneficiaryData[];
  message?: string;
};