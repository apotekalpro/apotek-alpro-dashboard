# v4.6.2-GB: Added Calculated GP Margin Column

## User Request

> "Area manager, their Area GP margin% should display (as now you already has their Area revenue at G and Area GP at H (But rename it as Outlet Total GP), so add a column to show Margin % (H/G in %)."

## Changes Implemented

### 1. Renamed Column
**Column H**: `Outlet GP (Rp)` → `Outlet Total GP (Rp)`

**Purpose**: Clearer naming to indicate this is the total GP amount (not margin percentage)

### 2. New Column Added
**New Column I**: `Calculated GP Margin (%)`

**Formula**: `(Outlet Total GP / Outlet Total Revenue) × 100`

**Purpose**: Show the calculated GP margin percentage for verification

**Display Logic**:
- **For AM**: (Area Total GP / Area Total Revenue) × 100
- **For BM/Alproean**: (Main Outlet GP / Main Outlet Revenue) × 100

## Updated Export Column Order

```
Column  | Name                          | Description
--------|-------------------------------|----------------------------------------
A       | Employee Name                 | Employee name
B       | Employee ID                   | Employee ID
C       | Role                          | Employee role
D       | Outlet                        | Outlet code(s)
E       | Remark                        | Additional info (outlets, GP margin)
F       | Personal Sales (Rp)           | Employee's personal sales
G       | Outlet Total Revenue (Rp)     | Total outlet/area sales
H       | Outlet Total GP (Rp)          | Total outlet/area GP (RENAMED)
I       | Calculated GP Margin (%)      | (H/G)×100 (NEW)
J       | Outlet Ops Target (Rp)        | Ops performance target
K       | Contribution Ratio (%)        | Personal sales / Outlet total
L       | GP Margin (%)                 | Original margin from Sales & GP
M       | Goal Bulanan                  | Goal hit status
N       | Goal Bulanan Target (Rp)      | Goal target amount
O       | Area Goal Bulanan             | AM area goal status
P       | Area Goal Bulanan Target (Rp) | AM area goal target
Q       | Original Incentive (Rp)       | Before all deductions
R       | Deduction Remarks             | Explanation of reductions
S       | AM Reward (Rp)                | AM reward amount
T       | BM Reward (Rp)                | BM reward amount
U       | Alproean Reward (Rp)          | Alproean reward amount
V       | Ops Reward Incentive (Rp)     | Ops reward total
W       | Goal Bulanan Incentive (Rp)   | Goal Bulanan total
X       | Final Incentive (Rp)          | Final amount after comparison
Y       | Incentive Type                | Ops Reward or Goal Bulanan
```

## Implementation Details

### Calculation Logic (lines 2005-2010)

```javascript
// Determine outlet revenue, GP, and Ops target to display
// For AM: Show total area revenue, GP, and Ops target
// For BM/Alproean: Show main outlet revenue, GP, and Ops target
const outletRevenue = isAM ? emp.amTotalRevenue : emp.mainOutletTotalRevenue;
const outletGP = isAM ? emp.amTotalGP : emp.mainOutletGP;
const outletOpsTarget = isAM ? emp.amAreaOpsTarget : emp.mainOutletOpsTarget;

// Calculate GP Margin %: (GP / Revenue) × 100
const calculatedGPMargin = outletRevenue > 0 
    ? (outletGP / outletRevenue) * 100 
    : 0;
```

### Export Data (lines 2011-2023)

```javascript
exportData.push([
    emp.employeeName,
    emp.employeeId,
    emp.role,
    outletDisplay,
    remark,
    emp.personalSales,
    outletRevenue,                      // G: Outlet Total Revenue
    outletGP,                           // H: Outlet Total GP (renamed)
    calculatedGPMargin.toFixed(2),      // I: Calculated GP Margin % (NEW)
    outletOpsTarget,                    // J: Outlet Ops Target
    avgContributionRatio.toFixed(2),
    avgGpMargin.toFixed(2),             // L: Original GP Margin
    // ... rest of columns
]);
```

## Examples

### Example 1: Area Manager

**Data**:
- Area Total Revenue (G): 450,000,000
- Area Total GP (H): 99,000,000
- Calculated GP Margin (I): 22.00%

**Calculation**:
```
Calculated GP Margin = (99,000,000 / 450,000,000) × 100
                     = 0.22 × 100
                     = 22.00%
```

**Purpose**: Verify the area-weighted GP margin used for incentive calculations

### Example 2: Branch Manager

**Data**:
- Main Outlet Revenue (G): 45,000,000
- Main Outlet GP (H): 11,385,000
- Calculated GP Margin (I): 25.30%

**Calculation**:
```
Calculated GP Margin = (11,385,000 / 45,000,000) × 100
                     = 0.253 × 100
                     = 25.30%
```

**Purpose**: Verify outlet GP margin used for incentive margin factor

### Example 3: Alproean

**Data**:
- Main Outlet Revenue (G): 30,000,000
- Main Outlet GP (H): 6,900,000
- Calculated GP Margin (I): 23.00%

**Calculation**:
```
Calculated GP Margin = (6,900,000 / 30,000,000) × 100
                     = 0.23 × 100
                     = 23.00%
```

**Purpose**: Shows GP margin triggers 70% margin factor (22-24.99% range)

## Verification Use Cases

### 1. AM Area GP Margin Verification

**Scenario**: AM has 11 outlets with mixed margins

**Export Shows**:
```
Outlet Total Revenue: 550,000,000    (sum of all 11 outlets)
Outlet Total GP: 121,000,000         (sum of all 11 outlets)
Calculated GP Margin: 22.00%         ((121M / 550M) × 100)
```

**Verify Against**:
- Remark: "Total Outlets: 11 | Area GP: 22.00%" ✓ Should match
- GP Margin Factor: 70% (for 22-24.99% range) ✓ Correct factor applied

### 2. Margin Factor Deduction Verification

**Scenario**: BM with GP margin in 70% factor range

**Export Shows**:
```
Outlet Total Revenue: 45,000,000
Outlet Total GP: 10,350,000
Calculated GP Margin: 23.00%         ((10.35M / 45M) × 100)
Original Incentive: 900,000
Deduction Remarks: Ops GP Margin 23.00% → 70% factor
Final Incentive: 630,000
```

**Verification**:
- Calculated GP Margin: 23.00% → Falls in 22-24.99% range ✓
- Margin Factor: 70% ✓
- Deduction: 900,000 × 0.7 = 630,000 ✓

### 3. Perfect Margin Verification

**Scenario**: Employee with GP ≥25% (no margin deduction)

**Export Shows**:
```
Outlet Total Revenue: 50,000,000
Outlet Total GP: 13,000,000
Calculated GP Margin: 26.00%         ((13M / 50M) × 100)
Original Incentive: 1,000,000
Deduction Remarks: (empty)
Final Incentive: 1,000,000
```

**Verification**:
- Calculated GP Margin: 26.00% → ≥25% ✓
- Margin Factor: 100% (no deduction) ✓
- Original = Final ✓

## Benefits

### 1. Complete Transparency
Users can now:
- **See total amounts**: Revenue and GP in absolute Rp
- **Verify calculations**: (GP / Revenue) × 100 shown directly
- **Cross-check margins**: Compare Calculated vs Original GP Margin

### 2. Easy Verification
Single row provides:
- **Input data**: Revenue (G) and GP (H)
- **Calculated result**: Margin % (I)
- **Expected outcome**: Margin factor application

### 3. AM Area Margin Visibility
For Area Managers:
- **Area totals visible**: Sum across all 11 outlets
- **Weighted margin**: (Total GP / Total Revenue) × 100
- **Matches remark**: Verify against "Area GP: XX.XX%" in Remark column

### 4. Audit Trail
Management can:
- **Verify margin ranges**: 23% should trigger 70% factor
- **Check calculations**: All inputs and formula visible
- **Validate deductions**: Margin % → Factor % → Deduction amount

## GP Margin Factor Bands Reference

| Calculated GP Margin | Margin Factor | Deduction |
|---------------------|---------------|-----------|
| ≥25.00% | 100% (1.0) | 0% |
| 22.00% - 24.99% | 70% (0.7) | 30% |
| 20.00% - 21.99% | 50% (0.5) | 50% |
| <20.00% | 0% (0.0) | 100% |

**Example Verification**:
- Calculated GP Margin: 23.50%
- Expected Factor: 70% (falls in 22-24.99% range)
- Deduction Remark: "Ops GP Margin 23.50% → 70% factor"
- Verification: ✓ Correct band applied

## Files Modified

1. `/home/user/webapp/assets/js/incentive-calculator.js`
   - Version updated to v4.6.2-GB
   - Renamed column H header to "Outlet Total GP (Rp)"
   - Added column I: "Calculated GP Margin (%)"
   - Calculate margin: (GP / Revenue) × 100
   - Export calculated margin with 2 decimal places

2. `/home/user/webapp/index.html`
   - Version badge updated to v4.6.2-GB
   - Cache-busting parameter updated to v=4.6.2

3. `/home/user/webapp/www/` (via build)
   - Production files updated

## Summary

v4.6.2-GB enhances export with calculated GP margin visibility:

✅ **Renamed**: "Outlet GP" → "Outlet Total GP" (clearer naming)  
✅ **New Column**: "Calculated GP Margin %" = (GP / Revenue) × 100  
✅ **AM Support**: Shows area-weighted margin across all outlets  
✅ **Verification**: Easy cross-check against margin factors and deductions  
✅ **Transparency**: Complete formula inputs and result visible in one row

Area Managers can now see their area GP margin calculated from total revenue and GP amounts in the export!
