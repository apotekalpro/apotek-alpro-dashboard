# OpEX Dashboard - Setup and Usage Guide

## Overview

The OpEX (Operational Excellence) Dashboard is a comprehensive data visualization and analysis tool designed to monitor and analyze operational performance across multiple dimensions:

1. **Field Audit** - Monitor outlet audit scores and detailed compliance
2. **STTK Shrinkage** - Track stock losses and identify problem areas
3. **Top 30 Shrinkage Items** - Analyze the most problematic inventory items
4. **CCTV Audit (14H Analysis)** - Track customer traffic and loss sales reasons

## Features

### Section 1: Field Audit
- **Leaderboard**: Top 5 and Bottom 5 performing outlets
- **Full Audit Table**: Complete audit records with filtering and sorting
- **Outlet Details**: Click any outlet to view detailed audit results
- **Detailed Analysis**: View "TIDAK" (non-compliance) items with code/name mapping
- **Summary Analytics**: Top 10 issues across all audits
- **Filters**: By AM, Outlet, with sorting capabilities

### Section 2: STTK Shrinkage Result
- **Top 5 Worst Stock Loss**: Outlets with highest negative stock variance
- **Full STTK Table**: All shrinkage records
- **Filters**: By AM, Outlet, Month

### Section 3: Top 30 Shrinkage Items
- **Item-level Analysis**: Top 30 items contributing to shrinkage
- **Sortable Columns**: By item code, name, or value

### Section 4: CCTV Audit Result (14H Analysis)
- **Summary Cards**: Total traffic, loss sales, conversion rate, avg loss
- **Top 10 Loss Sales Outlets**: Highest loss sales performers
- **Full CCTV Data**: All audit records with task and loss reason breakdown
- **Loss Sales Reason Summary**: Aggregate analysis of why sales are lost
  - No Staff Available
  - Staff Busy
  - No Stock
  - Others
- **Task Performance Summary**: How well staff perform service tasks
  - Greeting
  - Offer Help
  - Info Product
  - Offer More
  - Closing
- **Month Filtering**: Filter summaries by specific months

## Google Sheets Setup

### Step 1: Prepare Your Google Sheet

Your Google Sheet must have the following sheets with the specified structure:

#### 1. Audit Sheet
Columns: A-N
- Column D: AM Name
- Column G: Month
- Column K: Outlet Code
- Column L: Visit Date (Tanggal Kunjung)
- Column M: Scoring %
- Column N: Final Score

#### 2. FieldAudit_Detail Sheet
Columns: A-AU
- Column A: Month
- Column B: Outlet Code
- Column C: Visit Date (Tgl Kunjung)
- Column D: Result Type (Hasil Outlet / Hasil AM)
- Columns E-AU: Audit checklist items (with codes like A.1.1, A.2.1, etc.)
- Row 1: Headers with code names

#### 3. INDEX Sheet
Columns: A-B
- Column A: Code (e.g., A.1.1, A.2.1)
- Column B: Description/Name

#### 4. STTK_SHRINKAGE Sheet
Columns: A-G
- Column A: Month
- Column B: Outlet Name
- Column G: Area Manager Name
- Additional columns for stock loss values (negative = loss)

#### 5. Shrinkage_Top30 Sheet
Columns: A-G
- Column E: Item Code
- Column F: Item Name
- Column G: Shrinkage Value

#### 6. CCTV_14H Sheet
Columns: A-Q
- Column A: Check Date (Tgl Pengecekan)
- Column B: Video Date (Tgl Video Checked)
- Column C: Outlet Name (Nama Toko)
- Column D: AM Name
- Column E: Total Traffic
- Column F: (reserved)
- Column G: Loss Sales
- Column H: Greeting (task performance)
- Column I: Offer Help (task performance)
- Column J: Info Product (task performance)
- Column K: Offer More (task performance)
- Column L: Closing (task performance)
- Column M: No Staff (loss reason)
- Column N: Staff Busy (loss reason)
- Column O: No Stock (loss reason)
- Column P: Others (loss reason)
- Column Q: Month

### Step 2: Make Sheet Publicly Accessible

1. Open your Google Sheet
2. Click the "Share" button (top right)
3. Click "Change to anyone with the link"
4. Set permission to "Viewer"
5. Copy the sharing link

### Step 3: Get Google Sheets API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key
5. Restrict the API key (recommended):
   - Click on your API key to edit
   - Under "API restrictions", select "Restrict key"
   - Choose "Google Sheets API"
   - Save changes

### Step 4: Configure the Dashboard

1. Open `opex-config.js` file
2. Replace `YOUR_API_KEY_HERE` with your actual Google Sheets API key:
   ```javascript
   const OPEX_CONFIG = {
       API_KEY: 'AIzaSy...your-actual-key...', // Your API key here
       SHEET_ID: '1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M',
       // ... rest of config
   };
   ```
3. Verify the SHEET_ID matches your Google Sheet ID (from the URL)

### Step 5: Test the Dashboard

1. Open `opex-dashboard.html` in a web browser
2. The dashboard should load data from your Google Sheet
3. If you see sample data, check:
   - API key is correctly configured
   - Google Sheet is publicly accessible
   - Sheet names match exactly (case-sensitive)
   - Column letters are correct

## Integration into Main Dashboard

The OpEX Dashboard is integrated into the main Apotek Alpro Dashboard as a subtab under "Operations":

1. Navigate to the main dashboard (`index.html`)
2. Click on "Operations" tab
3. Click on "OpEX Dashboard" subtab
4. The dashboard will load within an iframe

Alternatively, open `opex-dashboard.html` directly in a new tab for full-screen view.

## Usage Guide

### Filtering Data

1. **Audit Section**:
   - Enter AM name or outlet code in filter fields
   - Click "Apply Filters" to filter the table
   - Click "Clear" to reset filters

2. **STTK Section**:
   - Use AM, Outlet, and Month filters
   - Apply to narrow down problem areas

3. **CCTV Section**:
   - Filter by AM, Outlet, and Month
   - Use month filter in summaries for period analysis

### Viewing Details

1. **Audit Details**:
   - Click on any row in the audit table
   - Or click the "View Details" button
   - Modal will show detailed compliance breakdown
   - View TIDAK items with code + description
   - See count of issues for that outlet

### Sorting Data

- Click on any column header with the sort icon (↕️)
- First click: ascending order
- Second click: descending order
- Third click: reset to default order

### Understanding Metrics

1. **Audit Scoring**: Higher percentage = better compliance
2. **Stock Loss**: Negative values = loss (more negative = worse)
3. **Shrinkage Value**: Higher value = more problematic item
4. **Loss Sales**: Number of potential customers who left without buying
5. **Task Performance**: How many times staff performed each service task
6. **Loss Reasons**: Why customers didn't make a purchase

### Interpreting Leaderboards

- **Green badges**: Good performance (top performers, positive metrics)
- **Red badges**: Needs improvement (bottom performers, losses)
- **Yellow badges**: Average performance

## Data Update Schedule

The dashboard loads data in real-time from Google Sheets. To refresh data:

1. Click the "Refresh Data" button (top right)
2. Or reload the page
3. Data updates automatically reflect any changes made in the Google Sheet

## Troubleshooting

### Dashboard shows "Loading..." indefinitely

**Possible causes**:
- API key not configured or invalid
- Google Sheet not publicly accessible
- Network connection issues
- Incorrect sheet names or column mappings

**Solutions**:
1. Check browser console for error messages (F12)
2. Verify API key in `opex-config.js`
3. Ensure Google Sheet sharing is set to "Anyone with the link"
4. Check that sheet names match exactly (case-sensitive)

### Dashboard shows sample data

This means the API connection failed and fallback sample data is being used.

**Solutions**:
1. Replace `YOUR_API_KEY_HERE` with actual API key
2. Verify Google Sheets API is enabled in your project
3. Check API key restrictions allow Google Sheets API

### Missing or incorrect data

**Solutions**:
1. Verify column letters match your actual sheet structure
2. Check that all required sheets exist in the spreadsheet
3. Ensure data is in the expected format (dates, percentages, numbers)
4. Look for empty or malformed cells

### Filters not working

**Solutions**:
1. Clear filters and try again
2. Check that filter inputs match actual data (case-insensitive)
3. Refresh the page to reset all filters

## Technical Details

### Architecture

```
opex-dashboard.html         # Main HTML interface
├── opex-dashboard.js       # Core dashboard logic class
├── opex-config.js          # Configuration (API key, Sheet ID)
└── Google Sheets API       # Data source
```

### Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- IE11: Not supported (use modern browser)

### Performance

- Initial load: ~2-5 seconds (depending on data size)
- Refresh: ~1-3 seconds
- Filtering/Sorting: Instant (client-side)

### Security

- API key should be restricted to Google Sheets API only
- Consider using a backend proxy for production to hide API key
- Sheet should be view-only to prevent unauthorized modifications

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify all setup steps are completed correctly
3. Ensure data format matches the specifications
4. Contact your system administrator for API access issues

## Future Enhancements

Planned features:
- Export to Excel/PDF functionality
- Advanced analytics and trends over time
- Email alerts for threshold breaches
- Mobile-responsive improvements
- Real-time collaboration features
- Custom metric definitions
- Dashboard customization options

---

**Version**: 1.0.0  
**Last Updated**: March 17, 2026  
**Maintained by**: Apotek Alpro IT Team
