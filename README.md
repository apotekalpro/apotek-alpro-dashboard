# apotek-alpro-dashboard

## BOD Dashboard (Chief only)

Board-level outlet performance view, inside the Executive Dashboard as the **BOD Dashboard** tab (also `bod-dashboard.html`).

- **Data**: read live from the Google Sheet (`MASTER` sheet in full, `Exec Dashboard` rows 9-25) through the sheet's gviz endpoint. No data is stored in this repo.
- **Files**: `bod-engine.js` (parsing, periods, levels, PAT), `bod-core.js` (access gate, filters, drawers), `bod-tabs-outlets.js`, `bod-tabs-insights.js`.
- **Access**: tab is added only when the signed-in role is `chief` (enforced in `getAccessibleTabs`, `showTab`, and inside the page itself). It is hidden from the Admin Config assignment screens.
- **Definitions**: growth = running year-on-year (same months, 12 months earlier). Levels 5..1 = 20 / 15 / 10 / 5 / 0 percent. PAT = PSH x working hours per outlet-month. Fiscal year Nov-Oct (switchable to calendar year).
- **Size & profitability** tab is a placeholder until the `Size` column in MASTER is filled.
