# Data Format Documentation

## 📊 Overview

This document specifies the required data formats for Excel files used in the Invoice & Payment Matching Dashboard. Proper data formatting ensures accurate matching and optimal system performance.

## 📋 Required File Formats

### **Supported File Types**
- **Excel Files**: .xlsx, .xls (recommended: .xlsx)
- **CSV Files**: .csv with UTF-8 encoding
- **Text Files**: .txt with tab or comma delimiters

### **File Size Limits**
- **Maximum File Size**: 200 MB per upload
- **Recommended Size**: < 50 MB for optimal performance
- **Record Limits**: Up to 1 million records per file

## 📄 Invoice Data Format

### **Required Columns**

| Column Name | Data Type | Required | Description | Example |
|-------------|-----------|----------|-------------|---------|
| invoice_id | Text/Number | Yes | Unique invoice identifier | INV-2023-001 |
| customer_id | Text/Number | Yes | Customer identifier | CUST-001 |
| customer_name | Text | No | Customer display name | ABC Corporation |
| invoice_date | Date | Yes | Invoice issue date | 2023-12-01 |
| due_date | Date | No | Payment due date | 2023-12-31 |
| amount | Number | Yes | Invoice amount (no currency symbols) | 1500.00 |
| currency | Text | No | Currency code (default: USD) | USD |
| reference_number | Text | No | Invoice reference/PO number | PO-2023-456 |
| description | Text | No | Invoice description | Professional Services |
| status | Text | No | Invoice status | Open |

### **Invoice Excel Template**

#### **Sheet Name**: "Invoices" (recommended)

| invoice_id | customer_id | customer_name | invoice_date | due_date | amount | currency | reference_number | description | status |
|------------|-------------|---------------|--------------|----------|--------|----------|------------------|-------------|--------|
| INV-2023-001 | CUST-001 | ABC Corp | 2023-12-01 | 2023-12-31 | 1500.00 | USD | PO-2023-456 | Consulting Services | Open |
| INV-2023-002 | CUST-002 | XYZ Ltd | 2023-12-02 | 2024-01-01 | 2750.50 | USD | REF-789 | Software License | Open |
| INV-2023-003 | CUST-001 | ABC Corp | 2023-12-03 | 2024-01-02 | 890.25 | EUR | PO-2023-457 | Training Services | Open |

### **Data Validation Rules**

#### **Invoice ID**
- **Format**: Alphanumeric, hyphens, underscores allowed
- **Length**: 1-50 characters
- **Uniqueness**: Must be unique within the file
- **Examples**: INV-001, 2023-INV-001, INVOICE_001

#### **Customer ID**
- **Format**: Alphanumeric, hyphens, underscores allowed
- **Length**: 1-30 characters
- **Consistency**: Must be consistent across all invoices for same customer
- **Examples**: CUST-001, C001, CUSTOMER_ABC

#### **Invoice Date**
- **Format**: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
- **Range**: Not more than 5 years in the past or 1 year in the future
- **Required**: Cannot be blank
- **Examples**: 2023-12-01, 12/01/2023, 01/12/2023

#### **Amount**
- **Format**: Numeric only (no currency symbols, commas)
- **Precision**: Up to 2 decimal places
- **Range**: Must be positive (> 0)
- **Examples**: 1500.00, 2750.5, 890.25

## 💳 Payment Data Format

### **Required Columns**

| Column Name | Data Type | Required | Description | Example |
|-------------|-----------|----------|-------------|---------|
| payment_id | Text/Number | Yes | Unique payment identifier | PAY-2023-001 |
| customer_id | Text/Number | Yes | Customer identifier | CUST-001 |
| customer_name | Text | No | Customer display name | ABC Corporation |
| payment_date | Date | Yes | Payment received date | 2023-12-15 |
| amount | Number | Yes | Payment amount (no currency symbols) | 1500.00 |
| currency | Text | No | Currency code (default: USD) | USD |
| reference_number | Text | No | Payment reference/check number | CHK-789 |
| payment_method | Text | No | Payment method | Wire Transfer |
| bank_reference | Text | No | Bank transaction reference | TXN-ABC123 |
| notes | Text | No | Additional notes | Early payment discount |

### **Payment Excel Template**

#### **Sheet Name**: "Payments" (recommended)

| payment_id | customer_id | customer_name | payment_date | amount | currency | reference_number | payment_method | bank_reference | notes |
|------------|-------------|---------------|--------------|--------|----------|------------------|----------------|----------------|-------|
| PAY-2023-001 | CUST-001 | ABC Corp | 2023-12-15 | 1500.00 | USD | CHK-789 | Check | | |
| PAY-2023-002 | CUST-002 | XYZ Ltd | 2023-12-16 | 2750.50 | USD | WIRE-456 | Wire Transfer | TXN-ABC123 | |
| PAY-2023-003 | CUST-001 | ABC Corp | 2023-12-17 | 890.25 | EUR | ACH-321 | ACH Transfer | | Early payment |

### **Data Validation Rules**

#### **Payment ID**
- **Format**: Alphanumeric, hyphens, underscores allowed
- **Length**: 1-50 characters
- **Uniqueness**: Must be unique within the file
- **Examples**: PAY-001, 2023-PAY-001, PAYMENT_001

#### **Payment Date**
- **Format**: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
- **Range**: Not more than 2 years in the past or 30 days in the future
- **Required**: Cannot be blank
- **Examples**: 2023-12-15, 12/15/2023, 15/12/2023

#### **Payment Method**
- **Valid Values**: Check, Wire Transfer, ACH Transfer, Credit Card, Cash, Other
- **Format**: Text (case insensitive)
- **Default**: "Other" if not specified

## 🔄 Multi-Sheet Excel Files

### **Combined Invoice and Payment File**

#### **Sheet Structure**
- **Sheet 1**: "Invoices" - Invoice data
- **Sheet 2**: "Payments" - Payment data
- **Sheet 3**: "Customers" - Customer master data (optional)

#### **Customer Master Data (Optional)**

| customer_id | customer_name | customer_type | credit_limit | payment_terms | contact_email |
|-------------|---------------|---------------|--------------|---------------|---------------|
| CUST-001 | ABC Corporation | Enterprise | 50000.00 | Net 30 | billing@abc.com |
| CUST-002 | XYZ Limited | SMB | 25000.00 | Net 60 | accounts@xyz.com |

## 📝 Data Quality Guidelines

### **1. Data Consistency**

#### **Customer Information**
- **Customer ID**: Must be identical across invoices and payments
- **Customer Name**: Should be consistent (minor variations acceptable)
- **Currency**: Use standard 3-letter ISO codes (USD, EUR, GBP, etc.)

#### **Date Formats**
- **Consistency**: Use same date format throughout the file
- **Timezone**: Assume local business timezone if not specified
- **Validation**: Ensure logical date relationships (due_date >= invoice_date)

#### **Amount Formatting**
- **No Currency Symbols**: Remove $, €, £, etc.
- **No Thousands Separators**: Remove commas (1500.00, not 1,500.00)
- **Decimal Places**: Use period (.) as decimal separator
- **Negative Amounts**: Use minus sign (-) for credits/adjustments

### **2. Data Completeness**

#### **Required Field Validation**
- **Invoice ID**: Must be present and unique
- **Customer ID**: Must be present for matching
- **Date Fields**: Must be valid dates
- **Amount Fields**: Must be positive numbers

#### **Optional Field Guidelines**
- **Reference Numbers**: Highly recommended for better matching
- **Customer Names**: Helpful for manual review and validation
- **Descriptions**: Useful for audit trails and reporting

### **3. Data Accuracy**

#### **Amount Validation**
- **Reasonable Ranges**: Flag amounts outside normal business ranges
- **Decimal Precision**: Limit to 2 decimal places for currency
- **Zero Amounts**: Generally not allowed (use separate adjustment process)

#### **Date Validation**
- **Business Dates**: Ensure dates fall on business days when appropriate
- **Logical Sequences**: Payment dates should generally be after invoice dates
- **Current Period**: Focus on recent transactions for active matching

## 🛠️ File Preparation Best Practices

### **1. Excel File Optimization**

#### **Before Upload**
- **Remove Empty Rows**: Delete blank rows between data
- **Clear Formatting**: Remove excessive formatting that may cause parsing issues
- **Single Header Row**: Ensure only one header row at the top
- **No Merged Cells**: Avoid merged cells in data area

#### **Column Headers**
- **Exact Names**: Use exact column names as specified (case-insensitive)
- **No Special Characters**: Avoid special characters in headers
- **No Spaces**: Use underscores instead of spaces (invoice_id, not "Invoice ID")
- **Alternative Names**: System accepts common variations (amount/total, date/invoice_date)

### **2. Data Cleaning Checklist**

#### **Pre-Upload Validation**
- [ ] All required columns present
- [ ] No duplicate IDs within each sheet
- [ ] All dates in consistent format
- [ ] All amounts are positive numbers
- [ ] No currency symbols in amount fields
- [ ] Customer IDs consistent between invoices and payments
- [ ] File size under 200 MB

#### **Common Issues to Fix**
- **Leading/Trailing Spaces**: Trim whitespace from text fields
- **Inconsistent Casing**: Standardize customer names and IDs
- **Date Format Mixing**: Use consistent date format throughout
- **Number Formatting**: Remove commas and currency symbols
- **Special Characters**: Replace or remove problematic characters

### **3. Testing and Validation**

#### **Sample File Testing**
- **Small Sample**: Test with 10-20 records first
- **Validation Report**: Review upload validation messages
- **Matching Test**: Verify matching results with known data
- **Error Resolution**: Fix any identified issues before full upload

#### **Production Upload**
- **Backup Original**: Keep copy of original file
- **Incremental Upload**: Consider uploading in batches for large files
- **Monitor Processing**: Watch for memory or performance issues
- **Validate Results**: Review matching results and exception reports

## 📊 Sample Data Templates

### **Download Templates**
The system provides downloadable Excel templates with:
- **Correct column headers** and formatting
- **Sample data** showing proper format
- **Data validation rules** built into the template
- **Instructions sheet** with formatting guidelines

### **Template Files Available**
- **invoice_template.xlsx**: Invoice data template
- **payment_template.xlsx**: Payment data template
- **combined_template.xlsx**: Multi-sheet template with both invoices and payments
- **sample_data.xlsx**: Complete sample dataset for testing

## 🔍 Troubleshooting Common Issues

### **Upload Errors**

#### **File Format Issues**
- **Error**: "Unsupported file format"
- **Solution**: Save as .xlsx format, ensure file is not corrupted

#### **Column Header Issues**
- **Error**: "Required column not found"
- **Solution**: Check column names match specification exactly

#### **Data Type Issues**
- **Error**: "Invalid date format"
- **Solution**: Ensure dates are in recognized format (YYYY-MM-DD recommended)

#### **Data Validation Issues**
- **Error**: "Duplicate invoice ID"
- **Solution**: Ensure all IDs are unique within the file

### **Matching Issues**

#### **Low Match Rates**
- **Cause**: Inconsistent customer IDs or reference numbers
- **Solution**: Standardize customer identifiers and reference formats

#### **Amount Mismatches**
- **Cause**: Currency symbols or formatting in amount fields
- **Solution**: Remove all non-numeric characters from amounts

#### **Date Range Issues**
- **Cause**: Payments dated before invoices or outside reasonable range
- **Solution**: Verify date accuracy and format consistency

## 📞 Support and Resources

### **Additional Help**
- **Template Downloads**: Available in the application under "Help" → "Templates"
- **Sample Data**: Use provided sample files to understand format requirements
- **Validation Tool**: Built-in file validator provides detailed error reports
- **Documentation**: This guide available as PDF download

### **Contact Information**
- **Technical Support**: support@yourcompany.com
- **Documentation Updates**: Check application for latest format requirements
- **Training Resources**: Video tutorials available in help section

---

*This data format documentation ensures consistent, accurate data input for optimal matching performance. For technical implementation details, see [SETUP.md](SETUP.md) and [BUSINESS_LOGIC.md](BUSINESS_LOGIC.md).*
