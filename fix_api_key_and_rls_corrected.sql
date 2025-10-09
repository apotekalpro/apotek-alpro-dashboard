-- ========================================
-- COMPREHENSIVE API KEY & RLS FIX SCRIPT (CORRECTED)
-- ========================================
-- This script addresses both API key permissions and RLS issues
-- causing "Invalid API key" (401) errors

-- Step 1: Grant full permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Step 2: Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;

-- Step 3: Disable RLS on users table (the main issue)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 4: Disable RLS on login_logs table
ALTER TABLE public.login_logs DISABLE ROW LEVEL SECURITY;

-- Step 5: Drop any existing RLS policies that might interfere
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can update users" ON public.users;
DROP POLICY IF EXISTS "Users can delete users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.users;

-- Step 6: Drop any existing RLS policies on login_logs
DROP POLICY IF EXISTS "Users can read all logs" ON public.login_logs;
DROP POLICY IF EXISTS "Users can insert logs" ON public.login_logs;
DROP POLICY IF EXISTS "Enable read access for all logs" ON public.login_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.login_logs;

-- Step 7: Grant explicit SELECT, INSERT, UPDATE, DELETE permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_logs TO anon, authenticated;

-- Step 8: Grant usage on sequences (for auto-increment IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Step 9: Test the fix immediately
SELECT COUNT(*) as "Total Users in Database" FROM public.users;

-- Step 10: Show sample user data (limit 3 for security)
SELECT id, email, name, role, status, created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 3;

-- ========================================
-- VERIFICATION QUERIES (CORRECTED)
-- ========================================

-- Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS_Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'login_logs');

-- Check basic permissions
SELECT 
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
    AND table_name IN ('users', 'login_logs')
    AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;