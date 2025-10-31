# GitHub Secrets Setup Guide

## 🎯 Purpose
Configure GitHub repository secrets to enable automated daily sync of Google Reviews to Supabase.

---

## 📋 Your Supabase Credentials

### ✅ Already Configured in Dashboard:
- **Project URL**: `https://sudchiscctcihsznewan.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZGNoaXNjY3RjaWhzem5ld2FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4OTM2NzUsImV4cCI6MjA3NzQ2OTY3NX0.qwT4DbDY0CvyjG5ubsrVZHvmHF67A1t2y4NXUZSczTQ`
- ✅ File updated: `supabase-config.js`

### 🔐 Need to Add to GitHub Secrets:
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZGNoaXNjY3RjaWhzem5ld2FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTg5MzY3NSwiZXhwIjoyMDc3NDY5Njc1fQ.8UT8y04LJ0GKS5ItOf3SiL6M0IYeYwI8e-Tt8-Mvhmk`

---

## 🚀 Step-by-Step: Add GitHub Secrets

### Step 1: Go to Repository Settings
1. Open your GitHub repository in browser
2. Click **"Settings"** tab (top right)
3. In left sidebar, expand **"Secrets and variables"**
4. Click **"Actions"**

### Step 2: Add First Secret (SUPABASE_URL)
1. Click **"New repository secret"** (green button)
2. **Name**: `SUPABASE_URL`
3. **Value**: 
   ```
   https://sudchiscctcihsznewan.supabase.co
   ```
4. Click **"Add secret"**

### Step 3: Add Second Secret (SUPABASE_KEY)
1. Click **"New repository secret"** again
2. **Name**: `SUPABASE_KEY`
3. **Value** (Service Role Key):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZGNoaXNjY3RjaWhzem5ld2FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTg5MzY3NSwiZXhwIjoyMDc3NDY5Njc1fQ.8UT8y04LJ0GKS5ItOf3SiL6M0IYeYwI8e-Tt8-Mvhmk
   ```
4. Click **"Add secret"**

### Step 4: Verify Secrets
You should now see two secrets listed:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_KEY`

⚠️ **Important**: Use **Service Role Key** for `SUPABASE_KEY`, NOT the anon key!

---

## 📁 Next: Add GitHub Actions Workflow File

Since GitHub App tokens don't have workflow permissions, you need to add this file manually through GitHub UI.

### Option A: Via GitHub Web Interface (Recommended)

1. **Go to your repo on GitHub**
2. **Navigate to**: `genspark_ai_developer` branch
3. **Click "Add file" → "Create new file"**
4. **File path**: `.github/workflows/google-review-sync.yml`
5. **Copy and paste this content**:

```yaml
name: Google Review Daily Sync

on:
  schedule:
    - cron: '0 1 * * *'  # Daily at 1:00 AM UTC (8:00 AM Jakarta)
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync-reviews:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install @supabase/supabase-js node-fetch
      
      - name: Run automation script
        run: node google-review-automation.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

6. **Commit directly** to `genspark_ai_developer` branch
7. **Click "Commit new file"**

### Option B: After Merging PR #36

If you prefer to wait until after merging:
1. Merge PR #36 to main branch
2. Switch to main branch
3. Follow same steps as Option A above

---

## 🧪 Test the Automation

### Step 1: Manual Test Run
1. Go to **"Actions"** tab in your GitHub repo
2. Click **"Google Review Daily Sync"** in left sidebar
3. Click **"Run workflow"** dropdown
4. Select branch: `genspark_ai_developer`
5. Click **"Run workflow"** button

### Step 2: Monitor Progress
- Workflow will appear in the list (yellow dot = running)
- Click on it to see live logs
- Expected runtime: ~7 minutes for 200 outlets

### Step 3: Verify Results

#### A. Check GitHub Actions Logs
- Should show:
  ```
  ✅ Fetched 200 outlets from Google Sheets
  Processing outlet 1/200: [Outlet Name]
  ✅ Synced [Outlet Name]: 123 reviews, 4.5 rating
  ...
  ✅ Successfully synced 200 outlets to Supabase
  ```

#### B. Check Supabase Table
1. Go to Supabase → Table Editor
2. Click `google_reviews` table
3. Should see 200+ rows with:
   - Outlet names
   - Google Maps links
   - Review counts
   - Ratings (1.0-5.0)
   - Last checked timestamps

#### C. Check Dashboard
1. Open your dashboard in browser
2. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Should load **instantly** (no 3-second delays)
4. Statistics should show:
   - Total outlets: 200+
   - With reviews: X
   - Pending: Y
   - Average rating: X.X
5. Leaderboard should show top 10 outlets with real review counts

---

## ⏰ Automation Schedule

### Current Schedule:
- **Cron**: `0 1 * * *`
- **UTC Time**: 1:00 AM
- **Your Time**: 8:00 AM Jakarta (UTC+7)

### To Change Schedule:
Edit the cron expression in `.github/workflows/google-review-sync.yml`:

```yaml
schedule:
  - cron: '0 1 * * *'  # Change this line
```

**Common Schedules**:
- `0 0 * * *` = Midnight UTC (7:00 AM Jakarta)
- `0 1 * * *` = 1:00 AM UTC (8:00 AM Jakarta) ← Current
- `0 2 * * *` = 2:00 AM UTC (9:00 AM Jakarta)
- `0 6 * * *` = 6:00 AM UTC (1:00 PM Jakarta)
- `0 12 * * *` = Noon UTC (7:00 PM Jakarta)

---

## 🔍 Troubleshooting

### Issue: Workflow Doesn't Appear in Actions Tab
**Solution**: 
- Workflow file must be on the branch you're viewing
- Check you're on correct branch (genspark_ai_developer or main)
- File must be at exact path: `.github/workflows/google-review-sync.yml`

### Issue: Workflow Fails with "Secrets not found"
**Solution**: 
- Verify secrets are named exactly: `SUPABASE_URL` and `SUPABASE_KEY`
- No spaces, no typos
- Re-add secrets if necessary

### Issue: Workflow Fails with "Table does not exist"
**Solution**: 
- Go to Supabase SQL Editor
- Run the table creation script again (see SUPABASE_SETUP_GUIDE.md)

### Issue: Workflow Succeeds but Dashboard Shows No Data
**Solution**: 
1. Check Supabase Table Editor - is data there?
2. If yes, check `supabase-config.js` has correct URL and key
3. Hard refresh dashboard: `Ctrl+Shift+R`
4. Check browser console (F12) for errors

### Issue: Google Maps Scraping Fails
**Solution**: 
- CORS proxy might be down
- Try running workflow again (transient issue)
- Check outlet links are valid: `https://maps.app.goo.gl/xxxxx`

### Issue: Only Some Outlets Sync
**Solution**: 
- This is normal - some outlets may not have reviews yet
- Check dashboard "Pending" count
- Run "Fetch Reviews for Pending Outlets" in dashboard

---

## 📊 Expected Results

After successful automation:

### Supabase Database:
- ✅ 200+ rows in `google_reviews` table
- ✅ Each row has: outlet_name, google_maps_link, review_count, rating
- ✅ Timestamps show recent sync time

### Dashboard:
- ✅ Loads in <1 second (from cache)
- ✅ Shows real review counts and ratings
- ✅ Leaderboard ranks outlets correctly
- ✅ Search and filter work instantly
- ✅ Statistics are accurate

### GitHub Actions:
- ✅ Workflow runs daily at 1 AM UTC
- ✅ Logs show successful sync
- ✅ No rate limit errors
- ✅ Runtime: 5-10 minutes

---

## 🎉 Success Checklist

- [ ] Supabase table created (`google_reviews`)
- [ ] Dashboard configured with URL and anon key
- [ ] GitHub secrets added (SUPABASE_URL, SUPABASE_KEY)
- [ ] Workflow file added (`.github/workflows/google-review-sync.yml`)
- [ ] Manual test run successful
- [ ] Data appears in Supabase
- [ ] Dashboard loads from Supabase
- [ ] Automation scheduled for 1 AM UTC

---

## 🆘 Need Help?

If you encounter any issues:
1. Check the troubleshooting section above
2. Review GitHub Actions logs for error messages
3. Check Supabase Table Editor for data
4. Verify browser console (F12) for dashboard errors
5. Share screenshots of any errors for debugging assistance

---

**Next Steps**: Follow the steps above to add GitHub Secrets and the workflow file! 🚀
