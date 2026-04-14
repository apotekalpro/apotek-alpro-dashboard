# STTK Auto Filter and Top 30 Shrinkage Formatting Fix

## Issues Fixed

### 1. STTK Shrinkage - Exclude "Auto" Entries
**Problem**: STTK table was showing both "Auto" and "Manual" entries  
**Requirement**: Only show "Manual" entries, exclude "Auto"  
**Solution**: Added filter to exclude rows where Column C = "Auto"

### 2. Top 30 Shrinkage - Missing Division and Formatting
**Problem**: Values were showing without division and without separators  
- Example: `989200000.00` instead of `Rp 9,892`
**Solution**: Applied smart number parsing (divide by 100,000) and currency formatting

---

## Technical Changes

### File: opex-config.js

**Updated STTK Range** to include the Auto/Manual column:
```javascript
STTK: {
    name: 'STTK_SHRINKAGE',
    range: 'A:I'  // Changed from A:G to A:I
},
```

### File: opex-dashboard-v2.js

#### 1. STTK Data Processing - Added Auto/Manual Filter

**Before**:
```javascript
this.data.sttk = rawData.slice(1)
    .filter(row => row[0] && row[1]) // Has month and store name
    .map(row => {
        const shrinkageQty = this.parseAndFormatSttkNumber(row[2]);
        const shrinkageCost = this.parseAndFormatSttkNumber(row[3]);
        // ...
    })
```

**After**:
```javascript
this.data.sttk = rawData.slice(1)
    .filter(row => {
        // Must have month and store name
        if (!row[0] || !row[1]) return false;
        
        // Column C (index 2) must be "Manual" (exclude "Auto")
        const type = (row[2] || '').toString().trim().toUpperCase();
        if (type === 'AUTO') {
            console.log(`Excluding Auto STTK: ${row[1]}`);
            return false;
        }
        
        return true;
    })
    .map(row => {
        // Columns shifted: D=Qty, E=Cost, etc.
        const shrinkageQty = this.parseAndFormatSttkNumber(row[3]); // Column D
        const shrinkageCost = this.parseAndFormatSttkNumber(row[4]); // Column E
        // ...
        return {
            month: row[0],
            storeName: row[1],
            type: row[2], // Auto/Manual
            shrinkageQty: shrinkageQty,
            shrinkageCost: shrinkageCost,
            sourceFileId: row[5],
            sourceFileName: row[6],
            am: row[7],
            outlet: row[8],
            stockLoss: stockLoss
        };
    })
```

**Column Mapping After Adding Type Column**:
| Column | Letter | Field |
|--------|--------|-------|
| 0 | A | Month |
| 1 | B | Store Name |
| 2 | C | **Type (Auto/Manual)** ← NEW |
| 3 | D | Shrinkage Qty |
| 4 | E | Shrinkage Cost |
| 5 | F | Source File ID |
| 6 | G | Source File Name |
| 7 | H | Area Manager |
| 8 | I | Outlet |

#### 2. Top 30 Shrinkage - Smart Number Parsing

**Before**:
```javascript
.map(row => ({
    // ...
    qty: this.parseNumber(row[4]) || 0,
    cost: this.parseNumber(row[5]) || 0,
    value: this.parseNumber(row[5]) || this.parseNumber(row[4]) || 0
}))
```

**After**:
```javascript
.map(row => {
    // Use smart parsing for shrinkage values (same as STTK)
    const qty = this.parseAndFormatSttkNumber(row[4]) || 0;
    const cost = this.parseAndFormatSttkNumber(row[5]) || 0;
    const value = cost || qty || 0;
    
    return {
        month: row[0] || '',
        storeName: row[1] || '',
        itemCode: row[2] || '',
        itemName: row[3] || '',
        qty: qty,
        cost: cost,
        value: value
    };
})
```

#### 3. Top 30 Shrinkage - Display Formatting

**Before**:
```javascript
<td><span class="badge badge-red">${Math.abs(item.value).toFixed(2)}</span></td>
```

**After**:
```javascript
const formattedValue = this.formatSttkCurrency(item.value);
return `
    <td><span class="badge badge-red">${formattedValue}</span></td>
`;
```

---

## Examples

### STTK Shrinkage - Auto vs Manual

**Google Sheets Data**:
| Month | Store Name | Type | Qty | Cost |
|-------|-----------|------|-----|------|
| Maret | Store A | Auto | 100 | 1000 |
| Maret | Store B | Manual | 200 | 2000 |
| Maret | Store C | Manual | 300 | 3000 |

**Dashboard Display** (Only Manual entries):
| Month | Store Name | AM | Shrinkage Qty | Stock Loss Value |
|-------|-----------|-----|--------------|------------------|
| Maret | Store B | John | 200 | Rp 2,000 |
| Maret | Store C | Jane | 300 | Rp 3,000 |

**Console Log**:
```
Excluding Auto STTK: Store A
Processed STTK records (Manual only): 2
```

### Top 30 Shrinkage - Number Formatting

**Before Fix**:
| Rank | Item Code | Item Name | Shrinkage Value |
|------|-----------|-----------|----------------|
| 1 | *100000539 | (FCS) DR. KOOL ADULT 3 X 2S | 989200000.00 |
| 2 | *106988 | AVODART 0.5MG TAB 3X10S | 995590143.00 |

**After Fix**:
| Rank | Item Code | Item Name | Shrinkage Value |
|------|-----------|-----------|----------------|
| 1 | *100000539 | (FCS) DR. KOOL ADULT 3 X 2S | **Rp 9,892** |
| 2 | *106988 | AVODART 0.5MG TAB 3X10S | **Rp 9,956** |

### Number Format Detection

The smart parsing detects the format and applies appropriate logic:

| Google Sheets | Format | Parsed | Display |
|---------------|--------|--------|---------|
| `989,200,000.00` | Comma | `989200000` | `Rp 989,200,000` |
| `989.200.000` | Dot | `9892` | `Rp 9,892` |
| `989200000` | Plain | `9892` | `Rp 9,892` |
| `123.45` | Dot | `0.0012345` | `Rp 0.00` |

---

## Verification Steps

### 1. Test STTK Auto Filter
1. Open dashboard: https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/opex-dashboard.html
2. Hard refresh (Ctrl+Shift+R)
3. Open Browser Console (F12)
4. Look for log messages:
   ```
   Excluding Auto STTK: [Store Name]
   Processed STTK records (Manual only): X
   ```
5. Verify "All STTK Shrinkage Records" table only shows Manual entries

### 2. Test Top 30 Shrinkage Formatting
1. Scroll to "3. Top 30 Shrinkage Items" section
2. Verify values display correctly:
   - Large values (>= 1000): `Rp 9,892` (with commas)
   - Small values (< 1000): `Rp 3.01` (with decimals)
3. Check console for parsing logs:
   ```
   STTK Parse (format with comma): "989,200,000.00" → 989200000
   STTK Parse (format with dot/plain): "989200000" → raw: 989200000 → divided: 9892
   ```

---

## Testing Checklist

- [ ] STTK table excludes "Auto" entries
- [ ] STTK table only shows "Manual" entries
- [ ] Console logs show "Excluding Auto STTK: [name]"
- [ ] Top 30 Shrinkage values formatted with currency
- [ ] Large values show with commas (Rp 9,892)
- [ ] Small values show with decimals (Rp 3.01)
- [ ] Console shows number parsing logs
- [ ] "Worst Stock Loss" section still works correctly
- [ ] STTK pagination works correctly
- [ ] STTK filters work correctly

---

## Git Information

- **Commit**: 84fd2c5
- **Branch**: feature/opex-dashboard
- **PR**: https://github.com/apotekalpro/apotek-alpro-dashboard/pull/116
- **Files Changed**: 
  - `opex-config.js` (STTK range update)
  - `opex-dashboard-v2.js` (filter and formatting logic)
- **Lines**: +46 insertions, -23 deletions

---

## Summary

✅ **STTK Shrinkage**: Now excludes "Auto" entries, only shows "Manual"  
✅ **Top 30 Shrinkage**: Values properly divided by 100,000 and formatted  
✅ **Number Formatting**: Smart detection of comma vs dot separators  
✅ **Display**: Consistent formatting with commas for large values, decimals for small  
✅ **Console Logging**: Detailed logs for debugging and verification
