# PV Splitter - Email Mapping Feature Guide

## 🎯 Overview

The PV Splitter now supports **TWO methods** for capturing email addresses:

### Method 1: Email Mapping File (NEW - Recommended)
Upload an Excel master list with Company Names and Email Addresses. The system will automatically match each PV sheet to its corresponding email.

### Method 2: Legacy D12 Cell (Fallback)
The system will read email addresses from cell D12 in each sheet if no mapping file is uploaded.

---

## 📋 Email Mapping File Format

### Required Format
| Column A | Column B |
|----------|----------|
| Company Name | Email Address |
| PT. MARGA NUSANTARA JAYA | finance@marga.co.id |
| PT ANUGERAH PHARMINDO LESTARI | accounting@apl.com |
| PT. INDOCORE PERKASA | admin@indocore.id |

### Requirements
- **Column A**: Company Name (must match cell D9 in PV sheets)
- **Column B**: Valid email address
- **Format**: .xlsx or .xls
- **Header Row**: Row 1 (will be skipped during processing)
- **Start Data**: Row 2 onwards

### Template Download
Click the **"Download Template"** button in the upload section to get a starter template.

---

## 🔍 How Matching Works

The system uses **3 matching strategies** to find the correct email:

### Strategy 1: Exact Match
```
PV Sheet D9: "PT. MARGA NUSANTARA JAYA"
Email List A2: "PT. MARGA NUSANTARA JAYA"
✅ MATCH! Uses email from B2
```

### Strategy 2: Cleaned Match
```
PV Sheet D9: "PT.  MARGA   NUSANTARA  JAYA" (extra spaces)
Email List A2: "PT. MARGA NUSANTARA JAYA"
✅ MATCH! System removes extra spaces and matches
```

### Strategy 3: Fallback to D12
```
PV Sheet D9: "PT. NEW COMPANY"
Email List: No match found
❌ No match → Falls back to reading cell D12 in the sheet
```

---

## 📖 Step-by-Step Usage

### Step 1: Prepare Email Mapping File
1. Download the template by clicking **"Download Template"**
2. Open in Excel
3. Fill in:
   - **Column A**: Enter exact company names from your PV sheets (cell D9)
   - **Column B**: Enter corresponding email addresses
4. Save as `.xlsx` file

**Example:**
```
Company Name                    | Email Address
--------------------------------|-------------------------
PT. MARGA NUSANTARA JAYA       | finance@marga.co.id
PT ANUGERAH PHARMINDO LESTARI   | accounting@apl.com
PT. INDOCORE PERKASA           | admin@indocore.id
```

### Step 2: Upload Files
1. **Upload PV Excel File** (Required)
   - Your multi-sheet PV workbook
   - Each sheet = one supplier's PV

2. **Upload Email Master List** (Optional)
   - Your email mapping file
   - If skipped, system uses D12 cells

### Step 3: Process & Split
Click **"Process & Split Files"** button

### Step 4: Review Results
- Check that each file has the correct email assigned
- Files with ✅ have email addresses
- Files with ⚠️ "No email" need attention

### Step 5: Send Emails
Choose one of these options:
- **Automated**: Click "Send All Emails Automatically" (requires email config)
- **Manual**: Click "Prepare Emails" → "Open Gmail" for each recipient

---

## ✅ Advantages of Email Mapping File

### vs. Legacy D12 Method

| Feature | Email Mapping File | D12 Cell Method |
|---------|-------------------|-----------------|
| **Central Management** | ✅ One file for all emails | ❌ Email in each sheet |
| **Easy Updates** | ✅ Update one file | ❌ Update each sheet |
| **Consistency** | ✅ Guaranteed same email | ⚠️ Risk of typos |
| **Audit Trail** | ✅ Master list as reference | ❌ No central record |
| **Bulk Changes** | ✅ Change all at once | ❌ Manual one-by-one |
| **Error Checking** | ✅ Easy to validate | ❌ Hard to find errors |

---

## 🧪 Testing Checklist

### Before Production Use
- [ ] Download the email template
- [ ] Fill in 3-5 test companies
- [ ] Upload a test PV file with matching companies
- [ ] Upload the email mapping file
- [ ] Click "Process & Split Files"
- [ ] Verify emails are correctly assigned
- [ ] Test "Prepare Emails" functionality
- [ ] Test automated email sending (if configured)

### Test Scenarios
1. **All Match**: All companies in mapping → Should use mapped emails
2. **Partial Match**: Some companies missing → Should fallback to D12
3. **No Mapping**: Don't upload mapping → Should use D12 for all
4. **Typo in Names**: Slight difference in name → Should still match (cleaned)

---

## 🔧 Troubleshooting

### Problem: "No email" showing for files
**Solution:**
1. Check company name in cell D9 matches Column A in mapping file
2. Ensure no extra spaces (system auto-cleans, but check)
3. If no match, check cell D12 has email
4. Re-upload mapping file if needed

### Problem: Wrong email assigned
**Solution:**
1. Check mapping file Column A exactly matches D9
2. Look for duplicate entries in mapping file
3. Verify email in Column B is correct
4. Re-process after fixing mapping file

### Problem: Template not downloading
**Solution:**
1. Check browser pop-up blocker
2. Try right-click → "Save As"
3. Create manually with format: `Company Name,Email Address`

---

## 📝 Best Practices

### 1. Maintain Master Email List
- Keep one central Excel file with all company emails
- Update it whenever a company email changes
- Version control it (e.g., `Email_List_2024-12-02.xlsx`)

### 2. Standardize Company Names
- Use exact names as they appear in D9
- Be consistent with punctuation (PT. vs PT)
- Document any variations

### 3. Regular Validation
- Periodically check for bounced emails
- Update mapping file when companies change emails
- Test with small batches first

### 4. Backup D12 Method
- Even with mapping file, keep D12 populated
- Acts as fallback if mapping fails
- Useful for one-off special cases

---

## 🎓 Example Workflow

### Scenario: Monthly PV Distribution

**Setup (Once):**
1. Create `Company_Emails_Master.xlsx`
2. Fill all current suppliers and emails
3. Save in shared location

**Monthly Process:**
1. Receive PV workbook from accounting
2. Open PV Splitter tool
3. Upload PV workbook
4. Upload `Company_Emails_Master.xlsx`
5. Click "Process & Split Files"
6. Review results (10 companies, all matched ✅)
7. Click "Send All Emails Automatically"
8. Done! ✨

**Time Saved:**
- **Before**: 30 minutes (manual email lookup + sending)
- **After**: 2 minutes (upload + click)
- **Savings**: 93% faster! 🚀

---

## 🔄 Migration from D12 Method

### Step 1: Extract Current Emails
1. Open your typical PV workbook
2. Create new Excel file
3. For each sheet:
   - Column A: Copy company name from D9
   - Column B: Copy email from D12

### Step 2: Save as Master List
Save as `Email_Mapping_Master.xlsx`

### Step 3: Test Parallel
1. First run: Use mapping file
2. Verify emails match what D12 would give
3. Once confident, switch fully to mapping

### Step 4: Clean Up (Optional)
- Can clear D12 cells in future PV sheets
- Mapping file is now the source of truth

---

## 📚 Related Documentation

- **Email Setup**: `EMAIL_SETUP.md` - Configure Gmail integration
- **IM Splitter Email**: `EMAIL_FEATURE_SUMMARY.md` - Similar feature for IM files
- **Main README**: `README.md` - Overview of all finance tools

---

## 💡 Tips & Tricks

1. **Use Descriptive Names**: `Email_Mapping_2024_Dec.xlsx` vs `list.xlsx`
2. **Add Notes Column**: Add Column C for notes (ignored by system)
3. **Color Code**: Use Excel colors to mark recently updated entries
4. **Filter & Sort**: Excel features work great for managing large lists
5. **Share with Team**: Put on shared drive so others can use too

---

## 🎉 Summary

The Email Mapping feature gives you:
- ✅ **Centralized** email management
- ✅ **Fast** processing (no manual lookup)
- ✅ **Accurate** email assignment
- ✅ **Flexible** with fallback to D12
- ✅ **Easy** to maintain and update

**Result**: Professional, efficient, error-free PV distribution! 🚀

---

*Last Updated: 2024-12-02*
*Tool: PV Splitter v2.0 with Email Mapping*
