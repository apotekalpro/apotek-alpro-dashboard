# 📋 Current Audit Data Logic - Detailed Explanation

## 🎯 Which Audit Sheet Is Being Used?

### **Current Setup:**

The dashboard loads from **7 different Google Sheets tabs**:

```javascript
1. 'Audit' (range A:N) ← THIS ONE is used for Field Audit section
2. 'FieldAudit_Detail' (range A:AU) ← Used for detail modal
3. 'INDEX' (range A:B) ← Lookup codes/descriptions
4. 'STTK_SHRINKAGE' (range A:I) ← STTK data
5. 'Shrinkage_Items_Raw' (range A:G) ← Top 30 items
6. 'CCTV_14H' (range A:Q) ← CCTV audit data
7. 'Analysis Field Audit Detail' (range A:AS) ← Summary analysis
```

### **For the Field Audit Section (main cards/table), the data comes from:**

**Sheet Name:** `Audit`  
**Range:** `A:N` (columns A through N, which is 14 columns total)  
**Loading Code:** `this.loadSheetData('Audit', 'A:N')`

---

## 📊 Current Data Structure Assumption

### **The "Audit" sheet is expected to have this structure:**

```
ROW-BASED LAYOUT (each row = one audit record)

Row 1 (Headers):
A       B       C       D       E       F       G       H       I       J       K       L           M           N
[Col1]  [Col2]  [Col3]  [AM]    ...     ...   [Month]  ...     ...     ...   [Outlet] [VisitDate] [Scoring]  [FinalScore]

Row 2 (Data):
...     ...     ...    JOHN DOE  ...     ...   Maret    ...     ...     ... OUT-001   03/01/2026  85.5%      B

Row 3 (Data):
...     ...     ...    JANE      ...     ...   Maret    ...     ...     ... OUT-001   03/09/2026  81.79%     A

Row 4 (Data):
...     ...     ...    MIKE      ...     ...   April    ...     ...     ... OUT-002   04/15/2026  90.2%      A
```

### **Column Mapping (Zero-Indexed):**

```javascript
row[0]  = Column A  (Index 0)
row[1]  = Column B  (Index 1)
row[2]  = Column C  (Index 2)
row[3]  = Column D  (Index 3)  ← AM Name
...
row[6]  = Column G  (Index 6)  ← Month
...
row[10] = Column K  (Index 10) ← Outlet Code
row[11] = Column L  (Index 11) ← Visit Date
row[12] = Column M  (Index 12) ← Scoring (%)
row[13] = Column N  (Index 13) ← Final Score
```

---

## ⚙️ Current Processing Logic - Step by Step

### **Step 1: Load Data from Google Sheets**

```javascript
this.loadSheetData('Audit', 'A:N')
```

**What it does:**
- Fetches ALL rows from columns A through N
- Returns a 2D array: `[[header row], [data row 1], [data row 2], ...]`

**Example result:**
```javascript
[
  ['Header1', 'Header2', ..., 'OutletCode', 'VisitDate', 'Scoring', 'FinalScore'],
  ['Data', 'Data', ..., 'OUT-001', '03/01/2026', '85.5%', 'B'],
  ['Data', 'Data', ..., 'OUT-001', '03/09/2026', '81.79%', 'A'],
  ['Data', 'Data', ..., 'OUT-002', '04/15/2026', '90.2%', 'A']
]
```

---

### **Step 2: Process Audit Data**

```javascript
processAuditData(rawData) {
    // Skip header row
    const rows = rawData.slice(1);
    
    // Filter and map data
    const processedData = rows
        .filter(row => row[12] && row[12] !== '0.00%')  // Only rows with scoring
        .map(row => ({
            outletCode: row[10] || '',     // Column K
            amName: row[3] || '',          // Column D
            visitDate: row[11] || '',      // Column L
            month: row[6] || '',           // Column G
            scoring: row[12] || '0%',      // Column M
            finalScore: row[13] || ''      // Column N
        }));
}
```

**What it does:**

1. **Skips header row**: `rawData.slice(1)` removes the first row
2. **Filters rows**: Only keeps rows where `row[12]` (Scoring) exists and is not "0.00%"
3. **Extracts specific columns**:
   - Outlet Code from column K (index 10)
   - AM Name from column D (index 3)
   - Visit Date from column L (index 11)
   - Month from column G (index 6)
   - Scoring from column M (index 12)
   - Final Score from column N (index 13)

**Example output:**
```javascript
[
  {
    outletCode: 'OUT-001',
    amName: 'JOHN DOE',
    visitDate: '03/01/2026',
    month: 'Maret 2026',
    scoring: '85.5%',
    finalScore: 'B'
  },
  {
    outletCode: 'OUT-001',
    amName: 'JANE',
    visitDate: '03/09/2026',
    month: 'Maret 2026',
    scoring: '81.79%',
    finalScore: 'A'
  }
]
```

---

### **Step 3: Get Latest Record Per Outlet**

```javascript
this.data.audit = this.getLatestRecordPerOutlet(processedData);
```

**OLD LOGIC (Before Fix):**
```javascript
getLatestRecordPerOutlet(data) {
    const outletMap = new Map();
    data.forEach(record => {
        const outlet = record.outletCode;
        const currentMonth = this.parseMonth(record.month);
        
        if (!outletMap.has(outlet)) {
            outletMap.set(outlet, record);  // ← First record for this outlet
        } else {
            const existingMonth = this.parseMonth(outletMap.get(outlet).month);
            if (currentMonth > existingMonth) {
                outletMap.set(outlet, record);  // ← Only if MONTH is newer
            }
        }
    });
    return Array.from(outletMap.values());
}
```

**Problem with OLD logic:**
```
Outlet OUT-001 has 2 records:
  Record 1: Month = "Maret 2026", VisitDate = "03/01/2026", Score = 85.5%
  Record 2: Month = "Maret 2026", VisitDate = "03/09/2026", Score = 81.79%

OLD logic says:
  - Both have same month "Maret 2026"
  - currentMonth (March 2026) is NOT > existingMonth (March 2026)
  - So it keeps Record 1 (the first one found)
  
Result: Dashboard shows OLD data (03/01 instead of 03/09) ❌
```

---

**NEW LOGIC (After Fix):**
```javascript
getLatestRecordPerOutlet(data) {
    const outletMap = new Map();
    data.forEach(record => {
        const outlet = record.outletCode;
        
        if (!outletMap.has(outlet)) {
            outletMap.set(outlet, record);
        } else {
            const existingRecord = outletMap.get(outlet);
            
            // Compare by month first
            const currentMonth = this.parseMonth(record.month);
            const existingMonth = this.parseMonth(existingRecord.month);
            
            if (currentMonth > existingMonth) {
                // Different month, newer month wins
                outletMap.set(outlet, record);
            } else if (currentMonth.getTime() === existingMonth.getTime()) {
                // SAME MONTH - now compare by VISIT DATE
                const currentVisitDate = this.parseVisitDate(record.visitDate);
                const existingVisitDate = this.parseVisitDate(existingRecord.visitDate);
                
                if (currentVisitDate > existingVisitDate) {
                    outletMap.set(outlet, record);  // ← Latest visit date wins
                }
            }
        }
    });
    return Array.from(outletMap.values());
}
```

**NEW logic behavior:**
```
Outlet OUT-001 has 2 records:
  Record 1: Month = "Maret 2026", VisitDate = "03/01/2026" → Date(2026, 2, 1)
  Record 2: Month = "Maret 2026", VisitDate = "03/09/2026" → Date(2026, 2, 9)

NEW logic says:
  1. Check months: Both = "Maret 2026" (same)
  2. Same month → Compare visit dates
  3. 03/09/2026 > 03/01/2026
  4. Keep Record 2 (the latest visit date)
  
Result: Dashboard shows LATEST data (03/09) ✅
```

---

### **Step 4: Parse Visit Date**

```javascript
parseVisitDate(dateStr) {
    // Supports multiple formats:
    // DD/MM/YYYY → "03/09/2026"
    // YYYY-MM-DD → "2026-03-09"
    // DD-MM-YYYY → "03-09-2026"
    
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');  // ["03", "09", "2026"]
        const day = parseInt(parts[0]);     // 3
        const month = parseInt(parts[1]) - 1; // 8 (JS months are 0-indexed)
        const year = parseInt(parts[2]);    // 2026
        return new Date(year, month, day);  // Date(2026, 8, 3)
    }
    
    // ... other format handlers
}
```

**Example:**
```
Input: "03/09/2026"
Output: Date object representing September 3, 2026
```

---

## 🔍 How the Data Flows to the Dashboard

### **Step 5: Render Audit Section**

```javascript
renderAuditSection() {
    const data = this.data.audit;  // Already filtered to latest per outlet
    
    // Display each outlet's data in the table
    data.forEach(record => {
        // Show: outletCode, amName, visitDate, month, scoring, finalScore
    });
}
```

**What you see:**
- One row per outlet
- Each row shows the LATEST audit data for that outlet
- Latest = newest month first, then newest visit date within that month

---

## 📝 Summary of Current Logic

### **Data Source:**
- **Sheet:** `Audit` (tab name in Google Sheets)
- **Range:** `A:N` (14 columns)
- **Structure:** Row-based (each row = one audit)

### **Column Extraction:**
```
Column D (index 3)  → AM Name
Column G (index 6)  → Month
Column K (index 10) → Outlet Code
Column L (index 11) → Visit Date
Column M (index 12) → Scoring
Column N (index 13) → Final Score
```

### **Filtering Rules:**
1. Skip header row
2. Only rows with non-zero scoring
3. Keep only LATEST record per outlet (by month, then by visit date)

### **Latest Record Logic:**
```
For each outlet:
  1. If different months → Pick newer month
  2. If same month → Pick newer visit date
  3. Result: One row per outlet with most recent data
```

---

## ⚠️ Important Notes

### **This logic ASSUMES:**

1. ✅ Sheet name is exactly `Audit`
2. ✅ Data is in ROW-based format (each row = one audit)
3. ✅ Outlet Code is in column K (index 10)
4. ✅ Visit Date is in column L (index 11)
5. ✅ Scoring is in column M (index 12)
6. ✅ Final Score is in column N (index 13)
7. ✅ Visit dates are in DD/MM/YYYY format

### **If your actual sheet has:**

- ❌ Different sheet name
- ❌ Different column positions
- ❌ COLUMN-based layout (each column = one outlet)
- ❌ Different date format
- ❌ Scoring in different location (like Q54)

**Then the mapping needs to be updated!**

---

## 🤔 Your Sheet Structure Question

Based on your screenshot showing:
- Visit Date at C5
- Final Score at C6
- Scoring at Q54

This suggests a **COMPLETELY DIFFERENT LAYOUT**:
- **Column-based** instead of row-based?
- **Each column** = one outlet?
- **Fixed row positions** for each field?

**Example of column-based layout:**
```
        Column B      Column C       Column D
Row 1   Outlet1      Outlet2        Outlet3
Row 2   Code         2019-BTTSLR1   OUT-003
Row 3   Name         Outlet Name    Another Name
Row 4   AM           LUTFI          JOHN
Row 5   Visit Date   09/03/2026     10/03/2026
Row 6   Final Score  71.04%         85%
...
Row 54  Scoring      -423.21%       90%
```

**If this is your structure, we need a COMPLETELY DIFFERENT parsing approach!**

---

## 📋 Next Steps - What We Need to Know

### **Please confirm:**

1. **Sheet Name:** What is the exact name of the tab in Google Sheets?
   - Is it "Audit"?
   - Or "LEGOSO RAYA_FIELD AUDIT"?
   - Or something else?

2. **Layout Type:**
   - **Row-based:** Each row is one audit, multiple columns for fields
   - **Column-based:** Each column is one audit, fixed rows for fields

3. **Column/Row Positions:**
   - Where exactly is Outlet Code?
   - Where is Visit Date?
   - Where is Scoring?
   - Where is Final Score?

4. **Date Format:**
   - DD/MM/YYYY (e.g., 09/03/2026)?
   - MM/DD/YYYY?
   - YYYY-MM-DD?

5. **Expected Behavior:**
   - Should dashboard show ALL audits for an outlet?
   - Or only the LATEST audit per outlet?

Once you clarify these points, I can update the logic correctly! 🎯
