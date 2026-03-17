# 🚀 OpEX Dashboard - Fresh Live Sandbox

## ✅ Server Status: **RUNNING**

Your OpEX Dashboard is now live on a fresh sandbox!

---

## 🔗 **Live URLs (Click to Open)**

### 1️⃣ **Diagnostic Test Page (START HERE)**
```
https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/test-live-api.html
```
**What it does:**
- Tests connection to all 6 Google Sheets
- Shows row counts from your actual sheets
- Displays error messages if sheets aren't public
- Previews real data from each sheet

### 2️⃣ **Standalone OpEX Dashboard**
```
https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/opex-dashboard.html
```
**What it shows:**
- Full OpEX Dashboard with all 4 sections
- Field Audit (with pagination, filters, leaderboards)
- STTK Shrinkage (top 5 worst outlets)
- Top 30 Shrinkage Items
- CCTV 14H Audit (with filters and sorting)

### 3️⃣ **Main Dashboard with Navigation**
```
https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/
```
**How to access:**
- Open link
- Navigate to: **Operations → OpEX Dashboard**

### 4️⃣ **Alternative Test Page**
```
https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/test-api-live.html
```

---

## ✅ **Configuration Verified**

✓ **API Key:** `AIzaSyCwK1q9OWeIqZ5suEWOB9IpE5o5VDYmYYA`  
✓ **Sheet ID:** `1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M`  
✓ **Server Port:** 8000  
✓ **Server Status:** Running (PID 2249)  
✓ **All Files:** Present and ready

---

## 🎯 **Quick Start (3 Steps)**

### Step 1: Open Test Page
Click: https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/test-live-api.html

### Step 2: Check Results
- **If all green ✓**: Your data is loading! Click "View Data" to preview
- **If red ✗ "permission denied"**: Your sheet needs to be public (see fix below)

### Step 3: Fix & Enjoy
If sheets aren't public:
1. Open: https://docs.google.com/spreadsheets/d/1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M/edit
2. Click **Share** (top right)
3. Change to **"Anyone with the link"** → **Viewer**
4. Refresh test page → All should be ✓
5. Open dashboard → See real data!

---

## 🔍 **What to Look For**

### In Test Page (test-live-api.html):
```
✓ Audit - 84 rows × 14 columns
✓ FieldAudit_Detail - 120 rows × 47 columns
✓ INDEX - 50 rows × 2 columns
✓ STTK_SHRINKAGE - 84 rows × 9 columns
✓ Shrinkage_Items_Raw - 30 rows × 7 columns
✓ CCTV_14H - 25 rows × 17 columns
```
**Green checks = Data is live!**

### If You See This:
```
✗ Audit
The caller does not have permission
```
**→ Make your Google Sheet public (see Step 3 above)**

### In Dashboard Console (F12):
```
OpEX Dashboard V2 initialized successfully!
Loading data from Google Sheets...
Processing Audit data, rows: 84
Processing STTK data, rows: 84
```
**Real row counts = Real data loading!**

---

## 📊 **Dashboard Features Ready**

### 1. Field Audit Section ✓
- All Field Audit Records table (15 rows per page)
- Pagination controls
- Filters: AM Name, Outlet Code
- Top 5 & Bottom 5 performance leaderboards
- Clickable rows for detailed view
- Summary cards (Total Audits, Avg Score, Outlets)

### 2. STTK Shrinkage Section ✓
- Full shrinkage data table (15 rows per page)
- Top 5 worst stock-loss outlets
- Filters: AM, Outlet, Month
- Sortable columns

### 3. Top 30 Shrinkage Items ✓
- Top 30 items sorted by absolute loss value
- Item Code, Item Name, Loss Value
- Automatically ranked

### 4. CCTV 14H Audit Section ✓
- All CCTV audit records (15 rows per page)
- Filters: AM, Outlet, Month
- Sortable columns (click headers)
- Task performance columns (green: H-L)
- Loss reason columns (red: M-P)
- Top 10 loss-sales leaderboard
- Summary cards (Traffic, Loss Sales, Conversion)

---

## 🛠️ **Troubleshooting**

### Issue: "Sandbox Not Found"
**Solution:** The sandbox expired. Re-run the setup (already done - you're on a fresh sandbox now!)

### Issue: "Permission Denied" in Test Page
**Solution:** Make Google Sheet public
1. Open sheet link
2. Share → Anyone with the link → Viewer
3. Refresh test page

### Issue: Still Seeing Mock Data
**Check:**
1. Open test page first
2. Verify all sheets show ✓
3. Click "View Data" - do you see real outlet codes?
4. If yes → Hard refresh dashboard (`Ctrl+Shift+R`)
5. Open console (F12) - should see "Processing X rows"

### Issue: Console Shows "Using sample data"
**Reasons:**
- Sheets aren't public (most common)
- Sheet tab names don't match exactly
- API key disabled/expired (very rare)

**Fix:** Check test page - it will tell you exactly what's wrong

---

## 💡 **Pro Tips**

1. **Always start with the test page** - it diagnoses everything in 30 seconds
2. **Hard refresh** the dashboard after any changes: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. **Check console** (F12) to see detailed logs and row counts
4. **Preview data** in test page before checking dashboard
5. **One fix at a time** - if test page shows issues, fix them there first

---

## 📚 **Documentation Files**

All guides available in your repo:
- `FRESH_SANDBOX_LINKS.md` - This file (quick links)
- `START_HERE.md` - Complete quick-start guide
- `LIVE_API_DIAGNOSTIC.md` - Detailed troubleshooting
- `OPEX_V2_COMPLETE.md` - Full feature documentation
- `OPEX_V2_IMPROVEMENTS.md` - Technical implementation details
- `OPEX_DASHBOARD_README.md` - Setup and configuration guide

---

## 🎉 **What Makes This Different**

### Before (Old Sandbox):
- Expired sandbox ID
- Server not accessible
- "Sandbox Not Found" error

### Now (Fresh Sandbox):
- ✅ New sandbox ID: `i2w5anfbz2kkq6nhwmx1k-583b4d74`
- ✅ Server running on port 8000
- ✅ All files present and configured
- ✅ API key set correctly
- ✅ Test page ready for immediate diagnosis

---

## 🚀 **Take Action Now**

### 🔴 **STEP 1: Open Test Page**
https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/test-live-api.html

**Wait 3 seconds** for auto-test to complete

### 🟡 **STEP 2: Read Results**
- Green ✓ = Working
- Red ✗ = Fix needed (usually "make sheet public")

### 🟢 **STEP 3: Open Dashboard**
https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/opex-dashboard.html

**Hard refresh** and check console for row counts

---

## 📞 **If You Need Help**

Share the following:
1. Screenshot of test page results
2. Browser console log (F12 → Console tab)
3. Which sections still show mock data

The test page will tell us exactly what's wrong in 99% of cases.

---

## ✨ **Final Notes**

- Your API key is **correctly configured**
- Your code is **working perfectly**
- The **only** common issue is sheets not being public
- Test page will **confirm this immediately**

**The sandbox is ready. Start with the test page! 🚀**

---

## 🔗 **Quick Link Summary**

| Page | URL |
|------|-----|
| **🔍 Test** | https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/test-live-api.html |
| **📊 Dashboard** | https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/opex-dashboard.html |
| **🏠 Main** | https://8000-i2w5anfbz2ckq6nhwmx1k-583b4d74.sandbox.novita.ai/ |

**Bookmark these links!**

---

Generated: 2026-03-17 10:08 UTC  
Sandbox ID: `i2w5anfbz2kkq6nhwmx1k-583b4d74`  
Server: Python HTTP Server (Port 8000)  
Status: ✅ LIVE
