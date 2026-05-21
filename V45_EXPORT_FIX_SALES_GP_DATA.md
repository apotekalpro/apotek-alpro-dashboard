# v4.5-GB: Export Fix + Sales & GP Data Addition

## Critical Issues Fixed

### Issue 1: Export Crash - `Cannot access 'isAM' before initialization`

**Error**: `Uncaught ReferenceError: Cannot access 'isAM' before initialization at incentive-calculator.js:1829:13`

**Root Cause**: The `isAM` variable was referenced at line 1829 but defined later at line 1859.

**Solution**: Moved the role determination code earlier (now at line 1828) before it's used in the outlet display logic.

```javascript
// BEFORE (Wrong - isAM used before definition)
let outletDisplay = '';
if (isAM && emp.allMappedOutlets.length > 0) {  // Line 1829 - ERROR!
    // ...
}
// ...
const role = (emp.role || '').toUpperCase();  // Line 1858
const isAM = role.includes('AREA MANAGER') && !role.includes('BRANCH');  // Line 1859

// AFTER (Fixed - isAM defined before use)
const role = (emp.role || '').toUpperCase();  // Line 1828
const isAM = role.includes('AREA MANAGER') && !role.includes('BRANCH');  // Line 1829

let outletDisplay = '';
if (isAM && emp.allMappedOutlets.length > 0) {  // Now isAM is already defined
    // ...
}
```

### Issue 2: Missing Sales & GP Data in Export

**User Requirement**: "In your exported report, please also include data of that outlet from Sales & GP. Its revenue & margin. So I know by looking at that report will do."

**Solution**: Added two new columns to the export:
1. **Outlet Total Revenue (Rp)**: Total sales from Sales & GP report
2. **Outlet GP (Rp)**: Total gross profit from Sales & GP report

**Data Source Logic**:
- **For AM**: Shows total area revenue and GP (sum of all mapped outlets)
- **For BM/Alproean**: Shows main outlet revenue and GP

## Implementation Details

### New Fields Added

#### 1. Aggregation Structure (lines 1701-1724)
```javascript
aggregatedResults[key] = {
    // ... existing fields ...
    mainOutletTotalRevenue: 0,  // Track total revenue for main outlet (from Sales & GP)
    mainOutletGP: 0,  // Track total GP for main outlet (from Sales & GP)
    // ... for AM ...
    amTotalRevenue: 0,  // For AM total area revenue (from Sales & GP)
    amTotalGP: 0,  // For AM total area GP (from Sales & GP)
};
```

#### 2. Outlet Sales Map Enhancement (lines 1732-1738)
```javascript
if (!aggregatedResults[key].outletSalesMap[currentOutlet]) {
    aggregatedResults[key].outletSalesMap[currentOutlet] = {
        sales: 0,  // Personal sales
        gpMargin: currentGPMargin,
        totalRevenue: currentTotalRevenue,  // From Sales & GP report
        gp: currentGP  // From Sales & GP report
    };
}
```

#### 3. AM Area Totals Calculation (lines 1765-1779)
```javascript
// Calculate total AM area revenue and GP from Sales & GP report
let totalRevenue = 0;
let totalGP = 0;
mappedOutlets.forEach(outlet => {
    const salesData = this.data.salesGpData.find(sales => 
        this.outletMatch(sales.outlet, outlet)
    );
    if (salesData) {
        totalRevenue += salesData.totalSales || 0;
        totalGP += salesData.gp || 0;
    }
});
aggregatedResults[key].amTotalRevenue = totalRevenue;
aggregatedResults[key].amTotalGP = totalGP;
```

#### 4. Main Outlet Data Tracking (lines 1797-1820)
```javascript
// Determine main outlet for each employee (outlet with highest sales)
Object.values(aggregatedResults).forEach(emp => {
    if (Object.keys(emp.outletSalesMap).length > 0) {
        let maxSales = 0;
        let mainOutlet = '';
        let mainGPMargin = 0;
        let mainTotalRevenue = 0;
        let mainGP = 0;
        
        Object.entries(emp.outletSalesMap).forEach(([outlet, data]) => {
            if (data.sales > maxSales) {
                maxSales = data.sales;
                mainOutlet = outlet;
                mainGPMargin = data.gpMargin;
                mainTotalRevenue = data.totalRevenue;
                mainGP = data.gp;
            }
        });
        
        emp.mainOutlet = mainOutlet;
        emp.mainOutletGPMargin = mainGPMargin;
        emp.mainOutletTotalRevenue = mainTotalRevenue;
        emp.mainOutletGP = mainGP;
    }
});
```

### Export Headers Updated (lines 1667-1687)

**Old Headers** (before v4.5):
```
Employee Name, Employee ID, Role, Outlet, Remark, Personal Sales (Rp), 
Contribution Ratio (%), GP Margin (%), Goal Bulanan, ...
```

**New Headers** (v4.5):
```
Employee Name, Employee ID, Role, Outlet, Remark, Personal Sales (Rp), 
Outlet Total Revenue (Rp), Outlet GP (Rp), 
Contribution Ratio (%), GP Margin (%), Goal Bulanan, ...
```

### Export Data Logic (lines 1871-1896)

```javascript
// Determine outlet revenue and GP to display
// For AM: Show total area revenue and GP
// For BM/Alproean: Show main outlet revenue and GP
const outletRevenue = isAM ? emp.amTotalRevenue : emp.mainOutletTotalRevenue;
const outletGP = isAM ? emp.amTotalGP : emp.mainOutletGP;

exportData.push([
    emp.employeeName,
    emp.employeeId,
    emp.role,
    outletDisplay,
    remark,
    emp.personalSales,
    outletRevenue,  // NEW: Outlet Total Revenue from Sales & GP
    outletGP,  // NEW: Outlet GP from Sales & GP
    avgContributionRatio.toFixed(2),
    avgGpMargin.toFixed(2),
    // ... rest of fields
]);
```

## Data Flow Verification

### For Area Manager (e.g., LELIANA OKTAVIA SARAGIH)

**Input**:
- AM Mapping file: 11 outlets assigned
- Sales & GP report: Total sales and GP for each outlet

**Processing**:
1. Get all 11 outlets from AM Mapping
2. For each outlet, fetch Sales & GP data
3. Sum total revenue: `Σ(salesData.totalSales)` for all 11 outlets
4. Sum total GP: `Σ(salesData.gp)` for all 11 outlets

**Export Output**:
- **Outlet**: All 11 outlets listed
- **Outlet Total Revenue**: Sum of all 11 outlets' revenue
- **Outlet GP**: Sum of all 11 outlets' GP
- **GP Margin %**: Area weighted margin (already displayed in remark)
- **Remark**: "Total Outlets: 11 | Area GP: XX.XX%"

### For BM/Alproean (e.g., YUYU SRI RAHAYU)

**Input**:
- Personal Sales: Multiple outlets (BTTSBB1, BTTSDL1)
- Sales & GP report: Total sales and GP for each outlet

**Processing**:
1. Determine main outlet (highest personal sales)
2. Fetch Sales & GP data for main outlet only
3. Get `salesData.totalSales` for main outlet
4. Get `salesData.gp` for main outlet

**Export Output**:
- **Outlet**: Main outlet code (e.g., BTTSBB1)
- **Personal Sales**: Employee's personal sales
- **Outlet Total Revenue**: Main outlet's total sales (from Sales & GP)
- **Outlet GP**: Main outlet's total GP (from Sales & GP)
- **Contribution Ratio**: (Personal Sales / Outlet Total Revenue) × 100
- **Remark**: "Main Outlet: BTTSBB1 (GP: XX.XX%)"

## Example Export Data

### AM Example (LELIANA OKTAVIA SARAGIH)
```
Employee Name: LELIANA OKTAVIA SARAGIH
Employee ID: 240210I
Role: AREA MANAGER
Outlet: JKJBPP1, JKJPMR1, JKJBTW1, ... [11 outlets]
Remark: Total Outlets: 11 | Area GP: 23.45%
Personal Sales: 15,000,000
Outlet Total Revenue: 550,000,000  ← Sum of all 11 outlets
Outlet GP: 129,000,000  ← Sum of all 11 outlets
Contribution Ratio: 2.73%
GP Margin: 23.45%
```

### BM/Alproean Example (YUYU SRI RAHAYU)
```
Employee Name: YUYU SRI RAHAYU
Employee ID: 220513E
Role: ALPROEAN
Outlet: BTTSBB1, BTTSDL1 [2 outlets]
Remark: Main Outlet: BTTSBB1 (GP: 25.30%)
Personal Sales: 12,500,000
Outlet Total Revenue: 45,000,000  ← Main outlet (BTTSBB1) total from Sales & GP
Outlet GP: 11,385,000  ← Main outlet (BTTSBB1) GP from Sales & GP
Contribution Ratio: 27.78%
GP Margin: 25.30%
```

## Benefits

### 1. Complete Financial Picture
Users can now see:
- **Personal contribution** (Personal Sales)
- **Outlet performance** (Total Revenue, GP)
- **Contribution percentage** (calculated ratio)
- **Profitability** (GP Margin)

### 2. Easy Verification
By looking at one row, users can verify:
- If outlet hit Goal Bulanan target (compare Total Revenue vs Goal Target)
- Employee's contribution significance (Contribution Ratio >10%?)
- Outlet profitability (GP Margin for margin factor)
- Calculation correctness (all data sources visible)

### 3. Data Transparency
All key data sources visible in one export:
- ✅ Personal Sales data (from Personal Sales report)
- ✅ Outlet total sales (from Sales & GP report)
- ✅ Outlet GP (from Sales & GP report)
- ✅ Goal/Ops targets (from Outlet Mapping)
- ✅ Calculated results (incentives, final amounts)

## Testing Checklist

- [x] Export no longer crashes with `isAM` error
- [x] New columns "Outlet Total Revenue" and "Outlet GP" added
- [x] AM shows total area revenue/GP (sum of all 11 outlets)
- [x] BM/Alproean shows main outlet revenue/GP only
- [x] Data comes from Sales & GP report (`salesData.totalSales`, `salesData.gp`)
- [x] All existing columns remain unchanged
- [x] Export file downloads successfully
- [x] Data matches expectations for AM and BM/Alproean

## Files Modified

1. `/home/user/webapp/assets/js/incentive-calculator.js`
   - Fixed `isAM` initialization order (moved to line 1828)
   - Added `mainOutletTotalRevenue` and `mainOutletGP` fields
   - Added `amTotalRevenue` and `amTotalGP` fields
   - Enhanced `outletSalesMap` to track revenue and GP
   - Calculate AM area totals from Sales & GP data
   - Track main outlet revenue/GP during aggregation
   - Added two new export columns
   - Export logic displays correct data per role

2. `/home/user/webapp/index.html`
   - Version badge updated to v4.5-GB
   - Cache-busting parameter updated to v=4.5

3. `/home/user/webapp/www/` (via build)
   - Production files updated

## Version History

- **v4.0-GB**: Initial Goal Bulanan implementation
- **v4.1-GB**: AM calculation fixes, weighted GP margin
- **v4.2-GB**: Contribution ratio storage, 50% Ops cut
- **v4.3-GB**: Main outlet selection, GP display fixes
- **v4.4-GB**: AM outlet display from Mapping file
- **v4.5-GB**: Export crash fix + Sales & GP data columns ✅ **Current**

## Summary

v4.5-GB fixes the export crash and adds critical Sales & GP data visibility:

1. ✅ **Export works** - Fixed `isAM` initialization error
2. ✅ **Sales & GP data visible** - Added Total Revenue and GP columns
3. ✅ **Role-specific display** - AM shows area totals, BM/Alproean shows main outlet
4. ✅ **Complete transparency** - All data sources visible for verification
5. ✅ **Easy validation** - Users can verify calculations by looking at one export row
