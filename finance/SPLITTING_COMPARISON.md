# Splitting Tools Comparison: IM vs PV

## 🎯 Overview

This document explains the differences between **IM Splitter** and **PV Splitter** to help you understand when to use each tool and how they work.

---

## 📊 Quick Comparison Table

| Feature | IM Splitter | PV Splitter |
|---------|-------------|-------------|
| **Purpose** | Split Serah Terima IM files | Split PV (Payment Voucher) files |
| **Input Type** | Single-sheet Excel (all suppliers in rows) | Multi-sheet Excel (one sheet per supplier) |
| **Split Method** | By Supplier (Column D) in rows | By Sheet (one file per sheet) |
| **Column Deletion** | YES (B, C, E, F, H, I, M, P, S, T, U) | NO (preserves all columns) |
| **Filename Format** | `{SupplierName}_{YYYYMMDD}.xlsx` | `{CompanyName} {PVNumber}.xlsx` |
| **Data Source for Name** | Column D (after deletion: becomes Column B) | Cell D9 in each sheet |
| **WhatsApp Distribution** | ✅ YES (Web + App) | ❌ NO |
| **Email Distribution** | ✅ YES (with mapping or D12) | ✅ YES (with mapping or D12) |
| **Email Capture Methods** | 1. Mapping file (Column A=Supplier, B=Email) | 1. Mapping file (Column A=Company, B=Email) |
| | 2. (No fallback) | 2. Fallback to cell D12 in each sheet |
| **Port** | 5002 | 5001 |
| **File Path** | `finance/serah-terima-im-split.html` | `finance/pv-split.html` |
| **Backend** | `finance/im-splitter.py` | `finance/pv-splitter.py` |

---

## 🔍 Detailed Comparison

### IM Splitter

#### Input Structure
```
Single Excel Sheet with ALL suppliers:

Row 1: Headers
Row 2: Supplier 1 data (with many columns A to Z)
Row 3: Supplier 2 data
Row 4: Supplier 3 data
...
```

#### Processing Logic
1. **Read Input**: Single sheet, all suppliers in rows
2. **Extract Date**: From cell G3 (after column deletion, becomes D3)
3. **Delete Columns**: Remove B, C, E, F, H, I, M, P, S, T, U
4. **Identify Suppliers**: Group rows by Supplier name (Column D → Column B after deletion)
5. **Create Files**: One file per supplier with their rows only
6. **Filename**: `{SupplierName}_{YYYYMMDD}.xlsx`
   - Example: `PT_MARGA_NUSANTARA_JAYA_20241202.xlsx`

#### Email Matching
- **Primary**: Upload email mapping file (Column A = Supplier, B = Email)
- **Fallback**: None (email is optional)
- Uses 3 matching strategies:
  1. Exact match with supplier name
  2. Match with company part (after dash)
  3. Match with cleaned supplier name

#### Distribution Methods
- **WhatsApp**: 
  - Dual buttons (Web + App)
  - Supports group invite links, phone numbers, group names
  - Pre-filled messages
  - Manual file attachment required
- **Email**: 
  - Individual send buttons
  - "Send All Emails" bulk button
  - Auto-attached files
  - Professional email template

#### Use Case Example
**Scenario**: Monthly Serah Terima IM Distribution
```
Input: Serah_Terima_IM_November_2024.xlsx (1 sheet, 50 suppliers)
Process: 
  - Upload IM file
  - Upload WhatsApp mapping (optional)
  - Upload Email mapping (optional)
  - Click "Process & Split Files"
Output: 50 files (one per supplier)
  - PT_MARGA_NUSANTARA_JAYA_20241115.xlsx
  - PT_ANUGERAH_PHARMINDO_LESTARI_20241115.xlsx
  - ...
Distribute:
  - WhatsApp: Click "WA Web" or "WA App" per supplier
  - Email: Click "Send All Emails" to send all at once
```

---

### PV Splitter

#### Input Structure
```
Multi-sheet Excel Workbook:

Sheet 1 (PT. MARGA NUSANTARA JAYA):
  - Cell D9: Company Name
  - Cell R9: PV Number
  - Cell D12: Email (optional if using mapping)
  - Data in various cells

Sheet 2 (PT. ANUGERAH PHARMINDO):
  - Cell D9: Company Name
  - Cell R9: PV Number
  - Cell D12: Email
  - Data in various cells
...
```

#### Processing Logic
1. **Read Input**: Multi-sheet workbook
2. **Process Each Sheet**:
   - Extract company name from D9
   - Extract PV number from R9
   - Match email (from mapping or D12)
3. **Create Files**: One file per sheet (all formatting preserved)
4. **Filename**: `{CompanyName} {PVNumber}.xlsx`
   - Example: `PT MARGA NUSANTARA JAYA PV_20241115_001.xlsx`

#### Email Matching
- **Primary**: Upload email mapping file (Column A = Company Name, B = Email)
- **Fallback**: Read from cell D12 in each sheet
- Uses 3 matching strategies:
  1. Exact match with company name from D9
  2. Match with cleaned company name
  3. Fallback to D12 if no match

#### Distribution Methods
- **WhatsApp**: ❌ Not available
- **Email**: 
  - Individual send buttons
  - "Send All Emails Automatically" bulk button
  - Auto-attached files
  - Professional email template
  - Manual Gmail compose option

#### Use Case Example
**Scenario**: Monthly PV Distribution
```
Input: PV_November_2024.xlsx (10 sheets, one per company)
Process: 
  - Upload PV workbook
  - Upload Email mapping (optional)
  - Click "Process & Split Files"
Output: 10 files (one per sheet)
  - PT MARGA NUSANTARA JAYA PV_20241115_001.xlsx
  - PT ANUGERAH PHARMINDO PV_20241115_002.xlsx
  - ...
Distribute:
  - Email: Click "Send All Emails Automatically"
  - Or click "Open Gmail" per company for manual sending
```

---

## 🎨 Visual Workflow Comparison

### IM Splitter Workflow
```
┌─────────────────────────┐
│ Single-Sheet Excel      │
│ (All Suppliers in Rows) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 1. Delete Columns       │
│    (B,C,E,F,H,I,M,P,S,T,U)│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Group by Supplier    │
│    (Column D→B)         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Create Files         │
│    (One per Supplier)   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. Match Email/WA       │
│    (From mapping files) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 5. Distribute           │
│    WhatsApp + Email     │
└─────────────────────────┘
```

### PV Splitter Workflow
```
┌─────────────────────────┐
│ Multi-Sheet Excel       │
│ (One Sheet per Company) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 1. Extract Metadata     │
│    D9=Company, R9=PV#   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Create Files         │
│    (One per Sheet)      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Match Email          │
│    (Mapping or D12)     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. Distribute           │
│    Email Only           │
└─────────────────────────┘
```

---

## 🔧 Technical Implementation Differences

### Backend Architecture

#### IM Splitter (`finance/im-splitter.py`)
```python
def delete_columns_and_split(input_file, wa_mapping, email_mapping, temp_dir):
    # 1. Delete specific columns
    columns_to_delete = ['B', 'C', 'E', 'F', 'H', 'I', 'M', 'P', 'S', 'T', 'U']
    
    # 2. Extract date from G3 (becomes D3 after deletion)
    date_value = ws['D3'].value  # Was G3 before deletion
    
    # 3. Group rows by supplier (Column B after deletion)
    # Original Column D becomes Column B after deletion
    supplier_name = row[1].value  # Column B (0-indexed = 1)
    
    # 4. Match WhatsApp and Email
    wa_target = find_wa_target(supplier_name, wa_mapping)
    email = find_email(supplier_name, email_mapping)
    
    # 5. Create split files
    return split_files_info
```

#### PV Splitter (`finance/pv-splitter.py`)
```python
def split_excel(file, email_mapping):
    # 1. Process each sheet
    for sheet_name in workbook.sheetnames:
        sheet = workbook[sheet_name]
        
        # 2. Extract metadata from specific cells
        company_name = sheet['D9'].value
        pv_number = sheet['R9'].value
        
        # 3. Match email
        email = email_mapping.get(company_name) or sheet['D12'].value
        
        # 4. Copy entire sheet to new workbook (no column deletion)
        # Preserve all formatting, merged cells, etc.
        
        # 5. Create split file
        return split_files_info
```

### Key Code Differences

| Aspect | IM Splitter | PV Splitter |
|--------|-------------|-------------|
| **Column Deletion** | `ws.delete_cols()` for specific columns | No deletion |
| **Data Grouping** | Loop through rows, group by supplier | Loop through sheets |
| **Metadata Location** | Various columns, extracted after deletion | Fixed cells (D9, R9, D12) |
| **File Creation** | Create new sheet, copy grouped rows | Copy entire sheet with formatting |
| **WhatsApp Integration** | `/api/generate-wa-link` endpoint | Not implemented |
| **Email Fallback** | None (email optional) | D12 cell as fallback |

---

## 📝 Email Mapping Comparison

### Both Tools Support Email Mapping File

**Format (Same for Both):**
```
Column A: Company/Supplier Name
Column B: Email Address
```

**Matching Logic (Similar):**
1. **Exact Match**: Name matches exactly
2. **Cleaned Match**: Remove extra spaces and match
3. **Fallback**: IM Splitter has no fallback, PV Splitter reads D12

### IM Splitter Email Example
```csv
Supplier Name,Email Address
PT. MARGA NUSANTARA JAYA,finance@marga.co.id
PT ANUGERAH PHARMINDO LESTARI,accounting@apl.com
```

**Matching from Column D (becomes B after deletion):**
- "0000000008 - PT. MARGA NUSANTARA JAYA" → Extracts "PT. MARGA NUSANTARA JAYA" → Matches!

### PV Splitter Email Example
```csv
Company Name,Email Address
PT. MARGA NUSANTARA JAYA,finance@marga.co.id
PT ANUGERAH PHARMINDO LESTARI,accounting@apl.com
```

**Matching from cell D9:**
- D9 = "PT. MARGA NUSANTARA JAYA" → Direct match!
- If no match → Fallback to D12

---

## 🎯 When to Use Which Tool?

### Use IM Splitter When:
✅ You have a single Excel sheet with multiple suppliers  
✅ You need to remove specific columns before distribution  
✅ You want to distribute via WhatsApp AND/OR Email  
✅ Your data has supplier info in one column (e.g., Column D)  
✅ You need filename with date format  

**Example Use Cases:**
- Monthly Serah Terima IM distribution
- Consolidated supplier reports to be split
- Documents requiring WhatsApp distribution

### Use PV Splitter When:
✅ You have a multi-sheet Excel workbook (one sheet per company)  
✅ You want to preserve all columns and formatting  
✅ You only need email distribution  
✅ Your sheets have company info in cell D9 and PV# in R9  
✅ You want to keep original sheet structure intact  

**Example Use Cases:**
- Monthly PV (Payment Voucher) distribution
- Per-company financial documents
- Pre-separated supplier sheets
- Documents with complex formatting to preserve

---

## 💡 Best Practices

### For Both Tools
1. **Maintain Email Master Lists**: Keep centralized email mapping files
2. **Use Descriptive Filenames**: Date your mapping files (e.g., `Email_List_2024-12.xlsx`)
3. **Test Before Production**: Always test with small sample first
4. **Backup Original Files**: Keep copies before processing
5. **Validate Outputs**: Check a few split files manually

### IM Splitter Specific
- ✅ Verify column headers before upload (system deletes specific columns)
- ✅ Check date in cell G3 (or D3 after deletion) is correct
- ✅ Use WhatsApp group invite links for best results
- ✅ Maintain both WA and Email mapping files

### PV Splitter Specific
- ✅ Ensure cell D9 has company name in each sheet
- ✅ Ensure cell R9 has PV number in each sheet
- ✅ Keep D12 populated as email fallback
- ✅ Test email mapping matches D9 exactly

---

## 🔗 Related Documentation

### IM Splitter Docs
- `WHATSAPP_INTEGRATION_GUIDE.md` - WhatsApp setup and usage
- `EMAIL_FEATURE_SUMMARY.md` - Email distribution guide
- `HOW_TO_GET_INVITE_LINKS.md` - Getting WhatsApp invite links

### PV Splitter Docs
- `PV_EMAIL_MAPPING_GUIDE.md` - Email mapping comprehensive guide
- `EMAIL_SETUP.md` - Gmail SMTP configuration

### General
- `README.md` - Overview of all finance tools
- `SPLITTING_COMPARISON.md` - This document

---

## 📊 Feature Matrix

| Feature | IM Splitter | PV Splitter |
|---------|:-----------:|:-----------:|
| **File Input** |
| Single-sheet Excel | ✅ | ❌ |
| Multi-sheet Excel | ❌ | ✅ |
| **Processing** |
| Column Deletion | ✅ | ❌ |
| Row Grouping | ✅ | ❌ |
| Sheet Splitting | ❌ | ✅ |
| Format Preservation | Partial | Full |
| Auto-fit Columns | ✅ | Inherited |
| **Distribution** |
| WhatsApp Web | ✅ | ❌ |
| WhatsApp App | ✅ | ❌ |
| Email Individual | ✅ | ✅ |
| Email Bulk Send | ✅ | ✅ |
| **Email Capture** |
| Mapping File | ✅ | ✅ |
| Cell Fallback | ❌ | ✅ (D12) |
| **Downloads** |
| Individual Files | ✅ | ✅ |
| Bulk ZIP | ✅ | ✅ |
| **UI Features** |
| Drag & Drop | ✅ | ✅ |
| Template Download | ✅ | ✅ |
| Progress Indicator | ✅ | ✅ |
| Error Handling | ✅ | ✅ |

---

## 🎉 Summary

Both tools serve specific purposes in the document distribution workflow:

**IM Splitter**: 
- Single-sheet → Multiple files
- Column deletion required
- WhatsApp + Email
- Perfect for consolidated supplier reports

**PV Splitter**:
- Multi-sheet → Multiple files  
- Format preservation required
- Email only
- Perfect for per-company financial docs

Choose the tool that matches your input structure and distribution needs! 🚀

---

*Last Updated: 2024-12-02*  
*Tools: IM Splitter v2.0, PV Splitter v2.0*
