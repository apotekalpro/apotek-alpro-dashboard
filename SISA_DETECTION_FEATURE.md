# SISA Transaction Detection Feature

## Overview

A new **SISA Detection** feature has been added to identify scenarios where one transaction matches ACMM 100% exactly, while other transactions are extra/remainder amounts (SISA).

## Problem Statement

### Real-World Scenario (from User's Data)

**Example from Excel:**
```
Outlet: Row 2
ACMM Total: 3,710,151
Bank Transactions: 2 txns
  - SETORAN 1 (11/03/07): Rp 3,710,151.00 (Ref: 6290) ← Matches ACMM 100%
  - SETORAN 2 (21/03/07): Rp 48,972.00 (Ref: 6290)    ← SISA (extra)
Total Bank: 3,759,123
```

**Previous Behavior:**
- Status: `AMOUNT_MISMATCH`
- Reason: Total 3,759,123 ≠ ACMM 3,710,151
- Problem: System didn't recognize that one transaction matched perfectly

**User's Requirement:**
> "if there is 1 trxn is full 100% match with ACMM total for that previous day, then another sisa trxn have to reveal in report also, for us to alert there is another sisa."

---

## Solution: SISA Detection Logic

### New Matching Algorithm

The system now checks individual transactions before checking totals:

```javascript
// Step 1: Collect all individual transactions (CDM + SETORAN)
const allTransactions = [...cdmTransactions, ...setoranTransactions];

// Step 2: Check if ANY transaction matches ACMM 100%
for (const txn of allTransactions) {
    // Check exact match with original ACMM
    if (txn.amount === acmmCashTotal) {
        foundExactMatch = true;
        matchedTransaction = txn;
        status = 'MATCHED_WITH_SISA';
        sisaAlert = true;
        
        // All other transactions are SISA
        sisaTransactions = allTransactions.filter(t => t !== txn);
        break;
    }
    // Also check match with rounded ACMM
    else if (txn.amount === roundDownTo50k(acmmCashTotal)) {
        // Same logic for rounded match
    }
}
```

---

## Features

### 1. Individual Transaction Matching

**Checks performed (in order):**
1. ✅ Does any transaction match ACMM **exactly**? (100% match)
2. ✅ Does any transaction match **rounded ACMM**? (50k increments)
3. ✅ If yes to either: Flag as `MATCHED_WITH_SISA`
4. ✅ All other transactions: Flag as SISA

### 2. New Status: MATCHED_WITH_SISA

**Meaning:**
- One transaction matched ACMM perfectly
- Additional SISA (remainder) transactions detected
- Requires investigation but not fraud

**Visual Indicators:**
- Status column: `MATCHED_WITH_SISA`
- SISA Alert column: `YES ⚠️`
- Transaction Details: Clearly separated MATCHED vs SISA

### 3. Enhanced Transaction Details Display

**Before:**
```
[SETORAN 1] 11/03/07 | Rp 3,710,151.00 | Ref: 6290
[SETORAN 2] 21/03/07 | Rp 48,972.00 | Ref: 6290
```

**After (with SISA detection):**
```
✅ MATCHED: [SETORAN] 11/03/07 | Rp 3,710,151.00 | Ref: 6290

⚠️ SISA TRANSACTIONS (Total: Rp 48,972.00)
   [SETORAN 1] 21/03/07 | Rp 48,972.00 | Ref: 6290
```

**Benefits:**
- Clear visual separation
- Matched transaction shown first
- SISA total calculated
- Easy to identify which is which

---

## Export Enhancements

### New Columns in Cash Reconciliation Sheet

**Column 9: SISA Alert**
- Values: `YES ⚠️` or `NO`
- Indicates if SISA transactions detected

**Column 10: SISA Info**
- Format: `SISA: {count} txn(s), Total: Rp {amount}`
- Example: `SISA: 1 txn(s), Total: Rp 48,972.00`

**Column 13: Transaction Details (Enhanced)**
- Shows matched transaction with ✅
- Shows SISA transactions with ⚠️
- Separates sections clearly

### Updated Column Layout

| # | Column Name | Width | Description |
|---|-------------|-------|-------------|
| 1 | Category | 12 | CASH / NON-CASH |
| 2 | Week | 15 | Week label |
| 3 | Outlet Code | 12 | Outlet identifier |
| 4 | Bank | 10 | BCA / BRI |
| 5 | Bank Total | 18 | Total bank amount |
| 6 | ACMM Total | 18 | ACMM amount |
| 7 | Difference | 15 | Bank - ACMM |
| 8 | Status | 25 | MATCHED_WITH_SISA, etc. |
| 9 | **SISA Alert** ✨ | 12 | **YES ⚠️ / NO** |
| 10 | **SISA Info** ✨ | 35 | **SISA details** |
| 11 | ACMM Breakdown | 30 | ACMM payment methods |
| 12 | Bank Breakdown | 50 | Bank transaction summary |
| 13 | Transaction Details | 80 | Individual transactions |

---

## Use Cases

### Use Case 1: Single SISA Transaction

**Scenario:**
- ACMM: 3,710,151
- Transaction 1: 3,710,151 (matches ACMM 100%)
- Transaction 2: 48,972 (SISA)

**Output:**
```
Status: MATCHED_WITH_SISA
SISA Alert: YES ⚠️
SISA Info: SISA: 1 txn(s), Total: Rp 48,972.00

Transaction Details:
✅ MATCHED: [SETORAN] 11/03/07 | Rp 3,710,151.00 | Ref: 6290

⚠️ SISA TRANSACTIONS (Total: Rp 48,972.00)
   [SETORAN 1] 21/03/07 | Rp 48,972.00 | Ref: 6290
```

**Action:** Investigate why there's an extra 48,972 transaction

### Use Case 2: Multiple SISA Transactions

**Scenario:**
- ACMM: 5,000,000
- Transaction 1: 5,000,000 (matches ACMM 100%)
- Transaction 2: 25,000 (SISA)
- Transaction 3: 15,500 (SISA)

**Output:**
```
Status: MATCHED_WITH_SISA
SISA Alert: YES ⚠️
SISA Info: SISA: 2 txn(s), Total: Rp 40,500.00

Transaction Details:
✅ MATCHED: [CDM] 15/03/07 | Rp 5,000,000.00 | Ref: 123456789012

⚠️ SISA TRANSACTIONS (Total: Rp 40,500.00)
   [CDM 1] 16/03/07 | Rp 25,000.00 | Ref: 123456789012
   [CDM 2] 17/03/07 | Rp 15,500.00 | Ref: 123456789012
```

**Action:** Investigate multiple extra transactions

### Use Case 3: Rounded Match with SISA

**Scenario:**
- ACMM: 2,843,500
- Rounded ACMM: 2,800,000
- Transaction 1: 2,800,000 (matches rounded ACMM)
- Transaction 2: 100,000 (SISA)

**Output:**
```
Status: MATCHED_WITH_SISA
SISA Alert: YES ⚠️
SISA Info: SISA: 1 txn(s), Total: Rp 100,000.00

Transaction Details:
✅ MATCHED: [CDM] 15/03/07 | Rp 2,800,000.00 | Ref: 123456789012

⚠️ SISA TRANSACTIONS (Total: Rp 100,000.00)
   [CDM 1] 16/03/07 | Rp 100,000.00 | Ref: 123456789012
```

**Action:** Investigate extra 100k transaction

### Use Case 4: No SISA (Normal Match)

**Scenario:**
- ACMM: 3,500,000
- Transaction 1: 3,500,000 (matches ACMM 100%)
- No other transactions

**Output:**
```
Status: MATCHED
SISA Alert: NO

Transaction Details:
[CDM 1] 15/03/07 | Rp 3,500,000.00 | Ref: 123456789012
```

**Action:** No action needed - perfect match

---

## Technical Implementation

### File: `finance/sales-reconciliation.html`

#### 1. Data Collection (Lines ~2095-2120)

```javascript
// Collect all individual transactions
const allTransactions = [];

// Get CDM transactions
const cdmKey = `${outletCode}|CDM`;
if (bcaData.weeklyBCA.has(cdmKey)) {
    const cdmDetail = bcaData.weeklyBCA.get(cdmKey);
    if (cdmDetail.transactions) {
        cdmDetail.transactions.forEach(txn => {
            allTransactions.push({...txn, type: 'CDM'});
        });
    }
}

// Get SETORAN transactions
const setoranKey = `${outletCode}|SETORAN_TUNAI`;
if (bcaData.weeklyBCA.has(setoranKey)) {
    const setoranDetail = bcaData.weeklyBCA.get(setoranKey);
    if (setoranDetail.transactions) {
        setoranDetail.transactions.forEach(txn => {
            allTransactions.push({...txn, type: 'SETORAN'});
        });
    }
}
```

#### 2. Individual Transaction Matching (Lines ~2123-2162)

```javascript
// Check if any single transaction matches ACMM
for (const txn of allTransactions) {
    // Check exact match with original ACMM
    if (txn.amount === acmmCashTotal) {
        foundExactMatch = true;
        matchedTransaction = txn;
        status = 'MATCHED_WITH_SISA';
        sisaAlert = true;
        
        // All other transactions are SISA
        sisaTransactions = allTransactions.filter(t => t !== txn);
        
        console.log(`✅ ${outletCode} 100% MATCH: ${txn.type} Rp ${txn.amount.toFixed(2)} = ACMM Rp ${acmmCashTotal.toFixed(2)}`);
        if (sisaTransactions.length > 0) {
            const sisaTotal = sisaTransactions.reduce((sum, t) => sum + t.amount, 0);
            console.log(`⚠️ ${outletCode} SISA ALERT: ${sisaTransactions.length} extra transaction(s), Total: Rp ${sisaTotal.toFixed(2)}`);
        }
        break;
    }
    // Check match with rounded ACMM
    else if (txn.amount === acmmRounded) {
        // Same logic for rounded match
    }
}
```

#### 3. Enhanced Transaction Details (Lines ~2199-2218)

```javascript
if (sisaAlert && matchedTransaction && sisaTransactions.length > 0) {
    // Rebuild transaction details with MATCHED and SISA labels
    const detailLines = [];
    const sisaTotal = sisaTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Add matched transaction first
    detailLines.push(`✅ MATCHED: [${matchedTransaction.type}] ${matchedTransaction.date} | Rp ${matchedTransaction.amount.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})} | Ref: ${matchedTransaction.reference}`);
    
    // Add separator
    detailLines.push('');
    detailLines.push(`⚠️ SISA TRANSACTIONS (Total: Rp ${sisaTotal.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})})`);
    
    // Add SISA transactions
    sisaTransactions.forEach((txn, idx) => {
        detailLines.push(`   [${txn.type} ${idx + 1}] ${txn.date} | Rp ${txn.amount.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})} | Ref: ${txn.reference}`);
    });
    
    enhancedTransactionDetails = detailLines.join('\n');
}
```

#### 4. Result Object (Lines ~2220-2250)

```javascript
cashResults.push({
    // ... existing fields
    status,
    fraudAlert: fraudAlert,
    sisaAlert: sisaAlert,  // NEW: Flag for SISA transactions
    transactionDetails: enhancedTransactionDetails,  // Enhanced with labels
    
    // NEW: Store SISA details for reporting
    sisaInfo: sisaAlert ? {
        matchedAmount: matchedTransaction ? matchedTransaction.amount : 0,
        sisaCount: sisaTransactions.length,
        sisaTotal: sisaTransactions.reduce((sum, t) => sum + t.amount, 0),
        sisaTransactions: sisaTransactions.map(t => ({
            type: t.type,
            date: t.date,
            amount: t.amount,
            reference: t.reference
        }))
    } : null
});
```

#### 5. Export Enhancement (Lines ~3202-3236)

```javascript
// Add SISA columns to export
const cashData = [
    ['Category', 'Week', 'Outlet Code', 'Bank', 'Bank Total', 'ACMM Total', 
     'Difference', 'Status', 'SISA Alert', 'SISA Info', 'ACMM Breakdown', 
     'Bank Breakdown', 'Transaction Details']
];

cashToExport.forEach(row => {
    // Format SISA info
    let sisaInfo = '';
    if (row.sisaAlert && row.sisaInfo) {
        sisaInfo = `SISA: ${row.sisaInfo.sisaCount} txn(s), Total: Rp ${row.sisaInfo.sisaTotal.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }
    
    cashData.push([
        // ... other columns
        row.status,
        row.sisaAlert ? 'YES ⚠️' : 'NO',  // SISA Alert
        sisaInfo,  // SISA Info
        // ... remaining columns
    ]);
});
```

---

## Benefits

### 1. Accurate Detection
- ✅ Identifies 100% match even when total doesn't match
- ✅ Reduces false MISMATCH alerts
- ✅ Recognizes both exact and rounded matches

### 2. Clear Communication
- ✅ Visual indicators (✅ for matched, ⚠️ for SISA)
- ✅ Separate sections in transaction details
- ✅ SISA total calculated automatically

### 3. Investigation Support
- ✅ Easy to identify which transaction matched
- ✅ Easy to spot extra/remainder transactions
- ✅ Reference numbers for both matched and SISA
- ✅ Dates for all transactions

### 4. Audit Trail
- ✅ Complete transaction history preserved
- ✅ Clear status indicators
- ✅ Supports compliance requirements

---

## Impact Analysis

### Before SISA Detection

**Excel Output:**
```
| Outlet | ACMM Total | Bank Total | Difference | Status          |
|--------|------------|------------|------------|-----------------|
| Row 2  | 3,710,151  | 3,759,123  | 48,972     | AMOUNT_MISMATCH |
```

**Problem:**
- Flagged as mismatch
- Cannot see which transaction matched
- Extra transaction not identified
- Requires manual investigation

### After SISA Detection

**Excel Output:**
```
| Outlet | ACMM Total | Bank Total | Status            | SISA Alert | SISA Info                           |
|--------|------------|------------|-------------------|------------|-------------------------------------|
| Row 2  | 3,710,151  | 3,759,123  | MATCHED_WITH_SISA | YES ⚠️     | SISA: 1 txn(s), Total: Rp 48,972.00 |
```

**Transaction Details:**
```
✅ MATCHED: [SETORAN] 11/03/07 | Rp 3,710,151.00 | Ref: 6290

⚠️ SISA TRANSACTIONS (Total: Rp 48,972.00)
   [SETORAN 1] 21/03/07 | Rp 48,972.00 | Ref: 6290
```

**Benefits:**
- ✅ Status: MATCHED_WITH_SISA (not mismatch)
- ✅ Clear indication of matched transaction
- ✅ SISA alert and details shown
- ✅ Easy to investigate extra transaction

---

## Related Features

1. **Transaction Details Feature** (PR #185)
   - Shows individual transaction amounts and references
   - Foundation for SISA detection

2. **CASH Matching Logic Fix** (PR #184)
   - Only rounds ACMM (not bank)
   - Exact match required

3. **Dual Matching Modes**
   - Period Mode: Standard reconciliation
   - Daily Mode: Fraud detection with SISA support

---

## Future Enhancements

### Phase 2: Multi-Day SISA Accumulation

**Scenario:**
- Day 1: Bank 3,710,151 (matches ACMM Day 1)
- Day 2: Bank 48,972 (SISA from Day 1)
- Day 2: Bank 5,200,000 (matches ACMM Day 2)

**Enhancement:** Link SISA transactions to their origin dates

### Phase 3: SISA Pattern Analysis

**Features:**
- Identify recurring SISA patterns
- Alert on unusual SISA amounts
- Track SISA resolution

### Phase 4: Automated SISA Investigation

**Features:**
- Suggest possible SISA origins
- Link SISA to previous days' variances
- Automate SISA classification

---

## Commit Information

**Commit:** 0284857  
**Branch:** `fix/correct-cash-matching-logic`  
**Message:** "feat: Add SISA transaction detection for 100% match + remainder scenarios"

**Changes:**
- +142 additions
- -35 deletions
- Modified: `finance/sales-reconciliation.html`

---

## User Feedback Reference

> "if there is 1 trxn is full 100% match with ACMM total for that previous day, then another sisa trxn have to reveal in report also, for us to alert there is another sisa."

**Status:** ✅ IMPLEMENTED

This feature implements exactly what was requested:
- ✅ Detects 100% match with ACMM
- ✅ Reveals SISA transactions in report
- ✅ Alerts user about extra transactions
- ✅ Clear visual separation between matched and SISA

---

**Created:** 2024-07-13  
**Author:** GenSpark AI Developer  
**Status:** ✅ Implemented and Ready for Testing
