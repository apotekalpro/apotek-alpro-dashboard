-- SIMPLE FIX: Disable RLS to resolve "Invalid API key" error
-- Run this in Supabase SQL Editor

-- Disable RLS on all tables (simplest solution)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE department_config DISABLE ROW LEVEL SECURITY;

-- Verify current status
SELECT schemaname, tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('users', 'login_logs', 'department_config');

-- Check if users exist
SELECT COUNT(*) as total_users FROM users;
SELECT email, name, role FROM users LIMIT 5;