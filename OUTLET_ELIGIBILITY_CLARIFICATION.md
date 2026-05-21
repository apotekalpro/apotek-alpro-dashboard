# Outlet Eligibility and Data Flow Clarification

## Issue Reported

After merging PR #157, user found that the calculation was based purely on personal sales data, but the correct flow should be:

1. **Outlet-level determination**: Use Sales & GP report total sales to compare against Goal or Ops targets
2. **Distribution**: THEN use personal sales for contribution ratio and individual distribution
3. **AM outlet count**: Must come from AM Mapping file, NOT from personal sales appearances

## Current Implementation Status

### ✅ What's Already Correct (v4.3 onwards)

#### 1. Outlet Eligibility Logic
**Location**: `incentive-calculator.js` lines 746-791

```javascript
// Check Goal Bulanan: Compare outlet's actual Net Sales vs Goal Bulanan target
if (this.data.goalBulananData && salesData && personalSales) {
    const goalTarget = this.findGoalBulananForOutlet(outletCode);
    if (goalTarget > 0) {
        goalBulananTarget = goalTarget;
        goalBulananAchievement = (salesData.totalSales / goalTarget) * 100;
        
        // Calculate employee's contribution ratio to this outlet
        contributionRatio = salesData.totalSales > 0 
            ? (personalSales.personalSales / salesData.totalSales) * 100 
            : 0;
        
        // Employee gets YES only if:
        // 1. Outlet hit goal (achievement >= 100%), AND
        // 2. Employee contribution > 10%
        const outletHitGoal = goalBulananAchievement >= 100;
        const significantContribution = contributionRatio > 10;
        
        goalBulananHit = (outletHitGoal && significantContribution) ? 'YES' : 'NO';
    }
}
```

**Status**: ✅ **CORRECT**
- Uses `salesData.totalSales` from Sales & GP report
- Compares against `goalTarget` from Goal Bulanan data
- Personal sales only used for contribution ratio calculation

#### 2. AM Calculation Using Mapping Data
**Location**: `incentive-calculator.js` lines 1277-1328

```javascript
this.data.outletMappingData.forEach(mapping => {
    const amName = this.toSafeString(mapping.areaManager);
    if (!amName) return;
    
    if (!amAreas[amName]) {
        amAreas[amName] = {
            amName: amName,
            totalOutletsInMapping: 0,  // Total outlets assigned to AM in Mapping file
            outletsWithGoal: [],
            outletsHitGoal: 0,
            totalRevenue: 0,
            totalGP: 0
        };
    }
    
    // Count ALL outlets in mapping (this is the total outlet count for AM)
    amAreas[amName].totalOutletsInMapping++;
    
    // Find sales data for this outlet
    const salesData = this.data.salesGpData.find(sales => 
        this.outletMatch(sales.outlet, mapping.outlet)
    );
    
    // Accumulate revenue and GP for area-level margin calculation
    if (salesData) {
        amAreas[amName].totalRevenue += salesData.totalSales || 0;
        amAreas[amName].totalGP += salesData.gp || 0;
    }
});
```

**Status**: ✅ **CORRECT**
- Uses `outletMappingData` as authoritative source
- Counts ALL outlets assigned to AM (11 outlets, not just 3)
- Gets total sales and GP from `salesGpData` (Sales & GP report)

#### 3. Sales & GP Data Usage
**Location**: Multiple sections in `incentive-calculator.js`

```javascript
// Line 733-735: Match sales data by outlet code
const salesData = this.data.salesGpData.find(sales => 
    this.outletMatch(sales.outlet, outletCode)
);

// Line 761: Use total sales for Goal achievement
goalBulananAchievement = (salesData.totalSales / goalTarget) * 100;

// Line 1305-1306: Accumulate for AM area margin
amAreas[amName].totalRevenue += salesData.totalSales || 0;
amAreas[amName].totalGP += salesData.gp || 0;

// Line 1352-1354: Calculate area GP margin
const areaGPMargin = amArea.totalRevenue > 0
    ? (amArea.totalGP / amArea.totalRevenue) * 100
    : 0;
```

**Status**: ✅ **CORRECT**
- Total sales from `salesData.totalSales` (Sales & GP report)
- GP margin from `salesData.gp` and `salesData.gpMargin`
- Used for outlet-level eligibility and AM area calculations

### ❌ What Was Wrong (Fixed in v4.4)

#### AM Outlet Display
**Problem**: Export was showing only 3 outlets (from personal sales) instead of 11 (from Mapping)

**Root Cause**: Export aggregation only counted outlets where AM had personal sales entries

**Fix in v4.4**:
```javascript
// For AM: Get ALL mapped outlets from Outlet Mapping file
if (aggregatedResults[key].allMappedOutlets.length === 0) {
    const amName = this.toSafeString(emp.employee.employeeName);
    const mappedOutlets = this.data.outletMappingData
        .filter(mapping => this.toSafeString(mapping.areaManager) === amName)
        .map(mapping => mapping.outlet);
    aggregatedResults[key].allMappedOutlets = mappedOutlets;
}

// Display logic
if (isAM && emp.allMappedOutlets.length > 0) {
    outletDisplay = emp.allMappedOutlets.length > 1 
        ? emp.allMappedOutlets.join(', ') + ` [${emp.allMappedOutlets.length} outlets]`
        : emp.allMappedOutlets[0];
}
```

**Status**: ✅ **FIXED in v4.4**

## Data Sources and Usage

| Data Element | Source File | Field Name | Usage |
|-------------|-------------|------------|-------|
| **Outlet Total Sales** | Sales & GP Report | `totalSales` | Outlet eligibility vs targets |
| **Outlet GP Margin** | Sales & GP Report | `gpMargin`, `gp` | Margin factor calculation |
| **Outlet Target** | Outlet Mapping | `target` | Ops reward achievement % |
| **Goal Bulanan Target** | Outlet Mapping (Goal Bulanan sheet) | Goal amount | Goal achievement % |
| **Personal Sales** | Personal Sales Report | `personalSales` | Contribution ratio, distribution |
| **AM Outlet Assignment** | Outlet Mapping (AM Mapping sheet) | All outlets under AM | AM outlet count |
| **Employee Role** | Active Alproean List | `role` | Determine AM/BM/Alproean |

## Calculation Flow

### 1. Outlet Eligibility Determination

```
Sales & GP Total Sales  →  Compare vs Target  →  Outlet Qualifies?
         ↓                                              ↓
     Goal Bulanan                                Achievement %
     Ops Target                                   ≥80%, ≥90%, ≥100%
```

### 2. Individual Employee Qualification

```
Personal Sales  →  ÷  Outlet Total Sales  →  Contribution Ratio
     ↓                                              ↓
If >10%                                      Eligible for Goal Bulanan
```

### 3. AM Area Calculation

```
AM Mapping File  →  ALL Outlets (11)  →  Count for calculation
     ↓                                      ↓
Sales & GP       →  Total Revenue      →  Area GP Margin
                    Total GP               (Total GP / Total Revenue)
                                          ↓
                                    Incentive = 100k × 11 × month × margin
```

### 4. BM/Alproean Calculation

```
Main Outlet (highest personal sales)  →  Check Goal Bulanan
     ↓                                         ↓
If YES + Contribution >10%               →  Incentive = 100k × month × margin
                                             (BM also gets 0.5× bonus)
```

## Verification Points

### For AM (e.g., LELIANA OKTAVIA SARAGIH)
- ✅ Calculation uses 11 outlets from AM Mapping
- ✅ Display shows all 11 outlets (fixed in v4.4)
- ✅ Area GP margin = (Sum of all outlet GP / Sum of all outlet Revenue)
- ✅ Incentive = 100,000 × 11 × month multiplier × margin factor

### For BM/Alproean
- ✅ Outlet eligibility based on Sales & GP total vs target
- ✅ Personal sales only used for contribution ratio (>10% required)
- ✅ Main outlet = outlet with highest personal sales
- ✅ Incentive based on main outlet's Goal Bulanan status and GP margin

## Summary

**The calculation logic has been correct since v4.3**:
- Outlet eligibility uses Sales & GP total sales vs targets ✅
- Personal sales used for contribution ratio only ✅
- AM outlet count from AM Mapping file ✅
- Sales & GP data used for total sales and margins ✅

**v4.4 fixed the DISPLAY issue**:
- AM now shows all 11 outlets from Mapping (not just 3 from personal sales) ✅
- Export correctly displays full outlet assignments for AMs ✅

## Reference Implementation

### Data Loading
```javascript
// Sales & GP Report
this.data.salesGpData = [
    { outlet: 'JKJBPP1', totalSales: 50000000, gp: 12500000, gpMargin: 25.0 }
];

// Outlet Mapping
this.data.outletMappingData = [
    { outlet: 'JKJBPP1', areaManager: 'LELIANA OKTAVIA SARAGIH', target: 45000000 }
];

// Personal Sales
this.data.personalSalesData = [
    { employeeName: 'LELIANA OKTAVIA SARAGIH', outlet: 'JKJBPP1', personalSales: 5000000 }
];
```

### Eligibility Check
```javascript
// Outlet hit Goal Bulanan?
const outletHitGoal = (salesData.totalSales >= goalTarget);  // 50M >= 45M = YES

// Employee contribution significant?
const contributionRatio = (5M / 50M) × 100 = 10%;
const significantContribution = (10% > 10%);  // NO (must be >10%, not >=)

// Employee qualifies?
goalBulananHit = (outletHitGoal && significantContribution);  // YES && NO = NO
```

### AM Calculation
```javascript
// Count outlets from Mapping
totalOutletsInMapping = 11;  // From AM Mapping file

// Calculate area GP margin
areaGPMargin = (totalGP / totalRevenue) × 100;  // Weighted average

// Calculate incentive
marginFactor = getGPAdjustment(areaGPMargin);  // Based on GP bands
incentive = 100000 × 11 × monthMultiplier × marginFactor;
```
