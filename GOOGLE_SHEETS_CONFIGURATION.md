# 🔗 Google Sheets Configuration - Complete Guide

## 📍 **YOUR Google Sheet Link**

### **The Dashboard Reads From YOUR Sheet - Not a Separate One!**

**Your Google Sheet ID:** `1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M`

**Full URL to Your Sheet:**
```
https://docs.google.com/spreadsheets/d/1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M/edit
```

**⚠️ IMPORTANT:** The dashboard does **NOT** create a separate sheet. It reads directly from **YOUR EXISTING Google Sheet** using the Google Sheets API.

---

## 📋 **Which Tabs Are Being Read?**

The dashboard expects these **tab names** in your Google Sheet:

### **1. Audit Tab** ← For Field Audit Section
```javascript
Sheet Name: 'Audit'
Range: 'A:N' (columns A through N)
Used For: Main Field Audit table/cards
```

### **2. FieldAudit_Detail Tab** ← For Detail Modal
```javascript
Sheet Name: 'FieldAudit_Detail'
Range: 'A:AU' (columns A through AU)
Used For: Audit detail popup when you click outlet
```

### **3. INDEX Tab** ← For Code Descriptions
```javascript
Sheet Name: 'INDEX'
Range: 'A:B' (code and description)
Used For: Looking up audit code descriptions
```

### **4. STTK_SHRINKAGE Tab** ← For STTK Section
```javascript
Sheet Name: 'STTK_SHRINKAGE'
Range: 'A:I' (columns A through I)
Used For: Stock shrinkage data
```

### **5. Shrinkage_Top30 Tab** ← For Top 30 Items
```javascript
Sheet Name: 'Shrinkage_Top30'
Range: 'A:G'
Used For: Top 30 shrinkage items
```

### **6. CCTV_14H Tab** ← For CCTV Section
```javascript
Sheet Name: 'CCTV_14H'
Range: 'A:Q' (all rows)
Used For: CCTV audit records
```

### **7. Analysis Field Audit Detail Tab** ← For Summary
```javascript
Sheet Name: 'Analysis Field Audit Detail'
Range: 'A:AS'
Used For: Top 10 Issues and Overall Compliance
```

---

## 🔄 **How Updates Work - REAL-TIME Loading**

### **The Dashboard DOES NOT Store Data!**

**Every time you open/refresh the dashboard:**

1. ✅ Browser sends request to Google Sheets API
2. ✅ API reads **CURRENT** data from your Google Sheet
3. ✅ Dashboard processes and displays the **LATEST** data

**This means:**
- ✅ Changes in your Google Sheet appear **immediately** after refresh
- ✅ No need to "sync" or "update" anything
- ✅ Dashboard always shows current data from your sheet

---

## 🔍 **The API Request - How It Works**

### **Code Location:** `/home/user/webapp/opex-dashboard-v2.js`

```javascript
async loadSheetData(sheetName, range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${sheetName}!${range}?key=${this.apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    return data.values || [];
}
```

### **Example API Call for Audit Data:**

**URL:**
```
https://sheets.googleapis.com/v4/spreadsheets/1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M/values/Audit!A:N?key=AIzaSyCwK1q9OWeIqZ5suEWOB9IpE5o5VDYmYYA
```

**Breakdown:**
```
Base URL: https://sheets.googleapis.com/v4/spreadsheets/
Sheet ID: 1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M
Tab Name: Audit
Range:    A:N
API Key:  AIzaSyCwK1q9OWeIqZ5suEWOB9IpE5o5VDYmYYA
```

**What happens:**
1. Dashboard makes this API call
2. Google returns the **current** data from the "Audit" tab, columns A-N
3. Dashboard displays it

---

## ⚠️ **The Problem - Tab Name Mismatch**

### **What the Dashboard Expects:**

The code looks for a tab named **exactly** `"Audit"` in your Google Sheet.

```javascript
this.loadSheetData('Audit', 'A:N')
//                 ^^^^^^ 
//                 Looking for tab named "Audit"
```

### **What You Might Have:**

Based on your screenshot title: **"LEGOSO RAYA_FIELD AUDIT"**

This suggests your tab might be named:
- ❌ `LEGOSO RAYA_FIELD AUDIT` (full name)
- ❌ `Field Audit`
- ❌ `FIELD AUDIT`
- ❌ Some other name

### **If Tab Name Doesn't Match:**

The API call will **FAIL** and you'll see:
- ⚠️ Console error: "Sheet 'Audit' not found"
- ⚠️ Dashboard shows sample/empty data
- ⚠️ No real data loaded

---

## 🔧 **How to Check Your Tab Names**

### **Option 1: Look at Your Google Sheet**

1. Open: https://docs.google.com/spreadsheets/d/1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M/edit
2. Look at the **tabs at the bottom**
3. Write down the **exact names** (case-sensitive!)

### **Option 2: Check Browser Console**

1. Open dashboard: https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/opex-dashboard.html
2. Press **F12** (open developer tools)
3. Go to **Console** tab
4. Refresh the page
5. Look for error messages like:
   ```
   Error loading Audit: Unable to parse range: Audit!A:N
   ```
   This means the "Audit" tab doesn't exist!

---

## 📝 **How to Update/Change Tab Names**

If your tab is named differently, I need to update the configuration.

### **Option A: Rename Your Google Sheet Tab**

**If you want to keep the code as-is:**

1. Open your Google Sheet
2. Right-click the tab at the bottom
3. Click "Rename"
4. Change to exactly: `Audit`
5. Make sure other tabs match the expected names

### **Option B: Update the Code to Match Your Tab Names**

**If you want to keep your tab names as-is:**

I can update the code to match your actual tab names.

**Tell me:**
- What is the **exact name** of the tab that contains the Field Audit data?
- (e.g., "LEGOSO RAYA_FIELD AUDIT" or "Field Audit" or something else)

Then I'll change this line:
```javascript
// OLD
this.loadSheetData('Audit', 'A:N')

// NEW
this.loadSheetData('YOUR_ACTUAL_TAB_NAME', 'A:N')
```

---

## 🔍 **Current Tab Mapping in Code**

```javascript
Tab Name in Code          → What Dashboard Section Uses It
──────────────────────────────────────────────────────────
'Audit'                   → Field Audit main table/cards
'FieldAudit_Detail'       → Detail modal (click outlet)
'INDEX'                   → Code lookup
'STTK_SHRINKAGE'          → STTK Shrinkage section
'Shrinkage_Top30'         → Top 30 items
'CCTV_14H'                → CCTV Audit section
'Analysis Field Audit Detail' → Top 10 Issues, Compliance
```

---

## 🎯 **How to Fix the Data Discrepancy**

### **The Issue You're Seeing:**

- **Google Sheet:** Shows outlet `2019-BTTSLR1`, date `09/03/2026`, score `81.79%`
- **Dashboard:** Shows different/old data

### **Possible Causes:**

1. **Wrong Tab Name**
   - Code looks for "Audit" tab
   - Your tab has a different name
   - API call fails, shows sample data

2. **Wrong Column Mapping**
   - Code reads from columns K, L, M, N
   - Your data is in different columns
   - Code reads wrong cells

3. **Different Sheet Structure**
   - Code expects row-based layout
   - Your sheet is column-based
   - Code can't parse it correctly

### **To Fix:**

**Step 1:** Tell me the **exact tab name** from your Google Sheet

**Step 2:** Tell me the **structure**:
- Is it row-based (each row = one audit)?
- Or column-based (each column = one audit)?

**Step 3:** Tell me **where the data is**:
- Which column (or row) has Outlet Code?
- Which column (or row) has Visit Date?
- Which column (or row) has Scoring?
- Which column (or row) has Final Score?

**Then I can update the code to read from the correct location!**

---

## 🔐 **Data Security**

### **Who Can Access Your Sheet?**

The dashboard uses **Google Sheets API** with:
- ✅ API Key: `AIzaSyCwK1q9OWeIqZ5suEWOB9IpE5o5VDYmYYA`
- ✅ Read-only access
- ✅ Sheet must be set to "Anyone with the link can view"

**The dashboard:**
- ✅ Can READ your sheet
- ❌ Cannot WRITE/modify your sheet
- ❌ Cannot delete data
- ✅ Only fetches data when you open the dashboard

---

## 📊 **Summary**

### **Your Google Sheet:**
```
URL: https://docs.google.com/spreadsheets/d/1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M/edit
```

### **How Dashboard Reads It:**
```
1. You open dashboard
2. Dashboard makes API call to Google
3. Google returns CURRENT data from your sheet
4. Dashboard processes and displays it
5. Every refresh = fresh data from your sheet
```

### **NO Separate Sheet:**
- ❌ Dashboard doesn't create a copy
- ❌ Dashboard doesn't store data
- ✅ Dashboard reads directly from YOUR sheet
- ✅ Changes in your sheet appear after refresh

### **To Fix the Old Data Issue:**

**I need you to tell me:**
1. Exact tab name (e.g., "Audit" or "LEGOSO RAYA_FIELD AUDIT")
2. Sheet structure (row-based or column-based)
3. Where data is located (which columns/rows)

**Then I'll update the code to read from the correct place!**

---

## 🆘 **Quick Diagnostics**

### **Open Browser Console (F12) and Look For:**

✅ **Success:**
```
Processing Audit data, total rows: 100
Filtered Audit records (non-zero scoring): 85
Final Audit records (latest per outlet): 42
```

❌ **Error - Tab Not Found:**
```
Error loading Audit: Unable to parse range: Audit!A:N
No Audit data found
```

❌ **Error - Wrong Columns:**
```
Processing Audit data, total rows: 100
Filtered Audit records (non-zero scoring): 0  ← Wrong scoring column!
Final Audit records (latest per outlet): 0
```

**Share what you see in the console and I can diagnose the exact issue!**

---

**Let me know:**
1. What are your actual tab names in the Google Sheet?
2. What structure does the Field Audit data have?
3. What do you see in the browser console when opening the dashboard?

Then I can fix the mapping to read your data correctly! 🎯
