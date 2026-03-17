# 🔍 OpEX Dashboard - Live API Diagnostic

## Issue
Your API key is correctly configured in `opex-config.js`, but you're seeing mock/sample data instead of real Google Sheets data.

## Diagnostic Test Page

**🚀 Open this URL to diagnose the issue:**

```
https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/test-live-api.html
```

This page will automatically test all 6 Google Sheets tabs and show you:

### What It Tests
1. ✅ **Configuration Validation**
   - Shows your Sheet ID
   - Shows your API key (first 10 chars)
   - Confirms debug mode status

2. ✅ **Sheet Connectivity**
   - Tests connection to all 6 sheets:
     - Audit (A:N)
     - FieldAudit_Detail (A:AU)
     - INDEX (A:B)
     - STTK_SHRINKAGE (A:I)
     - Shrinkage_Items_Raw (A:G)
     - CCTV_14H (A:Q)

3. ✅ **Data Verification**
   - Shows actual row and column counts
   - Displays first 10 rows of data
   - Shows response time for each API call
   - Preview data in table format

4. ✅ **Error Detection**
   - If sheets are not public → shows permission error
   - If API key is invalid → shows authentication error
   - If sheet names are wrong → shows not found error
   - Shows full error messages with API URLs

## Expected Results

### If Everything Works ✅
You should see:
```
✓ Audit - X rows × 14 columns
✓ FieldAudit_Detail - X rows × 47 columns
✓ INDEX - X rows × 2 columns
✓ STTK_SHRINKAGE - X rows × 9 columns
✓ Shrinkage_Items_Raw - X rows × 7 columns
✓ CCTV_14H - X rows × 17 columns
```

Click "View Data →" to see actual rows from your Google Sheet.

### If Sheets Are Not Public ❌
You will see:
```
✗ Audit
The caller does not have permission
```

**Fix:** Open your Google Sheet → Share → "Anyone with the link can view"

### If API Key Is Invalid ❌
You will see:
```
✗ Audit
API key not valid. Please pass a valid API key.
```

**Fix:** Verify your API key in Google Cloud Console

### If Sheet Names Don't Match ❌
You will see:
```
✗ Audit
Unable to parse range: Audit!A:N
```

**Fix:** Check that sheet tabs are named exactly: `Audit`, `FieldAudit_Detail`, `INDEX`, `STTK_SHRINKAGE`, `Shrinkage_Items_Raw`, `CCTV_14H`

## Common Issues & Solutions

### Issue 1: Sheets Not Public
**Symptom:** Permission denied error

**Solution:**
1. Open https://docs.google.com/spreadsheets/d/1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M/edit
2. Click "Share" (top right)
3. Change from "Restricted" to "Anyone with the link"
4. Set to "Viewer"
5. Click "Done"
6. Refresh the test page

### Issue 2: Wrong Sheet Names
**Symptom:** "Unable to parse range" error

**Solution:**
Check your sheet tab names match exactly:
- ✓ `Audit` (not "audit" or "Audit Data")
- ✓ `FieldAudit_Detail` (not "Field Audit Detail")
- ✓ `INDEX` (not "Index" or "index")
- ✓ `STTK_SHRINKAGE` (exact capitalization)
- ✓ `Shrinkage_Items_Raw` (exact name)
- ✓ `CCTV_14H` (exact name)

### Issue 3: Browser Cache
**Symptom:** Still seeing old data after fixes

**Solution:**
1. Open the test page
2. Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. This does a hard refresh, bypassing cache

### Issue 4: CORS Error
**Symptom:** "CORS policy" error in console

**Solution:**
- This is normal for Google Sheets API
- The test page handles CORS properly
- Make sure you're using the API key (not OAuth)

## How to Read the Results

### Green Check ✓
- Sheet is accessible
- Data is loading correctly
- API key is valid
- Permissions are correct

### Red X ✗
- Something is wrong with this specific sheet
- Read the error message for details
- Follow the solution steps above

### Data Preview
- Click "View Data →" to see actual rows
- First row = headers from your sheet
- Subsequent rows = actual data
- If you see your real outlet codes, AM names, etc. → data is live!
- If you see "Outlet A", "Manager 1" → still using sample data

## Next Steps After Testing

### If Test Shows Live Data ✅
1. Go back to main dashboard: https://8000-i2w5anfbz2ckq6nhwmx1k-583b4d74.sandbox.novita.ai/opex-dashboard.html
2. Hard refresh (`Ctrl+Shift+R`)
3. Open browser console (F12)
4. Look for: "Loading data from Google Sheets..."
5. Should see: "Processing X records" with real row counts

### If Test Shows Errors ❌
1. Fix the issues listed in the test page
2. Common fix: Make sheets public (see Issue 1 above)
3. Re-run the test
4. Once all sheets show ✓, main dashboard will work

## Contact & Support

If you're still seeing sample data after:
- ✅ Test page shows all green checks
- ✅ Sheets are public
- ✅ Hard refresh performed

Then share:
1. Screenshot of test-live-api.html results
2. Browser console log (F12 → Console tab)
3. Which specific sections still show mock data

## Technical Details

### API Endpoint Format
```
https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/{SheetName}!{Range}?key={API_KEY}
```

### Current Configuration
- Sheet ID: `1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M`
- API Key: `AIzaSyCwK1q9OWeIqZ5suEWOB9IpE5o5VDYmYYA` (configured in opex-config.js)
- Debug Mode: ON
- Fallback: Sample data if API fails

### Files Involved
- `opex-config.js` - API key and sheet configuration
- `opex-dashboard-v2.js` - Data loading logic
- `opex-dashboard.html` - Main dashboard UI
- `test-live-api.html` - This diagnostic tool

## Git Status
- Branch: `feature/opex-dashboard`
- Latest commit: "test: Add comprehensive live API diagnostic page"
- Pull Request: https://github.com/apotekalpro/apotek-alpro-dashboard/pull/116

---

**🚨 IMPORTANT: Start with the test page first!**

Open https://8000-i2w5anfbz2ckq6nhwmx1k-583b4d74.sandbox.novita.ai/test-live-api.html

This will show you exactly what's working and what needs to be fixed.
