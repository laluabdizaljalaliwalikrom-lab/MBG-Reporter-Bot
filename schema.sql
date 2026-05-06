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
