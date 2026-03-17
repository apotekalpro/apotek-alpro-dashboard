-- =====================================================
-- POWERLIFE DEPARTMENT DATABASE MIGRATION
-- Execute this script in your Supabase SQL Editor
-- =====================================================

-- Step 1: Update department_config table with Powerlife configurations
-- This adds the new Powerlife department to role configurations

-- First, check if Powerlife already exists in admin role
DO $$
BEGIN
    -- Update admin role to include Powerlife
    UPDATE department_config 
    SET departments = array_append(departments, 'powerlife')
    WHERE role = 'admin' 
    AND NOT ('powerlife' = ANY(departments));
    
    RAISE NOTICE 'Admin role updated with Powerlife access';
END $$;

DO $$
BEGIN
    -- Update chief role to include Powerlife
    UPDATE department_config 
    SET departments = array_append(departments, 'powerlife')
    WHERE role = 'chief' 
    AND NOT ('powerlife' = ANY(departments));
    
    RAISE NOTICE 'Chief role updated with Powerlife access';
END $$;

-- Step 2: Insert new Powerlife role configuration (if it doesn't exist)
INSERT INTO department_config (role, departments)
VALUES ('powerlife', ARRAY['powerlife'])
ON CONFLICT (role) DO UPDATE
SET departments = ARRAY['powerlife'];

-- Step 3: Update existing admin user to include Powerlife access
-- This updates any user with admin role
UPDATE users
SET department_access = array_append(department_access, 'powerlife')
WHERE role = 'admin' 
AND NOT ('powerlife' = ANY(department_access));

-- Step 4: Update existing chief users to include Powerlife access
UPDATE users
SET department_access = array_append(department_access, 'powerlife')
WHERE role = 'chief' 
AND NOT ('powerlife' = ANY(department_access));

-- Step 5: Create a sample Powerlife user (OPTIONAL)
-- Uncomment and modify the following if you want to create a test user
-- Replace 'powerlife@apotekalpro.id' with your desired email
-- Password will be 'powerlife123' (change it immediately after first login)

/*
INSERT INTO users (
    email, 
    password_hash, 
    name, 
    role, 
    status, 
    department_access,
    employee_id
)
VALUES (
    'powerlife@apotekalpro.id',
    'cG93ZXJsaWZlMTIz', -- Base64 encoded 'powerlife123'
    'Powerlife User',
    'powerlife',
    'active',
    ARRAY['powerlife'],
    'PWL001'
)
ON CONFLICT (email) DO UPDATE
SET 
    role = EXCLUDED.role,
    department_access = EXCLUDED.department_access,
    status = EXCLUDED.status;
*/

-- =====================================================
-- VERIFICATION QUERIES
-- Run these after the migration to verify changes
-- =====================================================

-- Check department_config table
SELECT role, departments 
FROM department_config 
ORDER BY role;

-- Check admin users
SELECT email, name, role, department_access 
FROM users 
WHERE role = 'admin' 
ORDER BY email;

-- Check chief users
SELECT email, name, role, department_access 
FROM users 
WHERE role = 'chief' 
ORDER BY email;

-- Check powerlife users
SELECT email, name, role, department_access 
FROM users 
WHERE role = 'powerlife' 
ORDER BY email;

-- =====================================================
-- ROLLBACK SCRIPT (Use if you need to undo changes)
-- =====================================================

/*
-- Remove Powerlife from admin role
UPDATE department_config 
SET departments = array_remove(departments, 'powerlife')
WHERE role = 'admin';

-- Remove Powerlife from chief role
UPDATE department_config 
SET departments = array_remove(departments, 'powerlife')
WHERE role = 'chief';

-- Delete Powerlife role configuration
DELETE FROM department_config WHERE role = 'powerlife';

-- Remove Powerlife access from all users
UPDATE users
SET department_access = array_remove(department_access, 'powerlife');

-- Delete sample Powerlife user (if created)
DELETE FROM users WHERE email = 'powerlife@apotekalpro.id';
*/

-- =====================================================
-- QUICK COMMANDS FOR SPECIFIC TASKS
-- =====================================================

-- To assign Powerlife role to an existing user:
/*
UPDATE users 
SET 
    role = 'powerlife',
    department_access = ARRAY['powerlife']
WHERE email = 'user@example.com';
*/

-- To give a specific user access to Powerlife (without changing their role):
/*
UPDATE users 
SET department_access = array_append(department_access, 'powerlife')
WHERE email = 'user@example.com' 
AND NOT ('powerlife' = ANY(department_access));
*/

-- To remove Powerlife access from a specific user:
/*
UPDATE users 
SET department_access = array_remove(department_access, 'powerlife')
WHERE email = 'user@example.com';
*/

-- =====================================================
-- NOTES
-- =====================================================
-- 1. This script is idempotent - you can run it multiple times safely
-- 2. All admin and chief users will automatically get Powerlife access
-- 3. Powerlife role users will ONLY have access to Powerlife tab
-- 4. Remember to update the frontend if you make manual changes
-- 5. Always backup your database before running migrations

RAISE NOTICE '✅ Powerlife department migration completed successfully!';
