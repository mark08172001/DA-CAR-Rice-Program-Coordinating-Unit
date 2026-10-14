-- ==============================================================================
-- Migration: Create Obligations & Balances Table (Official Government SAAODB Schema)
-- Department of Agriculture - Cordillera Administrative Region (DA-CAR)
-- Columns: FUND, PAP, SOURCE, CLASS, RC, OBJ CODE, DESCRIPTION, APPROPRIATIONS,
--          ADJUSTED ALLOTMENT, TOTAL OBLIGATION, UNOBLIGATED ALLOTMENT, EARMARK,
--          UNALLOCATED ALLOTMENT, DISBURSEMENT, UNPAID
-- ==============================================================================

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.obligations_and_balances (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sheet_name VARCHAR(255) NOT NULL DEFAULT 'Main Registry', -- Name of spreadsheet / table tab (e.g. 'Main Registry', '2026 SAAODB Q1')
    fund VARCHAR(100) NOT NULL DEFAULT '01101101', -- e.g. '01101101 - Regular Agency Fund'
    pap VARCHAR(255) NOT NULL DEFAULT '310100100002000', -- Program / Activity / Project Code & Title
    source VARCHAR(150) NOT NULL DEFAULT 'GAA', -- Fund Source (e.g. GAA, RCEF, QRF)
    class VARCHAR(50) NOT NULL DEFAULT 'MOOE', -- Allotment Class: MOOE, CO, PS, FE
    rc VARCHAR(100) NOT NULL DEFAULT 'RFO-CAR', -- Responsibility Center (e.g. RFO-CAR, CAR-KALINGA, CAR-BENGUET)
    obj_code VARCHAR(100) NOT NULL DEFAULT '50203010 00', -- UACS Object Code (e.g. 50203010 00 - Agricultural Supplies)
    description TEXT NOT NULL DEFAULT '', -- Description / Particulars
    appropriations NUMERIC(16, 2) NOT NULL DEFAULT 0, -- Authorized Appropriations
    adjusted_allotment NUMERIC(16, 2) NOT NULL DEFAULT 0, -- Adjusted / Received Allotment
    total_obligation NUMERIC(16, 2) NOT NULL DEFAULT 0, -- Total Obligated Amount
    unobligated_allotment NUMERIC(16, 2) NOT NULL DEFAULT 0, -- Unobligated = Adjusted Allotment - Total Obligation
    earmark NUMERIC(16, 2) NOT NULL DEFAULT 0, -- Earmarked Allotment
    unallocated_allotment NUMERIC(16, 2) NOT NULL DEFAULT 0, -- Unallocated = Unobligated - Earmark
    disbursement NUMERIC(16, 2) NOT NULL DEFAULT 0, -- Actual Cash Disbursements
    unpaid NUMERIC(16, 2) NOT NULL DEFAULT 0, -- Unpaid = Total Obligation - Disbursement
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure sheet_name column exists if table was previously created
ALTER TABLE IF EXISTS public.obligations_and_balances 
    ADD COLUMN IF NOT EXISTS sheet_name VARCHAR(255) NOT NULL DEFAULT 'Main Registry';

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_ob_sheet_name ON public.obligations_and_balances (sheet_name);
CREATE INDEX IF NOT EXISTS idx_ob_fund ON public.obligations_and_balances (fund);
CREATE INDEX IF NOT EXISTS idx_ob_pap ON public.obligations_and_balances (pap);
CREATE INDEX IF NOT EXISTS idx_ob_source ON public.obligations_and_balances (source);
CREATE INDEX IF NOT EXISTS idx_ob_class ON public.obligations_and_balances (class);
CREATE INDEX IF NOT EXISTS idx_ob_rc ON public.obligations_and_balances (rc);
CREATE INDEX IF NOT EXISTS idx_ob_obj_code ON public.obligations_and_balances (obj_code);

-- 3. Row Level Security (RLS) configuration
ALTER TABLE public.obligations_and_balances DISABLE ROW LEVEL SECURITY;

-- Fallback policies in case RLS is manually enabled:
DROP POLICY IF EXISTS "Allow select for all" ON public.obligations_and_balances;
CREATE POLICY "Allow select for all"
ON public.obligations_and_balances
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow insert for all" ON public.obligations_and_balances;
CREATE POLICY "Allow insert for all"
ON public.obligations_and_balances
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for all" ON public.obligations_and_balances;
CREATE POLICY "Allow update for all"
ON public.obligations_and_balances
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for all" ON public.obligations_and_balances;
CREATE POLICY "Allow delete for all"
ON public.obligations_and_balances
FOR DELETE
TO public
USING (true);

-- 4. Comment on table
COMMENT ON TABLE public.obligations_and_balances IS 'Registry of Allotments, Obligations, and Balances (RAO / SAAODB) for DA-CAR Regional Field Office';
