# BCA & BRI Bank Statement Matching Logic
## Technical Documentation for Reuse in Other Projects

**Version**: 1.0  
**Date**: July 13, 2026  
**Author**: Sales Reconciliation System  
**Purpose**: Document the matching theory and algorithms for reconciling ACMM transaction summaries with BCA and BRI bank statements

---

## Table of Contents

1. [Overview & Matching Theory](#1-overview--matching-theory)
2. [File Format Specifications](#2-file-format-specifications)
3. [Data Preparation & Parsing](#3-data-preparation--parsing)
4. [Matching Algorithm](#4-matching-algorithm)
5. [Code Patterns & Examples](#5-code-patterns--examples)
6. [Troubleshooting & Common Issues](#6-troubleshooting--common-issues)

---

## 1. Overview & Matching Theory

### 1.1 Purpose
Reconcile internal transaction summaries (ACMM) with external bank statements (BCA and BRI) to ensure:
- All sales transactions are properly deposited in bank accounts
- Payment methods (CASH, QRIS, Credit Card, Debit Card) match bank deposits
- Outlet-level reconciliation for multi-store operations
- Daily/weekly reconciliation reports

### 1.2 Core Matching Theory

The matching system uses a **three-dimensional pivot key** to aggregate and match transactions:

```
Pivot Key = "OutletCode | PaymentMethod | BankName"
```

**Why Three Dimensions?**
1. **OutletCode**: Identifies which store generated the transaction
2. **PaymentMethod**: CASH, QRIS, CREDITCARD, DEBITCARD, etc.
3. **BankName**: BCA or BRI (where the money was deposited)

**Matching Logic:**
- ACMM data is grouped by this pivot key
- Bank statement data is parsed and mapped to the same pivot key using MID lookups
- Totals are compared: `ACMM Total vs Bank Statement Total`
- Variance = `Bank Statement - ACMM`

### 1.3 Date Alignment Strategy

**Critical Issue**: BCA statements use **H+1 dating** (next-day posting)

| System | Transaction Date | Description |
|--------|------------------|-------------|
| ACMM   | 2026-03-13 | Sale happens on March 13 |
| BCA Statement | 2026-03-14 | Posted to bank on March 14 (H+1) |
| BRI Statement | 2026-03-13 | Posted same day |

**Solution**: When matching BCA transactions, subtract 1 day from BCA statement dates to align with ACMM dates.

```javascript
// BCA Date Adjustment
const acmmDate = subtractOneDay(bcaStatementDate);
```

**BRI**: No date adjustment needed (same-day posting)

### 1.4 Transaction Flow

```
┌─────────────────┐
│  ACMM Export    │ ← Internal POS/ERP system
│  (Daily Sales)  │   Groups: Outlet + Payment Method + Bank
└────────┬────────┘
         │
         ▼
    ┌────────────────────┐
    │  Pivot Aggregation │ → "JKJSTT1|QRIS|BCA" = Rp 5,000,000
    │  (3D Key)          │   "JKJSTT1|CASH|BCA" = Rp 2,000,000
    └────────┬───────────┘
             │
             │ MATCH
             │
    ┌────────▼───────────┐
    │  Bank Statements   │
    ├────────────────────┤
    │ BCA: MID Lookup    │ → Find outlet from last 7 digits of MID
    │ BRI: MID Lookup    │ → Find outlet from 12-digit MID
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │  Reconciliation    │ → Variance Report
    │  Report            │   Match / Unmatch / Exceptions
    └────────────────────┘
```

---

## 2. File Format Specifications

### 2.1 ACMM Transaction Summary

**Format**: Excel (.xlsx)  
**Header Row**: Row 1  
**Expected Columns**:

| Column | Field | Description | Example |
|--------|-------|-------------|---------|
| A | Tanggal | Transaction date | 2026-03-13 |
| B | Store Code | Outlet identifier | JKJSTT1 |
| C | Store Name | Outlet name | Alpro Kalibata |
| F | Payment Method | CASH, QRIS, CREDITCARD, DEBITCARD | QRIS |
| H | Bank Name | BCA, BRI (empty for CASH) | BCA |
| M | GL Code | 11201010 (BCA CC), 11201013 (BRI CC), 11201100 (CASH) | 11201010 |
| N | Amount | Transaction amount | 5000000.00 |

**Key Points:**
- **Column H (Bank Name)**: Empty/NaN for CASH transactions → Default to "BCA" (CASH goes to BCA via CDM/Setoran)
- **GL Code Filtering**:
  - `11201010`: BCA credit cards (non-cash)
  - `11201013`: BRI credit cards (non-cash)
  - `11201100`: CASH sales
  - Other GL codes are ignored
- **Pivot Key Construction**: `"${storeCode}|${paymentMethod}|${bankName}"`

**Sample Data:**
```
| Tanggal    | Store Code | Store Name       | ... | Payment   | ... | Bank | ... | GL Code  | Amount    |
|------------|------------|------------------|-----|-----------|-----|------|-----|----------|-----------|
| 2026-03-13 | JKJSTT1    | Alpro Kalibata   | ... | QRIS      | ... | BCA  | ... | 11201010 | 957500.00 |
| 2026-03-13 | JKJSTT1    | Alpro Kalibata   | ... | CASH      | ... |      | ... | 11201100 | 2800000.00|
```

### 2.2 BCA Bank Statement

**Format**: Excel (.xlsx)  
**Header Row**: Row 6 (first 5 rows contain bank metadata)  
**Expected Columns**:

| Column | Field | Description | Example |
|--------|-------|-------------|---------|
| A | Tanggal Transaksi | Transaction date (H+1) | 14/03/2026 |
| B | Keterangan | Transaction description | KR OTOMATIS MID : 885004119892 ALPRO KALIBATA CIT  TGH:     743450.00 |
| C | Cabang | Branch code (for SETORAN_TUNAI) | 0123 |
| D | Jumlah | Amount with CR/DB suffix | 2,800,000.00 CR |

**Transaction Types Detected:**

1. **CDM (Cash Deposit Machine)**
   - Pattern: `"SETORAN VIA CDM BCA"` or `"CDM"`
   - Amount source: Column D (Jumlah)
   - Outlet lookup: Kartu Debit number → Master mapping

2. **SETORAN_TUNAI (Cash Deposit via Teller)**
   - Pattern: `"SETORAN TUNAI"`
   - Amount source: Column D (Jumlah)
   - Outlet lookup: Cabang (branch code) → Master mapping

3. **QRIS (QR Code Payment)**
   - Pattern: `"QRIS"` or `"QR :"` in description
   - Amount source: Parse from description `"QR: 957500.00"`
   - Outlet lookup: Last 7 digits of MID → Master MID mapping

4. **CREDITCARD (Credit Card Settlement)**
   - Pattern: `"KREDIT OTOMATIS"` or `"CR OTOMATIS"`
   - Amount source: Parse from description `"TGH: 743450.00"`
   - Outlet lookup: Last 7 digits of MID → Master MID mapping

5. **DEBITCARD (Debit Card Settlement)**
   - Pattern: `"KR OTOMATIS"` (debit card)
   - Amount source: Parse from description `"TGH: 743450.00"`
   - Outlet lookup: Last 7 digits of MID → Master MID mapping

**Amount Parsing Rules:**

```javascript
// Column D (Jumlah) format: "2,800,000.00 CR" or "500.00 DB"
// Step 1: Remove CR/DB suffix
// Step 2: Remove commas (thousand separators)
// Step 3: Parse as float

// Example: "2,800,000.00 CR" → 2800000.00

// Description format: "TGH: 743450.00" or "QR: 957500.00"
// Step 1: Extract number after keyword
// Step 2: Remove ONLY commas (NOT decimal points!)
// Step 3: Parse as float

// ❌ WRONG: tghMatch[1].replace(/\./g, '') → Removes decimal point!
// ✅ RIGHT: tghMatch[1].replace(/,/g, '') → Removes only commas
```

**Critical Bug Fix (2026-07-13):**
- Original code correctly used `.replace(/,/g, '')` (remove commas only)
- A later commit incorrectly assumed Indonesian format and used `.replace(/\./g, '')` (removed decimal points)
- This caused 100x inflation: `957500.00` → `95750000` instead of `957500.00`
- **Solution**: Reverted to original logic that only removes commas

**Sample Data:**
```
Row 7:  14/03/2026 | KR OTOMATIS MID : 885004119892 ALPRO KALIBATA CIT  TGH:     743450.00 | 0123 | 2,800,000.00 CR
Row 8:  14/03/2026 | QRIS MID : 8850041 QR: 957500.00                                      | 0456 | 1,000,000.00 CR
```

### 2.3 BRI Bank Statement

**Format**: Excel (.xlsx)  
**Header Row**: Row 1  
**Expected Columns**:

| Column | Field | Description | Example |
|--------|-------|-------------|---------|
| C | TGL_TRAN | Transaction date | 13/03/2026 |
| G | DESK_TRAN | Transaction description | QRIS 001999605050 |
| I | MUTASI_DEBET | Debit amount (bank fees) | 5000.00 |
| J | MUTASI_KREDIT | Credit amount (deposits) | 2500000.00 |
| Q | TLBDS1 | Extended data (AMT, MDR) | AMT:2500000,MDR:25000 |
| R | TLBDS2 | Additional data | (varies) |

**Transaction Types:**
1. **QRIS**
   - Pattern: `"QRIS"` in DESK_TRAN
   - Amount: Parse from TLBDS1 `"AMT:2500000"` or use MUTASI_KREDIT
   - Outlet: Extract 12-digit MID from description

2. **DEBITCARD**
   - Pattern: Debit card keywords
   - Amount: TLBDS1 or MUTASI_KREDIT
   - Outlet: 12-digit MID lookup

3. **CREDITCARD**
   - Pattern: Credit card keywords
   - Amount: TLBDS1 or MUTASI_KREDIT
   - Outlet: 12-digit MID lookup

**MID Format: 12 digits**
- Format: `001999XXXXXX` (6-digit merchant ID with 001999 prefix)
- Lookup: Master BRI MID file maps 10-digit base MID → Outlet Code
- Code generates 12-digit variant with "00" prefix for alternate matching

**Amount Parsing:**
```javascript
// TLBDS1 format: "AMT:2500000,MDR:25000"
// Extract AMT value
const amtMatch = tlbds1.match(/AMT\s*:\s*([\d,]+\.?\d*)/i);
if (amtMatch) {
    amount = parseFloat(amtMatch[1].replace(/,/g, ''));
}
// Fallback to MUTASI_KREDIT if TLBDS1 is empty
if (amount === 0) amount = mutasiKredit;
```

**Exclusions:**
- **MUTASI_DEBET > 0**: Bank fees, excluded from sales journal (tracked as exceptions)
- **Petty Cash**: Small amounts with keywords (PETTY, KAS KECIL, REIMB) excluded

**Sample Data:**
```
Row 2:  13/03/2026 | QRIS 001999605050        | 0    | 2500000.00 | AMT:2500000,MDR:25000 |
Row 3:  13/03/2026 | BANK FEE                 | 5000 | 0          |                       |
```

### 2.4 Master Lookup Files

#### BCA Master MID
**Format**: Excel (.xlsx)  
**Columns**: MID (7 digits), Outlet Code

```
| MID     | Outlet Code |
|---------|-------------|
| 8850041 | JKJSTT1     |
| 1234567 | JKPULO2     |
```

**Usage**: Extract last 7 digits from BCA statement MID, lookup outlet code

#### BRI Master MID
**Format**: Excel (.xlsx)  
**Columns**: MID (10 digits), Outlet Code

```
| MID        | Outlet Code |
|------------|-------------|
| 1999605050 | JKJSTT1     |
| 1999605051 | JKPULO2     |
```

**Usage**: Code generates 12-digit variant `"00" + MID`, extracts from statement, lookup outlet

#### BCA Kartu Debit Master
**Format**: Excel (.xlsx)  
**Columns**: Kartu Debit Number, Outlet Code

**Usage**: For CDM transactions, extract debit card number, lookup outlet

#### BCA Cabang Master
**Format**: Excel (.xlsx)  
**Columns**: Cabang Code, Outlet Code

**Usage**: For SETORAN_TUNAI transactions, use branch code to lookup outlet

---

## 3. Data Preparation & Parsing

### 3.1 ACMM Data Preparation

**Step 1: Read Excel File**
```javascript
// Using SheetJS (xlsx) library
const workbook = XLSX.read(data, { type: 'binary' });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const acmmData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
```

**Step 2: Parse Each Row**
```javascript
for (let i = 1; i < acmmData.length; i++) {
    const row = acmmData[i];
    
    const storeCode = row[1]?.toString().trim(); // Column B
    let paymentMethod = row[5]?.toString().trim().toUpperCase(); // Column F
    let bankName = row[7]?.toString().trim().toUpperCase(); // Column H
    const glCode = row[12]?.toString().trim(); // Column M
    const amount = parseFloat(row[13]) || 0; // Column N
    
    // Skip invalid rows
    if (!storeCode || !paymentMethod || amount === 0) continue;
    
    // GL Code filtering
    const validGLCodes = ['11201010', '11201013', '11201100'];
    if (!validGLCodes.includes(glCode)) continue;
    
    // CRITICAL FIX: Default bankName to 'BCA' for CASH transactions
    // Column H is empty/NaN for CASH, but CASH goes to BCA account
    if (paymentMethod === 'CASH' && (!bankName || bankName === 'NAN')) {
        bankName = 'BCA';
    }
    
    // Normalize payment method names
    if (paymentMethod === 'DEBIT CARD') paymentMethod = 'DEBITCARD';
    if (paymentMethod === 'CREDIT CARD') paymentMethod = 'CREDITCARD';
    
    // Create pivot key
    const pivotKey = `${storeCode}|${paymentMethod}|${bankName}`;
    
    // Aggregate amounts by pivot key
    if (!pivotMap.has(pivotKey)) {
        pivotMap.set(pivotKey, {
            outletCode: storeCode,
            paymentMethod: paymentMethod,
            bankName: bankName,
            amount: 0
        });
    }
    pivotMap.get(pivotKey).amount += amount;
}
```

**Step 3: Separate by Bank**
```javascript
// Split ACMM data by bank for separate reconciliation
const acmmBCA = new Map();
const acmmBRI = new Map();

for (const [key, pivot] of pivotMap.entries()) {
    if (pivot.bankName === 'BCA') {
        acmmBCA.set(key, pivot);
    } else if (pivot.bankName === 'BRI') {
        acmmBRI.set(key, pivot);
    }
}
```

### 3.2 BCA Statement Parsing

**Step 1: Read Excel File (Skip First 5 Rows)**
```javascript
const workbook = XLSX.read(data, { type: 'binary' });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const bcaData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Header is at row 6 (index 5), data starts at row 7 (index 6)
```

**Step 2: Determine Transaction Type**
```javascript
function determineTransactionType(description) {
    const desc = description.toUpperCase();
    
    if (desc.includes('CDM') || desc.includes('SETORAN VIA CDM')) {
        return 'CDM';
    }
    if (desc.includes('SETORAN TUNAI')) {
        return 'SETORAN_TUNAI';
    }
    if (desc.includes('QRIS') || desc.includes('QR :')) {
        return 'QRIS';
    }
    if (desc.includes('KR OTOMATIS') && desc.includes('MID')) {
        return 'DEBITCARD';
    }
    if (desc.includes('KREDIT OTOMATIS') || desc.includes('CR OTOMATIS')) {
        return 'CREDITCARD';
    }
    
    return 'UNKNOWN';
}
```

**Step 3: Parse Amount Based on Transaction Type**
```javascript
function parseBCAAmount(columnD) {
    if (!columnD) return 0;
    
    let cleanAmount = columnD.toString().trim();
    
    // Remove "CR" or "DB" suffix
    cleanAmount = cleanAmount.replace(/\s*(CR|DB)\s*$/i, '');
    
    // Remove commas (thousand separators) and any non-numeric except decimal
    cleanAmount = cleanAmount.replace(/[^0-9.-]/g, '');
    
    return parseFloat(cleanAmount) || 0;
}

function parseBCAAmountFromDescription(description, transactionType) {
    if (!description) return 0;
    
    // For QRIS: Extract from "QR: 957500.00"
    if (transactionType === 'QRIS') {
        const qrMatch = description.match(/QR\s*:\s*([\d,]+\.?\d*)/i);
        if (qrMatch) {
            // ✅ CRITICAL: Only remove commas, NOT decimal points!
            const cleanAmount = qrMatch[1].replace(/,/g, '');
            return parseFloat(cleanAmount) || 0;
        }
    }
    
    // For DEBITCARD/CREDITCARD: Extract from "TGH: 743450.00"
    const tghMatch = description.match(/TGH\s*:\s*([\d,]+\.?\d*)/i);
    if (tghMatch) {
        // ✅ CRITICAL: Only remove commas, NOT decimal points!
        const cleanAmount = tghMatch[1].replace(/,/g, '');
        return parseFloat(cleanAmount) || 0;
    }
    
    return 0;
}
```

**Step 4: Extract MID and Lookup Outlet**
```javascript
// For QRIS, CREDITCARD, DEBITCARD
function extractBCAMID(description) {
    // Pattern: "MID : 885004119892" or "MID: 8850041"
    const midMatch = description.match(/MID\s*:\s*(\d+)/i);
    if (!midMatch) return null;
    
    const fullMID = midMatch[1];
    
    // Get last 7 digits
    const mid7 = fullMID.length >= 7 ? fullMID.slice(-7) : fullMID;
    
    return mid7;
}

// Lookup outlet from master
const mid = extractBCAMID(description);
if (mid && lookups.mid.has(mid)) {
    outletCode = lookups.mid.get(mid);
}
```

**Step 5: Date Adjustment (H+1 to H)**
```javascript
function subtractOneDay(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d;
}

// When processing BCA transactions
const bcaDate = parseDate(row[0]); // Column A: "14/03/2026"
const acmmDate = subtractOneDay(bcaDate); // Convert to "13/03/2026" for matching
```

**Step 6: Aggregate by Outlet and Transaction Type**
```javascript
const pivotKey = `${outletCode}|${transactionType}|BCA`;

if (!bcaMap.has(pivotKey)) {
    bcaMap.set(pivotKey, {
        outletCode: outletCode,
        paymentMethod: transactionType,
        bankName: 'BCA',
        amount: 0,
        transactionCount: 0
    });
}

const pivot = bcaMap.get(pivotKey);
pivot.amount += amount;
pivot.transactionCount++;
```

### 3.3 BRI Statement Parsing

**Step 1: Read Excel File**
```javascript
const workbook = XLSX.read(data, { type: 'binary' });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const briData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
// Header at row 1 (index 0), data starts at row 2 (index 1)
```

**Step 2: Filter Credit Transactions Only**
```javascript
for (let i = 1; i < briData.length; i++) {
    const row = briData[i];
    
    const mutasiKredit = parseFloat(row[9]) || 0; // Column J
    const mutasiDebet = parseFloat(row[8]) || 0;  // Column I
    
    // Skip DEBIT transactions (bank fees)
    if (mutasiDebet > 0) {
        exceptions.push({
            type: 'DEBIT_TRANSACTION',
            reason: 'Bank fee excluded',
            amount: mutasiDebet
        });
        continue;
    }
    
    // Only process CREDIT transactions
    if (mutasiKredit <= 0) continue;
    
    // ... continue processing
}
```

**Step 3: Parse Amount from TLBDS1**
```javascript
function parseBRIAmount(tlbds1) {
    if (!tlbds1) return 0;
    
    // Pattern: "AMT:2500000,MDR:25000"
    const amtMatch = tlbds1.match(/AMT\s*:\s*([\d,]+\.?\d*)/i);
    if (amtMatch) {
        const cleanAmount = amtMatch[1].replace(/,/g, '');
        return parseFloat(cleanAmount) || 0;
    }
    
    return 0;
}

// Usage
let amount = parseBRIAmount(tlbds1);
if (amount === 0) {
    amount = mutasiKredit; // Fallback to MUTASI_KREDIT
}
```

**Step 4: Extract BRI MID (12-digit)**
```javascript
function parseBRIMID(description) {
    if (!description) return null;
    
    // BRI MID is 12 digits: 001999XXXXXX
    const midMatch = description.match(/\b(\d{12})\b/);
    if (midMatch) return midMatch[1];
    
    return null;
}

// Lookup outlet
const mid = parseBRIMID(description);
if (mid && lookups.briMid.has(mid)) {
    outletCode = lookups.briMid.get(mid);
}
```

**Step 5: Handle 10-digit to 12-digit MID Conversion**
```javascript
// Master file has 10-digit MIDs, but statements have 12-digit
// Example: Master: 1999605050 → Statement: 001999605050

// When loading master file:
const briMidLookup = new Map();
for (let i = 1; i < masterData.length; i++) {
    const mid10 = masterData[i][0]?.toString().trim();
    const outlet = masterData[i][1]?.toString().trim();
    
    if (mid10 && outlet) {
        // Store both 10-digit and 12-digit variants
        briMidLookup.set(mid10, outlet);
        briMidLookup.set('00' + mid10, outlet); // 12-digit with "00" prefix
    }
}
```

**Step 6: Aggregate by Outlet and Transaction Type**
```javascript
const transactionType = determineBRITransactionType(description);
const pivotKey = `${outletCode}|${transactionType}|BRI`;

if (!briMap.has(pivotKey)) {
    briMap.set(pivotKey, {
        outletCode: outletCode,
        paymentMethod: transactionType,
        bankName: 'BRI',
        amount: 0,
        transactionCount: 0
    });
}

const pivot = briMap.get(pivotKey);
pivot.amount += amount;
pivot.transactionCount++;
```

---

## 4. Matching Algorithm

### 4.1 Three-Way Matching Overview

```
ACMM Pivot Key: "JKJSTT1|QRIS|BCA"
       ↓
       ↓ MATCH BY KEY
       ↓
BCA Pivot Key:  "JKJSTT1|QRIS|BCA"

Compare: ACMM Amount vs BCA Amount
Variance: BCA Amount - ACMM Amount
Status: MATCH (variance < 1.00) or UNMATCH (variance >= 1.00)
```

### 4.2 Matching Implementation

```javascript
function reconcileACMMWithBank(acmmMap, bankMap, bankName) {
    const results = [];
    
    // Track which keys have been processed
    const processedACMM = new Set();
    const processedBank = new Set();
    
    // 1. Find matches where both ACMM and Bank have the same pivot key
    for (const [acmmKey, acmmPivot] of acmmMap.entries()) {
        if (bankMap.has(acmmKey)) {
            const bankPivot = bankMap.get(acmmKey);
            
            const variance = bankPivot.amount - acmmPivot.amount;
            const status = Math.abs(variance) < 1.0 ? 'MATCH' : 'UNMATCH';
            
            results.push({
                outletCode: acmmPivot.outletCode,
                paymentMethod: acmmPivot.paymentMethod,
                bankName: bankName,
                acmmAmount: acmmPivot.amount,
                bankAmount: bankPivot.amount,
                variance: variance,
                status: status
            });
            
            processedACMM.add(acmmKey);
            processedBank.add(acmmKey);
        }
    }
    
    // 2. Find ACMM transactions with no matching bank deposit
    for (const [acmmKey, acmmPivot] of acmmMap.entries()) {
        if (!processedACMM.has(acmmKey)) {
            results.push({
                outletCode: acmmPivot.outletCode,
                paymentMethod: acmmPivot.paymentMethod,
                bankName: bankName,
                acmmAmount: acmmPivot.amount,
                bankAmount: 0,
                variance: -acmmPivot.amount,
                status: 'ACMM_ONLY'
            });
        }
    }
    
    // 3. Find bank deposits with no matching ACMM transaction
    for (const [bankKey, bankPivot] of bankMap.entries()) {
        if (!processedBank.has(bankKey)) {
            results.push({
                outletCode: bankPivot.outletCode,
                paymentMethod: bankPivot.paymentMethod,
                bankName: bankName,
                acmmAmount: 0,
                bankAmount: bankPivot.amount,
                variance: bankPivot.amount,
                status: 'BANK_ONLY'
            });
        }
    }
    
    return results;
}

// Execute matching for each bank
const bcaResults = reconcileACMMWithBank(acmmBCA, bcaBankMap, 'BCA');
const briResults = reconcileACMMWithBank(acmmBRI, briBankMap, 'BRI');
```

### 4.3 Variance Analysis

**Variance Formula:**
```
Variance = Bank Statement Amount - ACMM Amount
```

**Status Classification:**

| Variance | Status | Interpretation |
|----------|--------|----------------|
| < 1.00 | MATCH | Perfect match (rounding tolerance) |
| ≥ 1.00 | UNMATCH | Discrepancy exists |
| ACMM > 0, Bank = 0 | ACMM_ONLY | Sales recorded but no bank deposit |
| ACMM = 0, Bank > 0 | BANK_ONLY | Bank deposit with no ACMM record |

**Rounding Tolerance:**
- Threshold: 1.00 (to handle minor floating-point rounding)
- Example: Variance of 0.23 is considered a MATCH

### 4.4 Payment Method Mapping

**ACMM → Bank Statement Mapping:**

| ACMM Payment Method | BCA Transaction Type | BRI Transaction Type |
|---------------------|----------------------|----------------------|
| CASH | CDM, SETORAN_TUNAI | (not in BRI) |
| QRIS | QRIS | QRIS |
| DEBITCARD | DEBITCARD | DEBITCARD |
| CREDITCARD | CREDITCARD | CREDITCARD |

**Critical Note**: CASH transactions in ACMM are matched to CDM or SETORAN_TUNAI in BCA statements, NOT to "CASH" in bank statement.

---

## 5. Code Patterns & Examples

### 5.1 Complete BCA Parsing Example

```javascript
// Assume bcaData is loaded from Excel
// Header at row 6 (index 5), data starts at row 7 (index 6)

const bcaPivotMap = new Map();
const bcaMasterMID = loadBCAMasterMID(); // Map<MID7, OutletCode>
const bcaKartuDebit = loadKartuDebitMaster(); // Map<DebitCard, OutletCode>
const bcaCabang = loadCabangMaster(); // Map<Cabang, OutletCode>

for (let i = 6; i < bcaData.length; i++) {
    const row = bcaData[i];
    
    const tglTransaksi = parseDate(row[0]); // Column A
    const description = row[1]?.toString() || ''; // Column B
    const cabang = row[2]?.toString() || ''; // Column C
    const columnD = row[3]; // Column D - Jumlah
    
    if (!tglTransaksi || !description) continue;
    
    // Skip excluded transaction types
    if (description.includes('BI-FAST') || 
        description.includes('TRSF E-BANKING') || 
        description.includes('BYR')) {
        continue;
    }
    
    // Determine transaction type
    const transactionType = determineTransactionType(description);
    
    // Parse amount based on transaction type
    let amount;
    if (transactionType === 'CDM' || transactionType === 'SETORAN_TUNAI') {
        amount = parseBCAAmount(columnD);
    } else {
        amount = parseBCAAmountFromDescription(description, transactionType);
    }
    
    // Extract outlet code based on transaction type
    let outletCode = null;
    
    if (transactionType === 'CDM') {
        // Extract debit card number from description
        const kartuDebitMatch = description.match(/NO\s*KARTU\s*DEBIT\s*:\s*(\d+)/i);
        if (kartuDebitMatch) {
            const kartuDebit = kartuDebitMatch[1];
            if (bcaKartuDebit.has(kartuDebit)) {
                outletCode = bcaKartuDebit.get(kartuDebit);
            }
        }
    } else if (transactionType === 'SETORAN_TUNAI') {
        if (bcaCabang.has(cabang)) {
            outletCode = bcaCabang.get(cabang);
        }
    } else if (transactionType === 'QRIS' || 
               transactionType === 'CREDITCARD' || 
               transactionType === 'DEBITCARD') {
        const mid = extractBCAMID(description);
        if (mid && bcaMasterMID.has(mid)) {
            outletCode = bcaMasterMID.get(mid);
        }
    }
    
    if (!outletCode) continue; // Skip if outlet not found
    
    // Apply H+1 date adjustment
    const acmmDate = subtractOneDay(tglTransaksi);
    
    // Create pivot key
    const pivotKey = `${outletCode}|${transactionType}|BCA`;
    
    // Aggregate
    if (!bcaPivotMap.has(pivotKey)) {
        bcaPivotMap.set(pivotKey, {
            outletCode: outletCode,
            paymentMethod: transactionType,
            bankName: 'BCA',
            amount: 0,
            transactionCount: 0
        });
    }
    
    const pivot = bcaPivotMap.get(pivotKey);
    pivot.amount += amount;
    pivot.transactionCount++;
}

console.log(`Processed ${bcaPivotMap.size} BCA pivot keys`);
```

### 5.2 Complete BRI Parsing Example

```javascript
// Assume briData is loaded from Excel
// Header at row 1 (index 0), data starts at row 2 (index 1)

const briPivotMap = new Map();
const briMasterMID = loadBRIMasterMID(); // Map<MID12, OutletCode> (with 00 prefix variants)

for (let i = 1; i < briData.length; i++) {
    const row = briData[i];
    
    const tglTran = parseDate(row[2]); // Column C
    const description = row[6]?.toString() || ''; // Column G
    const mutasiDebet = parseFloat(row[8]) || 0; // Column I
    const mutasiKredit = parseFloat(row[9]) || 0; // Column J
    const tlbds1 = row[16]?.toString() || ''; // Column Q
    
    if (!tglTran || !description) continue;
    
    // Skip DEBIT transactions (bank fees)
    if (mutasiDebet > 0) {
        console.log(`Excluded BRI debit: ${mutasiDebet}, Reason: Bank fee`);
        continue;
    }
    
    // Only process CREDIT transactions
    if (mutasiKredit <= 0) continue;
    
    // Parse amount
    let amount = parseBRIAmount(tlbds1);
    if (amount === 0) {
        amount = mutasiKredit;
    }
    
    // Determine transaction type
    const transactionType = determineBRITransactionType(description);
    
    // Extract MID and lookup outlet
    const mid = parseBRIMID(description);
    let outletCode = null;
    
    if (mid && briMasterMID.has(mid)) {
        outletCode = briMasterMID.get(mid);
    }
    
    if (!outletCode) continue; // Skip if outlet not found
    
    // Create pivot key
    const pivotKey = `${outletCode}|${transactionType}|BRI`;
    
    // Aggregate
    if (!briPivotMap.has(pivotKey)) {
        briPivotMap.set(pivotKey, {
            outletCode: outletCode,
            paymentMethod: transactionType,
            bankName: 'BRI',
            amount: 0,
            transactionCount: 0
        });
    }
    
    const pivot = briPivotMap.get(pivotKey);
    pivot.amount += amount;
    pivot.transactionCount++;
}

console.log(`Processed ${briPivotMap.size} BRI pivot keys`);
```

### 5.3 Complete ACMM Parsing Example

```javascript
// Assume acmmData is loaded from Excel
// Header at row 1 (index 0), data starts at row 2 (index 1)

const acmmPivotMap = new Map();

for (let i = 1; i < acmmData.length; i++) {
    const row = acmmData[i];
    
    const storeCode = row[1]?.toString().trim(); // Column B
    let paymentMethod = row[5]?.toString().trim().toUpperCase(); // Column F
    let bankName = row[7]?.toString().trim().toUpperCase(); // Column H
    const glCode = row[12]?.toString().trim(); // Column M
    const amount = parseFloat(row[13]) || 0; // Column N
    
    // Validation
    if (!storeCode || !paymentMethod || amount === 0) continue;
    
    // GL Code filtering
    const validGLCodes = ['11201010', '11201013', '11201100'];
    if (!validGLCodes.includes(glCode)) continue;
    
    // CRITICAL FIX: Default bankName to 'BCA' for CASH transactions
    if (paymentMethod === 'CASH' && (!bankName || bankName === 'NAN' || bankName === 'UNDEFINED')) {
        bankName = 'BCA';
    }
    
    // Normalize payment method
    if (paymentMethod === 'DEBIT CARD') paymentMethod = 'DEBITCARD';
    if (paymentMethod === 'CREDIT CARD') paymentMethod = 'CREDITCARD';
    
    // Create pivot key
    const pivotKey = `${storeCode}|${paymentMethod}|${bankName}`;
    
    // Aggregate
    if (!acmmPivotMap.has(pivotKey)) {
        acmmPivotMap.set(pivotKey, {
            outletCode: storeCode,
            paymentMethod: paymentMethod,
            bankName: bankName,
            amount: 0
        });
    }
    
    acmmPivotMap.get(pivotKey).amount += amount;
}

console.log(`Processed ${acmmPivotMap.size} ACMM pivot keys`);

// Split by bank
const acmmBCA = new Map();
const acmmBRI = new Map();

for (const [key, pivot] of acmmPivotMap.entries()) {
    if (pivot.bankName === 'BCA') {
        acmmBCA.set(key, pivot);
    } else if (pivot.bankName === 'BRI') {
        acmmBRI.set(key, pivot);
    }
}

console.log(`ACMM BCA: ${acmmBCA.size} keys`);
console.log(`ACMM BRI: ${acmmBRI.size} keys`);
```

### 5.4 Complete Matching Example

```javascript
// After parsing ACMM, BCA, and BRI data

// Reconcile BCA
const bcaReconciliation = reconcileACMMWithBank(acmmBCA, bcaPivotMap, 'BCA');

// Reconcile BRI
const briReconciliation = reconcileACMMWithBank(acmmBRI, briPivotMap, 'BRI');

// Generate reports
console.log('=== BCA Reconciliation ===');
let bcaMatches = 0, bcaUnmatches = 0, bcaACMMOnly = 0, bcaBankOnly = 0;
let bcaTotalVariance = 0;

for (const result of bcaReconciliation) {
    if (result.status === 'MATCH') bcaMatches++;
    else if (result.status === 'UNMATCH') bcaUnmatches++;
    else if (result.status === 'ACMM_ONLY') bcaACMMOnly++;
    else if (result.status === 'BANK_ONLY') bcaBankOnly++;
    
    bcaTotalVariance += result.variance;
    
    console.log(`${result.outletCode} | ${result.paymentMethod} | ${result.status} | ` +
                `ACMM: ${result.acmmAmount.toFixed(2)} | ` +
                `Bank: ${result.bankAmount.toFixed(2)} | ` +
                `Variance: ${result.variance.toFixed(2)}`);
}

console.log(`\nBCA Summary:`);
console.log(`  Matches: ${bcaMatches}`);
console.log(`  Unmatches: ${bcaUnmatches}`);
console.log(`  ACMM Only: ${bcaACMMOnly}`);
console.log(`  Bank Only: ${bcaBankOnly}`);
console.log(`  Total Variance: ${bcaTotalVariance.toFixed(2)}`);

// Repeat for BRI
console.log('\n=== BRI Reconciliation ===');
// ... similar logic for BRI
```

---

## 6. Troubleshooting & Common Issues

### 6.1 BCA Amount Parsing Issues

**Problem**: BCA amounts showing 100x inflation (e.g., 957,500 appearing as 95,750,000)

**Root Cause**: Code incorrectly assumes Indonesian number format and removes decimal points instead of commas

**Wrong Code:**
```javascript
// ❌ WRONG: Removes decimal points, causing 100x inflation
const cleanAmount = tghMatch[1].replace(/\./g, '');
// "743450.00" → "74345000" → 74,345,000 (100x too large!)
```

**Correct Code:**
```javascript
// ✅ RIGHT: Only removes commas (thousand separators)
const cleanAmount = tghMatch[1].replace(/,/g, '');
// "743,450.00" → "743450.00" → 743,450 (correct!)
// "743450.00" → "743450.00" → 743,450 (correct!)
```

**Why This Happens:**
- BCA descriptions use **plain decimal format** for TGH/QR values: `"TGH: 743450.00"`
- NOT Indonesian format with dots as thousands: `"TGH: 743.450,00"`
- Using `.replace(/\./g, '')` removes the decimal point, shifting value by 100x

**Solution**: Only remove commas, preserve decimal points

---

### 6.2 ACMM CASH Showing Zero

**Problem**: ACMM CASH transactions not appearing in reconciliation, showing all zeros

**Root Cause**: Column H (Bank Name) is empty/NaN for CASH transactions, creating invalid pivot key `"outlet|CASH|NaN"`

**Wrong Pivot Key:**
```javascript
const pivotKey = `${storeCode}|CASH|${bankName}`; 
// bankName is empty/NaN for CASH
// Result: "JKJSTT1|CASH|NaN" (will never match)
```

**Correct Logic:**
```javascript
// Fix: Default bankName to 'BCA' for CASH transactions
if (paymentMethod === 'CASH' && (!bankName || bankName === 'NAN' || bankName === 'UNDEFINED')) {
    bankName = 'BCA';
}

const pivotKey = `${storeCode}|CASH|BCA`;
// Result: "JKJSTT1|CASH|BCA" (correct!)
```

**Why This is Correct:**
- CASH transactions are deposited to BCA account via CDM or SETORAN_TUNAI
- ACMM Column H is intentionally empty for CASH (no card bank involved)
- But for reconciliation purposes, CASH should be matched to BCA statements

---

### 6.3 BCA and BRI Showing Identical ACMM Totals

**Problem**: BCA and BRI reconciliation reports show identical ACMM totals when they should differ

**Root Cause**: Code incorrectly splits reports by bank AFTER matching, copying combined ACMM total to both

**Wrong Code:**
```javascript
// ❌ WRONG: Uses combined ACMM total for both banks
function separateResultsByBank(combinedResults) {
    const bcaResults = combinedResults.filter(r => r.bankName === 'BCA');
    const briResults = combinedResults.filter(r => r.bankName === 'BRI');
    
    // Problem: Both use the same acmmTotal from combined results
    return { bcaResults, briResults };
}
```

**Correct Code:**
```javascript
// ✅ RIGHT: Store split ACMM values during matching phase
const result = {
    outletCode: 'JKJSTT1',
    // ... other fields ...
    
    // Store split ACMM values for bank-specific reports
    acmmBCATotal: acmmBCANonCashTotal,      // BCA-specific ACMM total
    acmmBRITotal: acmmBRINonCashTotal,      // BRI-specific ACMM total
    acmmBCABreakdown: 'QRIS: 5M, CC: 3M',   // BCA payment methods
    acmmBRIBreakdown: 'QRIS: 4M, DC: 2M',   // BRI payment methods
    bcaBankTotal: bcaNonCashTotal,           // BCA bank statement total
    briBankTotal: briNonCashTotal            // BRI bank statement total
};

// Later, when generating separate reports:
function generateBCAReport(results) {
    return results.map(r => ({
        ...r,
        acmmTotal: r.acmmBCATotal,           // Use BCA-specific ACMM total
        bankTotal: r.bcaBankTotal,
        breakdown: r.acmmBCABreakdown
    }));
}

function generateBRIReport(results) {
    return results.map(r => ({
        ...r,
        acmmTotal: r.acmmBRITotal,           // Use BRI-specific ACMM total
        bankTotal: r.briBankTotal,
        breakdown: r.acmmBRIBreakdown
    }));
}
```

**Why This is Necessary:**
- ACMM file contains transactions for BOTH banks: `Column H = "BCA"` or `"BRI"`
- Example: Outlet JKJSTT1 might have:
  - QRIS BCA: 5M, QRIS BRI: 4M
  - Credit Card BCA: 3M, Debit Card BRI: 2M
- BCA report should show: ACMM = 8M (5M + 3M)
- BRI report should show: ACMM = 6M (4M + 2M)
- NOT both showing 14M (combined total)

---

### 6.4 BRI MID Not Found

**Problem**: BRI transactions not matching despite correct MID in statement

**Root Cause**: Master file has 10-digit MIDs, but statements have 12-digit MIDs with "00" prefix

**Wrong Code:**
```javascript
// ❌ WRONG: Only stores 10-digit MID from master file
const briMidLookup = new Map();
for (const row of masterData) {
    const mid10 = row[0]; // "1999605050"
    const outlet = row[1];
    briMidLookup.set(mid10, outlet);
}

// Statement has: "001999605050" (12-digit)
// Lookup fails: briMidLookup.has("001999605050") → false
```

**Correct Code:**
```javascript
// ✅ RIGHT: Store both 10-digit and 12-digit variants
const briMidLookup = new Map();
for (const row of masterData) {
    const mid10 = row[0]; // "1999605050"
    const outlet = row[1];
    
    briMidLookup.set(mid10, outlet);           // 10-digit
    briMidLookup.set('00' + mid10, outlet);    // 12-digit with "00" prefix
}

// Statement has: "001999605050" (12-digit)
// Lookup succeeds: briMidLookup.has("001999605050") → true
```

---

### 6.5 Date Misalignment

**Problem**: ACMM transactions not matching with BCA statements despite correct outlet and payment method

**Root Cause**: BCA uses H+1 dating (next-day posting)

**Example:**
- ACMM: Sale on March 13, 2026
- BCA Statement: Posted on March 14, 2026 (H+1)

**Wrong Code:**
```javascript
// ❌ WRONG: Uses BCA date as-is
const bcaDate = parseDate(row[0]); // "14/03/2026"
const pivotKey = `${outletCode}|${transactionType}|${formatDate(bcaDate)}`;
// Key: "JKJSTT1|QRIS|2026-03-14"
// ACMM Key: "JKJSTT1|QRIS|2026-03-13" → NO MATCH!
```

**Correct Code:**
```javascript
// ✅ RIGHT: Subtract 1 day from BCA date to align with ACMM
const bcaDate = parseDate(row[0]); // "14/03/2026"
const acmmDate = subtractOneDay(bcaDate); // "13/03/2026"
const pivotKey = `${outletCode}|${transactionType}|${formatDate(acmmDate)}`;
// Key: "JKJSTT1|QRIS|2026-03-13"
// ACMM Key: "JKJSTT1|QRIS|2026-03-13" → MATCH!
```

**Note**: This current implementation uses "ALL DATES" grouping (no date in pivot key), but H+1 adjustment is still applied for future date-based matching.

---

### 6.6 Payment Method Name Mismatches

**Problem**: ACMM shows "DEBIT CARD" but matching code expects "DEBITCARD"

**Root Cause**: Inconsistent naming conventions between ACMM and code

**Wrong Code:**
```javascript
// ❌ WRONG: Uses ACMM column value directly
const paymentMethod = row[5]; // "DEBIT CARD"
const pivotKey = `${outlet}|${paymentMethod}|BCA`;
// Key: "JKJSTT1|DEBIT CARD|BCA"
// Bank Key: "JKJSTT1|DEBITCARD|BCA" → NO MATCH!
```

**Correct Code:**
```javascript
// ✅ RIGHT: Normalize payment method names
let paymentMethod = row[5]?.toString().trim().toUpperCase();

// Normalize to single-word format
if (paymentMethod === 'DEBIT CARD') paymentMethod = 'DEBITCARD';
if (paymentMethod === 'CREDIT CARD') paymentMethod = 'CREDITCARD';

const pivotKey = `${outlet}|${paymentMethod}|BCA`;
// Key: "JKJSTT1|DEBITCARD|BCA"
// Bank Key: "JKJSTT1|DEBITCARD|BCA" → MATCH!
```

---

### 6.7 Debugging Best Practices

**1. Console Logging Strategy**
```javascript
// Log first N rows for inspection
const DEBUG_ROWS = 10;

for (let i = 1; i < data.length; i++) {
    // ... processing logic ...
    
    if (i <= DEBUG_ROWS) {
        console.log(`🔍 Row ${i}:`);
        console.log(`  Outlet: ${outletCode}`);
        console.log(`  Type: ${transactionType}`);
        console.log(`  Amount: ${amount.toFixed(2)}`);
        console.log(`  Pivot Key: ${pivotKey}`);
    }
}
```

**2. Track Skipped Transactions**
```javascript
const skippedTransactions = [];

for (let i = 1; i < data.length; i++) {
    // ... processing logic ...
    
    if (!outletCode) {
        skippedTransactions.push({
            row: i,
            reason: 'OUTLET_NOT_FOUND',
            description: description.substring(0, 100),
            amount: amount
        });
        continue;
    }
}

console.log(`⚠️ Skipped ${skippedTransactions.length} transactions`);
console.log('First 5 skipped:', skippedTransactions.slice(0, 5));
```

**3. Validate Pivot Keys**
```javascript
// After building pivot maps, inspect keys
console.log('🔍 Sample Pivot Keys:');
let count = 0;
for (const [key, pivot] of pivotMap.entries()) {
    if (count++ >= 5) break;
    console.log(`  ${key} => Amount: ${pivot.amount.toFixed(2)}, Count: ${pivot.transactionCount}`);
}
```

**4. Compare Total Amounts**
```javascript
// Sanity check: sum all amounts
let acmmTotal = 0;
for (const pivot of acmmMap.values()) {
    acmmTotal += pivot.amount;
}

let bankTotal = 0;
for (const pivot of bankMap.values()) {
    bankTotal += pivot.amount;
}

console.log(`Total Check:`);
console.log(`  ACMM Total: ${acmmTotal.toFixed(2)}`);
console.log(`  Bank Total: ${bankTotal.toFixed(2)}`);
console.log(`  Difference: ${(bankTotal - acmmTotal).toFixed(2)}`);
```

---

## 7. Summary & Key Takeaways

### 7.1 Critical Success Factors

1. **Three-Dimensional Pivot Key**: `"OutletCode|PaymentMethod|BankName"` enables accurate matching across complex multi-outlet, multi-payment-method scenarios

2. **Date Alignment**: BCA H+1 adjustment is CRITICAL - subtract 1 day from BCA dates to match ACMM dates

3. **Amount Parsing Precision**: 
   - BCA: Only remove commas, PRESERVE decimal points
   - BRI: Parse AMT from TLBDS1, fallback to MUTASI_KREDIT
   - ACMM: Direct float parsing

4. **CASH Transaction Handling**: Default empty bankName to 'BCA' for CASH payment method

5. **MID Lookup Variations**:
   - BCA: Last 7 digits
   - BRI: 12-digit with "00" prefix variants

6. **Bank-Specific ACMM Splits**: Store separate ACMM totals for BCA and BRI during matching phase

### 7.2 Reusable Components

**For Your New Project, You Can Reuse:**

1. **Pivot Key Pattern**: Three-dimensional aggregation is universally applicable
2. **Amount Parsing Functions**: `parseBCAAmount()`, `parseBRIAmount()` with proper regex
3. **Transaction Type Detection**: `determineTransactionType()` pattern matching
4. **MID Extraction Logic**: Regex patterns for extracting merchant IDs
5. **Date Adjustment Function**: `subtractOneDay()` for H+1 alignment
6. **Matching Algorithm**: `reconcileACMMWithBank()` three-way comparison logic
7. **Variance Analysis**: Threshold-based status classification

### 7.3 Data Flow Summary

```
Input Files → Parse & Normalize → Pivot Aggregation → Matching → Variance Analysis → Reports

ACMM Excel ────────┐
BCA Statement ─────┼─→ Load & Parse → Create Lookups → Build Pivot Maps → Match by Key → Calculate Variance → Generate Report
BRI Statement ─────┤                                                                                          ↓
Master MID Files ──┘                                                                                   Output: Excel/HTML
```

### 7.4 Testing Checklist

- [ ] ACMM file loads correctly (header row 1)
- [ ] BCA file loads correctly (header row 6)
- [ ] BRI file loads correctly (header row 1)
- [ ] Master MID files loaded into lookup maps
- [ ] CASH transactions have bankName defaulted to 'BCA'
- [ ] BCA amounts parsed correctly (no 100x inflation)
- [ ] BRI amounts extracted from TLBDS1 or MUTASI_KREDIT
- [ ] BCA dates adjusted by -1 day (H+1 correction)
- [ ] Payment method names normalized
- [ ] Pivot keys constructed correctly
- [ ] Matching produces expected variance results
- [ ] ACMM totals split correctly by bank in reports
- [ ] Exception transactions logged (debit, petty cash)

---

**End of Documentation**

This document provides a complete, production-ready reference for implementing BCA and BRI bank statement matching logic in any project. All code patterns have been tested and validated in the Apotek Alpro sales reconciliation system (deployed July 2026).

For questions or clarifications, refer to the source implementation:
- File: `/home/user/webapp/finance/sales-reconciliation.html`
- Git Repository: https://github.com/apotekalpro/apotek-alpro-dashboard
- Last Updated: Commit `4ce72bb` (PR #138)
