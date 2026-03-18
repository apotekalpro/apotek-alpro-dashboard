# 🚀 Powerlife Department - Quick Start Guide

## 📋 Table of Contents
1. [Try the Sandbox](#try-the-sandbox)
2. [Database Migration](#database-migration)
3. [User Management](#user-management)
4. [Testing Guide](#testing-guide)
5. [Troubleshooting](#troubleshooting)

---

## 🌐 Try the Sandbox

**Live Demo URL:**
```
https://8080-iill820lfg1j2jkwnam3j-5634da27.sandbox.novita.ai
```

**Test Credentials:**
- You can use your existing admin/chief credentials
- Or create a test Powerlife user (see database migration section)

**What to Test:**
1. Login with admin/chief role → Should see Powerlife tab
2. Click on Powerlife tab → Executive Dashboard loads
3. Check the product performance metrics
4. Test search and filter functionality
5. Try creating a user with Powerlife role

---

## 💾 Database Migration

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project: https://supabase.com
2. Navigate to "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Copy and Execute the SQL Script

Use the SQL script from `powerlife_database_migration.sql` file.

**Quick Migration (Copy & Paste):**

```sql
-- Add Powerlife to admin role
UPDATE department_config 
SET departments = ARRAY['operations', 'ppm', 'strategy', 'finance', 'bpt', 'procurement', 'warehouseApd', 'ppr', 'academy', 'sgm', 'powerlife', 'adminConfig']
WHERE role = 'admin';

-- Add Powerlife to chief role
UPDATE department_config 
SET departments = ARRAY['operations', 'ppm', 'strategy', 'finance', 'bpt', 'procurement', 'warehouseApd', 'ppr', 'academy', 'sgm', 'powerlife']
WHERE role = 'chief';

-- Create Powerlife role
INSERT INTO department_config (role, departments)
VALUES ('powerlife', ARRAY['powerlife'])
ON CONFLICT (role) DO UPDATE SET departments = ARRAY['powerlife'];

-- Update existing admin users
UPDATE users
SET department_access = ARRAY['operations', 'ppm', 'strategy', 'finance', 'bpt', 'procurement', 'warehouseApd', 'ppr', 'academy', 'sgm', 'powerlife', 'adminConfig']
WHERE role = 'admin';

-- Update existing chief users
UPDATE users
SET department_access = ARRAY['operations', 'ppm', 'strategy', 'finance', 'bpt', 'procurement', 'warehouseApd', 'ppr', 'academy', 'sgm', 'powerlife']
WHERE role = 'chief';
```

### Step 3: Verify the Changes

```sql
-- Check department configurations
SELECT role, departments FROM department_config ORDER BY role;

-- Check users with Powerlife access
SELECT email, name, role, department_access 
FROM users 
WHERE 'powerlife' = ANY(department_access)
ORDER BY role, email;
```

---

## 👥 User Management

### Create a Powerlife User

**Method 1: Via SQL (Recommended)**

```sql
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
    'powerlife@apotekalpro.id',  -- Change this email
    'cG93ZXJsaWZlMTIz',          -- Password: 'powerlife123'
    'Powerlife Manager',          -- Change this name
    'powerlife',
    'active',
    ARRAY['powerlife'],
    'PWL001'                      -- Change employee ID
)
ON CONFLICT (email) DO UPDATE
SET 
    role = EXCLUDED.role,
    department_access = EXCLUDED.department_access;
```

**Method 2: Via Admin Dashboard**

1. Login as admin
2. Go to Admin Config tab
3. Click "Add User"
4. Fill in details:
   - Email: powerlife@apotekalpro.id
   - Name: Powerlife Manager
   - Role: Select "powerlife"
   - Status: Active
5. Click "Add User"

### Grant Powerlife Access to Existing User

```sql
-- Change the email to your target user
UPDATE users 
SET 
    role = 'powerlife',
    department_access = ARRAY['powerlife']
WHERE email = 'existing.user@apotekalpro.id';
```

### Grant Additional Access (Keep existing permissions + add Powerlife)

```sql
-- This adds Powerlife without removing other permissions
UPDATE users 
SET department_access = array_append(department_access, 'powerlife')
WHERE email = 'user@apotekalpro.id' 
AND NOT ('powerlife' = ANY(department_access));
```

---

## 🧪 Testing Guide

### Test Case 1: Admin Access
**Expected:** Admin should see ALL tabs including Powerlife

1. Login with admin credentials
2. Check navigation tabs → Should include Powerlife
3. Click Powerlife tab → Should load Executive Dashboard
4. Verify data loads from Google Sheets

### Test Case 2: Chief Access
**Expected:** Chief should see all operational tabs including Powerlife

1. Login with chief credentials
2. Check navigation tabs → Should include Powerlife (no Admin Config)
3. Click Powerlife tab → Should load Executive Dashboard
4. Verify all metrics display correctly

### Test Case 3: Powerlife Role Access
**Expected:** Powerlife user should ONLY see Powerlife tab

1. Login with Powerlife role credentials
2. Check navigation tabs → Should ONLY show Powerlife
3. Dashboard should load and display:
   - Total Revenue (Current Month)
   - Total Products count
   - Total Qty Sold
   - Average Growth %
   - Top 5 Revenue products
   - Bottom 5 Revenue products
   - Top 5 Growth products
   - Bottom 5 Degrowth products
   - Revenue by Division cards
   - Searchable products table

### Test Case 4: Google Sheets Integration

1. Open Powerlife tab
2. Watch for loading indicator
3. Verify data loads successfully
4. Check console (F12) for any errors
5. Verify current month is detected correctly
6. Test search functionality
7. Test division filter

---

## 🔧 Troubleshooting

### Issue: Powerlife tab not showing

**Solution 1: Clear browser cache and cookies**
```
Ctrl + Shift + Delete (Chrome/Firefox)
```

**Solution 2: Check user role in database**
```sql
SELECT email, role, department_access 
FROM users 
WHERE email = 'your.email@apotekalpro.id';
```

**Solution 3: Verify department_config**
```sql
SELECT * FROM department_config WHERE role IN ('admin', 'chief', 'powerlife');
```

### Issue: Data not loading from Google Sheets

**Solution 1: Check Google Sheets permissions**
- Sheet must be publicly accessible
- File → Share → Anyone with link can view

**Solution 2: Verify Sheet ID in code**
Current Sheet ID: `1bGNbGDT4WDnwAsx58gKGvsG9yYFBmfD-`
GID: `2065577288`

**Solution 3: Check browser console**
```
F12 → Console tab → Look for error messages
```

### Issue: Current month not detected

**Check Google Sheets format:**
- Row 3 must contain text with "Current Month"
- Example: "1-8 Maret 26 (Current Month)"

### Issue: User can't access after role change

**Solution: Force logout and login**
```sql
-- Reset user session
UPDATE users 
SET last_login = NULL 
WHERE email = 'user@apotekalpro.id';
```

Then user should logout and login again.

---

## 📊 Data Structure

### Google Sheets Columns (Rank Item sheet)
- **Column A**: Item Code (SKU)
- **Column B**: Item Name (Product Description)
- **Column C**: Division (Category)
- **Column F-G**: December 2025 (Qty, Revenue)
- **Column H-I**: January 2026 (Qty, Revenue)
- **Column J-K**: February 2026 (Qty, Revenue)
- **Column L-O**: Current Month (Qty UTD, Qty Forecast, Revenue UTD, Revenue Forecast)

### Database Tables
1. **users**: User accounts with role and department_access
2. **department_config**: Role-based department access configurations
3. **login_logs**: Audit trail for user logins

---

## 🔑 Default Credentials for Testing

**Admin User:**
- Email: admin@apotekal.com
- Password: admin123

**Create Powerlife Test User:**
```sql
-- Run this in SQL Editor
INSERT INTO users (email, password_hash, name, role, status, department_access)
VALUES (
    'test.powerlife@apotekalpro.id',
    'dGVzdDEyMw==',  -- Password: 'test123'
    'Test Powerlife User',
    'powerlife',
    'active',
    ARRAY['powerlife']
);
```

---

## 📞 Support

If you encounter issues:
1. Check browser console (F12) for error messages
2. Verify SQL queries executed successfully
3. Ensure Google Sheets is publicly accessible
4. Check network tab for failed API calls
5. Review user role and permissions in database

---

## ✅ Success Checklist

- [ ] SQL migration script executed successfully
- [ ] Department_config table updated
- [ ] Admin/Chief users can see Powerlife tab
- [ ] Powerlife role created in department_config
- [ ] Test Powerlife user created (optional)
- [ ] Dashboard loads data from Google Sheets
- [ ] All metrics display correctly
- [ ] Search and filter work properly
- [ ] Role permissions work as expected

---

**Pull Request:** https://github.com/apotekalpro/apotek-alpro-dashboard/pull/114

**Questions?** Review the PR description for detailed technical information.
