-- ============================================================================
-- DA-CAR PORTAL: SUPER ADMIN USER DELETION RPC
-- Run this in your Supabase Dashboard -> SQL Editor -> Run
-- This allows deleting users completely from auth.users and public.profiles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog, pg_temp
AS $$
DECLARE
  target_id UUID;
BEGIN
  -- Protect primary super administrator account
  IF lower(trim(user_email)) = 'super.admin@car.da.gov.ph' THEN
    RAISE EXCEPTION 'Cannot delete primary super administrator account';
  END IF;

  -- 1. Find user in auth.users
  SELECT id INTO target_id 
  FROM auth.users 
  WHERE lower(email) = lower(trim(user_email)) 
  LIMIT 1;

  -- 2. Deleting from auth.users permanently eliminates their login ability and cascades to profiles
  IF target_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = target_id;
  END IF;

  -- 3. Ensure profile is wiped from public.profiles
  DELETE FROM public.profiles WHERE lower(email) = lower(trim(user_email));

  RETURN TRUE;
END;
$$;

-- Grant execution permissions to API roles
REVOKE ALL ON FUNCTION public.delete_user_account(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(TEXT) TO anon, authenticated, service_role;
