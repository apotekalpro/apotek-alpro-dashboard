# Quick Test Guide - See the Blue Button

## Problem
You can't see the blue "Send All Emails Automatically" button because email is not configured yet.

## Solution - Two Options

### Option A: Configure Email (Recommended - Full Feature)

**This will enable the BLUE button and allow automated sending**

1. **Get Gmail App Password** (5 minutes):
   - Go to: https://myaccount.google.com/apppasswords
   - Create App Password for "Mail"
   - Copy the 16-character password

2. **Set Environment Variables**:
   ```bash
   export SENDER_EMAIL="your-email@apotekalpro.com"
   export SENDER_PASSWORD="your-16-char-password"
   ```

3. **Restart Backend**:
   ```bash
   # Kill existing process
   lsof -ti:5001 | xargs kill -9
   
   # Start with config
   cd /home/user/webapp
   python3 finance/pv-splitter.py
   ```

4. **Refresh Page** - You'll now see the BLUE button! ✨

---

### Option B: See the UI (What You See Now)

**After the latest update, you should now see:**

1. **Gray Button**: "Automated Email (Not Configured)" 
   - This is DISABLED
   - Shows you the feature exists
   
2. **Yellow Box**: Configuration instructions
   - Shows what you need to do
   - Link to get App Password
   - Current status

3. **Purple Button**: "Open All Gmail Compose Windows (Manual)"
   - This ALWAYS works
   - Manual attachment method

---

## What You Should See Now

After refreshing the page (Ctrl+Shift+R), you should see:

```
┌─────────────────────────────────────────────┐
│  📧 Recipient: khoozy.alpro@gmail.com      │
│  [Download buttons for each file]          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 🔒 Automated Email (Not Configured)        │  ← GRAY BUTTON (disabled)
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ⚠️ Automated Email Not Configured          │  ← YELLOW BOX
│                                             │
│ To enable automated email sending:         │
│ 1. Set up email credentials                │
│ 2. Get Gmail App Password                  │
│ 3. Set environment variables               │
│ 4. Restart backend server                  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 📧 Open All Gmail Compose Windows (Manual) │  ← PURPLE BUTTON (always works)
└─────────────────────────────────────────────┘
```

---

## After You Configure Email

Once you set up the email credentials, you'll see:

```
┌─────────────────────────────────────────────┐
│ 🚀 Send All Emails Automatically (3)       │  ← BLUE BUTTON (enabled)
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✅ Automated email ready!                  │  ← GREEN BOX
│ Click the blue button above to send all    │
│ emails with attachments automatically.     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 📧 Open All Gmail Compose Windows (Manual) │  ← PURPLE BUTTON (fallback)
└─────────────────────────────────────────────┘
```

---

## Test It Right Now!

**Refresh your browser** (hard refresh):
- **Chrome/Edge**: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
- **Firefox**: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)

After refresh:
1. Upload your Excel file
2. Click "Split Excel File"
3. Click "Prepare Emails for Gmail"
4. **You should NOW see the gray button** with instructions! 📋

---

## Quick Config for Testing (30 seconds)

If you want to test the BLUE button right now:

```bash
# Set temporary test config (replace with real values)
export SENDER_EMAIL="test@example.com"
export SENDER_PASSWORD="test-password-here"

# Restart backend
cd /home/user/webapp
python3 finance/pv-splitter.py
```

Then refresh page - BLUE button appears!

(Note: It won't actually send emails with fake credentials, but you'll see the UI)

---

## Why You Didn't See It Before

**Old behavior:** Button was completely hidden if email not configured  
**New behavior:** Button always shows, but disabled with instructions if not configured

This is much better UX! 🎯
