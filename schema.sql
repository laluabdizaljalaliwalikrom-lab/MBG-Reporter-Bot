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
    pengawas_gizi TEXT DEFAULT '' -- Nama Pengawas Gizi (e.g. Ns. Fatimah, S.Gz)
);

-- Migration query to add columns if table already exists in Supabase:
ALTER TABLE sppg_data ADD COLUMN IF NOT EXISTS kepala_sppg TEXT DEFAULT '';
ALTER TABLE sppg_data ADD COLUMN IF NOT EXISTS pengawas_gizi TEXT DEFAULT '';

-- Disable RLS for sppg_data (matching mbg_reports behaviour)
ALTER TABLE sppg_data DISABLE ROW LEVEL SECURITY;
