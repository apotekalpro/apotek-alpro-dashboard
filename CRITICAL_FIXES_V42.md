# Critical Fixes for v4.2-GB

## Issues to Fix:

### 1. Contribution Ratio Not Displaying
- **Problem**: Contribution % not showing in export, even though calculated
- **Fix**: Store contributionRatio in matched object permanently
- **Status**: ✅ FIXED (line 812 - added contributionRatio field)

### 2. 50% Ops Reward Cut When Goal Bulanan = NO
- **Problem**: Ops rewards should be cut by 50% if Goal Bulanan = NO
- **Fix**: Apply 50% multiplier to all Ops rewards when goalBulananHit = 'NO'
- **Status**: ✅ FIXED (lines 1236-1244 - added 50% cut logic)

### 3. Main Outlet Selection Wrong
- **Problem**: Using first outlet instead of outlet with highest sales
- **Fix**: Track personalSales per outlet, select main outlet based on max sales
- **Status**: ⏳ TODO

### 4. GP Margin Showing N/A in Remark
- **Problem**: Remark shows "GP: N/A" even when GP data exists
- **Fix**: Pass salesData.gpMargin to remark generation
- **Status**: ⏳ TODO

### 5. Goal Bulanan Incentive = 0 Even When Entitled
- **Problem**: Goal Bulanan shows YES but incentive = 0
- **Fix**: Check Goal Bulanan calculation logic for BM/Alproean
- **Status**: ⏳ TODO

### 6. AM Using Personal Sales for Outlet Count
- **Problem**: AM outlet count based on personal sales, not Mapping AM file  
- **Fix**: Use Mapping AM data for all AM outlet counting
- **Status**: ✅ ALREADY CORRECT (lines 1262-1278 - uses outletMappingData)

## Next Steps:
- Fix main outlet selection (highest sales)
- Fix GP margin display in remark  
- Debug Goal Bulanan incentive = 0 issue
