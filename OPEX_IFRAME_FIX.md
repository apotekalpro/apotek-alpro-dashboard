# OpEX Dashboard - Iframe Loading Fix

## Issue Resolved ✅

**Problem**: OpEX Dashboard showed empty when accessed via iframe in the main dashboard (Operations > OpEX Dashboard), but worked fine in standalone mode.

**Root Cause**: The `showOperationsSubtab()` function was missing the iframe lazy loading logic that other tab sections had.

**Solution**: Added iframe loading code to properly initialize the iframe when the OpEX Dashboard tab is clicked.

---

## What Was Fixed

### Code Change in `index.html`

**Location**: `showOperationsSubtab()` function (around line 7218)

**Before**:
```javascript
const targetSubtab = document.getElementById(subtabMap[subtabId]);
if (targetSubtab) {
    targetSubtab.classList.remove('hidden');
}
```

**After**:
```javascript
const targetSubtab = document.getElementById(subtabMap[subtabId]);
if (targetSubtab) {
    targetSubtab.classList.remove('hidden');
    
    // Load iframe if it exists and hasn't been loaded yet (for lazy loading)
    const iframe = targetSubtab.querySelector('iframe.lazy-iframe');
    if (iframe && !iframe.src && iframe.dataset.src) {
        console.log('Loading iframe for:', subtabId);
        iframe.src = iframe.dataset.src;
    }
}
```

---

## How It Works Now

1. **Initial State**: 
   - Iframe has `data-src="opex-dashboard.html"` (not loaded yet)
   - No `src` attribute (saves bandwidth)

2. **When User Clicks OpEX Dashboard**:
   - `showOperationsSubtab('opex-dashboard')` is called
   - Function finds the iframe with class `lazy-iframe`
   - Checks if iframe hasn't been loaded yet (`!iframe.src`)
   - Copies `data-src` to `src` to trigger loading
   - Logs to console: "Loading iframe for: opex-dashboard"

3. **Result**:
   - Dashboard loads and displays properly
   - Sample data shows immediately (if API not configured)
   - All sections render correctly

---

## Testing the Fix

### Test in Main Dashboard

1. **Navigate**: Go to https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/
2. **Click**: Operations tab
3. **Click**: OpEX Dashboard subtab
4. **Verify**: 
   - Dashboard loads with data
   - Summary cards show values
   - Tables display sample data
   - No console errors (except API key warning - expected)

### Test Standalone

1. **Direct Access**: https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/opex-dashboard.html
2. **Verify**: Same data displays correctly

### Check Browser Console

Open DevTools (F12) and you should see:
```
✅ Loading iframe for: opex-dashboard
⚠️  OpEX Config not found or invalid - using inline initialization with sample data
✅ Dashboard loaded with sample data
```

---

## Expected Behavior Now

### ✅ What Should Work:

1. **Main Dashboard Integration**:
   - ✅ OpEX Dashboard button visible in Operations section
   - ✅ Click loads dashboard in iframe
   - ✅ All 4 sections display with data
   - ✅ Filters and sorting work
   - ✅ "Open in New Tab" button works

2. **Standalone Mode**:
   - ✅ Direct URL access works
   - ✅ All features functional
   - ✅ Sample data loads automatically

3. **Console Messages**:
   - ✅ No critical errors
   - ⚠️  API key warning (expected until configured)
   - ℹ️  Informational logs about data loading

### ⚠️ Expected Warnings (Normal):

These are NORMAL and expected:
```
⚠️ Unrecognized Feature: 'ambient-light-sensor'
⚠️ Unrecognized Feature: 'speaker'
⚠️ Unrecognized Feature: 'vibrate'
⚠️ Unrecognized Feature: 'vr'
```
These are just browser warnings about permissions-policy features that don't affect functionality.

```
⚠️ Google Sheets API key not configured. Using sample data.
```
This is expected until you add your API key to `opex-config.js`.

---

## Troubleshooting

### If Dashboard Still Appears Empty:

1. **Hard Refresh**: Ctrl + Shift + R (or Cmd + Shift + R on Mac)
2. **Clear Cache**: 
   - Chrome: Settings > Privacy > Clear browsing data
   - Or just hard refresh
3. **Check Console**: Press F12 and look for actual errors (not warnings)
4. **Verify Files**: Visit https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/test-opex.html

### If Console Shows Errors:

**Error**: `Failed to load resource: net::ERR_FILE_NOT_FOUND`
- **Solution**: Files missing, verify all files are deployed

**Error**: `Uncaught ReferenceError: opexDashboard is not defined`
- **Solution**: JavaScript files not loading, check paths

**Error**: `CORS policy: No 'Access-Control-Allow-Origin'`
- **Solution**: Should not happen with local files, but check server config

### If API Key Issues:

**Message**: `API key not configured`
- **Status**: ✅ Normal - using sample data
- **To Fix**: Add API key to `opex-config.js` (optional)

**Error**: `Invalid API key`
- **Check**: Key copied correctly without extra spaces
- **Check**: Google Sheets API is enabled
- **Check**: API key restrictions allow Google Sheets API

---

## Git Commits Made

1. **Initial Implementation** (763e23e):
   - Created all OpEX Dashboard files
   - Added to Operations section
   
2. **Improvements** (9b6dbdf):
   - Added external JS file integration
   - Created test page
   - Added documentation

3. **Iframe Fix** (2ca1026): ⭐ **This Fix**
   - Added lazy loading to Operations subtab
   - Resolves empty dashboard issue

---

## Pull Request

**URL**: https://github.com/apotekalpro/apotek-alpro-dashboard/pull/116

**Status**: Open - Updated with iframe loading fix

**Changes**: 3 commits total
- feat: Add OpEX Dashboard
- fix: Improve initialization
- fix: Add iframe lazy loading ⭐

---

## Next Steps

### For Testing:
1. ✅ Refresh your browser
2. ✅ Test both iframe and standalone modes
3. ✅ Verify all sections load

### For Production:
1. ⚠️ Add Google Sheets API key to `opex-config.js`
2. ⚠️ Make Google Sheet publicly accessible
3. ⚠️ Test with real data
4. ✅ Merge PR when ready

### For Users:
1. ℹ️ Access via: Operations > OpEX Dashboard
2. ℹ️ Use filters to narrow down data
3. ℹ️ Click rows for detailed view
4. ℹ️ Use "Refresh Data" to update

---

## Summary

✅ **Issue Fixed**: Dashboard now loads properly in iframe  
✅ **Standalone Works**: Direct access still functional  
✅ **Sample Data**: Displays automatically for testing  
✅ **Console Clean**: Only expected warnings remain  
✅ **Ready to Use**: Can be tested immediately  

**The OpEX Dashboard is now fully functional in both iframe and standalone modes!** 🎉

---

**Last Updated**: March 17, 2026  
**Commit**: 2ca1026  
**Branch**: feature/opex-dashboard
