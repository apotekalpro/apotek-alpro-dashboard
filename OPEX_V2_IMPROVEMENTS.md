# OpEX Dashboard V2 - Improvements Summary

## Issues Fixed

### 1. ✅ Field Audit Table Filters Moved
- **OLD**: Filters at top of section
- **NEW**: Filters above "All Field Audit Records" table only
- **NEW**: Table renamed to "All Field Audit Records"
- **NEW**: Pagination added (15 rows per page with Next/Previous)

### 2. ✅ STTK Shrinkage Data Loading
- **FIXED**: Now correctly reads from STTK_SHRINKAGE sheet
- **Column Mapping**: A=Month, B=StoreName, C/D=Shrinkage values, G=AM
- **Filter**: Only shows non-zero values
- **Pagination**: 15 rows per page

### 3. ✅ Shrinkage Top 30 Items Data Loading  
- **FIXED**: Now correctly reads from Shrinkage_Items_Raw sheet
- **Column Mapping**: C=ItemCode, D=ItemName, E/F=Values
- **Sort**: By absolute value (largest first)
- **Limit**: Top 30 items only

### 4. ✅ CCTV Table Headers
- **FIXED**: Headers now read from Row 1 of sheet
- **Column Mapping**: A-Q as shown in sheet
- **NEW**: Filters added for AM, Outlet, Month
- **NEW**: Sorting on all columns
- **NEW**: Pagination (15 rows per page)

## Files Created

1. **opex-dashboard-v2.js** - Complete rewrite with:
   - Pagination system (15 rows per page)
   - Correct column mappings for all sheets
   - Proper data filtering
   - Enhanced error handling
   - Console logging for debugging

## Changes Needed in HTML

To integrate V2, update opex-dashboard.html:

1. Replace script reference:
```html
<script src="opex-dashboard-v2.js"></script>
```

2. Update initialization:
```javascript
opexDashboard = new OpexDashboardV2(OPEX_CONFIG.SHEET_ID, OPEX_CONFIG.API_KEY);
```

3. Add pagination divs:
```html
<!-- After audit table -->
<div id="auditPagination"></div>

<!-- After STTK table -->
<div id="sttkPagination"></div>

<!-- After CCTV table -->
<div id="cctvPagination"></div>
```

4. Move audit filters to above the "All Field Audit Records" section

## Data Column Mappings

### STTK_SHRINKAGE Sheet:
- A: Month  
- B: StoreName
- C: ShrinkageQty
- D: ShrinkageCost
- E: sourceFileId
- F: sourceFileName
- G: AM
- H: Outlet

### Shrinkage_Items_Raw Sheet:
- A: Month
- B: StoreName
- C: ItemCode
- D: ItemName
- E: Qty
- F: Cost

### CCTV_14H Sheet:
- Row 1: Headers
- A: Tgl Pengecekan (Check Date)
- B: Tgl Video (Video Date)
- C: Nama Toko (Outlet)
- D: AM
- E: Total Traffic
- G: Loss Sales
- H-L: Task metrics (Greeting, Offer Help, Info Product, Offer More, Closing)
- M-P: Loss reasons (No Staff, Staff Busy, No Stock, Others)
- Q: Month

## Testing Checklist

- [ ] STTK data loads correctly
- [ ] Shrinkage Top 30 shows items
- [ ] CCTV table displays with correct headers
- [ ] Pagination works on all tables
- [ ] Filters work on CCTV table
- [ ] Audit filters only affect audit table
- [ ] 15 rows per page on all tables
- [ ] Next/Previous buttons work

## Console Debugging

When loaded, you should see:
```
Initializing OpEX Dashboard V2...
Loading data from Google Sheets...
Processing STTK data, rows: X
Processed STTK records: Y
Processing Shrinkage data, rows: X  
Processed Shrinkage items: Y
Processing CCTV data, rows: X
CCTV Headers: [array of headers]
Processed CCTV records: Y
```

If data is empty, check:
1. Sheet names match exactly
2. Column letters are correct
3. API key is valid
4. Sheet is publicly accessible

---

**Created**: March 17, 2026  
**Version**: 2.0  
**Status**: Ready for integration
