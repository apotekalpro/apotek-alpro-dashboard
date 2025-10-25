# Troubleshooting Guide - Apotek Alpro Dashboard

## Issue: Login Page Won't Redirect to Dashboard

### Symptoms:
- After entering credentials and clicking login
- Page stays on login screen
- No error message shown
- Dashboard doesn't appear

### Possible Causes & Solutions:

#### 1. **Cached Version of the Site**
**Solution:**
- Hard refresh the page: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- Or clear browser cache completely
- Try incognito/private browsing mode

#### 2. **Browser Console Errors**
**How to Check:**
1. Right-click on the page → "Inspect" or press `F12`
2. Click on "Console" tab
3. Look for any RED error messages
4. Share screenshots of errors for debugging

#### 3. **Supabase Connection Issues**
**Check:**
- Look in console for messages like "Supabase connection failed"
- Verify Supabase credentials are correctly configured
- Check if Supabase service is online

#### 4. **JavaScript Not Loading**
**Check:**
- In browser console, type: `typeof showDashboard`
- Should return `"function"`, not `"undefined"`
- If undefined, JavaScript files aren't loading properly

#### 5. **Production Deployment Not Updated**
**If you're accessing a production URL:**
- The latest changes might not be deployed yet
- Contact the deployment team to redeploy from `main` branch
- Or merge PR #35 and redeploy

---

## Issue: IM Splitter Won't Load (404 Not Found)

### Symptoms:
- Clicking "Serah Terima IM Split" shows "Not Found" error
- Or shows blank page / loading spinner forever

### Possible Causes & Solutions:

#### 1. **Files Not Deployed to Production**
**Solution:**
- PR #35 needs to be merged to `main` branch
- Production needs to be redeployed after merge
- Files added: `finance/serah-terima-im-split.html`, `finance/im-splitter.py`

#### 2. **Backend Server Not Running**
**Check:**
The IM Splitter requires a Python Flask backend running on port 5002.

**To Start Backend:**
```bash
cd finance
python3 im-splitter.py
```

**Expected Output:**
```
============================================================
IM Splitter API Server Starting...
============================================================
Endpoints:
  POST /api/split-im-excel - Process and split Excel file
  ...
 * Running on http://127.0.0.1:5002
```

**Health Check:**
Open in browser: `http://your-domain:5002/health`
Should return: `{"status": "healthy", "service": "IM Splitter API"}`

#### 3. **API URL Mismatch**
The latest fix (commit 755433a) addresses this with auto-detection.

**Manual Check:**
1. Open browser console on IM Splitter page
2. Look for: `"IM Splitter API Base URL: ..."`
3. Verify the URL is correct for your environment

**Expected URLs:**
- Localhost: `http://localhost:5002`
- Sandbox: `https://5002-{sandbox-id}.sandbox.novita.ai`
- Production: `https://your-domain:5002` or configure accordingly

#### 4. **CORS Issues**
If backend is running but requests fail:
- Check browser console for CORS errors
- Verify Flask-CORS is installed: `pip install flask-cors`
- Check firewall/network allows port 5002

---

## Quick Diagnostic Commands

### For Development/Testing:

```bash
# Check if files exist
ls -la finance/serah-terima-im-split.html
ls -la finance/im-splitter.py

# Check if backend is running
curl http://localhost:5002/health

# Check if frontend is accessible
curl -I http://localhost:8000/finance/serah-terima-im-split.html

# View backend logs
# (if running in background, check the process output)

# Test API endpoint
curl -X POST http://localhost:5002/api/test-endpoint
```

### For Production:

```bash
# Pull latest changes
git checkout main
git pull origin main

# Restart servers
# (depends on your deployment setup)

# Check processes
ps aux | grep python | grep splitter
ps aux | grep python | grep 8000
```

---

## Dependencies Required

### Python Packages:
```bash
pip install flask flask-cors openpyxl
```

### Frontend:
- Tailwind CSS (loaded from CDN)
- Font Awesome (loaded from CDN)
- No npm install required

---

## Current PR Status

**PR #35**: Serah Terima IM Split Tool
- Status: OPEN
- Branch: `genspark_ai_developer`
- Files Changed: 3 files, +906 lines
- Latest Fix: API URL auto-detection (commit 755433a)

**To Deploy:**
1. Review and merge PR #35 into `main`
2. Deploy `main` branch to production
3. Start backend server: `python3 finance/im-splitter.py`
4. Verify health check: `curl http://your-domain:5002/health`

---

## Getting Help

If issues persist:

1. **Collect Information:**
   - Screenshot of error (already provided)
   - Browser console output (F12 → Console tab)
   - Network tab errors (F12 → Network tab)
   - Backend server logs

2. **Share Details:**
   - What URL are you accessing? (localhost / sandbox / production domain)
   - What browser and version?
   - Are you logged in with valid credentials?
   - Is this immediately after deployment or has it been working before?

3. **Contact:**
   - Share collected information with development team
   - Include PR number (#35) and commit hash (755433a)

---

## Checklist for Fresh Deployment

- [ ] Pull latest code from `main` branch
- [ ] Verify all files present:
  - [ ] `finance/serah-terima-im-split.html`
  - [ ] `finance/im-splitter.py`
  - [ ] `index.html` (with IM Split subtab)
- [ ] Install Python dependencies: `pip install flask flask-cors openpyxl`
- [ ] Start backend server: `python3 finance/im-splitter.py`
- [ ] Verify backend health: `curl http://localhost:5002/health`
- [ ] Start frontend server (if needed)
- [ ] Test login → should redirect to dashboard
- [ ] Test Finance tab → Serah Terima IM Split button should appear
- [ ] Click button → tool should load in iframe
- [ ] Test file upload and processing

---

**Last Updated:** 2025-10-25
**Related PR:** #35
**Latest Commit:** 755433a
