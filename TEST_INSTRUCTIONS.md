# Testing Instructions for PPM Incentive Calculator Fix

## 🎯 Quick Test Checklist

### Step 1: Deploy the Fix
- [ ] Merge PR #64 into main branch
- [ ] Wait for deployment to complete

### Step 2: Clear Browser Cache
**Very Important!** The old JavaScript is cached in your browser.

**Chrome/Edge:**
- Press `Ctrl + Shift + R` (Windows/Linux)
- Press `Cmd + Shift + R` (Mac)

**Firefox:**
- Press `Ctrl + F5` (Windows/Linux)  
- Press `Cmd + Shift + R` (Mac)

### Step 3: Open PPM Incentive Calculator
- Navigate to your PPM Incentive Calculator page
- Open Browser Console (Press `F12`)
- Make sure Console tab is visible

### Step 4: Upload Files
Upload all 5 required files:
1. ✅ Active Alproean List
2. ✅ Full Alproean List  
3. ✅ Sales & GP
4. ✅ Personal Sales
5. ✅ Outlet Mapping

### Step 5: Check Console Logs
After uploading Active Alproean List, you should see:

```
🔍 activeAlproean - First 10 rows of raw Excel data:
  Excel Row 1: ...
  Excel Row 2: ...
  ...

✅ AUTO-DETECTED Header at row 1 (0-indexed: 0)
   Column C: "NAMA" | Column D: "Employee ID - DO NOT EDIT" | Column G: "Job Position"

✅ Parsed Active Alproean: 775 rows
```

**❌ If you see header detected at row 31, the fix didn't deploy properly!**

### Step 6: Calculate Incentives
- Click "Calculate Incentives" button
- Wait for calculation to complete

### Step 7: Verify Results
Check these specific employees in the results table:

| Employee Name | Expected Role | Status |
|---|---|---|
| KHOO ZI YU | HEALTH ADVISOR | ⬜ |
| ESTER DESINDO NABABAN | CHIEF STRATEGIC OFFICER | ⬜ |
| RONTA SIREGAR | BRANCH MANAGER | ⬜ |
| LAELA FITIRAH | APOTEKER | ⬜ |
| EPI PURNAMASARI | HEALTH ADVISOR | ⬜ |
| Mardian Rahayu | HEALTH ADVISOR | ⬜ |
| PUTRI AMBAR LESTARI | HEALTH ADVISOR | ⬜ |

**All should match! ✅**

### Step 8: Export and Verify
- Click "Export Matched Results"
- Open the exported Excel file
- Verify roles match the Expected Role column above

## ⚠️ Troubleshooting

### Issue: Still seeing wrong roles after fix
**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear all browser cache (Settings → Privacy → Clear browsing data)
3. Try in Incognito/Private mode
4. Check console - should show header at row 1, NOT row 31

### Issue: Console shows "Header at row 31"
**Solution:**
1. Fix not deployed yet - wait for deployment
2. Or browser still using old cached JavaScript
3. Clear cache completely and try again

### Issue: Different employees showing wrong roles
**Solution:**
1. Check console logs for header detection
2. If row 1 detected correctly, the issue is different
3. Report which specific employees have wrong roles
4. Check if Excel file structure matches expected format

## 📞 Support

If issues persist:
1. Take screenshot of browser console showing header detection
2. Take screenshot of results table with wrong roles
3. Export results and attach Excel file
4. Report in PR #64 comments

## ✅ Success Criteria

You'll know the fix works when:
- ✅ Console shows "Header at row 1" only
- ✅ All 775+ employees display correct roles
- ✅ KHOO ZI YU shows "HEALTH ADVISOR"
- ✅ ESTER DESINDO NABABAN shows "CHIEF STRATEGIC OFFICER"
- ✅ Exported Excel has all correct roles
- ✅ No role misalignment after row 31

---

**Created:** 2025-11-18  
**PR:** #64  
**Fix Status:** ✅ Ready for testing
