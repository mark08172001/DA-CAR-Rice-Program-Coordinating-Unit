-- ==============================================================================
-- Migration: Create RFFA Beneficiaries Table (rffa_beneficiaries)
-- Department of Agriculture - Cordillera Administrative Region (DA-CAR)
-- Module 03: Beneficiaries & Field Services (RFFA Payroll Registry)
-- ==============================================================================

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.rffa_beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Region" VARCHAR(100) DEFAULT 'CAR',
    "Province" VARCHAR(150),
    "CityMunicipality" VARCHAR(150),
    "PanaloKardNo" VARCHAR(100),
    "Card_Number" VARCHAR(100),
    "RSBSARefNo" VARCHAR(100),
    "FirstName" VARCHAR(150),
    "MiddleName" VARCHAR(150),
    "LastName" VARCHAR(150),
    "BirthDate" VARCHAR(50),
    "DateOfCashout" VARCHAR(50),
    "YEAR FUNDED" VARCHAR(50),
    "REMARKS" TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Performance indexes for fast filtering, searching, and sorting
CREATE INDEX IF NOT EXISTS idx_rffa_rsbsa ON public.rffa_beneficiaries ("RSBSARefNo");
CREATE INDEX IF NOT EXISTS idx_rffa_card_no ON public.rffa_beneficiaries ("Card_Number");
CREATE INDEX IF NOT EXISTS idx_rffa_panalokard ON public.rffa_beneficiaries ("PanaloKardNo");
CREATE INDEX IF NOT EXISTS idx_rffa_province ON public.rffa_beneficiaries ("Province");
CREATE INDEX IF NOT EXISTS idx_rffa_citymuni ON public.rffa_beneficiaries ("CityMunicipality");
CREATE INDEX IF NOT EXISTS idx_rffa_year ON public.rffa_beneficiaries ("YEAR FUNDED");
CREATE INDEX IF NOT EXISTS idx_rffa_cashout_date ON public.rffa_beneficiaries ("DateOfCashout" DESC);
CREATE INDEX IF NOT EXISTS idx_rffa_names ON public.rffa_beneficiaries ("LastName", "FirstName");

-- 3. Composite unique index for upserts and deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_rffa_unique_entry 
ON public.rffa_beneficiaries ("RSBSARefNo", "Card_Number", "YEAR FUNDED", "DateOfCashout");

-- 4. Row Level Security (RLS) configuration
-- Disabled by default so portal batch CSV imports can insert seamlessly
ALTER TABLE public.rffa_beneficiaries DISABLE ROW LEVEL SECURITY;

-- Fallback permissive policies in case RLS is turned on:
DROP POLICY IF EXISTS "Allow select for all" ON public.rffa_beneficiaries;
CREATE POLICY "Allow select for all"
ON public.rffa_beneficiaries
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow insert for all" ON public.rffa_beneficiaries;
CREATE POLICY "Allow insert for all"
ON public.rffa_beneficiaries
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for all" ON public.rffa_beneficiaries;
CREATE POLICY "Allow update for all"
ON public.rffa_beneficiaries
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for all" ON public.rffa_beneficiaries;
CREATE POLICY "Allow delete for all"
ON public.rffa_beneficiaries
FOR DELETE
TO public
USING (true);

-- 5. Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_rffa_beneficiaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rffa_beneficiaries_updated_at ON public.rffa_beneficiaries;
CREATE TRIGGER trg_rffa_beneficiaries_updated_at
BEFORE UPDATE ON public.rffa_beneficiaries
FOR EACH ROW
EXECUTE FUNCTION update_rffa_beneficiaries_updated_at();

-- 6. Comment on table
COMMENT ON TABLE public.rffa_beneficiaries IS 'Registry of Rice Farmers Financial Assistance (RFFA) cash subsidy payroll disbursements for DA-CAR.';
