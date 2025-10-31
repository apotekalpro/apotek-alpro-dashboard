# Google Review Automation Setup Guide

## 🎯 Overview

This automation system syncs Google Reviews daily at 1:00 AM automatically.

**Flow:**
```
1. Google Sheets (MAIN OPERATION) → Fetch outlet list
2. Google Maps → Fetch reviews for each outlet  
3. Supabase → Store cached data
4. Dashboard → Display instant results
```

**Benefits:**
- ✅ Handle 200+ outlets without timeout
- ✅ Instant page load (cached data)
- ✅ Auto-updated daily at 1 AM
- ✅ No manual work required

---

## 📋 Prerequisites

1. **Supabase Account** (free tier works)
2. **GitHub Repository** (for GitHub Actions cron)
3. **Google Sheets** with outlet data
4. **Node.js** (if running locally/server)

---

## 🔧 Setup Steps

### Step 1: Create Supabase Table

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run this SQL:

```sql
-- Create google_reviews table
CREATE TABLE google_reviews (
  id SERIAL PRIMARY KEY,
  outlet_name TEXT UNIQUE NOT NULL,
  google_maps_link TEXT,
  review_count INTEGER DEFAULT 0,
  rating DECIMAL(3,1) DEFAULT 0,
  last_checked TIMESTAMP,
  status TEXT DEFAULT 'pending',
  place_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_outlet_name ON google_reviews(outlet_name);
CREATE INDEX idx_review_count ON google_reviews(review_count DESC);
CREATE INDEX idx_rating ON google_reviews(rating DESC);

-- Enable Row Level Security
ALTER TABLE google_reviews ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access" 
  ON google_reviews FOR SELECT 
  USING (true);

-- Create policy for service role write access
CREATE POLICY "Service role write access" 
  ON google_reviews FOR ALL 
  USING (auth.role() = 'service_role');
```

4. Click **Run** to execute

### Step 2: Get Supabase Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (secret, not anon key!)

⚠️ **Important:** Use **Service Role Key**, not Anon Key, for the automation!

### Step 3: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_KEY` | Your Supabase Service Role Key |

### Step 4: Enable GitHub Actions

1. The workflow file is already in: `.github/workflows/google-review-sync.yml`
2. Push all files to GitHub:
   ```bash
   git add .
   git commit -m "Add Google Review automation"
   git push
   ```
3. Go to **Actions** tab in GitHub
4. Workflow should appear: "Google Review Daily Sync"

### Step 5: Test the Automation

**Manual Test:**
1. Go to **Actions** tab
2. Click "Google Review Daily Sync"
3. Click **Run workflow** dropdown
4. Click **Run workflow** button
5. Wait for completion (may take 6-8 hours for 200 outlets)
6. Check logs for results

**Check Supabase:**
1. Go to Supabase → **Table Editor**
2. Open `google_reviews` table
3. Verify data is populated

### Step 6: Update Dashboard Config

1. Open `supabase-config.js`
2. Update credentials:
   ```javascript
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key'; // For dashboard
   ```
3. Save and deploy

---

## 🕐 Scheduling

### Default Schedule: Daily at 1:00 AM UTC

The workflow runs automatically based on this cron expression:
```yaml
cron: '0 1 * * *'
```

**Convert to your timezone:**
- **UTC 1:00 AM** = Jakarta 8:00 AM (UTC+7)
- **UTC 1:00 AM** = Singapore 9:00 AM (UTC+8)

**To change the time:**
1. Edit `.github/workflows/google-review-sync.yml`
2. Change the cron expression:
   ```yaml
   # Example: 6 PM UTC = 1 AM Jakarta (UTC+7)
   - cron: '0 18 * * *'
   ```
3. Commit and push changes

**Cron Expression Format:**
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

---

## 🧪 Testing & Troubleshooting

### Test Locally

1. Install dependencies:
   ```bash
   npm install @supabase/supabase-js node-fetch
   ```

2. Set environment variables:
   ```bash
   export SUPABASE_URL="your-url"
   export SUPABASE_KEY="your-key"
   ```

3. Run script:
   ```bash
   node google-review-automation.js
   ```

### Common Issues

**Issue: Workflow doesn't run automatically**
- Solution: Check GitHub Actions is enabled in repository settings
- Solution: Verify cron expression is correct
- Note: First run may be delayed up to 1 hour

**Issue: "Missing environment variables" error**
- Solution: Check GitHub Secrets are set correctly
- Solution: Use Service Role Key, not Anon Key

**Issue: Rate limiting errors**
- Solution: Script already has 2-second delays
- Solution: If still rate-limited, increase DELAY_BETWEEN_REQUESTS

**Issue: No data in Supabase**
- Solution: Check table name is exactly `google_reviews`
- Solution: Verify RLS policies allow inserts
- Solution: Check script logs for errors

### View Logs

**GitHub Actions Logs:**
1. Go to **Actions** tab
2. Click the workflow run
3. Expand each step to see detailed logs

**Supabase Logs:**
1. Supabase dashboard → **Logs**
2. Filter by table: `google_reviews`
3. View insert/update operations

---

## 📊 Monitoring

### Check Automation Status

**Dashboard:**
1. Open dashboard → Strategy → Google Review
2. Click "Auto-Sync Settings"
3. Status indicator shows if automation is active

**GitHub Actions:**
1. Go to **Actions** tab
2. See history of past runs
3. Green check = success, Red X = failed

### Email Notifications

**For failures:**
1. Go to **Settings** → **Notifications**
2. Enable **Actions** notifications
3. Get email when workflow fails

---

## 🎯 Usage

### For End Users

**Daily Workflow:**
1. Open dashboard anytime
2. Data loads instantly from Supabase
3. See reviews updated from last night's sync
4. No manual refresh needed!

**Manual Sync (if needed):**
1. Click "Sync from Google Sheets" button
2. Waits for data to sync
3. Or click "Refresh All" for specific outlets

### For Administrators

**Monitor:**
- Check GitHub Actions tab weekly
- Verify data updates in Supabase
- Review error logs if any failures

**Maintain:**
- Update Google Sheets as needed
- Outlets auto-sync daily
- CLOSED outlets excluded automatically

---

## 🚀 Deployment Options

### Option 1: GitHub Actions (Recommended)

✅ **Pros:**
- Free for public repos
- Built-in scheduling
- Easy setup
- Reliable

❌ **Cons:**
- Limited to public repos or paid GitHub

### Option 2: Vercel Cron

1. Deploy to Vercel
2. Create `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/sync-reviews",
       "schedule": "0 1 * * *"
     }]
   }
   ```
3. Create API route with script

### Option 3: Server Cron

1. Deploy script to your server
2. Add to crontab:
   ```bash
   0 1 * * * cd /path/to/app && node google-review-automation.js
   ```

---

## 📝 File Structure

```
project/
├── google-review-automation.js     # Main automation script
├── .github/
│   └── workflows/
│       └── google-review-sync.yml  # GitHub Actions workflow
├── supabase-config.js              # Supabase configuration
└── GOOGLE_REVIEW_AUTOMATION_SETUP.md  # This guide
```

---

## ✅ Checklist

Before going live, verify:

- [ ] Supabase table created
- [ ] GitHub Secrets configured (SUPABASE_URL, SUPABASE_KEY)
- [ ] Google Sheets has correct data (columns J, AC, P)
- [ ] Test run successful
- [ ] Dashboard loads data from Supabase
- [ ] Cron schedule set correctly
- [ ] Notifications configured
- [ ] Team knows how to use system

---

## 🆘 Support

**Issues:**
- Check logs in GitHub Actions
- Verify Supabase table structure
- Test script locally first
- Review error messages

**Questions:**
- Refer to code comments
- Check Supabase documentation
- Review GitHub Actions docs

---

## 📈 Scaling

**For 1000+ outlets:**
1. Increase server resources
2. Consider batch processing
3. Use multiple workers
4. Implement retry logic
5. Add progress tracking

**Performance Tips:**
- Use Supabase RLS for security
- Index frequently queried columns
- Batch insert operations
- Monitor rate limits

---

## 🎉 Conclusion

Your Google Review Tracker is now fully automated!

- ✅ Daily automatic updates
- ✅ Instant page loads
- ✅ Scalable to 1000+ outlets
- ✅ Minimal maintenance required

Enjoy your hands-free review tracking system! 🚀
