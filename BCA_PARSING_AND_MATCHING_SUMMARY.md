# BCA Statement Parsing and Matching Logic - Complete Summary

## 📋 Table of Contents
1. [Overview](#overview)
2. [BCA Statement Structure](#bca-statement-structure)
3. [Parsing Logic](#parsing-logic)
4. [Transaction Type Detection](#transaction-type-detection)
5. [Amount Extraction](#amount-extraction)
6. [Reference Number Extraction](#reference-number-extraction)
7. [Outlet Code Lookup](#outlet-code-lookup)
8. [Aggregation Logic](#aggregation-logic)
9. [Matching Logic](#matching-logic)
10. [SISA Detection](#sisa-detection)
11. [Mode-Specific Behavior](#mode-specific-behavior)

---

## 📌 Overview

The BCA reconciliation system processes BCA bank statements to match them against ACMM (Transaction Summary) data. The system:

1. **Parses** BCA statement rows
2. **Classifies** transaction types
3. **Extracts** amounts and reference numbers
4. **Maps** to outlet codes using master files
5. **Aggregates** by outlet and transaction type
6. **Matches** against ACMM data
7. **Detects** SISA (remainder) transactions

---

## 📄 BCA Statement Structure

### Column Layout
| Column | Name | Description | Example |
|--------|------|-------------|---------|
| A | Tgl Transaksi | Transaction Date | 09/03/07 (DD/MM/YY) |
| B | Description | Transaction Description | SETORAN VIA CDM BCA ... |
| C | Cabang | Branch Code | 6290 |
| D | Jumlah | Amount (with CR suffix) | 3710151.00 CR |

### Date Format
- **Input Format**: `DD/MM/YY` (e.g., `09/03/07`)
- **Reference Year**: Auto-detected or manually specified
- **Parsing**: Uses `parseDate()` function with reference year

---

## 🔍 Parsing Logic

### Main Function: `aggregateBCAByWeek(bcaData, lookups, referenceYear)`

**Purpose**: Parse BCA statement and aggregate transactions by outlet and type

**Process Flow**:
```
1. Loop through BCA statement rows (skip header)
2. Parse transaction date (Column A)
3. Parse description (Column B)
4. Parse branch code (Column C)
5. Parse amount (Column D or from description)
6. Determine transaction type
7. Extract outlet identifier (card number, MID, or branch)
8. Lookup outlet code from master files
9. Store individual transaction details
10. Aggregate by outlet + transaction type
```

### Exclusions (Filtered Out)
```javascript
// Skip non-deposit transactions
if (description.includes('BI-FAST')) continue;      // Instant transfers
if (description.includes('TRSF E-BANKING')) continue; // Online transfers
if (description.includes('BYR')) continue;            // Payments
```

---

## 🏷️ Transaction Type Detection

### Function: `determineTransactionType(description)`

**Logic**:
```javascript
if (description.includes('SETORAN VIA CDM'))           → 'CDM'
if (description.includes('KARTU KREDIT'))              → 'CREDITCARD'
if (description.includes('QR :'))                      → 'QRIS'
if (description.includes('KR OTOMATIS') && 'TGH:')     → 'DEBITCARD'
if (description.includes('KR OTOMATIS'))               → 'DEBITCARD'
if (description.includes('SETORAN TUNAI'))             → 'SETORAN_TUNAI'
else                                                   → 'OTHER'
```

### Transaction Type Categories

#### 1. **CDM** (Cash Deposit Machine / ATM)
- **Description Pattern**: `SETORAN VIA CDM BCA ...`
- **Example**: `SETORAN VIA CDM BCA 123456789012 ALPRO KALIBATA Rp 3.710.151,00`
- **Identifier**: 12-digit card number
- **Amount Source**: Column D (Jumlah)
- **Master Lookup**: Master Kartu Debit Outlet (File 4)

#### 2. **SETORAN_TUNAI** (Manual Cash Deposit)
- **Description Pattern**: `SETORAN TUNAI ...`
- **Example**: `SETORAN TUNAI 069-JKJSKR1 141 02025`
- **Identifier**: Branch code (Column C - Cabang)
- **Amount Source**: Column D (Jumlah)
- **Master Lookup**: Master BCA Cabang (File 6)
- **Note**: Excluded in Daily Mode (manual corrections only)

#### 3. **QRIS** (QR Code Payment)
- **Description Pattern**: Contains `QR :`
- **Example**: `QR : MID : 1234567 ALPRO KALIBATA`
- **Identifier**: 7-digit MID (Merchant ID)
- **Amount Source**: Parsed from description
- **Master Lookup**: Master MID Outlet (File 3)

#### 4. **CREDITCARD** (Credit Card Payment)
- **Description Pattern**: `KARTU KREDIT ...`
- **Example**: `KARTU KREDIT MID:1234567 ALPRO KALIBATA`
- **Identifier**: 7-digit MID
- **Amount Source**: Parsed from description
- **Master Lookup**: Master MID Outlet (File 3)

#### 5. **DEBITCARD** (Debit Card Payment)
- **Description Pattern**: `KR OTOMATIS ...`
- **Example**: `KR OTOMATIS MID : 1234567 ALPRO KALIBATA TGH: 743450.00`
- **Identifier**: 7-digit MID
- **Amount Source**: Parsed from description (TGH field)
- **Master Lookup**: Master MID Outlet (File 3)

---

## 💰 Amount Extraction

### Function: `parseBCAAmount(amountStr)` - Column D Parsing

**Purpose**: Parse amount from Column D (Jumlah)

**Logic**:
```javascript
1. Convert to string and trim
2. Remove "CR" suffix: "3710151.00 CR" → "3710151.00"
3. Remove non-numeric characters (except decimal and minus)
4. Parse to float
```

**Example**:
```javascript
Input:  "3710151.00 CR"
Output: 3710151.00
```

---

### Function: `parseBCAAmountFromDescription(description, transactionType)` - Description Parsing

**Purpose**: Extract amount from description (for non-CASH transactions)

#### Pattern 1: CDM (already uses Column D, fallback only)
```javascript
// Pattern: "Rp 1.234.567,89"
const rpMatch = description.match(/Rp\s*([\d.,]+)/i);
// Clean: remove dots (thousand separators), replace comma with decimal
cleanAmount = rpMatch[1].replace(/\./g, '').replace(/,/g, '.');
```

#### Pattern 2: SETORAN_TUNAI (already uses Column D, fallback only)
```javascript
// Pattern: numbers at end of description
const amountMatch = description.match(/([\d.,]+)\s*$/i);
```

#### Pattern 3: QRIS/CC/DC - *SALES* Format (Primary Pattern)
```javascript
// NEW Pattern: "*QRIS*:8735997,*SALES*:12759015,*CASH*:2169118"
const salesMatch = description.match(/\*SALES\*\s*:\s*([\d,]+\.?\d*)/i);
// Extract SALES amount (total transaction)
```

#### Pattern 4: QRIS/CC/DC - Sum All Payment Types
```javascript
// If no *SALES* field, sum all payment types
// Pattern: *TYPE*:amount
const paymentPattern = /\*[^*]+\*\s*:\s*([\d,]+\.?\d*)/g;
// Sum: *QRIS*:8735997 + *CASH*:2169118 + *DEBIT LAIN*:8898400
```

#### Pattern 5: Debit Card - TGH Format
```javascript
// Pattern: "TGH: 743450.00"
const tghMatch = description.match(/TGH\s*:\s*([\d,]+\.?\d*)/i);
// Extract TGH amount
```

#### Pattern 6: QRIS - QR Format
```javascript
// Pattern: "QR : 12345.00"
const qrMatch = description.match(/QR\s*:\s*([\d,]+\.?\d*)/i);
```

**Amount Source Summary**:
| Transaction Type | Primary Source | Fallback Source |
|-----------------|----------------|-----------------|
| CDM | Column D | Description (Rp pattern) |
| SETORAN_TUNAI | Column D | Description (end number) |
| QRIS | Description (*SALES* or sum) | QR: pattern |
| CREDITCARD | Description (*SALES* or sum) | - |
| DEBITCARD | Description (TGH:) | *SALES* or sum |

---

## 🔑 Reference Number Extraction

### Purpose
Provide traceability back to bank statements for audit and verification

### Extraction Logic by Transaction Type

#### CDM - 12-digit Card Number
```javascript
function parseCDM(description) {
    const cdmMatch = description.match(/SETORAN VIA CDM.*?(\d{12,})/i);
    if (cdmMatch) {
        return extractLastDigits(cdmMatch[1], 12);  // Last 12 digits
    }
    return null;
}
```
**Example**:
- Description: `SETORAN VIA CDM BCA 123456789012345 ALPRO...`
- Extract: `123456789012345` → Last 12: `456789012345`

#### QRIS - 7-digit MID
```javascript
function parseQRIS(description) {
    if (description.includes('QR :')) {
        const midMatch = description.match(/MID\s*:\s*(\d+)/i);
        if (midMatch) {
            return extractLastDigits(midMatch[1], 7);  // Last 7 digits
        }
    }
    return null;
}
```

#### Credit Card - 7-digit MID
```javascript
function parseCreditCardMID(description) {
    const midMatch = description.match(/KARTU KREDIT.*?MID:(\d+)/i);
    if (midMatch) {
        return extractLastDigits(midMatch[1], 7);  // Last 7 digits
    }
    return null;
}
```

#### Debit Card - 7-digit MID (Two Patterns)
```javascript
function parseDebitCard(description) {
    // Pattern 1: KR OTOMATIS with MID: label
    const midMatch = description.match(/KR OTOMATIS.*?MID\s*:\s*(\d+)/i);
    if (midMatch && !description.includes('QR :')) {
        return extractLastDigits(midMatch[1], 7);
    }
    
    // Pattern 2: KR OTOMATIS with FLAZZ (no MID: label)
    const flazzMatch = description.match(/FLAZZ\s+(\d+)/i);
    if (flazzMatch && !description.includes('QR :')) {
        return extractLastDigits(flazzMatch[1], 7);
    }
    
    return null;
}
```

#### SETORAN_TUNAI - Branch Code
```javascript
// Reference is the branch code (Column C - Cabang)
reference = cabang.toString().trim();
```

### Storage in Transactions Array
```javascript
bcaDetail.transactions.push({
    date: formatDate(tglTransaksi),        // Transaction date
    amount: amount,                        // Parsed amount
    reference: reference,                  // Extracted reference number
    description: description.substring(0, 100)  // First 100 chars
});
```

---

## 🏪 Outlet Code Lookup

### Master Files Used

#### 1. Master Kartu Debit Outlet (File 4) - For CDM
**Purpose**: Map 12-digit card number → Outlet Code

**Structure**:
- Column F (index 5): Card Number (12 digits)
- Column G (index 6): Outlet Code

**Logic**:
```javascript
const kartuDebit = parseCDM(description);  // Extract 12-digit card number
if (kartuDebit && lookups.kartuDebit.has(kartuDebit)) {
    outletCode = lookups.kartuDebit.get(kartuDebit);
}
```

#### 2. Master MID Outlet (File 3) - For QRIS/CC/DC
**Purpose**: Map 7-digit MID → Outlet Code

**Structure**:
- Column D (index 3): MID (7 digits)
- Column E (index 4): Outlet Code

**Logic**:
```javascript
// For QRIS
const mid = parseQRIS(description);  // Extract 7-digit MID
if (mid && lookups.mid.has(mid)) {
    outletCode = lookups.mid.get(mid);
}

// For Credit Card
const mid = parseCreditCardMID(description);
if (mid && lookups.mid.has(mid)) {
    outletCode = lookups.mid.get(mid);
}

// For Debit Card
const mid = parseDebitCard(description);
if (mid && lookups.mid.has(mid)) {
    outletCode = lookups.mid.get(mid);
}
```

#### 3. Master BCA Cabang (File 6) - For SETORAN_TUNAI
**Purpose**: Map Branch Code → Outlet Code

**Structure**:
- Column A (index 0): Branch Code
- Column B (index 1): Outlet Code

**Logic**:
```javascript
const cabangStr = cabang.toString().trim();  // Column C from BCA statement
if (lookups.cabang.has(cabangStr)) {
    outletCode = lookups.cabang.get(cabangStr);
}
```

### Skipped Transactions
If outlet code cannot be determined, transaction is **skipped**:
```javascript
if (!outletCode) {
    console.log(`⚠️ SKIPPED Row ${i}: Type=${transactionType}, Amount=${amount}, No outlet found`);
    continue;  // Skip this transaction
}
```

---

## 📊 Aggregation Logic

### Data Structure: `weeklyBCA` Map

**Key Format**: `${outletCode}|${transactionType}`

**Example Keys**:
- `JKJSKR1|CDM`
- `JKJSKR1|SETORAN_TUNAI`
- `ALPRO123|QRIS`
- `ALPRO123|CREDITCARD`
- `ALPRO123|DEBITCARD`

**Value Structure**:
```javascript
{
    outletCode: 'JKJSKR1',
    transactionType: 'CDM',
    totalAmount: 3710151.00,           // Sum of all transactions
    transactionCount: 2,                // Number of transactions
    transactions: [                     // NEW: Individual transaction details
        {
            date: '09/03/07',
            amount: 3710151.00,
            reference: '456789012345',
            description: 'SETORAN VIA CDM BCA 123456789012345 ...'
        },
        {
            date: '11/03/07',
            amount: 48972.00,
            reference: '456789012345',
            description: 'SETORAN VIA CDM BCA 123456789012345 ...'
        }
    ],
    weekKey: 'ALL',
    weekLabel: 'All Dates',
    weekStart: null,
    weekEnd: null
}
```

### Aggregation Process
```javascript
1. Create or get existing entry: weeklyBCA.get(detailKey)
2. Add to total amount: bcaDetail.totalAmount += amount
3. Increment count: bcaDetail.transactionCount++
4. Store individual transaction: bcaDetail.transactions.push({...})
```

---

## 🔄 Matching Logic

### Main Function: `matchWeeklyData(acmmData, bcaData, briData, pivotMap, lookups)`

### CASH Matching (CDM + SETORAN_TUNAI)

#### Step 1: Collect ACMM CASH Total
```javascript
// ACMM key format: "outletCode|paymentMethod|bankName"
const acmmKeyBCA = `${outletCode}|CASH|BCA`;
if (acmmData.weeklyACMM.has(acmmKeyBCA)) {
    acmmCashTotal = acmmDetail.totalAmount;
}
```

#### Step 2: Collect BCA CASH Total
```javascript
// BCA CASH = CDM + SETORAN_TUNAI
const cdmKey = `${outletCode}|CDM`;
const setoranKey = `${outletCode}|SETORAN_TUNAI`;

bcaCashTotal = cdmTotal + setoranTotal;
```

#### Step 3: Collect Individual Transactions
```javascript
const allTransactions = [];

// Get CDM transactions
if (bcaData.weeklyBCA.has(cdmKey)) {
    cdmDetail.transactions.forEach(txn => {
        allTransactions.push({...txn, type: 'CDM'});
    });
}

// Get SETORAN transactions
if (bcaData.weeklyBCA.has(setoranKey)) {
    setoranDetail.transactions.forEach(txn => {
        allTransactions.push({...txn, type: 'SETORAN'});
    });
}
```

#### Step 4: Check for 100% Exact Match (BOTH Modes)
```javascript
// STEP 1: Always check for 100% exact match first
for (const txn of allTransactions) {
    if (txn.amount === acmmCashTotal) {
        foundExactMatch = true;
        matchedTransaction = txn;
        status = 'MATCHED_WITH_SISA';
        sisaAlert = true;
        sisaTransactions = allTransactions.filter(t => t !== txn);
        break;
    }
}
```

#### Step 5: Mode-Specific Logic (If No Exact Match)

**Period Mode**:
```javascript
if (matchingMode === 'period') {
    // Standard 500 tolerance
    status = Math.abs(difference) <= 500 ? 'MATCHED' : 'AMOUNT_MISMATCH';
}
```

**Daily Mode**:
```javascript
else {
    // Round down ACMM to nearest 50,000
    const acmmRounded = roundDownTo50k(acmmCashTotal);
    
    // Check for match with rounded ACMM
    for (const txn of allTransactions) {
        if (txn.amount === acmmRounded) {
            foundExactMatch = true;
            status = 'MATCHED_WITH_SISA';
            sisaAlert = true;
            sisaTransactions = allTransactions.filter(t => t !== txn);
            break;
        }
    }
    
    // If still no match, check total
    if (!foundExactMatch) {
        if (bcaCashTotal === acmmRounded) {
            status = 'MATCHED';
        } else {
            status = 'FRAUD_ALERT';
            fraudAlert = true;
        }
    }
    
    // Excessive variance check
    if (Math.abs(difference) > 5000000) {
        status = 'FRAUD_ALERT';
        fraudAlert = true;
        sisaAlert = false;
    }
}
```

### NON-CASH Matching (QRIS, CREDITCARD, DEBITCARD)

#### Step 1: Collect ACMM NON-CASH Total
```javascript
// ACMM splits by bank: BCA vs BRI
for (const [key, data] of acmmData.weeklyACMM.entries()) {
    const parts = key.split('|');
    const paymentMethod = parts[1];
    const bankName = parts[2];
    
    if (outlet === outletCode && paymentMethod !== 'CASH') {
        if (bankName === 'BCA') {
            acmmBCANonCashTotal += data.totalAmount;
        }
    }
}
```

#### Step 2: Collect BCA NON-CASH Total
```javascript
// BCA NON-CASH = QRIS + CREDITCARD + DEBITCARD
const nonCashTypes = ['QRIS', 'CREDITCARD', 'DEBITCARD'];

for (const transactionType of nonCashTypes) {
    const key = `${outletCode}|${transactionType}`;
    if (bcaData.weeklyBCA.has(key)) {
        bcaNonCashTotal += detail.totalAmount;
    }
}
```

#### Step 3: Compare with Tolerance
```javascript
const difference = bcaNonCashTotal - acmmBCANonCashTotal;
const tolerance = Math.max(500, acmmBCANonCashTotal * 0.01); // 1% or 500, whichever is higher

if (Math.abs(difference) <= tolerance) {
    status = 'MATCHED';
} else {
    status = 'AMOUNT_MISMATCH';
}
```

---

## 🚨 SISA Detection

### What is SISA?

**SISA** = Remainder/Extra transaction that occurs when:
1. **ONE transaction matches ACMM 100% exactly**
2. **OTHER transactions exist** (remainder/extra amounts)

### Example Scenario

**Input**:
- ACMM CASH Total: **3,710,151**
- BCA Transaction 1: **3,710,151** (CDM or SETORAN)
- BCA Transaction 2: **48,972** (CDM or SETORAN)

**Analysis**:
- Transaction 1: 3,710,151 = ACMM 3,710,151 ✅ **100% MATCH**
- Transaction 2: 48,972 ⚠️ **SISA** (extra/remainder)

**Result**:
- Status: `MATCHED_WITH_SISA`
- SISA Alert: `YES ⚠️`
- SISA Info: `SISA: 1 txn(s), Total: Rp 48,972.00`

### SISA Detection Logic

```javascript
// STEP 1: Check for 100% exact match
for (const txn of allTransactions) {
    if (txn.amount === acmmCashTotal) {
        foundExactMatch = true;
        matchedTransaction = txn;
        status = 'MATCHED_WITH_SISA';
        sisaAlert = true;
        
        // All OTHER transactions are SISA
        sisaTransactions = allTransactions.filter(t => t !== txn);
        
        console.log(`✅ ${outletCode} 100% MATCH: ${txn.type} Rp ${txn.amount}`);
        if (sisaTransactions.length > 0) {
            const sisaTotal = sisaTransactions.reduce((sum, t) => sum + t.amount, 0);
            console.log(`⚠️ ${outletCode} SISA ALERT: ${sisaTransactions.length} extra txn(s), Total: Rp ${sisaTotal}`);
        }
        break;
    }
}
```

### Enhanced Transaction Details Display

**When SISA Detected**:
```javascript
if (sisaAlert && matchedTransaction && sisaTransactions.length > 0) {
    const detailLines = [];
    const sisaTotal = sisaTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Matched transaction
    detailLines.push(
        `✅ MATCHED: [${matchedTransaction.type}] ${matchedTransaction.date} | ` +
        `Rp ${matchedTransaction.amount.toLocaleString()} | Ref: ${matchedTransaction.reference}`
    );
    
    // Separator
    detailLines.push('');
    detailLines.push(`⚠️ SISA TRANSACTIONS (Total: Rp ${sisaTotal.toLocaleString()})`);
    
    // SISA transactions
    sisaTransactions.forEach((txn, idx) => {
        detailLines.push(
            `   [${txn.type} ${idx + 1}] ${txn.date} | ` +
            `Rp ${txn.amount.toLocaleString()} | Ref: ${txn.reference}`
        );
    });
    
    enhancedTransactionDetails = detailLines.join('\n');
}
```

**Output Example**:
```
✅ MATCHED: [SETORAN] 11/03/07 | Rp 3,710,151.00 | Ref: 6290

⚠️ SISA TRANSACTIONS (Total: Rp 48,972.00)
   [SETORAN 1] 21/03/07 | Rp 48,972.00 | Ref: 6290
```

### Export with SISA Information

**Columns Added**:
- **Column 9**: SISA Alert (`YES ⚠️` or `NO`)
- **Column 10**: SISA Info (`SISA: 1 txn(s), Total: Rp 48,972.00`)
- **Column 13**: Transaction Details (Enhanced with ✅ and ⚠️)

---

## 🔀 Mode-Specific Behavior

### Period Mode (100% Accuracy)

**Purpose**: Weekly reconciliation with exact matching

**Characteristics**:
- ✅ Uses exact ACMM amounts (no rounding)
- ✅ SISA detection enabled (100% exact match check)
- ✅ 500 tolerance for total matching
- ❌ No CDM round-down
- ❌ No fraud alerts
- ✅ Includes SETORAN_TUNAI

**CASH Matching Logic**:
```javascript
1. Check for 100% exact match with individual transactions
   → If found: Status = MATCHED_WITH_SISA
2. If no exact match:
   → Check total with 500 tolerance
   → Status = MATCHED or AMOUNT_MISMATCH
```

**Use Case**: End-of-week reconciliation for accounting

---

### Daily Mode (Fraud Detection)

**Purpose**: Daily fraud detection with variance tolerance

**Characteristics**:
- ✅ SISA detection enabled (exact + rounded match check)
- ✅ CDM amounts rounded down to nearest 50,000
- ✅ ACMM CASH rounded down to nearest 50,000
- ✅ Fraud alerts for mismatches
- ✅ Fraud alert for missing bank deposits
- ❌ SETORAN_TUNAI excluded (manual corrections only)

**CASH Matching Logic**:
```javascript
1. Check for 100% exact match with individual transactions
   → If found: Status = MATCHED_WITH_SISA
2. Round down ACMM to nearest 50,000
3. Check for match with rounded ACMM
   → If found: Status = MATCHED_WITH_SISA
4. If no individual match:
   → Check if total equals rounded ACMM
   → Status = MATCHED or FRAUD_ALERT
5. Excessive variance check (> 5 million):
   → Status = FRAUD_ALERT (override SISA)
```

**Round-Down Logic**:
```javascript
function roundDownTo50k(amount) {
    return Math.floor(amount / 50000) * 50000;
}

// Example: 2,843,500 → 2,800,000
```

**SETORAN_TUNAI Exclusion**:
```javascript
if (matchingMode === 'daily' && transactionType === 'SETORAN_TUNAI') {
    excludedManualBankIn++;
    console.log(`🚫 DAILY MODE: Excluding manual bank-in`);
    continue;  // Skip this transaction
}
```

**Use Case**: Daily monitoring for fraud and operational issues

---

## 📋 Matching Status Codes

| Status | Description | Meaning |
|--------|-------------|---------|
| `MATCHED` | Exact match within tolerance | ✅ Normal |
| `MATCHED_WITH_SISA` | One txn matched 100%, others are SISA | ⚠️ Investigate SISA |
| `AMOUNT_MISMATCH` | Total doesn't match | ❌ Mismatch |
| `FRAUD_ALERT` | (Daily Mode) Suspicious variance | 🚨 Fraud risk |
| `NO_ACMM_DATA` | No ACMM data for outlet | ℹ️ Missing ACMM |
| `NO_BCA_DATA` | No BCA data for outlet | ℹ️ Missing BCA |
| `UNMATCHED` | No data on either side | ℹ️ Unmatched |

---

## 🔑 Key Takeaways

### 1. **Two-Stage Matching**
- **Stage 1**: Check for 100% exact match with individual transactions (BOTH modes)
- **Stage 2**: Apply mode-specific logic if no exact match found

### 2. **SISA Detection is Universal**
- Works in **BOTH Period and Daily modes**
- Detects when ONE transaction matches 100%
- Flags OTHER transactions as SISA

### 3. **Amount Parsing is Context-Dependent**
- **CASH (CDM/SETORAN)**: Column D (Jumlah)
- **NON-CASH (QRIS/CC/DC)**: Description parsing (*SALES* or TGH:)

### 4. **Reference Numbers for Traceability**
- **CDM**: 12-digit card number
- **QRIS/CC/DC**: 7-digit MID
- **SETORAN_TUNAI**: Branch code

### 5. **Daily Mode is Stricter**
- Round-down logic for variance tolerance
- Excludes SETORAN_TUNAI (manual corrections)
- Enables fraud alerts

### 6. **Period Mode is More Accurate**
- Uses exact amounts (no rounding)
- Includes SETORAN_TUNAI
- 500 tolerance for accounting precision

---

## 📂 Related Documentation

- **SISA_DETECTION_FEATURE.md**: Detailed SISA detection documentation
- **TRANSACTION_DETAILS_FEATURE.md**: Transaction details feature documentation
- **MATCHING_MODES_SUMMARY.md**: User guide for Period vs Daily modes
- **CASH_MATCHING_FIX.md**: CASH matching logic fix documentation

---

## 📅 Last Updated
- **Date**: July 15, 2026
- **Version**: v2.3 (with SISA detection in both modes)
- **Author**: Genspark AI Developer
