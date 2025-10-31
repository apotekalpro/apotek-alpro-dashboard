# GitHub Actions Workflow Update Instructions

## ⚠️ IMPORTANT: Manual Update Required

The `.github/workflows/google-review-sync.yml` file needs to be manually updated because the GitHub App doesn't have permission to modify workflow files.

## 📝 Changes Needed

Update the workflow file to install Puppeteer system dependencies before running the automation script.

### Current Workflow Section:

```yaml
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install @supabase/supabase-js node-fetch
      
      - name: Run Google Review Sync
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        run: node google-review-automation.js
```

### Updated Workflow Section:

```yaml
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Puppeteer dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libnss3 \
            libnspr4 \
            libatk1.0-0 \
            libatk-bridge2.0-0 \
            libcups2 \
            libdrm2 \
            libdbus-1-3 \
            libxkbcommon0 \
            libxcomposite1 \
            libxdamage1 \
            libxfixes3 \
            libxrandr2 \
            libgbm1 \
            libasound2 \
            libatspi2.0-0 \
            libxshmfence1
      
      - name: Install dependencies
        run: npm install @supabase/supabase-js node-fetch puppeteer
      
      - name: Run Google Review Sync
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
          PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: false
        run: node google-review-automation.js
```

## 🔧 Step-by-Step Update Process

1. **Open the workflow file** in GitHub web interface:
   - Navigate to: `.github/workflows/google-review-sync.yml`
   - Click "Edit" button

2. **Add the new step** after "Setup Node.js" step:
   ```yaml
   - name: Install Puppeteer dependencies
     run: |
       sudo apt-get update
       sudo apt-get install -y \
         libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
         libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
         libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
         libgbm1 libasound2 libatspi2.0-0 libxshmfence1
   ```

3. **Update the "Install dependencies" step**:
   ```yaml
   - name: Install dependencies
     run: npm install @supabase/supabase-js node-fetch puppeteer
   ```

4. **Add environment variable** to "Run Google Review Sync" step:
   ```yaml
   - name: Run Google Review Sync
     env:
       SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
       SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
       PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: false  # Add this line
     run: node google-review-automation.js
   ```

5. **Commit the changes** directly to the main branch or create a PR

## ✅ Verification

After updating:

1. **Trigger manual workflow run**:
   - Go to Actions tab
   - Select "Google Review Daily Sync"
   - Click "Run workflow"

2. **Check the logs**:
   - Look for "🌐 Launching headless browser..."
   - Verify "✅ Browser launched successfully"
   - Check rating extraction logs

3. **Verify data in Supabase**:
   - Check `google_reviews` table
   - Confirm ratings are correct
   - Compare with Google Maps manually

## 📊 Expected Log Output

```
🚀 Starting Google Review Automation (Puppeteer Edition)
⏰ Time: 2025-01-31T01:00:00.000Z

🌐 Launching headless browser...
✅ Browser launched successfully

📊 Fetching outlets from Google Sheets...
✅ Found 200+ active outlets

📊 Fetching reviews for all outlets...
  🔍 [1] Fetching reviews for: APOTEK ALPRO Belleza
     Loading page...
  ✅ APOTEK ALPRO Belleza: 95 reviews, 5.0 rating
  
  ... (more outlets)

💾 Saving to Supabase...
✅ Successfully saved 200+ outlets to Supabase

✅ Automation completed successfully!
📊 Summary:
   • Total Outlets: 200+
   • Outlets with Ratings: 200+
   • Total Reviews: XXXXX
   • Average Rating: X.XX

🌐 Browser closed
```

## 🚨 Troubleshooting

### Issue: Browser launch fails
**Solution**: Ensure all Puppeteer dependencies are installed (check the apt-get step)

### Issue: Timeout errors
**Solution**: Increase timeout in `google-review-automation.js`:
```javascript
await page.goto(outlet.link, {
    waitUntil: 'networkidle2',
    timeout: 60000  // Increase from 30000 to 60000
});
```

### Issue: Still getting wrong ratings
**Solution**: 
1. Check if Google Maps changed their HTML structure
2. Run `test-rating-extraction.js` locally with actual URLs
3. Update extraction strategies in `fetchReviewData()` function

## 📚 Additional Resources

- **Puppeteer Documentation**: https://pptr.dev/
- **GitHub Actions Ubuntu Packages**: https://github.com/actions/virtual-environments
- **Supabase Docs**: https://supabase.com/docs

---

**Last Updated**: 2025-01-31
**PR**: #44
**Status**: Awaiting manual workflow update
