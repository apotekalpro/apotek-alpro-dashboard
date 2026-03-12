# IM File Layout Changes - December 2024

## 📋 Summary

The Invoice Matching (IM) Excel file format has been updated with new header/data row positions and an additional column. The IM Splitter has been updated to accommodate these changes.

---

## 🔄 Changes Overview

### Layout Structure Changes

| Aspect | OLD Layout | NEW Layout (Dec 2024) |
|--------|------------|----------------------|
| **Header Row** | Row 1 | Row 5 |
| **Data Start Row** | Row 2 | Row 6 |
| **Date Location** | G3 (becomes D3 after deletion) | G3 (Printed Date) |
| **Total Rows Before Data** | 1 (header only) | 5 (title + metadata + header) |

### New Column Added

**Column M**: "Invoice Receive Date" - **KEEP THIS COLUMN**

This is a NEW column that needs to be preserved in the output files.

---

## 📊 Detailed Header Comparison

### Row 1-4: Metadata (NEW)
```
Row 1: Invoice Matching (title)
Row 2: Printed By: ANNISA
Row 3: Create Date: 2024-06-01 to 2025-12-04 | Printed Date: 2025-12-04 19:30:39
Row 4: Status: Completed
```

### Row 5: Header Row (NEW Location)

| Column | Letter | Header Name | Action | Notes |
|--------|--------|-------------|--------|-------|
| 1 | A | Company | DELETE | Store identification |
| 2 | B | Store | DELETE | Store code |
| 3 | C | Match No. | DELETE | Internal matching number |
| 4 | D | Supplier | **KEEP** | **Used for splitting files** |
| 5 | E | Supplier Contract | DELETE | Contract reference |
| 6 | F | Credit Term | DELETE | Payment terms |
| 7 | G | Status | **KEEP** | Completion status |
| 8 | H | Create Date | DELETE | When match was created |
| 9 | I | Confirm Date | DELETE | When match was confirmed |
| 10 | J | Invoice Number | **KEEP** | Critical for Serah Terima |
| 11 | K | Faktur Pajak Number | **KEEP** | Tax invoice number |
| 12 | L | Invoice Date | **KEEP** | Invoice issuance date |
| 13 | M | Invoice Receive Date | **KEEP** | **NEW COLUMN - Keep it!** |
| 14 | N | Due Date | **KEEP** | Payment due date |
| 15 | O | Order Number | DELETE | Purchase order reference |
| 16 | P | Receiving Number | DELETE | Goods receipt reference |
| 17 | Q | Total Purchase Excl. Tax | **KEEP** | Amount data |
| 18 | R | Total Invoice Excl. Tax | **KEEP** | Amount data |
| 19 | S | Total Invoice Tax Amount | **KEEP** | Tax amount |
| 20 | T | Total Invoice Incl. Tax | **KEEP** | Total with tax |
| 21 | U | Tolerance Amount | DELETE | Variance allowance |
| 22 | V | Total Prepaid Tax Amount | DELETE | Prepayment info |

---

## 🗑️ Column Deletion Updates

### OLD Column Deletion List
```
Columns to delete: B, C, E, F, H, I, M, P, S, T, U
(11 columns total)
```

**Why M was deleted before**: In the old layout, column M contained data that wasn't needed for Serah Terima.

### NEW Column Deletion List
```
Columns to delete: B, C, E, F, H, I, O, P, U, V
(10 columns total)
```

**Why M is now KEPT**: Column M now contains "Invoice Receive Date" which IS important for Serah Terima tracking.

### Column Shift Impact

The addition of column M shifts all subsequent columns:

```
OLD Layout → NEW Layout:
- OLD Column M → NEW Column N (Due Date)
- OLD Column N → NEW Column O (Order Number)
- OLD Column O → NEW Column P (Receiving Number)
- OLD Column P → NEW Column Q (Total Purchase Excl. Tax)
- OLD Column Q → NEW Column R (Total Invoice Excl. Tax)
- OLD Column R → NEW Column S (Total Invoice Tax Amount)
- OLD Column S → NEW Column T (Total Invoice Incl. Tax)
- OLD Column T → NEW Column U (Tolerance Amount)
- OLD Column U → NEW Column V (Total Prepaid Tax Amount)
```

---

## 🔧 Code Changes

### Backend (`finance/im-splitter.py`)

#### 1. Updated Column Deletion List
```python
# OLD:
columns_to_delete = [21, 20, 19, 16, 13, 9, 8, 6, 5, 3, 2]  # B,C,E,F,H,I,M,P,S,T,U

# NEW:
columns_to_delete = [22, 21, 16, 15, 9, 8, 6, 5, 3, 2]      # B,C,E,F,H,I,O,P,U,V
```

#### 2. Updated Column Skip Logic
```python
# OLD:
if src_col_idx in [2, 3, 5, 6, 8, 9, 13, 16, 19, 20, 21]:
    continue

# NEW:
if src_col_idx in [2, 3, 5, 6, 8, 9, 15, 16, 21, 22]:
    continue
```

#### 3. Updated Documentation
```python
"""
NEW Layout (Dec 2024):
- Header row: Row 5
- Data starts: Row 6
- New column M: Invoice Receive Date (KEEP)
- Columns shift: Old M→N, N→O, O→P, P→Q, etc.
"""
```

### Frontend (`finance/serah-terima-im-split.html`)

#### Updated UI Text
```html
<!-- OLD -->
<li>System will delete unwanted columns (B, C, E, F, H, I, M, P, S, T, U)</li>

<!-- NEW -->
<li>System will delete unwanted columns (B, C, E, F, H, I, O, P, U, V) and keep Invoice Receive Date (M)</li>
```

---

## 📝 Sample Data

### Row 6 (First Data Row Example):
```
A: 041 - PT PRORESULT KREASI UTAMA
B: 0001 - JKJSTT1
C: 377351
D: 0000000012 - PT ANUGRAH ARGON MEDICA    ← Used for splitting
E: MD-00015 - AAM - BD
F: 30 - 30 Days
G: Completed
H: 2025-12-02
I: 2025-12-02
J: 261225149005                              ← Invoice Number (KEEP)
K: 04002500394639252                         ← Faktur Pajak (KEEP)
L: 2025-11-29                                ← Invoice Date (KEEP)
M: 2025-12-03                                ← Invoice Receive Date (KEEP - NEW!)
N: 2026-01-01                                ← Due Date (KEEP)
O: 000120003455
P: 000100003714
Q: 309000                                    ← Amount (KEEP)
R: 309000                                    ← Amount (KEEP)
S: 33990                                     ← Tax (KEEP)
T: 342990                                    ← Total (KEEP)
U: ...
V: ...
```

---

## ✅ Testing Results

### Test File: `COMPLETED 04 DES.xlsx`

**Results:**
- ✅ Header detection: Found "Supplier" at Row 5 (0-indexed: 4)
- ✅ Date extraction: G3 = "2025-12-04 19:30:39" → "20251204"
- ✅ Supplier grouping: 20 unique suppliers identified
- ✅ Sample suppliers:
  - PT ANUGRAH ARGON MEDICA (42 rows)
  - PT ANTARMITRA SEMBADA (74 rows)
  - PT GLOBAL BINTAN PERMATA (127 rows)

---

## 🚀 Expected Output

### After Processing:

1. **Files split by Supplier** (Column D)
2. **Filename format**: `{SupplierName}_{YYYYMMDD}.xlsx`
   - Example: `PT_ANUGRAH_ARGON_MEDICA_20251204.xlsx`

3. **Columns in output file**:
   - Column A (was D): Supplier
   - Column B (was G): Status
   - Column C (was J): Invoice Number
   - Column D (was K): Faktur Pajak Number
   - Column E (was L): Invoice Date
   - Column F (was M): Invoice Receive Date ← **NEW!**
   - Column G (was N): Due Date
   - Column H (was Q): Total Purchase Excl. Tax
   - Column I (was R): Total Invoice Excl. Tax
   - Column J (was S): Total Invoice Tax Amount
   - Column K (was T): Total Invoice Incl. Tax

4. **Deleted columns**:
   - Company (A)
   - Store (B)
   - Match No. (C)
   - Supplier Contract (E)
   - Credit Term (F)
   - Create Date (H)
   - Confirm Date (I)
   - Order Number (O)
   - Receiving Number (P)
   - Tolerance Amount (U)
   - Total Prepaid Tax (V)

---

## 🔍 Migration Checklist

For users upgrading from the old system:

- [ ] Update any documentation referencing row 1 as header → now row 5
- [ ] Update any scripts that expect data to start at row 2 → now row 6
- [ ] Remove references to deleting column M → it's now kept
- [ ] Update column references in downstream processes
- [ ] Test with new file format (COMPLETED 04 DES.xlsx format)
- [ ] Verify Invoice Receive Date (M) is present in output files
- [ ] Check that 10 columns are deleted (not 11 anymore)

---

## 💡 Key Takeaways

1. **Header moved from Row 1 → Row 5** (4 metadata rows added above)
2. **Data starts at Row 6** (was Row 2)
3. **Column M is now "Invoice Receive Date"** - MUST KEEP IT
4. **10 columns deleted** (was 11): B, C, E, F, H, I, O, P, U, V
5. **Date still extracted from G3** (Printed Date)
6. **Supplier column (D) unchanged** - still used for splitting

---

## 📚 Related Documentation

- `SPLITTING_COMPARISON.md` - Comparison of IM vs PV Splitter
- `WHATSAPP_INTEGRATION_GUIDE.md` - WhatsApp distribution guide
- `EMAIL_FEATURE_SUMMARY.md` - Email distribution guide

---

## 🐛 Troubleshooting

### Issue: "Could not find 'Supplier' header row"
**Solution**: Ensure the file has "Supplier" in column D at row 5

### Issue: Wrong columns in output
**Solution**: Verify you're using the updated IM Splitter (Dec 2024 version)

### Issue: Invoice Receive Date missing
**Solution**: Check that column M is NOT in the deletion list

### Issue: Date extraction fails
**Solution**: Verify G3 contains date in format "YYYY-MM-DD HH:MM:SS"

---

*Last Updated: 2024-12-08*  
*IM Splitter Version: 2.1 (Dec 2024 Layout Update)*
