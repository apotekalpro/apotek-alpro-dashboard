# Sales Reconciliation - Dual Matching Modes

## Overview

The sales reconciliation system now supports **two distinct matching modes** to serve different business needs:

1. **Period Matching** - Full reconciliation for monthly/weekly closing
2. **Daily Matching** - Fraud detection and early warning system

---

## 1. Period Matching Mode (Full Reconciliation)

### Purpose
Final reconciliation for accounting close - ensures 100% accuracy

### Configuration
- ✅ **Includes** manual bank-in (SETORAN_TUNAI) transactions
- ✅ Standard amount parsing
- ✅ 500 tolerance for rounding differences
- ✅ All transaction types included

### Matching Rules
- **CASH**: Exact match with 500 tolerance
- **NON-CASH**: Exact match with 500 tolerance
- **Status**: MATCHED or AMOUNT_MISMATCH

### Use Cases
- Monthly financial closing
- Weekly reconciliation reports
- Final audit documentation
- Variance investigation

### Example Output
```
Outlet: JKJSTT1
CASH: 
  ACMM: 50,000,000.00
  Bank: 50,000,350.00 (includes manual bank-in correction)
  Status: MATCHED (variance within tolerance)

NON-CASH:
  ACMM: 25,000,000.00
  Bank: 25,000,100.00
  Status: MATCHED
```

---

## 2. Daily Matching Mode (Fraud Detection)

### Purpose
Early warning system for fraud, theft, or missout detection

### Configuration
- 🚫 **Excludes** manual bank-in (SETORAN_TUNAI) - only ATM deposits
- 🔽 **Round-down** ATM amounts for CASH matching
- ⚡ **95% tolerance** for CASH (not 100% required)
- 🎯 **100% match required** for NON-CASH (QRIS/CC/DC)
- 📅 H-1 date tracking enabled

### Matching Rules

#### CASH (CDM Deposits)
- **95% tolerance**: If bank deposit >= 95% of ACMM, status = MATCHED
- **< 95%**: FRAUD_ALERT (potential theft or missout)
- **Missing deposit**: FRAUD_ALERT if ACMM > 500K
- **Large variance**: FRAUD_ALERT if difference > 1M

#### NON-CASH (QRIS/Credit/Debit)
- **100% match required**: Must match within 10 rounding tolerance
- **Any mismatch**: FRAUD_ALERT
- **Missing deposit**: FRAUD_ALERT if ACMM > 100K
- **Unexpected deposit**: FRAUD_ALERT if Bank > 100K with no ACMM

### Fraud Alert Triggers

| Scenario | CASH Threshold | NON-CASH Threshold | Alert Type |
|----------|---------------|-------------------|------------|
| Bank < 95% of ACMM | < 95% match | Any variance > 10 | 🚨 FRAUD_ALERT |
| Missing bank deposit | ACMM > 500K | ACMM > 100K | 🚨 FRAUD_ALERT |
| Large variance | Diff > 1M | Diff > 100K | 🚨 FRAUD_ALERT |
| Unexpected deposit | - | Bank > 100K, ACMM = 0 | 🚨 FRAUD_ALERT |

### Why These Rules?

1. **Exclude Manual Bank-In**
   - Manual deposits are weekly selisih corrections, not daily sales
   - Including them masks daily variances
   - Daily mode focuses on ATM deposits only

2. **95% Tolerance for CASH**
   - ATM deposits may have small variances (coin rounding, petty cash)
   - 95% threshold catches significant issues while allowing minor variances
   - Focus on large amounts (> 500K) for alert priority

3. **100% Match for NON-CASH**
   - QRIS/Credit/Debit should match exactly (digital transactions)
   - No cash handling variances
   - Any mismatch indicates potential fraud or system error

4. **Round-Down ATM Amounts to Nearest 50,000 (50rb)**
   - Helps match CASH deposits with small variances (coins, petty cash)
   - Example: 2,843,500 → 2,800,000 (nearest 50rb)
   - Example: 5,123,456 → 5,100,000 (nearest 50rb)
   - Reduces false positives from minor rounding and daily variance

### Use Cases
- Daily fraud monitoring
- Early detection of theft or missout
- Outlet performance tracking
- Cashier accountability

### Example Output
```
Outlet: JKJSTT1 (DAILY MODE)

CASH:
  ACMM: 50,000,000.00
  Bank: 47,000,000.00 (CDM only, manual bank-in excluded)
  Match: 94% (< 95% threshold)
  Status: 🚨 FRAUD_ALERT
  → Potential missout of 3M detected!

NON-CASH:
  ACMM: 25,000,000.00
  Bank: 24,900,000.00
  Variance: -100,000
  Status: 🚨 FRAUD_ALERT
  → NON-CASH must match 100%, investigate immediately!
```

---

## Technical Implementation

### BCA Statement Processing

#### Period Mode
```javascript
// Include all transactions
if (transactionType === 'SETORAN_TUNAI') {
    // ✅ Include manual bank-in
    amount = parseBCAAmount(columnD);
}

if (transactionType === 'CDM') {
    // ✅ Standard amount parsing
    amount = parseBCAAmount(columnD);
}
```

#### Daily Mode
```javascript
// Exclude manual bank-in
if (transactionType === 'SETORAN_TUNAI') {
    if (matchingMode === 'daily') {
        // 🚫 Skip this transaction
        excludedManualBankIn++;
        continue;
    }
}

// Round-down ATM amounts to nearest 50,000 (50rb)
if (transactionType === 'CDM') {
    amount = parseBCAAmount(columnD);
    if (matchingMode === 'daily') {
        // 🔽 Round down to nearest 50rb: 2,843,500 → 2,800,000
        amount = roundDownTo50k(amount);
    }
}
```

### Matching Logic

#### Period Mode
```javascript
if (matchingMode === 'period') {
    // Standard matching with 500 tolerance
    status = Math.abs(difference) <= 500 ? 'MATCHED' : 'AMOUNT_MISMATCH';
}
```

#### Daily Mode - CASH
```javascript
// Round down CDM amounts to nearest 50,000
if (transactionType === 'CDM') {
    amount = parseBCAAmount(columnD);
    if (matchingMode === 'daily') {
        amount = roundDownTo50k(amount); // 2,843,500 → 2,800,000
    }
}

// Match with 95% tolerance
if (matchingMode === 'daily') {
    const matchPercentage = (bcaCashTotal / acmmCashTotal) * 100;
    
    if (matchPercentage >= 95) {
        status = 'MATCHED';
    } else {
        status = 'FRAUD_ALERT';
        fraudAlert = true;
    }
    
    // Flag large variances
    if (Math.abs(difference) > 1000000) {
        fraudAlert = true;
    }
}
```

#### Daily Mode - NON-CASH
```javascript
if (matchingMode === 'daily') {
    // 100% match required for NON-CASH
    if (Math.abs(difference) <= 10) {
        status = 'MATCHED';
    } else {
        status = 'FRAUD_ALERT';
        fraudAlert = true;
    }
}
```

---

## UI Features

### Mode Selection
- Radio buttons for Period vs Daily mode
- Detailed descriptions of each mode
- Real-time mode details panel
- Visual indicators (green for Period, yellow for Daily)

### Results Display
- Mode banner showing active configuration
- Fraud alert summary card (Daily mode only)
- 🚨 FRAUD_ALERT badge on flagged transactions
- Red background highlighting for fraud alerts
- Animated pulsing for alert visibility

### Console Logging
```
🔍 DEBUG: Matching Mode: DAILY
🚫 DAILY MODE: Excluding manual bank-in Row 15: SETORAN TUNAI...
🔽 DAILY MODE: Round-down CDM Row 8: 2800500.50 → 2800500.00
🚨 DAILY MODE: 3 fraud alerts detected!
   Alert 1: JKJSTT1 CASH - ACMM: 50000000.00, Bank: 47000000.00, Variance: -3000000.00
```

---

## Best Practices

### When to Use Period Mode
✅ Monthly financial closing  
✅ Final reconciliation reports  
✅ Audit documentation  
✅ Variance investigation  
✅ Need exact 100% matching  

### When to Use Daily Mode
✅ Daily fraud monitoring  
✅ Early warning system  
✅ Real-time outlet performance  
✅ Cashier accountability  
✅ Quick health checks  

### Workflow Recommendation

```
Daily Operations:
  Morning: Upload yesterday's data in DAILY MODE
  Check: Review fraud alerts immediately
  Action: Investigate any flagged outlets
  
Weekly Close:
  Upload: Full week data in PERIOD MODE
  Verify: 100% accuracy for accounting
  Reconcile: Manual bank-in corrections
  
Monthly Close:
  Upload: Full month data in PERIOD MODE
  Final: Complete reconciliation
  Report: Generate audit documentation
```

---

## Fraud Alert Response Procedure

### When You See a Fraud Alert:

1. **CASH Fraud Alert (< 95% match)**
   - Check: Did the outlet make the CDM deposit?
   - Verify: ATM transaction receipts
   - Investigate: Missing cash from sales floor
   - Action: Contact outlet manager immediately

2. **NON-CASH Fraud Alert (Any variance)**
   - Check: QRIS/CC/DC settlement reports
   - Verify: Bank statement transactions
   - Investigate: Potential system error or fraud
   - Action: Contact bank and review POS logs

3. **Missing Bank Deposit Alert**
   - Check: Was deposit made manually (not through ATM)?
   - Verify: Next day bank statement (H+1 posting)
   - Investigate: Cash on hand at outlet
   - Action: Urgent investigation required

---

## Summary Table

| Feature | Period Mode | Daily Mode |
|---------|------------|------------|
| **Purpose** | Final reconciliation | Fraud detection |
| **Manual Bank-In** | ✅ Included | 🚫 Excluded |
| **ATM Rounding** | Standard parsing | 🔽 Round-down |
| **CASH Tolerance** | 500 | 95% match (5% variance OK) |
| **NON-CASH Tolerance** | 500 | 10 (must match exactly) |
| **Fraud Alerts** | ❌ No | ✅ Yes |
| **Use Frequency** | Weekly/Monthly | Daily |
| **Accuracy Required** | 100% | ~95-100% |
| **Alert Threshold** | None | CASH: >500K, NON-CASH: >100K |

---

## Files Modified

1. `/home/user/webapp/finance/sales-reconciliation.html`
   - Added matching mode selector UI
   - Updated `aggregateBCAByWeek()` with mode logic
   - Enhanced `matchWeeklyData()` with fraud detection
   - Updated `displayResults()` with fraud alert summary
   - Enhanced results table with fraud alert badges

2. `/home/user/webapp/BCA_BRI_STATEMENT_MATCHING_DOCUMENTATION.md`
   - Complete technical documentation
   - Parsing algorithms and examples
   - Troubleshooting guide

3. `/home/user/webapp/MATCHING_MODES_SUMMARY.md`
   - This document - user guide for dual modes

---

## Next Steps

1. **Test Period Mode**
   - Upload full period data
   - Verify 100% matching logic
   - Check manual bank-in inclusion

2. **Test Daily Mode**
   - Upload daily data
   - Verify manual bank-in exclusion
   - Check fraud alert triggering
   - Validate 95% tolerance for CASH
   - Validate 100% requirement for NON-CASH

3. **Deploy**
   - Create pull request
   - Review changes
   - Merge to main
   - Deploy to production

4. **Train Users**
   - Explain mode differences
   - Demonstrate fraud alert workflow
   - Establish response procedures

---

**Version**: 1.0  
**Date**: July 13, 2026  
**Commit**: 702e5cb
