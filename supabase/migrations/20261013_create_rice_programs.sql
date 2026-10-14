-- ==============================================================================
-- Migration: Create & Seed Rice Programs Register Table
-- Department of Agriculture - Cordillera Administrative Region (DA-CAR)
-- Categories:
--   1. PSS   - Production Support Services (10 interventions)
--   2. ESETS - Extension Support, Education and Training Services (19 interventions)
--   3. RD    - Research and Development (2 interventions)
--   4. INS   - Irrigation Network Services (3 interventions)
-- ==============================================================================

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.programs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    category VARCHAR(50) NOT NULL, -- PSS, ESETS, RD, INS
    category_name VARCHAR(255) NOT NULL, -- Full descriptive title of the pillar
    name TEXT NOT NULL, -- Program / Intervention title
    description TEXT DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Ongoing, Upcoming, Completed
    target_beneficiaries VARCHAR(255) DEFAULT '',
    province VARCHAR(100) DEFAULT 'Regional (CAR)',
    municipality VARCHAR(100) DEFAULT '',
    barangay VARCHAR(100) DEFAULT '',
    allotment_class VARCHAR(50) DEFAULT 'MOOE', -- MOOE, CO, PS
    start_date DATE DEFAULT '2026-01-01',
    end_date DATE DEFAULT '2026-12-31',
    date_coverage VARCHAR(150) DEFAULT 'CY 2026 (Jan - Dec 2026)',
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure all columns exist if the table was previously created with an older schema
ALTER TABLE IF EXISTS public.programs
    ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'PSS',
    ADD COLUMN IF NOT EXISTS category_name VARCHAR(255) NOT NULL DEFAULT 'Production Support Services',
    ADD COLUMN IF NOT EXISTS target_beneficiaries VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS allotment_class VARCHAR(50) DEFAULT 'MOOE',
    ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT '2026-01-01',
    ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT '2026-12-31',
    ADD COLUMN IF NOT EXISTS date_coverage VARCHAR(150) DEFAULT 'CY 2026 (Jan - Dec 2026)',
    ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- 2. Performance and Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_category_name ON public.programs (category, name);
CREATE INDEX IF NOT EXISTS idx_programs_category ON public.programs (category);
CREATE INDEX IF NOT EXISTS idx_programs_status ON public.programs (status);
CREATE INDEX IF NOT EXISTS idx_programs_display_order ON public.programs (display_order);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.programs DISABLE ROW LEVEL SECURITY;

-- Fallback public read policies
DROP POLICY IF EXISTS "Allow select for all" ON public.programs;
CREATE POLICY "Allow select for all"
ON public.programs
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.programs;
CREATE POLICY "Allow all for authenticated"
ON public.programs
FOR ALL
TO authenticated
USING (true);

