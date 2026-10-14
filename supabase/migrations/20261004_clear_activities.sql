-- ============================================================================
-- CLEAR ALL REGIONAL ACTIVITIES
-- Run this in the Supabase SQL Editor to wipe out all 19 duplicate activities
-- ============================================================================

DELETE FROM public.regional_activities;

-- Enable permissions so authenticated & administrative requests can delete if needed
DROP POLICY IF EXISTS "Anyone can delete activities" ON public.regional_activities;
CREATE POLICY "Anyone can delete activities"
  ON public.regional_activities FOR DELETE
  TO anon, authenticated
  USING (true);
