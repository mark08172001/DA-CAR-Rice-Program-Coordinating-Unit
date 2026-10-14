-- ============================================================================
-- DA-CAR PORTAL: ADD ACCESS CONTROL & GRANULAR PERMISSIONS TO PROFILES
-- Run this in your Supabase Dashboard -> SQL Editor -> Run
-- This ensures Super Admin module restrictions persist across Vercel deployments!
-- ============================================================================

-- 1. Add granular accessibility and permission columns to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allowed_modules TEXT[] DEFAULT ARRAY['mod-general']::TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_add_activities":false,"can_edit_budget":false,"can_import_beneficiaries":false,"can_manage_claims":false,"can_delete_programs":false,"can_edit_programs":false}'::JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Update existing profiles with sensible defaults based on their role
UPDATE public.profiles
SET allowed_modules = CASE
  WHEN role IN ('super_admin', 'admin') THEN ARRAY['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin']::TEXT[]
  WHEN role = 'officer' THEN ARRAY['mod-general', 'mod-rice', 'mod-beneficiary']::TEXT[]
  ELSE ARRAY['mod-general']::TEXT[]
END
WHERE allowed_modules IS NULL OR array_length(allowed_modules, 1) IS NULL;

UPDATE public.profiles
SET permissions = CASE
  WHEN role IN ('super_admin', 'admin') THEN '{"can_add_activities":true,"can_edit_budget":true,"can_import_beneficiaries":true,"can_manage_claims":true,"can_delete_programs":true,"can_edit_programs":true}'::JSONB
  WHEN role = 'officer' THEN '{"can_add_activities":true,"can_edit_budget":false,"can_import_beneficiaries":true,"can_manage_claims":true,"can_delete_programs":true,"can_edit_programs":true}'::JSONB
  ELSE '{"can_add_activities":true,"can_edit_budget":false,"can_import_beneficiaries":false,"can_manage_claims":false,"can_delete_programs":false,"can_edit_programs":false}'::JSONB
END
WHERE permissions IS NULL;

UPDATE public.profiles
SET status = CASE
  WHEN is_approved = FALSE THEN 'pending_approval'
  ELSE 'active'
END
WHERE status IS NULL;

-- 3. Ensure API roles can read and update these columns
GRANT SELECT, UPDATE ON TABLE public.profiles TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;
CREATE POLICY "Anyone can update profiles"
  ON public.profiles FOR UPDATE
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);
