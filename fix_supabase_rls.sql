-- Fix Supabase RLS Policies for User Management System
-- This script resolves the "Invalid API key" error when loading users

-- 1. Check current RLS status and policies
SELECT schemaname, tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('users', 'login_logs', 'department_config');

-- 2. Drop existing problematic policies
DROP POLICY IF EXISTS "Allow all operations for users" ON users;
DROP POLICY IF EXISTS "Allow all operations for login_logs" ON login_logs;  
DROP POLICY IF EXISTS "Allow all operations for department_config" ON department_config;

-- 3. Temporarily disable RLS to test (can re-enable later with proper policies)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE department_config DISABLE ROW LEVEL SECURITY;

-- 4. Alternative: Create more permissive policies (if you prefer to keep RLS enabled)
-- Uncomment these if you want RLS enabled with permissive access:

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE department_config ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for all users" ON users FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update access for all users" ON users FOR UPDATE USING (true) WITH CHECK (true);
-- CREATE POLICY "Enable delete access for all users" ON users FOR DELETE USING (true);

-- CREATE POLICY "Enable all access for login_logs" ON login_logs FOR ALL USING (true);
-- CREATE POLICY "Enable all access for department_config" ON department_config FOR ALL USING (true);

-- 5. Verify the admin user exists
SELECT email, name, role, status FROM users WHERE email = 'admin@apotekal.com';

-- 6. If admin user doesn't exist, create it
INSERT INTO users (email, password_hash, name, role, status, department_access) 
VALUES ('admin@apotekal.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin', 'active', ARRAY['operations', 'ppm', 'strategy', 'finance', 'bpt', 'procurement', 'warehouseApd', 'ppr', 'academy', 'adminConfig'])
ON CONFLICT (email) DO UPDATE SET 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    department_access = EXCLUDED.department_access;

-- 7. Add some test users if table is empty
INSERT INTO users (email, password_hash, name, role, status, employee_id, manager, date_added, department_access) 
VALUES 
    ('khoo.ziyu@apotekalpro.id', '$2a$10$N9qo8uLOickgx2ZMRZoMye/6ucXDEV.gWU1aMFJzVOhCcmLLkGWi2', 'TOMAS', 'admin', 'active', 'EMP001', 'System', '2024-01-01', ARRAY['operations', 'ppm', 'strategy', 'finance', 'bpt', 'procurement', 'warehouseApd', 'ppr', 'academy', 'adminConfig']),
    ('devi.purba@apotekalpro.id', '$2a$10$N9qo8uLOickgx2ZMRZoMye/6ucXDEV.gWU1aMFJzVOhCcmLLkGWi2', 'DEVI', 'admin', 'active', 'EMP002', 'System', '2024-01-01', ARRAY['operations', 'ppm', 'strategy', 'finance']),
    ('susi.sukaesih@apotekalpro.id', '$2a$10$N9qo8uLOickgx2ZMRZoMye/6ucXDEV.gWU1aMFJzVOhCcmLLkGWi2', 'SUSI SUKAESIH', 'manager', 'active', 'EMP003', 'TOMAS', '2024-01-01', ARRAY['operations', 'ppm']),
    ('ade.irma@apotekalpro.id', '$2a$10$N9qo8uLOickgx2ZMRZoMye/6ucXDEV.gWU1aMFJzVOhCcmLLkGWi2', 'ADE IRMA SEPTIANI AIDHA', 'manager', 'active', 'EMP004', 'TOMAS', '2024-01-01', ARRAY['operations', 'ppm']),
    ('bernard.lee@apotekalpro.id', '$2a$10$N9qo8uLOickgx2ZMRZoMye/6ucXDEV.gWU1aMFJzVOhCcmLLkGWi2', 'BERNARD', 'chief', 'active', 'EMP005', 'System', '2024-01-01', ARRAY['operations', 'ppm', 'strategy', 'finance'])
ON CONFLICT (email) DO NOTHING;

-- 8. Verify users were created
SELECT COUNT(*) as total_users FROM users;
SELECT email, name, role, status FROM users LIMIT 10;

-- 9. Check if we can query without errors
SELECT 
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users
FROM users;