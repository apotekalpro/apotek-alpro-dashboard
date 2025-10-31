# Google Sheets Access Fix

## 🎯 Problem Identified

Your Google Sheet is **restricted/private**, so the CSV export URL cannot be accessed by the dashboard.

Error symptoms:
- Import count = 0
- Console may show CORS errors or empty data
- "Already exists (skipped): 136" but no new imports

## ✅ Solution Options

---

## Option 1: Make Sheet Publicly Readable (RECOMMENDED)

### ⭐ This is the EASIEST and FASTEST solution

### Steps:

1. **Open your Google Sheet**  
   https://docs.google.com/spreadsheets/d/1Li6_bE_kTM5N5BlBS6-CqqaottR-oaU9YlY1BIo15Dc

2. **Click "Share" button** (top right corner)

3. **Change General Access**:
   - Look for "General access" section
   - Click dropdown (currently says "Restricted")
   - Select **"Anyone with the link"**

4. **Set Permission Level**:
   - Make sure the role is set to **"Viewer"**
   - NOT "Editor" or "Commenter"

5. **Click "Done"**

### ✅ Result:
- Sheet is now **publicly readable**
- Link is still **hard to guess** (secure by obscurity)
- Only people with the link can view
- **NO ONE can edit** (view-only)
- CSV export URL will work

### 🔒 Security Notes:
- The sheet is **VIEW-ONLY** - no one can modify your data
- The link URL is a long random string (very hard to guess)
- You can **revoke access** anytime by changing back to "Restricted"
- Good for: Internal tools, non-sensitive data, business listings

---

## Option 2: Use Google Sheets API (Advanced)

### ⚠️ More complex, keeps sheet fully private

This requires:
1. Google Cloud Project setup
2. Service Account creation
3. API credentials
4. Backend proxy server (Node.js)

### When to use:
- Sheet contains **highly sensitive data**
- Need **audit logs** of who accesses
- Require **role-based access control**
- Company security policy requires

### Implementation (if needed):

#### Step 1: Google Cloud Setup

1. Go to https://console.cloud.google.com/
2. Create new project: "Apotek Alpro Dashboard"
3. Enable Google Sheets API
4. Create Service Account
5. Download JSON credentials

#### Step 2: Share Sheet with Service Account

1. Copy service account email (from JSON): `xxx@xxx.iam.gserviceaccount.com`
2. Share your Google Sheet with this email (Viewer access)

#### Step 3: Update Code

We would need to:
- Add Google Sheets API library
- Add authentication logic
- Store credentials securely (environment variables)
- Update sync function to use API instead of CSV export

**Note**: This requires significant code changes and is NOT recommended unless absolutely necessary for security compliance.

---

## 🎯 Recommended Action

### For Your Use Case:

**Use Option 1 (Make Sheet Publicly Readable)**

**Why:**
1. ✅ Simple - takes 30 seconds
2. ✅ No code changes needed
3. ✅ Works immediately
4. ✅ Secure enough (view-only, obscure URL)
5. ✅ Common practice for business directories
6. ✅ Easy to revoke if needed

**Your data (outlet names, Google Maps links) is:**
- Already public on Google Maps
- Not personally identifiable information
- Not financial/medical data
- Similar to a business directory

---

## 🧪 Test After Fixing

1. **Make sheet public** (Option 1 above)
2. **Test CSV URL directly** in browser:
   ```
   https://docs.google.com/spreadsheets/d/1Li6_bE_kTM5N5BlBS6-CqqaottR-oaU9YlY1BIo15Dc/export?format=csv&gid=0
   ```
   - If you see CSV data → ✅ Works!
   - If you see "Need permission" → ❌ Still private

3. **Test dashboard sync**:
   - Hard refresh dashboard (Ctrl+F5)
   - Click "Sync from Google Sheets"
   - Check import count > 0

---

## 🔄 Alternative: Export to New Public Sheet

If you want to keep the main sheet private:

1. **Create a new Google Sheet** (public)
2. **Use IMPORTRANGE formula**:
   ```
   =IMPORTRANGE("1Li6_bE_kTM5N5BlBS6-CqqaottR-oaU9YlY1BIo15Dc", "MAIN OPERATION!A:AC")
   ```
3. **Make this new sheet public** (Option 1)
4. **Update dashboard** with new sheet ID

This keeps your main operational sheet private while exposing only the needed columns publicly.

---

## 📋 Summary

| Option | Difficulty | Security | Recommended |
|--------|-----------|----------|-------------|
| **Option 1: Public Link** | ⭐ Easy | 🔒 Medium | ✅ **YES** |
| **Option 2: API + Auth** | ⭐⭐⭐⭐⭐ Hard | 🔒🔒🔒 High | ❌ Only if required |
| **Alt: Separate Sheet** | ⭐⭐ Moderate | 🔒🔒 Good | ✅ If main sheet must stay private |

---

## 🎯 Next Steps

1. **Choose Option 1** (recommended)
2. **Make sheet publicly readable** (view-only)
3. **Test the sync** again
4. **Share results** with me

Once the sheet is accessible, the import should work immediately!
