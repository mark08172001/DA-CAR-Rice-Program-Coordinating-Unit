-- ==============================================================================
-- Migration: Create IMC Beneficiaries Table (farmer_serve_transactions)
-- Department of Agriculture - Cordillera Administrative Region (DA-CAR)
-- Module 03: Beneficiaries & Field Services (IMC Beneficiaries Directory)
-- ==============================================================================

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.farmer_serve_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Reference no." VARCHAR(100) UNIQUE,
    "PanalokardNumber" VARCHAR(100),
    "RSBSA RefNumber" VARCHAR(100),
    "Merchant UUID" VARCHAR(150),
    "Merchant Name" VARCHAR(255),
    "First Name" VARCHAR(150),
    "Last name" VARCHAR(150),
    "Municipality" VARCHAR(150),
    "Province" VARCHAR(150),
    "Product Category" VARCHAR(150),
    "Product Name" VARCHAR(255),
    "Product Description" TEXT,
    "Qty" NUMERIC(12, 2) DEFAULT 0,
    "Unit" VARCHAR(50),
    "Amount" NUMERIC(14, 2) DEFAULT 0,
    "Total Amount" NUMERIC(14, 2) DEFAULT 0,
    "Region" VARCHAR(50) DEFAULT 'CAR',
    "Date" VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Performance indexes for fast filtering, searching, and sorting
CREATE INDEX IF NOT EXISTS idx_fst_rsbsa ON public.farmer_serve_transactions ("RSBSA RefNumber");
CREATE INDEX IF NOT EXISTS idx_fst_ref_no ON public.farmer_serve_transactions ("Reference no.");
CREATE INDEX IF NOT EXISTS idx_fst_province ON public.farmer_serve_transactions ("Province");
CREATE INDEX IF NOT EXISTS idx_fst_municipality ON public.farmer_serve_transactions ("Municipality");
CREATE INDEX IF NOT EXISTS idx_fst_category ON public.farmer_serve_transactions ("Product Category");
CREATE INDEX IF NOT EXISTS idx_fst_date ON public.farmer_serve_transactions ("Date" DESC);
CREATE INDEX IF NOT EXISTS idx_fst_names ON public.farmer_serve_transactions ("Last name", "First Name");

-- 3. Row Level Security (RLS) configuration
-- Note: Disabled or granted to public so portal batch imports can insert via anon/publishable key without service role key
ALTER TABLE public.farmer_serve_transactions DISABLE ROW LEVEL SECURITY;

-- Fallback policies in case RLS is re-enabled:
DROP POLICY IF EXISTS "Allow select for all" ON public.farmer_serve_transactions;
CREATE POLICY "Allow select for all"
ON public.farmer_serve_transactions
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow insert for all" ON public.farmer_serve_transactions;
CREATE POLICY "Allow insert for all"
ON public.farmer_serve_transactions
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for all" ON public.farmer_serve_transactions;
CREATE POLICY "Allow update for all"
ON public.farmer_serve_transactions
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for all" ON public.farmer_serve_transactions;
CREATE POLICY "Allow delete for all"
ON public.farmer_serve_transactions
FOR DELETE
TO public
USING (true);

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_farmer_serve_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_farmer_serve_transactions_updated_at ON public.farmer_serve_transactions;
CREATE TRIGGER trg_farmer_serve_transactions_updated_at
BEFORE UPDATE ON public.farmer_serve_transactions
FOR EACH ROW
EXECUTE FUNCTION update_farmer_serve_transactions_updated_at();

-- Comment on table
COMMENT ON TABLE public.farmer_serve_transactions IS 'Registry of Intervention Monitoring Card (IMC) beneficiary voucher redemption transactions for DA-CAR.';
