-- ============================================================================
-- DA-CAR PORTAL: NEW REGISTRATIONS REQUIRE SUPER ADMIN APPROVAL
-- Run this in the Supabase Dashboard -> SQL Editor.
-- ============================================================================

-- 1. Ensure profiles table and all required columns exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT DEFAULT 'Rice Program Coordinating Unit',
  role TEXT NOT NULL DEFAULT 'staff',
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Rice Program Coordinating Unit';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'officer', 'staff', 'viewer'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx
  ON public.profiles (lower(email));

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO anon, authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Policies
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Public can view staff profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert into profiles" ON public.profiles;
CREATE POLICY "Anyone can insert into profiles"
  ON public.profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile details" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;
CREATE POLICY "Anyone can update profiles"
  ON public.profiles FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can delete profiles" ON public.profiles;
CREATE POLICY "Anyone can delete profiles"
  ON public.profiles FOR DELETE
  TO anon, authenticated
  USING (true);

-- Remove unwanted or deleted duplicate accounts
DELETE FROM public.profiles WHERE lower(email) = 'admin@car.da.gov.ph';

DROP POLICY IF EXISTS "Service role has full access to profiles" ON public.profiles;
CREATE POLICY "Service role has full access to profiles"
  ON public.profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Automatic Profile Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  user_count INT;
  assigned_role TEXT;
  user_full_name TEXT;
  user_dept TEXT;
  user_is_approved BOOLEAN;
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;

  IF user_count = 0 OR lower(NEW.email) LIKE '%admin%' THEN
    assigned_role := 'admin';
    user_is_approved := TRUE;
  ELSE
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');
    user_is_approved := FALSE;
  END IF;

  IF assigned_role NOT IN ('super_admin', 'admin', 'officer', 'staff', 'viewer') THEN
    assigned_role := 'staff';
  END IF;

  user_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(split_part(NEW.email, '@', 1)), ''),
    'DA-CAR Personnel'
  );

  user_dept := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''),
    'Rice Program Coordinating Unit'
  );

  DELETE FROM public.profiles
  WHERE lower(email) = lower(NEW.email)
    AND id != NEW.id;

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    department,
    role,
    is_approved,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    user_full_name,
    lower(NEW.email),
    user_dept,
    assigned_role,
    user_is_approved,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name   = EXCLUDED.full_name,
    email       = EXCLUDED.email,
    department  = EXCLUDED.department,
    role        = CASE
                    WHEN public.profiles.role IS NOT NULL AND public.profiles.role != 'staff' THEN public.profiles.role
                    ELSE EXCLUDED.role
                  END,
    updated_at  = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error for % (%): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clean up any duplicate or orphaned profile records with mismatched ID for the same email
DELETE FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM auth.users u
  WHERE lower(u.email) = lower(p.email) AND u.id != p.id
);

-- 4. Backfill: create or sync profile rows for all existing auth users
INSERT INTO public.profiles (id, full_name, email, department, role, is_approved)
SELECT
  u.id,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1), 'DA-CAR Personnel'),
  lower(u.email),
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'department'), ''), 'Rice Program Coordinating Unit'),
  CASE
    WHEN lower(u.email) LIKE '%admin%' OR u.raw_user_meta_data->>'role' IN ('super_admin', 'admin') THEN 'admin'
    WHEN u.raw_user_meta_data->>'role' IN ('officer', 'staff', 'viewer') THEN u.raw_user_meta_data->>'role'
    ELSE 'staff'
  END,
  CASE
    WHEN lower(u.email) LIKE '%admin%' THEN TRUE
    ELSE FALSE
  END
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  full_name   = EXCLUDED.full_name,
  email       = EXCLUDED.email,
  department  = EXCLUDED.department,
  role        = EXCLUDED.role,
  updated_at  = now();

-- ============================================================================
-- 5. Clear all 19 regional activities and ensure permissions
-- ============================================================================
DELETE FROM public.regional_activities;

DROP POLICY IF EXISTS "Anyone can delete activities" ON public.regional_activities;
CREATE POLICY "Anyone can delete activities"
  ON public.regional_activities FOR DELETE
  TO anon, authenticated
  USING (true);

