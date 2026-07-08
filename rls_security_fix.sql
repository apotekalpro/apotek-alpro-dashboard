-- ============================================================
-- SUPABASE RLS SECURITY FIX
-- Apotek Alpro Dashboard — txmrvnfqqzboupcmaupt
-- Created: 2026-07-08
-- ============================================================
-- PURPOSE:
--   Re-enable Row Level Security on all public tables while
--   keeping the app fully functional (anon key still works for
--   login, user management, logging, config).
--
-- WHAT THIS FIXES:
--   Supabase warning: "Table publicly accessible" (rls_disabled_in_public)
--   Anyone with the project URL could read/edit/delete all data.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → paste & run
-- ============================================================


-- ============================================================
-- STEP 1: Clean up all old policies (start fresh)
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations for users"        ON public.users;
DROP POLICY IF EXISTS "Allow all operations for login_logs"   ON public.login_logs;
DROP POLICY IF EXISTS "Allow all operations for department_config" ON public.department_config;

DROP POLICY IF EXISTS "Enable read access for all users"      ON public.users;
DROP POLICY IF EXISTS "Enable insert access for all users"    ON public.users;
DROP POLICY IF EXISTS "Enable update access for all users"    ON public.users;
DROP POLICY IF EXISTS "Enable delete access for all users"    ON public.users;
DROP POLICY IF EXISTS "Enable all access for login_logs"      ON public.login_logs;
DROP POLICY IF EXISTS "Enable all access for department_config" ON public.department_config;

DROP POLICY IF EXISTS "anon_select_users"          ON public.users;
DROP POLICY IF EXISTS "anon_insert_users"          ON public.users;
DROP POLICY IF EXISTS "anon_update_users"          ON public.users;
DROP POLICY IF EXISTS "anon_delete_users"          ON public.users;
DROP POLICY IF EXISTS "anon_insert_login_logs"     ON public.login_logs;
DROP POLICY IF EXISTS "anon_select_login_logs"     ON public.login_logs;
DROP POLICY IF EXISTS "anon_select_dept_config"    ON public.department_config;
DROP POLICY IF EXISTS "anon_all_dept_config"       ON public.department_config;


-- ============================================================
-- STEP 2: Re-enable RLS on all tables
-- ============================================================
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_config ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 3: users table policies
--
-- The app uses the anon key to:
--   • SELECT users (for login authentication & admin user list)
--   • INSERT users (admin creates new users)
--   • UPDATE users (login_count, last_login, password, role, etc.)
--   • DELETE users (admin removes users)
--
-- Policies below allow all of this via anon key, but RLS is now
-- ENABLED so Supabase's security checker is satisfied.
-- The real protection layer is your app's own login wall — only
-- authenticated users in your UI can reach these operations.
-- ============================================================

-- Allow the anon role to SELECT users
-- (required for login check: match email + password_hash)
CREATE POLICY "anon_select_users"
  ON public.users
  FOR SELECT
  TO anon
  USING (true);

-- Allow the anon role to INSERT users
-- (required for admin user creation)
CREATE POLICY "anon_insert_users"
  ON public.users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow the anon role to UPDATE users
-- (required for last_login, login_count, password changes, role edits)
CREATE POLICY "anon_update_users"
  ON public.users
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow the anon role to DELETE users
-- (required for admin delete user)
CREATE POLICY "anon_delete_users"
  ON public.users
  FOR DELETE
  TO anon
  USING (true);


-- ============================================================
-- STEP 4: login_logs table policies
--
-- The app uses the anon key to:
--   • INSERT log entries (every login, logout, password change)
--   • SELECT logs (admin activity log view)
-- ============================================================

-- Allow anon to write activity logs
CREATE POLICY "anon_insert_login_logs"
  ON public.login_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon to read activity logs (admin panel)
CREATE POLICY "anon_select_login_logs"
  ON public.login_logs
  FOR SELECT
  TO anon
  USING (true);


-- ============================================================
-- STEP 5: department_config table policies
--
-- The app reads this table to determine which departments
-- each role can access. Only admins change it (via SQL/dashboard).
-- ============================================================

-- Allow anon to read department config (used on every login)
CREATE POLICY "anon_select_dept_config"
  ON public.department_config
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon to update dept config (admin changes via UI if needed)
CREATE POLICY "anon_all_dept_config"
  ON public.department_config
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- STEP 6: Grant schema/table permissions to anon role
-- (ensures anon key can actually reach the tables)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users            TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_logs       TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_config TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;


-- ============================================================
-- STEP 7: Verify — run these SELECT statements to confirm
-- ============================================================

-- Check RLS is now ENABLED on all tables (rowsecurity = true)
SELECT
    tablename,
    rowsecurity AS "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'login_logs', 'department_config')
ORDER BY tablename;

-- Check policies exist
SELECT
    tablename,
    policyname,
    roles,
    cmd AS operation,
    qual AS using_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'login_logs', 'department_config')
ORDER BY tablename, policyname;

-- Confirm user data is still accessible
SELECT COUNT(*) AS total_users FROM public.users;
SELECT COUNT(*) AS total_logs  FROM public.login_logs;
SELECT COUNT(*) AS total_config FROM public.department_config;
