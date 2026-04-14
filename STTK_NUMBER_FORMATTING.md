# STTK Number Formatting Fix

## Issue
The STTK Shrinkage table was not correctly handling different number formats from Google Sheets. Some numbers came with comma separators, others with dot separators.

## Solution Implemented

### Smart Parsing Logic
The `parseAndFormatSttkNumber()` method now detects the format:

1. **Numbers with comma separator** (US/International format)
   - Examples: `301,042,599` or `301,042,599.00` or `301,042.50`
   - Action: **Use original value** (no division)
   - Process: Remove commas, parse as float

2. **Numbers with dot separator or plain digits** (European format or unformatted)
   - Examples: `301.042.599` or `301042599` or `301.042`
   - Action: **Divide by 100,000**
   - Process: Remove dots, parse as integer, divide by 100,000

### Display Formatting

#### For Shrinkage Qty (formatSttkNumber)
- **If value >= 1000**: Show as integer with comma separators
  - Example: `2,203` (no decimals)
- **If value < 1000**: Show with 2 decimal places
  - Example: `3.01` or `12.45`

#### For Stock Loss Value (formatSttkCurrency)
- **If value >= 1000**: Show with "Rp" prefix and comma separators
  - Example: `Rp 2,202,519` (no decimals)
- **If value < 1000**: Show with "Rp" prefix and 2 decimal places
  - Example: `Rp 3.01` or `Rp 123.45`

## Code Changes

### File: opex-dashboard-v2.js

```javascript
parseAndFormatSttkNumber(value) {
    if (!value) return 0;
    
    const str = value.toString().trim();
    
    // CASE 1: Number has comma as thousand separator
    if (str.includes(',')) {
        const cleaned = str.replace(/,/g, '');
        const parsed = parseFloat(cleaned) || 0;
        console.log(`STTK Parse (format with comma): "${str}" → ${parsed}`);
        return parsed;
    }
    
    // CASE 2: Number has dot as separator OR is plain digits
    const cleaned = str.replace(/\./g, '');
    const rawValue = parseFloat(cleaned) || 0;
    const divided = rawValue / 100000;
    console.log(`STTK Parse (format with dot/plain): "${str}" → raw: ${rawValue} → divided: ${divided}`);
    return divided;
}

formatSttkNumber(value) {
    if (!value || value === 0) return '0';
    if (Math.abs(value) >= 1000) {
        return Math.abs(value).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return Math.abs(value).toFixed(2);
}

formatSttkCurrency(value) {
    if (!value || value === 0) return 'Rp 0';
    const absValue = Math.abs(value);
    if (absValue >= 1000) {
        return 'Rp ' + absValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return 'Rp ' + absValue.toFixed(2);
}
```

## Examples

### Parsing Examples
| Google Sheets Value | Format Detected | Parsed Value | Display (Qty) | Display (Currency) |
|---------------------|-----------------|--------------|---------------|-------------------|
| `301,042,599` | Comma separator | `301042599` | `301,042,599` | `Rp 301,042,599` |
| `301,042,599.00` | Comma separator | `301042599` | `301,042,599` | `Rp 301,042,599` |
| `301,042.50` | Comma separator | `301042.50` | `301,043` | `Rp 301,043` |
| `301.042.599` | Dot separator | `3.01` | `3.01` | `Rp 3.01` |
| `301042599` | Plain digits | `3010.43` | `3,010` | `Rp 3,010` |
| `1234` | Plain digits | `0.01234` | `0.01` | `Rp 0.01` |

## Debugging
Console logs are included to help debug number parsing:
```
STTK Parse (format with comma): "301,042,599.00" → 301042599
STTK Parse (format with dot/plain): "301.042.599" → raw: 301042599 → divided: 3010.42599
```

## Testing Checklist
- [ ] Open dashboard: https://8000-i2w5anfbz2kkq6nhwmx1k-583b4d74.sandbox.novita.ai/opex-dashboard.html
- [ ] Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- [ ] Open Browser Console (F12)
- [ ] Scroll to "All STTK Shrinkage Records" section
- [ ] Verify numbers display correctly:
  - Large values (>= 1000): Show as integers with commas
  - Small values (< 1000): Show with 2 decimal places
- [ ] Check console for parsing logs to verify format detection

## Git Info
- **Commit**: be8a309
- **Branch**: feature/opex-dashboard
- **PR**: https://github.com/apotekalpro/apotek-alpro-dashboard/pull/116
- **Files Changed**: opex-dashboard-v2.js (+70, -9)
