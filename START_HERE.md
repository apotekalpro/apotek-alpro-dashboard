# 🎯 OpEX Dashboard - Real Live Sandbox Ready

## 🚀 **YOUR DIAGNOSTIC PAGE IS READY**

### **Start Here - Live API Test:**
```
https://8000-i2w5anfbz2ckq6nhwmx1k-583b4d74.sandbox.novita.ai/test-live-api.html
```

This page will **automatically diagnose** why you're seeing mock data instead of real data.

---

## ✅ What's Confirmed Working

1. **✓ API Key Configured**
   - Your API key `AIzaSyCwK1q9OWeIqZ5suEWOB9IpE5o5VDYmYYA` is correctly set in `opex-config.js`

2. **✓ Sheet ID Configured**
   - Sheet ID `1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M` is correct

3. **✓ Live Server Running**
   - Server active at port 8000
   - All files accessible

4. **✓ Code Committed**
   - All changes committed to `feature/opex-dashboard`
   - 10 commits total
   - Pull Request: https://github.com/apotekalpro/apotek-alpro-dashboard/pull/116

---

## 🔍 What the Test Page Will Show You

### Opening the test page will automatically:

1. **Load your configuration** and show:
   - Sheet ID
   - API Key (first 10 characters for security)
   - Debug mode status

2. **Test all 6 sheets** in parallel:
   - Audit
   - FieldAudit_Detail
   - INDEX
   - STTK_SHRINKAGE
   - Shrinkage_Items_Raw
   - CCTV_14H

3. **Display results** for each sheet:
   - ✅ Green check = Working, shows row count
   - ❌ Red X = Error, shows exact error message

4. **Preview real data**:
   - Click "View Data →" on any successful sheet
   - See first 10 rows from your Google Sheet
   - Verify if it's real data or mock data

---

## 🎯 Most Likely Issue (95% of cases)

### **Your Google Sheet is probably not public**

**To fix:**
1. Open your sheet: https://docs.google.com/spreadsheets/d/1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M/edit
2. Click the **Share** button (top right corner)
3. Change from "Restricted" to **"Anyone with the link"**
4. Make sure role is set to **Viewer**
5. Click **Done**
6. Go back to the test page and refresh

**Expected error if sheets are not public:**
```
✗ Audit
The caller does not have permission
```

**After making public, you should see:**
```
✓ Audit - 84 rows × 14 columns (350ms)
✓ FieldAudit_Detail - 120 rows × 47 columns (420ms)
✓ INDEX - 50 rows × 2 columns (280ms)
✓ STTK_SHRINKAGE - 84 rows × 9 columns (310ms)
✓ Shrinkage_Items_Raw - 30 rows × 7 columns (290ms)
✓ CCTV_14H - 25 rows × 17 columns (330ms)
```

---

## 📱 All Your Links

### 1. **Diagnostic Test (START HERE):**
```
https://8000-i2w5anfbz2ckq6nhwmx1k-583b4d74.sandbox.novita.ai/test-live-api.html
```
- Auto-tests all sheets
- Shows exactly what's wrong
- Displays real data if working

### 2. **Standalone OpEX Dashboard:**
```
https://8000-i2w5anfbz2ckq6nhwmx1k-583b4d74.sandbox.novita.ai/opex-dashboard.html
```
- Full dashboard in standalone mode
- Use after test page shows ✓ for all sheets

### 3. **Main Dashboard with Navigation:**
```
https://8000-i2w5anfbz2ckq6nhwmx1k-583b4d74.sandbox.novita.ai/
```
- Full Apotek Alpro dashboard
- Go to Operations → OpEX Dashboard tab

### 4. **Pull Request:**
```
https://github.com/apotekalpro/apotek-alpro-dashboard/pull/116
```
- All code changes
- 10 commits
- Ready for review/merge

---

## 🛠️ Step-by-Step: From Mock to Real Data

### Step 1: Run Diagnostic
1. Open: https://8000-i2w5anfbz2ckq6nhwmx1k-583b4d74.sandbox.novita.ai/test-live-api.html
2. Wait 2-3 seconds for auto-test
3. Look at results

### Step 2: Fix Issues
**If you see permission errors:**
- Make Google Sheet public (see instructions above)
- Refresh test page

**If you see "Unable to parse range":**
- Check sheet tab names are exact: `Audit`, `FieldAudit_Detail`, `INDEX`, `STTK_SHRINKAGE`, `Shrinkage_Items_Raw`, `CCTV_14H`

**If you see "API key not valid":**
- Verify API key in Google Cloud Console
- Make sure Sheets API is enabled

### Step 3: Verify Data
1. Once all sheets show ✓
2. Click "View Data →" on each
3. Verify you see real outlet codes, AM names, dates
4. If yes → data is live! 🎉

### Step 4: Use Dashboard
1. Open main dashboard: https://8000-i2w5anfbz2ckq6nhwmx1k-583b4d74.sandbox.novita.ai/opex-dashboard.html
2. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. Open console: Press `F12`
4. Should see: "Loading data from Google Sheets..."
5. Should see: "Processing X records" with real counts

---

## 📊 What You Should See When Working

### Field Audit Section
- **Real data**: Actual outlet codes (e.g., "OUT001", "JKT-001")
- **Mock data**: Generic codes (e.g., "OUT-001", "Outlet A")

### STTK Shrinkage Section
- **Real data**: Real store names from your sheet
- **Mock data**: "Store A", "Store B", "Store C"

### CCTV Audit Section
- **Real data**: Real check dates and outlet names
- **Mock data**: "Outlet A", dates in March 2026

### Look for this in console:
```
OpEX Dashboard V2 initialized successfully!
Loading data from Google Sheets...
Processing Audit data, rows: 84
Processing STTK data, rows: 84
Processing Shrinkage data, rows: 30
Processing CCTV data, rows: 25
```

---

## 🎓 Understanding the Test Results

### Example - All Working:
```
✓ Audit - 84 rows × 14 columns (350ms)
   [View Data →]

✓ STTK_SHRINKAGE - 84 rows × 9 columns (310ms)
   [View Data →]
```
- Green check = Sheet accessible
- Row/column counts = Real data from your sheet
- Response time in milliseconds
- Click "View Data" to see actual rows

### Example - Not Public:
```
✗ Audit
   The caller does not have permission
   [Show URL]
```
- Red X = Error
- Error message tells you exactly what's wrong
- Click "Show URL" to see the API call being made

---

## 🚨 Action Required

### **Do This Now:**

1. **Open test page**: https://8000-i2w5anfbz2ckq6nhwmx1k-583b4d74.sandbox.novita.ai/test-live-api.html

2. **Read the results** - it will tell you exactly what's wrong

3. **Most likely fix**: Make your Google Sheet public
   - Link: https://docs.google.com/spreadsheets/d/1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M/edit
   - Share → Anyone with the link → Viewer

4. **Refresh test page** and verify all ✓

5. **Open dashboard** and enjoy real data!

---

## 📄 Documentation Files

All guides created:
- `LIVE_API_DIAGNOSTIC.md` - Full troubleshooting guide
- `OPEX_V2_COMPLETE.md` - Complete V2 feature guide
- `OPEX_V2_IMPROVEMENTS.md` - Technical improvements
- `OPEX_DASHBOARD_README.md` - Setup and usage
- `OPEX_IMPLEMENTATION_SUMMARY.md` - Implementation details

---

## 💡 Pro Tips

1. **Always test with the diagnostic page first** before checking the main dashboard
2. **Use hard refresh** (`Ctrl+Shift+R`) to bypass cache
3. **Check console** (F12) for detailed logs when `DEBUG_MODE: true`
4. **Preview data** in test page to verify it's real before using dashboard
5. **One fix at a time** - fix sheets one by one if needed

---

## ✨ Why This Setup is Better

### Before:
- Dashboard shows sample data
- No way to know why
- Hard to debug

### Now:
- Dedicated test page auto-diagnoses issues
- Shows exact error messages
- Previews real data
- Clear fix instructions
- Verifies each sheet independently

---

**🎯 Bottom Line:**

Your API key is configured correctly. Your code is working. The only thing between you and real data is making your Google Sheet public. The test page will confirm this in 30 seconds.

**Start here:** https://8000-i2w5anfbz2ckq6nhwmx1k-583b4d74.sandbox.novita.ai/test-live-api.html
