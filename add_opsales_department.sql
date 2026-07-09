-- ============================================================
-- Add "Operation Sales" (opsales) Department to Supabase
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Add opsales row to department_config (for role-based default access)
INSERT INTO public.department_config (role, departments)
VALUES ('opsales', ARRAY['opsales'])
ON CONFLICT (role) DO UPDATE
    SET departments = ARRAY['opsales'],
        updated_at = NOW();

-- Step 2: Update admin role to include opsales
UPDATE public.department_config
SET departments = array_append(departments, 'opsales'),
    updated_at = NOW()
WHERE role = 'admin'
  AND NOT ('opsales' = ANY(departments));

-- Step 3: Update chief role to include opsales
UPDATE public.department_config
SET departments = array_append(departments, 'opsales'),
    updated_at = NOW()
WHERE role = 'chief'
  AND NOT ('opsales' = ANY(departments));

-- Step 4: Update manager role to include opsales (optional — adjust if needed)
-- UPDATE public.department_config
-- SET departments = array_append(departments, 'opsales'),
--     updated_at = NOW()
-- WHERE role = 'manager'
--   AND NOT ('opsales' = ANY(departments));

-- Step 5: Verify results
SELECT role, departments
FROM public.department_config
ORDER BY role;
