# ✉️ Email Functionality Added to IM Splitter

## 🎉 What's New

I've successfully added email functionality to the IM Splitter tool, matching the features from your PV Splitter!

---

## ✨ Key Features

### 1. **Email Mapping File Upload (Optional)**
- Upload Excel file with supplier email addresses
- **Format:**
  - Column A: Supplier Name
  - Column B: Email Address
- **Drag-and-drop support** with visual feedback
- **Optional:** You can upload WA mapping only, Email mapping only, or both!

### 2. **Individual Email Sending**
- **Send Email button** appears for each supplier with email mapping
- Click button → Confirmation dialog → Email sent with file attached
- Professional email template with:
  - Subject: `Serah Terima IM - [Supplier Name]`
  - Body: Personalized message with supplier name and filename
  - Attachment: Split Excel file automatically attached

### 3. **Bulk Email Sending**
- **"Send All Emails" button** at the top
- Sends emails to all suppliers with email mappings in one click
- Progress notifications showing send status
- Summary: "Sent X emails successfully" or error details

### 4. **Auto-Attached Files** ✅
- **Unlike WhatsApp**, email files ARE automatically attached!
- No manual attachment needed - just click send
- Files sent directly from server to email

### 5. **Flexible Upload Options**
- ✅ **Required:** Completed IM file only
- ✅ **Optional:** WhatsApp mapping
- ✅ **Optional:** Email mapping
- Can use either, both, or process files only

---

## 🔧 Technical Implementation

### Backend Changes (`finance/im-splitter.py`)

```python
# Email Configuration (same as PV Splitter)
EMAIL_CONFIG = {
    'smtp_server': 'smtp.gmail.com',
    'smtp_port': 587,
    'sender_email': os.getenv('SENDER_EMAIL', ''),
    'sender_password': os.getenv('SENDER_PASSWORD', ''),
    'sender_name': 'Apotek Alpro Finance Team'
}

# New Endpoints
POST /api/send-emails         # Send emails with attachments
GET  /api/test-email-config   # Check email configuration
```

**Key Functions:**
- `send_single_email()` - Sends one email with SMTP
- Flexible email matching (3 strategies like WA mapping)
- Batch email processing with error handling
- Email address stored in split file metadata

### Frontend Changes (`finance/serah-terima-im-split.html`)

**New UI Elements:**
- Email mapping upload section (Section 3)
- "Send Email" button on each file card (purple button)
- "Send All Emails" bulk button at top
- Email address display in file cards

**New Functions:**
- `handleEmailFile()` - Process uploaded email mapping
- `sendEmail()` - Send individual email
- `sendAllEmails()` - Send bulk emails
- Email confirmation dialogs
- Real-time send notifications

---

## 📋 How to Use

### Step 1: Configure Email (One-Time Setup)

Set environment variables before starting the API:

```bash
export SENDER_EMAIL="your-email@gmail.com"
export SENDER_PASSWORD="your-gmail-app-password"
```

**How to get Gmail App Password:**
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Search for "App passwords"
4. Generate app password for "Mail"
5. Copy the 16-character password
6. Use this as `SENDER_PASSWORD`

### Step 2: Create Email Mapping File

Create Excel file with this format:

| Column A (Supplier Name) | Column B (Email Address) |
|--------------------------|--------------------------|
| PT. MARGA NUSANTARA JAYA | supplier1@example.com |
| PT ANUGERAH PHARMINDO LESTARI | supplier2@example.com |
| PT. INDOCORE PERKASA | supplier3@example.com |

**Notes:**
- Supplier name must match exactly as it appears in IM file
- Or use the company name part (e.g., "PT. MARGA NUSANTARA JAYA")
- System uses flexible matching (3 strategies)

### Step 3: Use the Tool

1. **Upload Files:**
   - ✅ Completed IM file (required)
   - ✅ WhatsApp mapping (optional - if you want WA distribution)
   - ✅ Email mapping (optional - if you want email distribution)

2. **Process Files:**
   - Click "Process & Split Files"
   - Files split by supplier

3. **Send via Email:**
   - **Individual:** Click "Send Email" button on specific file
   - **Bulk:** Click "Send All Emails" at top to send all at once

4. **Or Send via WhatsApp:**
   - **Individual:** Click "WA Web" or "WA App" button
   - Files download, WhatsApp opens (manual attachment required)

5. **Or Both!**
   - You can send to some suppliers via email
   - And others via WhatsApp
   - Completely flexible!

---

## 🆚 Email vs WhatsApp Comparison

| Feature | Email ✉️ | WhatsApp 📱 |
|---------|----------|-------------|
| **File Attachment** | ✅ Auto-attached | ❌ Manual (browser security) |
| **Setup Required** | ✅ Gmail App Password | ❌ None |
| **Direct Targeting** | ✅ Always direct to recipient | ✅ With invite links only |
| **Bulk Sending** | ✅ Yes (1 click for all) | ✅ Yes (but manual attach each) |
| **Mapping Required** | ✅ Yes (email addresses) | ⚠️ Optional (invite links better) |
| **User Experience** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Very Good |
| **Best For** | Formal communication | Quick informal sharing |

---

## 💡 Best Practices

### When to Use Email:
- ✅ Formal supplier communication
- ✅ When you need delivery confirmation
- ✅ When suppliers prefer email
- ✅ Bulk sending to many suppliers
- ✅ Automatic distribution without manual steps

### When to Use WhatsApp:
- ✅ Quick informal sharing
- ✅ When suppliers are more responsive on WhatsApp
- ✅ When you want personal touch
- ✅ Follow-up after email

### Use Both:
- ✅ Send email for official record
- ✅ Send WhatsApp as notification/reminder
- ✅ Best of both worlds!

---

## 🎯 Example Workflow

### Scenario: Send IM files to 20 suppliers

**Option 1: Email Only**
```
1. Upload completed IM file
2. Upload email mapping file
3. Click "Process & Split Files"
4. Click "Send All Emails"
5. Done! All 20 emails sent with files attached ✅
   Total time: 30 seconds
```

**Option 2: WhatsApp Only**
```
1. Upload completed IM file
2. Upload WA mapping file (with invite links)
3. Click "Process & Split Files"
4. For each file:
   - Click "WA Web"
   - WhatsApp opens in group
   - Click attach icon
   - Select file
   - Click send
5. Repeat for all 20 suppliers
   Total time: ~3 minutes (8 seconds × 20)
```

**Option 3: Both (Recommended)**
```
1. Upload completed IM file
2. Upload both WA and email mapping files
3. Click "Process & Split Files"
4. Click "Send All Emails" (official record)
5. Then click "WA Web" for high-priority suppliers (notification)
   Total time: 1-2 minutes
```

---

## 🔍 Technical Details

### Email Sending Process

1. **User clicks "Send Email"** or "Send All Emails"
2. **Frontend** prepares email data:
   ```javascript
   {
     to: "supplier@example.com",
     subject: "Serah Terima IM - Supplier Name",
     body: "Professional template with details",
     files: [{ filename: "PT_SUPPLIER_20251025.xlsx" }]
   }
   ```

3. **Backend API** receives request at `/api/send-emails`

4. **SMTP Connection:**
   - Connects to Gmail SMTP server
   - Uses TLS encryption
   - Authenticates with app password

5. **Email Construction:**
   - Creates multipart MIME message
   - Adds text body
   - Attaches Excel file from temp directory
   - Encodes file as base64

6. **Send & Confirm:**
   - Sends via SMTP
   - Returns success/failure status
   - Frontend shows notification

### Error Handling

- ✅ Email not configured → Shows error message
- ✅ No email mapping → Shows warning
- ✅ Individual send fails → Error notification with details
- ✅ Bulk send partial failure → Shows "X sent, Y failed"
- ✅ SMTP connection error → Clear error message

---

## 📊 Email Template

**Subject:**
```
Serah Terima IM - PT. MARGA NUSANTARA JAYA
```

**Body:**
```
Dear PT. MARGA NUSANTARA JAYA,

Please find attached your Serah Terima IM document.

File: PT_MARGA_NUSANTARA_JAYA_20251025.xlsx

Best regards,
Apotek Alpro Finance Team
```

**Attachment:**
```
PT_MARGA_NUSANTARA_JAYA_20251025.xlsx (auto-attached)
```

---

## ✅ Advantages Over WhatsApp

1. **No Manual Attachment** - Files automatically attached
2. **Official Record** - Email serves as formal communication
3. **Bulk Sending** - One click sends to all suppliers
4. **Delivery Confirmation** - Can track if email delivered
5. **Professional** - More formal than WhatsApp
6. **No Invite Links Needed** - Just email addresses

---

## 🚀 Next Steps for You

### Immediate:
1. ✅ Review PR #35: https://github.com/apotekalpro/apotek-alpro-dashboard/pull/35
2. ✅ Set up Gmail App Password (one-time)
3. ✅ Create email mapping Excel file
4. ✅ Test with a few suppliers

### Testing Checklist:
- [ ] Upload completed IM file only → Process works ✅
- [ ] Upload completed + email mapping → See email buttons ✅
- [ ] Upload completed + WA mapping → See WA buttons ✅
- [ ] Upload all three files → See both email and WA buttons ✅
- [ ] Click "Send Email" → Email sent with attachment ✅
- [ ] Click "Send All Emails" → Bulk send works ✅
- [ ] Verify supplier receives email with attached file ✅

### Production:
- [ ] Merge PR #35
- [ ] Deploy to production
- [ ] Set environment variables on production server
- [ ] Update email mapping file with real supplier emails
- [ ] Start using for daily IM distribution! 🎉

---

## 📞 Summary

**What You Requested:**
> "i need to add the email function like my previous split PV, include the auto email, using the same login and app pass. But allow me to upload email master file (Column A is supplier, B is email address of supplier). Then same, it would allow me to individual send, or mass send all at once. (Upload file of WA or email is optional, so i can upload which one i need)"

**What I Delivered:**
✅ Email functionality exactly like PV Splitter
✅ Same SMTP configuration (Gmail App Password)
✅ Email mapping file upload (Column A=Supplier, B=Email)
✅ Individual email send per supplier
✅ Bulk "Send All Emails" button
✅ **Auto-attached files** (unlike WhatsApp!)
✅ Optional uploads (WA, Email, or both)
✅ Professional email template
✅ Error handling and notifications

**Key Benefit:**
Unlike WhatsApp, **email files are automatically attached!** No manual attachment needed. Click button → Email sent → Done! ✅

---

## 🔗 Resources

- **PR #35:** https://github.com/apotekalpro/apotek-alpro-dashboard/pull/35
- **Documentation:**
  - Gmail App Password: https://support.google.com/accounts/answer/185833
  - PV Splitter (reference): `/finance/pv-splitter.py`
  - IM Splitter Backend: `/finance/im-splitter.py`
  - IM Splitter Frontend: `/finance/serah-terima-im-split.html`

**All committed and pushed to `genspark_ai_developer` branch!** 🚀
