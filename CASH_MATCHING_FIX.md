# CASH Matching Logic Fix - Daily Mode

## Problem Statement

The previous implementation (commit b883768) had INCORRECT CASH matching logic in Daily Mode:

### ❌ WRONG Implementation:
```javascript
const acmmRounded = roundDownTo50k(acmmCashTotal);
const bankRounded = roundDownTo50k(bcaCashTotal);  // ❌ WRONG: Should NOT round bank
const roundedDiff = Math.abs(bankRounded - acmmRounded);

if (roundedDiff <= 150000) {  // ❌ WRONG: Allowed 150k variance
    status = 'MATCHED';
}
```

**Issues:**
1. Rounded BOTH ACMM and Bank amounts (Bank should not be rounded)
2. Allowed 150k variance tolerance (Bank must EXACTLY match rounded ACMM)
3. Did not implement proper multi-day banking accumulation logic

---

## Correct Specification

### ✅ CORRECT Logic:

**Rule 1: Daily Banking (Normal Case)**
- Round down ACMM CASH ONLY to nearest 50,000
- Bank deposit should EXACTLY match the rounded ACMM amount
- NO rounding of bank deposit amount

**Example:**
- ACMM CASH Sales: 2,843,500
- Rounded ACMM: 2,800,000 (rounded down to nearest 50k)
- Bank Deposit: **Must be exactly 2,800,000**
- If Bank ≠ 2,800,000 → FRAUD_ALERT

**Rule 2: Multi-Day Banking (2-3 Days Accumulation)**
- If outlet has no bank-in for next day(s), accumulate 2-3 days:
  1. Sum 2 days of bank deposits (no rounding)
  2. Sum 2 days of ACMM CASH sales
  3. THEN round down the 2-day ACMM total
  4. Compare: accumulated bank vs rounded accumulated ACMM
  5. Same logic applies for 3 days if needed

**Example:**
- Day 1 ACMM: 2,843,500
- Day 2 ACMM: 3,156,800
- Total 2-day ACMM: 6,000,300
- Rounded 2-day ACMM: 6,000,000
- Bank Deposit (2 days combined): **Must be exactly 6,000,000**

**Rule 3: Fraud Detection**
- If outlet doesn't bank for more than 3 days → FRAUD_ALERT
- If bank amount doesn't match rounded ACMM (even after 2-3 day accumulation) → FRAUD_ALERT

---

## Implementation

### Current Fix (Phase 1)

**File:** `/home/user/webapp/finance/sales-reconciliation.html`  
**Lines:** 2036-2073 (Daily Mode CASH matching logic)

```javascript
} else {
    // DAILY MODE: CORRECT CASH matching logic
    // Rule: Round down ACMM CASH ONLY to nearest 50rb
    // Bank deposit should EXACTLY match the rounded ACMM amount
    // Example: ACMM 2,843,500 → rounds to 2,800,000 → Bank MUST be 2,800,000
    // NO rounding of bank deposit amount
    
    const acmmRounded = roundDownTo50k(acmmCashTotal);
    
    // Bank should EXACTLY equal the rounded ACMM (no rounding of bank)
    if (bcaCashTotal === acmmRounded) {
        // Perfect match - outlet banked the correct rounded amount
        status = 'MATCHED';
    } else {
        // Bank doesn't match the rounded ACMM
        // TODO: Implement multi-day banking accumulation logic
        
        // For now: Flag as fraud alert (multi-day accumulation not yet implemented)
        status = 'FRAUD_ALERT';
        fraudAlert = true;
        
        // Log for investigation
        const variance = bcaCashTotal - acmmRounded;
        console.log(`🚨 ${outletCode} CASH FRAUD ALERT: ACMM ${acmmCashTotal.toFixed(2)} → Rounded ${acmmRounded.toFixed(0)}, Bank ${bcaCashTotal.toFixed(0)}, Variance ${variance.toFixed(0)}`);
    }
}
```

**Changes Made:**
1. ✅ Removed rounding of bank deposit (`bankRounded` variable removed)
2. ✅ Exact match check: `bcaCashTotal === acmmRounded`
3. ✅ Removed 150k variance tolerance
4. ✅ Clear logging showing original ACMM, rounded ACMM, and bank amount
5. ⚠️ TODO: Multi-day banking accumulation (Phase 2)

---

## Testing

### Test Case 1: Perfect Daily Banking
```
ACMM: 2,843,500
Rounded: 2,800,000
Bank: 2,800,000
Expected: ✅ MATCHED
```

### Test Case 2: Incorrect Banking Amount
```
ACMM: 2,843,500
Rounded: 2,800,000
Bank: 2,850,000
Expected: 🚨 FRAUD_ALERT
```

### Test Case 3: Multi-Day Banking (Future Implementation)
```
Day 1 ACMM: 2,843,500
Day 2 ACMM: 3,156,800
Total ACMM: 6,000,300 → Rounded: 6,000,000
Bank (Day 2): 6,000,000
Expected: ✅ MATCHED (after multi-day logic implemented)
```

---

## Phase 2: Multi-Day Banking Accumulation (Future)

**Challenge:**
Current system aggregates transactions as "All Dates" - doesn't track daily breakdown.

**Solution Required:**
1. Track daily CASH sales per outlet (date → amount mapping)
2. Track daily bank deposits per outlet (date → amount mapping)
3. Implement sliding window accumulation (1-day, 2-day, 3-day)
4. Compare accumulated bank vs accumulated rounded ACMM
5. Flag outlets with >3 days without banking

**Implementation Complexity:**
- Need to refactor aggregation functions to preserve daily granularity
- Need date-based matching logic instead of "All Dates" aggregation
- Need to handle edge cases (weekends, holidays, multi-outlet banking)

---

## Commit History

1. **b883768** (WRONG) - "Smart CASH matching with 50rb rounding (no 95% tolerance)"
   - Incorrectly rounded both ACMM and Bank
   - Allowed 150k variance
   - Logged 2-3 day banking patterns (but logic was wrong)

2. **[Current Fix]** - "fix: Correct CASH matching logic - only round ACMM, exact bank match required"
   - Only round ACMM CASH to nearest 50k
   - Bank must EXACTLY match rounded ACMM
   - No variance tolerance
   - Clear TODO for multi-day accumulation

---

## User Feedback Reference

> "bank deposit should not round, as bank deposit should be the correct amount. Example if 2843500, round down is 2800000, so suppose they should bank in 2800000, not rounding down again, if its not 2800000, its not matched."

> "Unless if detection on that outlet has no bank in for next day, but another day, then have to add up 2 days bank in amount CDM to versus 2 days Cash sales added up (then only rounddown from the total 2 days cash sales)"

---

## Related Documentation

- `/home/user/webapp/BCA_BRI_STATEMENT_MATCHING_DOCUMENTATION.md` - Complete technical documentation
- `/home/user/webapp/MATCHING_MODES_SUMMARY.md` - User guide for Period vs Daily modes
- `/home/user/webapp/BANK_SEPARATION_FEATURE.md` - BCA vs BRI separation feature

---

## Next Steps

1. ✅ Fix Phase 1: Exact match after rounding ACMM only (DONE)
2. ⏳ Test with real data to validate the fix
3. ⏳ Implement Phase 2: Multi-day banking accumulation logic
4. ⏳ Add unit tests for edge cases
5. ⏳ Update user documentation with examples
