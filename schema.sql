-- Create the mbg_reports table
CREATE TABLE IF NOT EXISTS mbg_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    whatsapp_from TEXT,
    raw_message TEXT,
    extracted_data JSONB,
    status TEXT DEFAULT 'DRAFT',
    
    -- Extracted fields for easier access (optional but recommended)
    tanggal DATE,
    porsi_besar INTEGER,
    porsi_kecil INTEGER,
    menu TEXT,
    energi NUMERIC,
    protein NUMERIC,
    lemak NUMERIC,
    karbohidrat NUMERIC,
    serat NUMERIC,
    
    -- New fields for state management and media
    photo_url TEXT,
    poster_url TEXT
);

-- Disable RLS for mbg_reports (Supabase enables RLS by default on new projects)
ALTER TABLE mbg_reports DISABLE ROW LEVEL SECURITY;

-- Create the sppg_data table
CREATE TABLE IF NOT EXISTS sppg_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nama_sppg TEXT UNIQUE NOT NULL,
    porsi_kecil INTEGER DEFAULT 0,
    porsi_besar INTEGER DEFAULT 0,
    balita INTEGER DEFAULT 0,
    bumil INTEGER DEFAULT 0,
    busui INTEGER DEFAULT 0,
    kepala_sppg TEXT DEFAULT '',  -- Nama Kepala SPPG (e.g. Drs. Ahmad Hidayat, M.Si)
    pengawas_gizi TEXT DEFAULT '', -- Nama Pengawas Gizi (e.g. Ns. Fatimah, S.Gz)
    kontak_pengaduan TEXT DEFAULT '', -- Kontak WA Pengaduan SPPG (e.g. 08123456789)
    tiktok TEXT DEFAULT '',           -- Akun TikTok SPPG (e.g. sppg_bandung)
    instagram TEXT DEFAULT '',        -- Akun Instagram SPPG (e.g. sppg_bandung)
    sub_wilayah TEXT DEFAULT ''       -- Keterangan wilayah/pelayanan (e.g. Kawasan Pelayanan Mandiri)
);

-- Migration query to add columns if table already exists in Supabase:
ALTER TABLE sppg_data ADD COLUMN IF NOT EXISTS kepala_sppg TEXT DEFAULT '';
ALTER TABLE sppg_data ADD COLUMN IF NOT EXISTS pengawas_gizi TEXT DEFAULT '';
ALTER TABLE sppg_data ADD COLUMN IF NOT EXISTS kontak_pengaduan TEXT DEFAULT '';
ALTER TABLE sppg_data ADD COLUMN IF NOT EXISTS tiktok TEXT DEFAULT '';
ALTER TABLE sppg_data ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT '';
ALTER TABLE sppg_data ADD COLUMN IF NOT EXISTS sub_wilayah TEXT DEFAULT '';

-- Disable RLS for sppg_data (matching mbg_reports behaviour)
ALTER TABLE sppg_data DISABLE ROW LEVEL SECURITY;

-- Create the mbg_menus table (MBG Maker feature)
CREATE TABLE IF NOT EXISTS mbg_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nama_menu TEXT NOT NULL,                          -- Nama menu utama
    tanggal DATE,                                     -- Tanggal target menu
    sppg_id UUID REFERENCES sppg_data(id) ON DELETE SET NULL, -- Referensi SPPG
    menu_data JSONB NOT NULL DEFAULT '{}',            -- Data semua variant menu (porsi besar/kecil, PMT)
    status TEXT DEFAULT 'DRAFT',                      -- DRAFT | FINALIZED
    catatan TEXT,                                     -- Catatan tambahan
    is_template BOOLEAN DEFAULT FALSE,                -- True = template reusable
    template_name TEXT                                -- Nama template (jika is_template = true)
);

-- Disable RLS for mbg_menus
ALTER TABLE mbg_menus DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Kelompok Penerima Manfaat (grup sekolah/posyandu/dll)
-- ============================================
CREATE TABLE IF NOT EXISTS kelompok_penerima_manfaat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sppg_id UUID REFERENCES sppg_data(id) ON DELETE SET NULL,
    nama_kelompok TEXT NOT NULL,
    jenis TEXT DEFAULT 'Sekolah',
    kategori TEXT DEFAULT '',
    alamat TEXT DEFAULT '',
    kontak TEXT DEFAULT '',
    catatan TEXT DEFAULT ''
);

ALTER TABLE kelompok_penerima_manfaat ADD COLUMN IF NOT EXISTS sppg_id UUID REFERENCES sppg_data(id) ON DELETE SET NULL;
ALTER TABLE kelompok_penerima_manfaat ADD COLUMN IF NOT EXISTS jenis TEXT DEFAULT 'Sekolah';
ALTER TABLE kelompok_penerima_manfaat ADD COLUMN IF NOT EXISTS kategori TEXT DEFAULT '';
ALTER TABLE kelompok_penerima_manfaat ADD COLUMN IF NOT EXISTS alamat TEXT DEFAULT '';
ALTER TABLE kelompok_penerima_manfaat ADD COLUMN IF NOT EXISTS kontak TEXT DEFAULT '';
ALTER TABLE kelompok_penerima_manfaat ADD COLUMN IF NOT EXISTS catatan TEXT DEFAULT '';
ALTER TABLE kelompok_penerima_manfaat ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE kelompok_penerima_manfaat DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Penerima Manfaat (individu)
-- ============================================
CREATE TABLE IF NOT EXISTS penerima_manfaat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sppg_id UUID REFERENCES sppg_data(id) ON DELETE SET NULL,
    kelompok_id UUID REFERENCES kelompok_penerima_manfaat(id) ON DELETE SET NULL,
    nama_lengkap TEXT NOT NULL,
    tanggal_lahir DATE,
    gender TEXT DEFAULT '',
    nik TEXT DEFAULT '',
    identity_type TEXT DEFAULT 'nik',
    identity_code TEXT DEFAULT '',
    kategori TEXT DEFAULT '',
    sub_kategori TEXT DEFAULT '',
    status TEXT DEFAULT 'Aktif',
    tanggal_mulai DATE,
    tanggal_berhenti DATE,
    catatan TEXT DEFAULT ''
);

ALTER TABLE penerima_manfaat ADD COLUMN IF NOT EXISTS kelompok_id UUID REFERENCES kelompok_penerima_manfaat(id) ON DELETE SET NULL;
ALTER TABLE penerima_manfaat ADD COLUMN IF NOT EXISTS nik TEXT DEFAULT '';
ALTER TABLE penerima_manfaat ADD COLUMN IF NOT EXISTS identity_type TEXT DEFAULT 'nik';
ALTER TABLE penerima_manfaat ADD COLUMN IF NOT EXISTS identity_code TEXT DEFAULT '';
ALTER TABLE penerima_manfaat ADD COLUMN IF NOT EXISTS kategori TEXT DEFAULT '';
ALTER TABLE penerima_manfaat ADD COLUMN IF NOT EXISTS sub_kategori TEXT DEFAULT '';
ALTER TABLE penerima_manfaat ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aktif';
ALTER TABLE penerima_manfaat ADD COLUMN IF NOT EXISTS tanggal_mulai DATE;
ALTER TABLE penerima_manfaat ADD COLUMN IF NOT EXISTS tanggal_berhenti DATE;
ALTER TABLE penerima_manfaat ADD COLUMN IF NOT EXISTS catatan TEXT DEFAULT '';
ALTER TABLE penerima_manfaat ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE penerima_manfaat DISABLE ROW LEVEL SECURITY;
-- Migration: KPM fields (kode, kader, telepon, email)
ALTER TABLE kelompok_penerima_manfaat ADD COLUMN IF NOT EXISTS kode TEXT DEFAULT '';
ALTER TABLE kelompok_penerima_manfaat ADD COLUMN IF NOT EXISTS nama_kader TEXT DEFAULT '';
ALTER TABLE kelompok_penerima_manfaat ADD COLUMN IF NOT EXISTS telepon TEXT DEFAULT '';
ALTER TABLE kelompok_penerima_manfaat ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
