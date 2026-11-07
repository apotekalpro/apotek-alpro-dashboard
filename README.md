# apotek-alpro-dashboard

## BOD Dashboard (Chief only)

Board-level outlet performance view, inside the Executive Dashboard as the **BOD Dashboard** tab (also `bod-dashboard.html`).

- **Data**: read live from the Google Sheet (`MASTER` sheet in full, `Exec Dashboard` rows 9-25) through the sheet's gviz endpoint. No data is stored in this repo.
- **Files**: `bod-engine.js` (parsing, periods, levels, PAT), `bod-core.js` (access gate, filters, drawers), `bod-tabs-outlets.js`, `bod-tabs-insights.js`.
- **Access**: Chief always has the tab. Any other user gets it only when **BOD Dashboard** is ticked on that user (Admin Config > edit user > Department Access Permissions, saved in the user's `department_access` as `bod`; no SQL needed). It is not part of any role's default list, so ticking it for one person never opens it for their whole role. Enforced in `getAccessibleTabs`, `showTab` and inside the page itself.
- **Definitions**: growth = running year-on-year (same months, 12 months earlier). Levels 5..1 = 20 / 15 / 10 / 5 / 0 percent, on sales or transactions. PAT = PSH x working hours per outlet-month (no other cost deducted). Financial year = Jan-Dec (FY2026 = Jan 2026 to the latest month, year to date; rolls over each January). Running 12 months = last 12 months to the latest month (e.g. Nov 2025 - Oct 2026), moving forward automatically. Company-level PSH uses the Exec Dashboard figure when no outlet filter is applied; outlet and filtered views use outlet PSH x hours.
- **Dynamic sheet**: when a new month is added (every metric block gains a column and everything shifts right), nothing needs changing. MASTER months and metric blocks are found by header text, the fixed info columns (Outlet, AM, Type, ...) by their header names, and the Exec Dashboard reads however many month columns have data. The latest month, FY selector and default period follow the sheet.
- **Tabs**: Overview, Declining stores, Improving stores, New outlets, Financial growth (group by opening year, type, tier, AM, province, nature, city), Area managers scorecard, Store size & profitability (blank), Watchlist & alerts, Winning formula.
- Targets are intentionally not used.
- **Size & profitability** tab is a placeholder until the `Size` column in MASTER is filled.
