-- ========================================
-- SIMPLE STEP-BY-STEP FIX
-- ========================================
-- Run these commands one by one if needed

-- 1. Disable RLS on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on login_logs table  
ALTER TABLE public.login_logs DISABLE ROW LEVEL SECURITY;

-- 3. Grant permissions to anon role
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.login_logs TO anon;

-- 4. Grant permissions to authenticated role
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.login_logs TO authenticated;

-- 5. Test the fix
SELECT COUNT(*) as "Users Count" FROM public.users;