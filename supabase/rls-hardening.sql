-- DRAFT — NOT APPLIED. Review, then run in Supabase SQL editor only after Azman approves.
-- Goal: anon gets nothing; only admins (profiles.is_admin) can read/write app data;
-- users cannot promote themselves to admin. service_role (Pages Functions, bol.py) bypasses RLS.
-- Prereq: confirm every person who should use the site has profiles.is_admin = true:
--   SELECT id, email, is_admin FROM profiles;

BEGIN;

-- 1. Helper: is the current JWT user an admin? (SECURITY DEFINER avoids RLS recursion on profiles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. Block self-promotion: only service_role / SQL editor may change is_admin
CREATE OR REPLACE FUNCTION public.protect_is_admin()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     AND COALESCE(auth.role(), '') IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'is_admin can only be changed by an administrator';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_is_admin ON public.profiles;
CREATE TRIGGER trg_protect_is_admin BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_is_admin();

-- 3. Enable RLS everywhere (videos was DISABLEd in migrations.sql; live already seems enabled — harmless)
ALTER TABLE public.videos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reuploads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bolreview_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_tiers    ENABLE ROW LEVEL SECURITY;

-- 4. Replace the old "any authenticated user can do anything" policies
DROP POLICY IF EXISTS "Allow public access" ON public.videos;
DROP POLICY IF EXISTS "Allow public insert" ON public.videos;
DROP POLICY IF EXISTS "Allow authenticated users all operations on reuploads" ON public.reuploads;
DROP POLICY IF EXISTS "Allow all operations on bolreview_uploads" ON public.bolreview_uploads;
DROP POLICY IF EXISTS "Allow authenticated users all operations on campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow authenticated users all operations on campaign_tiers" ON public.campaign_tiers;
-- NOTE: run `SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE schemaname='public';`
-- first and drop any other permissive policy that exists live but not in the repo files.

-- Data tables: authenticated may read? -> No: signup is OPEN (disable_signup=false, autoconfirm=true),
-- so "authenticated" = anyone on the internet. Restrict read AND write to admins.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['videos','reuploads','bolreview_uploads','campaigns','campaign_tiers'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "admin read %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin write %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "admin read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_admin())', t);
    EXECUTE format('CREATE POLICY "admin write %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t);
  END LOOP;
END $$;

-- bookmarks: keep own-row policy ("Users can manage own bookmarks") as is.
-- profiles: keep "Users can read own profile" + "Users can update own profile" (trigger above blocks is_admin changes).

-- 5. Belt and braces: anon role needs no table privileges at all
REVOKE ALL ON public.videos, public.reuploads, public.bolreview_uploads, public.bookmarks,
              public.profiles, public.campaigns, public.campaign_tiers FROM anon;

COMMIT;

-- Recommended (dashboard, not SQL): Authentication → Sign In / Providers → disable "Allow new users to sign up"
-- (and/or turn on email confirmation) since /register is public.
-- Optional future migration to keep description history (not included):
--   ALTER TABLE videos ADD COLUMN previous_description TEXT;  -- then have generate-description write it.
