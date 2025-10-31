# Supabase Setup Guide - Step by Step

## 🎯 What We're Building

A fully automated system that:
1. **Runs daily at 1 AM** (GitHub Actions cron job)
2. **Fetches outlets** from your public Google Sheet
3. **Scrapes reviews** from Google Maps for each outlet
4. **Stores in Supabase** for instant access
5. **Dashboard loads** data instantly from Supabase (no waiting!)

---

## 📋 Step 1: Create Supabase Account

### 1.1 Sign Up

1. Go to https://supabase.com
2. Click **"Start your project"**
3. Sign up with **GitHub** (easiest) or email
4. It's **FREE** - no credit card required!

### 1.2 Create New Project

1. Click **"New project"**
2. Fill in:
   - **Name**: `apotek-alpro-reviews` (or any name you like)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you (Southeast Asia recommended)
   - **Pricing Plan**: Free (good for up to 500 MB database)
3. Click **"Create new project"**
4. Wait ~2 minutes for setup

---

## 📋 Step 2: Create Database Table

### 2.1 Open SQL Editor

1. In Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New query"** button

### 2.2 Run This SQL

Copy and paste this SQL code:

```sql
-- Create google_reviews table
CREATE TABLE google_reviews (
  id SERIAL PRIMARY KEY,
  outlet_name TEXT UNIQUE NOT NULL,
  google_maps_link TEXT NOT NULL,
  review_count INTEGER DEFAULT 0,
  rating DECIMAL(3,1) DEFAULT 0,
  last_checked TIMESTAMP,
  status TEXT DEFAULT 'pending',
  place_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_outlet_name ON google_reviews(outlet_name);
CREATE INDEX idx_review_count ON google_reviews(review_count DESC);
CREATE INDEX idx_rating ON google_reviews(rating DESC);
CREATE INDEX idx_last_checked ON google_reviews(last_checked DESC);

-- Enable Row Level Security
ALTER TABLE google_reviews ENABLE ROW LEVEL SECURITY;

-- Allow public READ access (for dashboard)
CREATE POLICY "Anyone can read reviews" 
  ON google_reviews 
  FOR SELECT 
  USING (true);

-- Allow authenticated WRITE access (for automation)
CREATE POLICY "Service role can write" 
  ON google_reviews 
  FOR ALL 
  USING (auth.role() = 'service_role');
```

3. Click **"Run"** button (bottom right)
4. You should see: **"Success. No rows returned"**

### 2.3 Verify Table Created

1. Click **"Table Editor"** (left sidebar)
2. You should see `google_reviews` table
3. It will be empty - that's correct!

---

## 📋 Step 3: Get Supabase Credentials

### 3.1 Find Your Project URL

1. Go to **Settings** → **API** (left sidebar)
2. Under **"Project URL"**, copy the URL
   - Example: `https://abcdefghijk.supabase.co`
3. **Save this!** We'll need it later

### 3.2 Get API Keys

You'll see two keys:

**ANON KEY** (public):
- Used by the **dashboard** to READ data
- Safe to expose in frontend code
- Copy and save this

**SERVICE ROLE KEY** (secret):
- Used by the **automation script** to WRITE data
- ⚠️ **KEEP SECRET!** Never expose publicly
- Copy and save this

---

## 📋 Step 4: Configure Dashboard

### 4.1 Update Supabase Config File

1. In your project, open `supabase-config.js`
2. Replace the placeholder values:

```javascript
const SUPABASE_URL = 'https://abcdefghijk.supabase.co'; // Your Project URL
const SUPABASE_ANON_KEY = 'eyJhbGc...'; // Your Anon Key (public)
```

3. Save the file

### 4.2 Test Dashboard Connection

1. Hard refresh your dashboard (Ctrl+F5)
2. Open console (F12)
3. You should see: "✅ Supabase initialized"
4. No errors = working!

---

## 📋 Step 5: Configure GitHub Secrets

### 5.1 Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **"New repository secret"** button

### 5.2 Add SUPABASE_URL

1. **Name**: `SUPABASE_URL`
2. **Secret**: Paste your Supabase Project URL
3. Click **"Add secret"**

### 5.3 Add SUPABASE_KEY

1. Click **"New repository secret"** again
2. **Name**: `SUPABASE_KEY`
3. **Secret**: Paste your **SERVICE ROLE KEY** (not anon key!)
4. Click **"Add secret"**

⚠️ **Important**: Use SERVICE ROLE KEY here, not the anon key!

---

## 📋 Step 6: Update Automation Script

The automation script needs to use your new public sheet:

### 6.1 Open google-review-automation.js

The script already has:
```javascript
const GOOGLE_SHEETS_ID = '1nTSZFKFZRt1owO-hKUk2lkzvlGxcyrBTC47yDTiu1YQ';
const SHEET_NAME = 'Sheet1';
```

This is correct! ✅ No changes needed.

### 6.2 Verify Column Mapping

The script expects:
- **Column A** (index 0) = Outlet Name
- **Column B** (index 1) = Status
- **Column C** (index 2) = Google Maps Link

This matches your sheet! ✅ No changes needed.

---

## 📋 Step 7: Test Automation Manually

### 7.1 Push Files to GitHub

If not already pushed:
```bash
git add .
git commit -m "Setup Supabase automation"
git push origin genspark_ai_developer
```

### 7.2 Merge to Main Branch

1. Create/merge your PR #36
2. This puts the files in the main branch

### 7.3 Manual Test Run

1. Go to your GitHub repository
2. Click **"Actions"** tab (top menu)
3. Click **"Google Review Daily Sync"** workflow (left sidebar)
4. Click **"Run workflow"** dropdown (right side)
5. Click **"Run workflow"** button

### 7.4 Watch Progress

1. The workflow will start running
2. Click on the running workflow to see logs
3. Expand each step to see detailed output
4. **Estimated time**: ~7-10 minutes for 200 outlets

### 7.5 Check Supabase

1. Go to Supabase → **Table Editor**
2. Open `google_reviews` table
3. You should see all your outlets with review data!

---

## 📋 Step 8: Verify Dashboard

### 8.1 Reload Dashboard

1. Hard refresh dashboard (Ctrl+F5)
2. The dashboard should now load data from Supabase
3. **Instant load!** No waiting for API calls

### 8.2 Check Statistics

You should see:
- **Total Outlets**: 200+ (your actual count)
- **With Reviews**: Should match outlets with data
- **Total Reviews**: Sum of all reviews
- **Average Rating**: Average of all ratings
- **Leaderboard**: Top 10 outlets by review count

---

## 📋 Step 9: Configure Schedule (Optional)

The default schedule is **1:00 AM UTC** (8:00 AM Jakarta).

### To Change the Time:

1. Open `.github/workflows/google-review-sync.yml`
2. Find this line:
   ```yaml
   - cron: '0 1 * * *'  # 1:00 AM UTC
   ```
3. Change to your desired time:
   ```yaml
   - cron: '0 18 * * *'  # 6:00 PM UTC = 1:00 AM Jakarta (UTC+7)
   ```
4. Commit and push changes

**Cron Format:**
```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6)
│ │ │ │ │
* * * * *
```

**Examples:**
- `0 1 * * *` = 1:00 AM UTC daily
- `0 18 * * *` = 6:00 PM UTC daily (1:00 AM Jakarta)
- `0 0 * * 0` = Midnight UTC every Sunday
- `0 12 * * 1-5` = Noon UTC on weekdays only

---

## 🧪 Troubleshooting

### Issue: Workflow doesn't run

**Check:**
1. GitHub Actions enabled in repo settings
2. Workflow file in main branch (not just PR branch)
3. Secrets are set correctly
4. Wait up to 1 hour for first scheduled run

### Issue: "Missing environment variables"

**Solution:**
1. Go to Settings → Secrets → Actions
2. Verify `SUPABASE_URL` and `SUPABASE_KEY` exist
3. Check for typos in secret names
4. Use SERVICE ROLE KEY, not anon key

### Issue: No data in Supabase

**Solution:**
1. Check workflow logs for errors
2. Verify Google Sheet is public
3. Test CSV URL manually:
   ```
   https://docs.google.com/spreadsheets/d/1nTSZFKFZRt1owO-hKUk2lkzvlGxcyrBTC47yDTiu1YQ/export?format=csv
   ```
4. Check Supabase table policies allow inserts

### Issue: Rate limiting errors

**Solution:**
1. Script already has 2-second delays
2. Increase `DELAY_BETWEEN_REQUESTS` in script
3. Consider splitting into batches

### Issue: Dashboard shows old data

**Solution:**
1. Hard refresh (Ctrl+F5)
2. Clear localStorage
3. Check browser console for errors
4. Verify Supabase credentials in `supabase-config.js`

---

## 📊 Monitoring

### Check Workflow Status

1. Go to **Actions** tab in GitHub
2. See list of past runs
3. ✅ Green check = success
4. ❌ Red X = failed (click to see logs)

### Check Supabase Data

1. Supabase → **Table Editor**
2. View `google_reviews` table
3. Check `last_checked` timestamp
4. Verify review counts look correct

### Enable Email Notifications

1. GitHub → **Settings** → **Notifications**
2. Enable **Actions** notifications
3. Get email when workflow fails

---

## ✅ Final Checklist

Before considering setup complete:

- [ ] Supabase project created
- [ ] `google_reviews` table created with SQL
- [ ] Supabase URL and keys copied
- [ ] `supabase-config.js` updated with credentials
- [ ] GitHub Secrets configured (SUPABASE_URL, SUPABASE_KEY)
- [ ] Workflow file in main branch
- [ ] Manual test run successful
- [ ] Data appears in Supabase table
- [ ] Dashboard loads data from Supabase
- [ ] Leaderboard shows correct rankings
- [ ] Schedule configured (default 1 AM UTC)
- [ ] Notifications enabled for failures

---

## 🎉 You're Done!

Your automation is now fully set up!

**What happens now:**
1. ✅ Every day at 1 AM, automation runs automatically
2. ✅ Fetches latest outlets from Google Sheet
3. ✅ Scrapes reviews from Google Maps
4. ✅ Updates Supabase with fresh data
5. ✅ Dashboard loads instantly from cache

**No more manual work!** 🚀

---

## 📞 Need Help?

If you encounter issues:
1. Check workflow logs in Actions tab
2. Review Supabase logs in dashboard
3. Test script locally: `node google-review-automation.js`
4. Verify all credentials are correct
5. Check Google Sheet is accessible

---

## 🔄 Maintenance

**Weekly:**
- Check Actions tab for any failures
- Verify data is updating in Supabase

**Monthly:**
- Review Supabase storage usage (free tier: 500 MB)
- Check for any rate limiting issues
- Update outlets in Google Sheet as needed

**As Needed:**
- Add new outlets to Google Sheet (auto-syncs next day)
- Mark closed outlets as "CLOSED" (auto-excluded)
- Adjust schedule if needed

Enjoy your automated Google Review tracking! 🎊
