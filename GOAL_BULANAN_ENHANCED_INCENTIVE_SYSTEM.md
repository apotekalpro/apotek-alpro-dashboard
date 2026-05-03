# Goal Bulanan Enhanced Incentive System

**Implementation Date:** February 13, 2026  
**Version:** 2.0  
**Status:** ✅ Production Ready

## 🎯 Overview

The enhanced Goal Bulanan incentive system provides a comprehensive monthly bonus structure that calculates incentives based on outlet goal achievement, employee contribution ratios, payroll month multipliers, and GP margin factors. The system automatically compares Goal Bulanan incentives against Operational Reward incentives and awards employees the higher amount.

---

## 📋 Key Features

### 1. **Payroll Month Multiplier**
- Monthly dropdown selector in the UI
- Multiplier pattern: **Jan=1, Feb=2, Mar=3, Apr=4, May=5, Jun=6, Jul=1, Aug=2, Sep=3, Oct=4, Nov=5, Dec=6**
- Resets every 6 months (bi-annual cycle)

### 2. **Incentive Calculation Formula**

#### **Base Formula:**
```
Base Incentive = Rp 100,000 × Month Multiplier
Final Incentive = Base Incentive × Margin Factor
```

#### **GP Margin Factor:**
| GP Margin | Factor | Percentage |
|-----------|--------|------------|
| ≥ 25% | 1.0 | 100% |
| 22-24.99% | 0.7 | 70% |
| 20-21.99% | 0.5 | 50% |
| < 20% | 0.0 | 0% |

### 3. **Role-Specific Incentives**

#### **A. Area Manager (AM)**
- **Eligibility:** Area Goal Bulanan = YES
- **Formula:** `100,000 × Month Multiplier × Number of Outlets (that hit goal) × Margin Factor`
- **Margin Calculation:** Average GP margin across all outlets in the area
- **Example:**
  - Month: June (6x multiplier)
  - Outlets that hit goal: 3
  - Average GP margin: 23% (70% factor)
  - Incentive: `100,000 × 6 × 3 × 0.7 = Rp 1,260,000`

#### **B. Branch Manager (BM)**
- **Eligibility Requirements:**
  1. Goal Bulanan = YES (outlet hit goal)
  2. Contribution Ratio > 10%
- **Formula:** `(100,000 × Month Multiplier × Margin Factor) × 1.5`
- **Bonus:** 50% additional bonus on top of base incentive
- **Example:**
  - Month: June (6x multiplier)
  - Outlet GP margin: 24% (70% factor)
  - Contribution ratio: 15% ✅
  - Base: `100,000 × 6 × 0.7 = 420,000`
  - Final: `420,000 × 1.5 = Rp 630,000`

#### **C. Alproean Staff**
- **Eligibility Requirements:**
  1. Goal Bulanan = YES (outlet hit goal)
  2. Contribution Ratio > 10%
- **Formula:** `100,000 × Month Multiplier × Margin Factor`
- **Example:**
  - Month: June (6x multiplier)
  - Outlet GP margin: 24% (70% factor)
  - Contribution ratio: 12% ✅
  - Incentive: `100,000 × 6 × 0.7 = Rp 420,000`

---

## 🔄 Incentive Comparison Logic

### **Final Incentive Determination**

The system calculates both:
1. **Ops Reward Incentive** (traditional performance-based rewards)
2. **Goal Bulanan Incentive** (new monthly goal-based incentive)

**Final Rule:** Employee receives whichever is higher

```javascript
if (goalBulananIncentive > opsRewardIncentive) {
    finalIncentive = goalBulananIncentive;
    incentiveType = 'Goal Bulanan';
} else {
    finalIncentive = opsRewardIncentive;
    incentiveType = 'Ops Reward';
}
```

---

## 📊 Export Report Columns

### **New Columns Added:**

1. **Remark** - Shows main outlet for BM & Alproean (no remark for AM)
2. **Ops Reward Incentive (Rp)** - Traditional performance incentive amount
3. **Goal Bulanan Incentive (Rp)** - New goal-based incentive amount
4. **Final Incentive (Rp)** - The higher of the two incentives
5. **Incentive Type** - Indicates which incentive was awarded (Goal Bulanan or Ops Reward)

### **Complete Export Structure:**

```
Employee Name | Employee ID | Role | Outlet | Remark | Personal Sales (Rp) | 
Contribution Ratio (%) | GP Margin (%) | Goal Bulanan | Goal Bulanan Target (Rp) | 
Area Goal Bulanan | Area Goal Bulanan Target (Rp) | AM Reward (Rp) | BM Reward (Rp) | 
Alproean Reward (Rp) | Ops Reward Incentive (Rp) | Goal Bulanan Incentive (Rp) | 
Final Incentive (Rp) | Incentive Type
```

---

## 💡 Example Calculations

### **Example 1: AM Jakarta (June Payroll)**

**Area Setup:**
- Outlets managed: JKJSTT1, JKJSVR1, JKJBTM1
- Outlets that hit goal: 2 (JKJSVR1, JKJBTM1)
- Average GP margin: 23.5%
- Month multiplier: 6x (June)

**Calculation:**
```
Margin Factor = 0.7 (23.5% → 22-24.99% range)
Goal Bulanan Incentive = 100,000 × 6 × 2 × 0.7 = Rp 840,000
Ops Reward Incentive = Rp 750,000

Final Incentive = Rp 840,000 (Goal Bulanan is higher)
Incentive Type = "Goal Bulanan"
```

### **Example 2: BM at BTTSBB1 (June Payroll)**

**Staff Setup:**
- Goal Bulanan: NO (outlet did not hit goal)
- Contribution ratio: 18%
- Outlet GP margin: 22.5%

**Calculation:**
```
Eligibility Check: Goal Bulanan = NO ❌
Goal Bulanan Incentive = Rp 0 (not eligible)
Ops Reward Incentive = Rp 450,000

Final Incentive = Rp 450,000 (only Ops Reward available)
Incentive Type = "Ops Reward"
```

### **Example 3: Alproean at JKJSVR1 (June Payroll)**

**Staff Setup:**
- Goal Bulanan: YES
- Contribution ratio: 15%
- Outlet GP margin: 25%
- Month multiplier: 6x (June)

**Calculation:**
```
Eligibility Check: Goal = YES ✅, Contribution > 10% ✅
Margin Factor = 1.0 (25% → ≥25% range)
Goal Bulanan Incentive = 100,000 × 6 × 1.0 = Rp 600,000
Ops Reward Incentive = Rp 350,000

Final Incentive = Rp 600,000 (Goal Bulanan is higher)
Incentive Type = "Goal Bulanan"
```

---

## 🔍 Business Rules Summary

### **Contribution Ratio Requirement (10%)**
- **Applies to:** BM and Alproean staff only
- **Not applicable to:** AM (uses area-level calculation)
- **Rule:** Employee must contribute more than 10% of outlet's total sales to receive Goal Bulanan incentive
- **Calculation:** `(Personal Sales / Outlet Total Sales) × 100 > 10%`

### **Goal Achievement Requirements**

#### **Individual Level (BM/Alproean):**
- Outlet Net Sales ≥ Goal Bulanan Target → YES
- Outlet Net Sales < Goal Bulanan Target → NO

#### **Area Level (AM):**
- Sum of all outlet sales ≥ Sum of all outlet targets → YES
- Sum of all outlet sales < Sum of all outlet targets → NO

### **Margin Factor Application**
- Applied at the individual outlet level for BM/Alproean
- Applied as area average for AM
- No incentive if GP margin < 20%

---

## 🛠️ Implementation Details

### **UI Changes**
- Added payroll month dropdown selector in the file upload section
- Dropdown shows month name and multiplier (e.g., "June (Multiplier: 6x)")
- Default selection: January (1x)

### **Code Changes**

**New Function:**
```javascript
calculateGoalBulananIncentives(matchedEmployees)
```

**Key Logic Points:**
1. Retrieves selected payroll month from UI
2. Calculates base incentive with month multiplier
3. Applies GP margin factor
4. Differentiates between AM, BM, and Alproean calculations
5. Compares with Ops Reward and selects higher amount
6. Updates employee records with final incentive and type

### **Files Modified:**
1. `index.html` - Added payroll month selector UI
2. `assets/js/incentive-calculator.js` - Added Goal Bulanan incentive calculation logic
3. `www/assets/js/incentive-calculator.js` - Synchronized copy

---

## 📈 Testing Scenarios

### **Scenario 1: High GP Margin (≥25%)**
- Expected margin factor: 1.0 (100%)
- Test case: Outlet with 26% GP margin
- Result: Full incentive amount (100% × base)

### **Scenario 2: Medium GP Margin (22-24.99%)**
- Expected margin factor: 0.7 (70%)
- Test case: Outlet with 23% GP margin
- Result: 70% of base incentive

### **Scenario 3: Low GP Margin (20-21.99%)**
- Expected margin factor: 0.5 (50%)
- Test case: Outlet with 21% GP margin
- Result: 50% of base incentive

### **Scenario 4: Below Threshold (<20%)**
- Expected margin factor: 0.0 (0%)
- Test case: Outlet with 18% GP margin
- Result: No Goal Bulanan incentive (Rp 0)

### **Scenario 5: Contribution Ratio Below 10%**
- Test case: BM with 8% contribution ratio
- Result: Not eligible for Goal Bulanan incentive
- Falls back to Ops Reward only

### **Scenario 6: Multi-Outlet Employee**
- Test case: Employee works in 3 outlets, only 1 hits goal with >10% contribution
- Result: Eligible for Goal Bulanan incentive based on qualifying outlet

---

## ⚠️ Important Notes

1. **Month Multiplier Cycle:**
   - Resets every 6 months (July = 1, not 7)
   - Ensure correct month is selected for payroll period

2. **Margin Factor:**
   - Applied AFTER month multiplier
   - Can significantly reduce incentive if GP margin is low
   - Outlet must maintain at least 20% GP margin to receive any Goal Bulanan incentive

3. **Contribution Ratio:**
   - Only applies to BM and Alproean
   - Must exceed 10% (not equal to)
   - Prevents unfair incentives for minimal contributions

4. **Incentive Comparison:**
   - System automatically selects higher incentive
   - Both amounts shown in export for transparency
   - Incentive Type column clearly indicates which was awarded

5. **Area Goal Bulanan (AM):**
   - Cumulative calculation across all outlets
   - AM can receive incentive even if some individual outlets don't hit goal
   - Based on total area performance vs total area target

---

## 📝 Usage Instructions

### **For Payroll Processing:**

1. **Select Payroll Month:**
   - Choose the correct month from the dropdown
   - Verify the multiplier displayed is correct (1x through 6x)

2. **Upload Required Files:**
   - Active Alproean List
   - Full Alproean List
   - Sales & GP Data
   - Personal Sales
   - Outlet Mapping (with Goal Bulanan sheet)

3. **Calculate Incentives:**
   - Click "Calculate Incentives" button
   - System will process all incentives including Goal Bulanan

4. **Review Results:**
   - Check summary cards for total incentives
   - Review detailed table for individual calculations

5. **Export Results:**
   - Use "Export Matched Results" for payroll processing
   - Verify "Incentive Type" column to understand incentive source
   - Cross-check Ops Reward vs Goal Bulanan amounts

6. **Verify Key Fields:**
   - Final Incentive (Rp) - Amount to pay
   - Incentive Type - Reason for payment
   - Remark - Main outlet for BM/Alproean

---

## 🎉 Benefits

1. **Transparent Incentive Calculation:**
   - Both Goal and Ops incentives calculated
   - Higher amount awarded automatically
   - Clear indication of incentive type

2. **Fair Employee Compensation:**
   - Contribution ratio prevents unfair awards
   - Margin factor encourages profitability
   - Month multiplier rewards sustained performance

3. **Motivation & Engagement:**
   - Clear goal achievement tracking
   - Progressive multiplier encourages long-term performance
   - Fair credit for multi-outlet employees

4. **Management Insights:**
   - Easy comparison between incentive types
   - Identify which incentive system performs better
   - Track goal achievement across outlets and areas

5. **Scalable System:**
   - Supports all employee types (AM, BM, Alproean)
   - Handles multi-outlet scenarios
   - Flexible month multiplier structure

---

## 🔗 Related Documentation

- `GOAL_BULANAN_FEATURE.md` - Original Goal Bulanan feature
- `AREA_GOAL_BULANAN_FEATURE.md` - Area-level goal tracking for AMs
- `GOAL_BULANAN_IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- `AM_REWARD_SIMPLIFICATION.md` - AM reward structure changes

---

## 📞 Support

For questions or issues related to the Goal Bulanan Enhanced Incentive System:
- Review calculation examples in this document
- Check employee eligibility requirements
- Verify payroll month selection
- Ensure Goal Bulanan sheet is present in Outlet Mapping file

**Last Updated:** February 13, 2026  
**Version:** 2.0  
**Status:** ✅ Production Ready
