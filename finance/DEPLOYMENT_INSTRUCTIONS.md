# Finance Tools Deployment Instructions

## Current Issue

The finance tools (IM Splitter, PV Splitter) require backend APIs that are currently running on sandbox ports 5001 and 5002. These cannot be accessed from GitHub Pages production.

## Solutions

### Option 1: Deploy Backend APIs (Recommended for Production)

You need to deploy the backend services to a server that's accessible from GitHub Pages.

#### Backend Services Required:
1. **PV Splitter API** - `finance/pv-splitter.py` (Port 5001)
2. **IM Splitter API** - `finance/im-splitter.py` (Port 5002)

#### Deployment Options:

**A. Deploy to a Cloud Platform:**
- Heroku, Railway, Render, or similar
- DigitalOcean App Platform
- AWS Lambda + API Gateway
- Google Cloud Run

**B. Use Your Existing Server:**
If you have a server:
```bash
# On your server
cd /path/to/deployment

# Install dependencies
pip3 install flask flask-cors openpyxl

# Set environment variables
export SENDER_EMAIL="apotekalpro.finance@gmail.com"
export SENDER_PASSWORD="typtlkwkeyqyaymq"
export SENDER_NAME="Apotek Alpro Finance Team"

# Run PV Splitter
nohup python3 pv-splitter.py > pv-splitter.log 2>&1 &

# Run IM Splitter
nohup python3 im-splitter.py > im-splitter.log 2>&1 &
```

#### Update Frontend URLs:
Once deployed, update the API URLs in the HTML files:

**In `finance/pv-split.html`** (line 276-278):
```javascript
const API_BASE = 'https://your-backend-domain.com:5001';
```

**In `finance/serah-terima-im-split.html`** (find similar line):
```javascript
const API_BASE = 'https://your-backend-domain.com:5002';
```

---

### Option 2: Client-Side Only (Quick Fix, Limited Features)

Convert tools to work entirely in the browser without backend.

**Limitations:**
- No automated email sending (user must download and send manually)
- All processing happens in browser
- Slower for large files

**Advantages:**
- No backend needed
- Works immediately on GitHub Pages
- No server costs

#### Implementation Steps:

1. Use **SheetJS (xlsx)** library for client-side Excel processing
2. Remove email sending features (or use mailto: links)
3. All file processing in JavaScript

Would you like me to implement the client-side version?

---

### Option 3: Hybrid Approach (Recommended Short-term)

Keep current functionality but add clear instructions for users:

1. **Deploy backends to your infrastructure**
2. **Update API URLs** in HTML files
3. **Add fallback UI** if backend unavailable

---

## Current Status

✅ **Frontend**: Deployed to GitHub Pages  
❌ **Backend**: Running on sandbox (not accessible)  
⚠️ **Result**: CORS errors, API calls fail

## Recommended Next Steps

1. **Choose deployment option** (1, 2, or 3 above)
2. **For Option 1**: Deploy backends to cloud/server
3. **Update API URLs** in HTML files
4. **Test production** with real URLs
5. **Document** final production URLs

## Quick Test (Local)

To test locally with backends:
```bash
# Terminal 1: PV Splitter
cd /home/user/webapp
SENDER_EMAIL="apotekalpro.finance@gmail.com" SENDER_PASSWORD="typtlkwkeyqyaymq" python3 finance/pv-splitter.py

# Terminal 2: IM Splitter  
cd /home/user/webapp
SENDER_EMAIL="apotekalpro.finance@gmail.com" SENDER_PASSWORD="typtlkwkeyqyaymq" python3 finance/im-splitter.py

# Terminal 3: File Server
cd /home/user/webapp
python3 server.py

# Open: http://localhost:8000/finance/pv-split.html
```

## Contact

For deployment assistance, contact your DevOps team or hosting provider.

