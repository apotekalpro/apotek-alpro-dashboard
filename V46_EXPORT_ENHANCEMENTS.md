# v4.6-GB: Export Enhancements - Ops Target & Deduction Tracking

## User Requirements Implemented

1. ✅ **Add Ops Target column** - Show outlet's Ops target from Outlet Mapping
2. ✅ **Add Deduction Remarks** - Explain why incentive was reduced
3. ✅ **Add Original Incentive column** - Show incentive before any deductions

## New Export Columns

### 1. Outlet Ops Target (Rp)
**Data Source**: Outlet Mapping file (`outletMapping.target`)

**Display Logic**:
- **For AM**: Sum of all mapped outlets' Ops targets
- **For BM/Alproean**: Main outlet's Ops target only

**Purpose**: Shows the performance target used for Ops Reward calculations

### 2. Original Incentive (Rp)
**Calculation**: Sum of AM + BM + Alproean rewards **before** any deductions

**Captured Before**:
- 50% cut (when Goal Bulanan = NO)
- Margin factor reduction (when GP margin < 25%)
- Goal vs Ops comparison

**Purpose**: Reference point to see how much was deducted

### 3. Deduction Remarks
**Automatically Generated**: Explains why incentive was reduced

**Possible Remarks**:
1. `50% Ops cut (Goal Bulanan = NO)` - When outlet didn't hit Goal Bulanan target
2. `GP Margin XX.XX% → YY% factor` - When GP margin below 25% reduces incentive
3. Combined: `50% Ops cut (Goal Bulanan = NO); GP Margin 22.5% → 70% factor`

**Purpose**: Complete transparency on deductions applied

## Updated Export Column Order

```
1.  Employee Name
2.  Employee ID
3.  Role
4.  Outlet
5.  Remark
6.  Personal Sales (Rp)
7.  Outlet Total Revenue (Rp)
8.  Outlet GP (Rp)
9.  Outlet Ops Target (Rp)              ← NEW
10. Contribution Ratio (%)
11. GP Margin (%)
12. Goal Bulanan
13. Goal Bulanan Target (Rp)
14. Area Goal Bulanan
15. Area Goal Bulanan Target (Rp)
16. Original Incentive (Rp)             ← NEW
17. Deduction Remarks                   ← NEW
18. AM Reward (Rp)
19. BM Reward (Rp)
20. Alproean Reward (Rp)
21. Ops Reward Incentive (Rp)
22. Goal Bulanan Incentive (Rp)
23. Final Incentive (Rp)
24. Incentive Type
```

## Implementation Details

### Ops Target Tracking

#### 1. During Aggregation (lines 1741-1750)
```javascript
// Get Ops target from outlet mapping
const currentOpsTarget = emp.outletMapping ? emp.outletMapping.target : 0;

if (!aggregatedResults[key].outletSalesMap[currentOutlet]) {
    aggregatedResults[key].outletSalesMap[currentOutlet] = {
        sales: 0,
        gpMargin: currentGPMargin,
        totalRevenue: currentTotalRevenue,
        gp: currentGP,
        opsTarget: currentOpsTarget  // NEW: Track Ops target
    };
}
```

#### 2. AM Area Ops Target Calculation (lines 1779-1800)
```javascript
// Calculate total AM area revenue, GP, and Ops target
let totalRevenue = 0;
let totalGP = 0;
let totalOpsTarget = 0;  // NEW
mappedOutlets.forEach(outlet => {
    const salesData = this.data.salesGpData.find(sales => 
        this.outletMatch(sales.outlet, outlet)
    );
    const outletMapping = this.data.outletMappingData.find(mapping => 
        this.outletMatch(mapping.outlet, outlet)
    );
    if (salesData) {
        totalRevenue += salesData.totalSales || 0;
        totalGP += salesData.gp || 0;
    }
    if (outletMapping) {
        totalOpsTarget += outletMapping.target || 0;  // NEW
    }
});
aggregatedResults[key].amAreaOpsTarget = totalOpsTarget;
```

#### 3. Main Outlet Ops Target (lines 1812-1836)
```javascript
// Determine main outlet (highest personal sales)
let mainOpsTarget = 0;  // NEW

Object.entries(emp.outletSalesMap).forEach(([outlet, data]) => {
    if (data.sales > maxSales) {
        maxSales = data.sales;
        mainOutlet = outlet;
        mainGPMargin = data.gpMargin;
        mainTotalRevenue = data.totalRevenue;
        mainGP = data.gp;
        mainOpsTarget = data.opsTarget;  // NEW
    }
});

emp.mainOutletOpsTarget = mainOpsTarget;  // NEW
```

### Original Incentive Tracking

#### 1. Before 50% Cut (lines 1247-1263)
```javascript
matchedEmployees.forEach(emp => {
    // Store original Ops rewards before any cuts
    const originalAM = emp.amReward || 0;
    const originalBM = emp.bmReward || 0;
    const originalAlproean = emp.alproeanReward || 0;
    emp.originalIncentive = originalAM + originalBM + originalAlproean;  // NEW
    
    if (emp.goalBulananHit === 'NO') {
        // Cut Ops Rewards by 50%
        emp.alproeanReward = emp.alproeanReward * 0.5;
        emp.bmReward = emp.bmReward * 0.5;
        emp.amReward = emp.amReward * 0.5;
        
        // Add deduction remark
        emp.deductionRemark = '50% Ops cut (Goal Bulanan = NO)';  // NEW
    }
});
```

### Deduction Remarks Generation

#### 1. 50% Ops Cut Remark (line 1260)
```javascript
if (emp.goalBulananHit === 'NO') {
    emp.deductionRemark = '50% Ops cut (Goal Bulanan = NO)';
}
```

#### 2. Margin Factor Remark for AM (lines 1381-1388)
```javascript
// After AM Goal Bulanan calculation
if (marginFactor < 1.0) {
    const existingRemark = emp.deductionRemark || '';
    const marginRemark = `GP Margin ${areaGPMargin.toFixed(2)}% → ${(marginFactor * 100).toFixed(0)}% factor`;
    emp.deductionRemark = existingRemark 
        ? `${existingRemark}; ${marginRemark}` 
        : marginRemark;
}
```

#### 3. Margin Factor Remark for BM/Alproean (lines 1436-1443)
```javascript
// After BM/Alproean Goal Bulanan calculation
if (marginFactor < 1.0) {
    const existingRemark = emp.deductionRemark || '';
    const marginRemark = `GP Margin ${outletGPMargin.toFixed(2)}% → ${(marginFactor * 100).toFixed(0)}% factor`;
    emp.deductionRemark = existingRemark 
        ? `${existingRemark}; ${marginRemark}` 
        : marginRemark;
}
```

#### 4. Aggregation (lines 1817-1821)
```javascript
// Collect deduction remarks from all outlet entries
if (emp.deductionRemark && !aggregatedResults[key].deductionRemarks.includes(emp.deductionRemark)) {
    aggregatedResults[key].deductionRemarks.push(emp.deductionRemark);
}
```

#### 5. Export Formatting (lines 1911-1913)
```javascript
// Format deduction remarks for export
const deductionRemark = emp.deductionRemarks.length > 0 
    ? emp.deductionRemarks.join('; ') 
    : '';
```

## GP Margin Factor Bands

| GP Margin Range | Margin Factor | Display | Impact |
|----------------|---------------|---------|--------|
| ≥25% | 1.0 | 100% factor | No reduction |
| 22-24.99% | 0.7 | 70% factor | 30% reduction |
| 20-21.99% | 0.5 | 50% factor | 50% reduction |
| <20% | 0.0 | 0% factor | 100% reduction (no incentive) |

## Example Export Data

### Example 1: AM with Multiple Deductions

```
Employee Name: LELIANA OKTAVIA SARAGIH
Employee ID: 240210I
Role: AREA MANAGER
Outlet: JKJBPP1, JKJPMR1, JKJBTW1, ... [11 outlets]
Personal Sales: 15,000,000
Outlet Total Revenue: 450,000,000  (area total)
Outlet GP: 99,000,000  (area total)
Outlet Ops Target: 500,000,000  (area total) ← NEW
GP Margin: 22.00%
Original Incentive: 6,600,000  ← NEW (before deductions)
Deduction Remarks: 50% Ops cut (Goal Bulanan = NO); GP Margin 22.00% → 70% factor ← NEW
Final Incentive: 2,310,000  (Original → 50% cut → 70% margin factor)
```

**Calculation Breakdown**:
1. **Base**: 100,000 × 11 outlets × 6 month = 6,600,000
2. **Original**: 6,600,000 (stored)
3. **50% cut**: 6,600,000 × 0.5 = 3,300,000 (Goal = NO)
4. **Margin 70%**: 3,300,000 × 0.7 = 2,310,000 (GP 22% → 70% factor)
5. **Final**: 2,310,000

**Deduction**: 6,600,000 - 2,310,000 = **4,290,000 reduced** (65% total reduction)

### Example 2: BM with Margin Factor Only

```
Employee Name: YUYU SRI RAHAYU
Employee ID: 220513E
Role: BRANCH MANAGER
Outlet: BTTSBB1, BTTSDL1 [2 outlets]
Main Outlet: BTTSBB1
Personal Sales: 12,500,000
Outlet Total Revenue: 45,000,000  (main outlet)
Outlet GP: 10,125,000  (main outlet)
Outlet Ops Target: 50,000,000  (main outlet) ← NEW
GP Margin: 22.50%
Goal Bulanan: YES
Original Incentive: 900,000  ← NEW
Deduction Remarks: GP Margin 22.50% → 70% factor ← NEW
Final Incentive: 630,000  (900,000 × 0.7)
```

**Calculation Breakdown**:
1. **Base**: 100,000 × 6 month = 600,000 (Alproean) + 300,000 (BM bonus)
2. **Original**: 900,000 (stored)
3. **No 50% cut**: Goal Bulanan = YES, so no reduction
4. **Margin 70%**: 900,000 × 0.7 = 630,000 (GP 22.5% → 70% factor)
5. **Final**: 630,000

**Deduction**: 900,000 - 630,000 = **270,000 reduced** (30% reduction)

### Example 3: Alproean with No Deductions

```
Employee Name: JOHN DOE
Employee ID: 230101A
Role: ALPROEAN
Outlet: JKJABC1
Personal Sales: 8,500,000
Outlet Total Revenue: 30,000,000
Outlet GP: 7,800,000
Outlet Ops Target: 28,000,000 ← NEW
GP Margin: 26.00%
Goal Bulanan: YES
Original Incentive: 600,000 ← NEW
Deduction Remarks: (empty) ← NEW (no deductions)
Final Incentive: 600,000  (no reduction)
```

**Calculation Breakdown**:
1. **Base**: 100,000 × 6 month = 600,000
2. **Original**: 600,000 (stored)
3. **No 50% cut**: Goal Bulanan = YES
4. **No margin factor**: GP 26% ≥ 25% → 100% factor (1.0)
5. **Final**: 600,000

**Deduction**: 0 (no reduction)

## Benefits

### 1. Complete Transparency
Users can now see:
- **Starting point**: Original incentive before deductions
- **Deduction reasons**: Explicit remarks explaining reductions
- **Performance context**: Ops target alongside actual revenue
- **Final outcome**: How deductions affected final incentive

### 2. Easy Verification
By looking at one export row, users can:
- Verify if outlet hit Ops target (Revenue vs Ops Target)
- Understand why incentive was reduced (Deduction Remarks)
- Calculate deduction impact (Original - Final = Total Deduction)
- See margin factor effect (GP Margin → Factor percentage)

### 3. Financial Analysis
Management can analyze:
- Total potential incentives (sum of Original Incentive)
- Total deductions (Original - Final across all employees)
- Impact of Goal Bulanan program (50% cut frequency)
- Impact of margin performance (margin factor distribution)

## Deduction Scenarios Summary

| Scenario | Goal Bulanan | GP Margin | Deduction Remarks | Example Calculation |
|----------|-------------|-----------|-------------------|---------------------|
| **Best Case** | YES | ≥25% | (empty) | 600k → 600k (0% reduction) |
| **Margin Only** | YES | 22-24.99% | GP Margin 23% → 70% factor | 600k → 420k (30% reduction) |
| **Goal Cut Only** | NO | ≥25% | 50% Ops cut (Goal Bulanan = NO) | 600k → 300k (50% reduction) |
| **Both Deductions** | NO | 22-24.99% | 50% Ops cut...; GP Margin 23% → 70% | 600k → 50% → 70% = 210k (65% reduction) |
| **Worst Case** | NO | <20% | 50% Ops cut...; GP Margin 18% → 0% | 600k → 0k (100% reduction) |

## Testing Checklist

- [x] Ops Target column added to export
- [x] AM shows total area Ops target (sum of all outlets)
- [x] BM/Alproean shows main outlet Ops target
- [x] Original Incentive captured before 50% cut
- [x] Deduction Remarks generated for 50% cut
- [x] Deduction Remarks generated for margin factor
- [x] Multiple remarks combined with semicolon
- [x] Export shows all new columns in correct order
- [x] All existing columns remain unchanged

## Files Modified

1. `/home/user/webapp/assets/js/incentive-calculator.js`
   - Version updated to v4.6-GB
   - Added `mainOutletOpsTarget`, `amAreaOpsTarget` fields
   - Added `originalIncentive`, `deductionRemarks` fields
   - Track Ops target during aggregation
   - Calculate AM area Ops target from Mapping
   - Store original incentive before cuts
   - Generate deduction remarks for 50% cut and margin factor
   - Added 3 new export columns

2. `/home/user/webapp/index.html`
   - Version badge updated to v4.6-GB
   - Cache-busting parameter updated to v=4.6

3. `/home/user/webapp/www/` (via build)
   - Production files updated

## Version History

- **v4.0-GB**: Initial Goal Bulanan implementation
- **v4.1-GB**: AM calculation fixes, weighted GP margin
- **v4.2-GB**: Contribution ratio storage, 50% Ops cut
- **v4.3-GB**: Main outlet selection, GP display fixes
- **v4.4-GB**: AM outlet display from Mapping file
- **v4.5-GB**: Export crash fix + Sales & GP data columns
- **v4.6-GB**: Ops target + deduction tracking + original incentive ✅ **Current**

## Summary

v4.6-GB enhances export transparency with complete deduction tracking:

1. ✅ **Ops Target visible** - Shows performance benchmark
2. ✅ **Original Incentive** - Shows starting point before deductions
3. ✅ **Deduction Remarks** - Explains every reduction applied
4. ✅ **Complete audit trail** - From original to final incentive
5. ✅ **Easy analysis** - Management can analyze deduction patterns
