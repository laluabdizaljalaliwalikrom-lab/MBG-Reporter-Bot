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

-- Enable RLS if needed
-- ALTER TABLE mbg_reports ENABLE ROW LEVEL SECURITY;

-- Create the sppg_data table
CREATE TABLE IF NOT EXISTS sppg_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nama_sppg TEXT UNIQUE NOT NULL,
    porsi_kecil INTEGER DEFAULT 0,
    porsi_besar INTEGER DEFAULT 0,
    balita INTEGER DEFAULT 0,
    bumil INTEGER DEFAULT 0,
    busui INTEGER DEFAULT 0
);

-- Disable RLS for sppg_data (matching mbg_reports behaviour)
ALTER TABLE sppg_data DISABLE ROW LEVEL SECURITY;
