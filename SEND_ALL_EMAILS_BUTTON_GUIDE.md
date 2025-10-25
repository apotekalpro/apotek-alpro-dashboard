# 📧 Send All Emails Button - Quick Guide

## ✅ Fixed! Button Now Shows/Hides Automatically

### 🎯 How It Works

The **"Send All Emails"** button is now **smart** - it automatically appears only when you have email mappings!

---

## 📍 Where to Find the Button

The button appears in the **Bulk Actions** section at the top of the results, right next to "Download All Files (ZIP)".

### Visual Layout:

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Split Summary                                           │
│  • Total Suppliers: 3                                       │
│  • Total Files: 3                                           │
│  • Processing Date: 20251025                                │
│                                                             │
│  ┌──────────────────────────┐  ┌───────────────────────┐  │
│  │ 📥 Download All Files    │  │ ✉️ Send All Emails    │  │  ← BUTTON IS HERE!
│  │    (ZIP)                 │  │                       │  │
│  └──────────────────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  📋 Split Files by Supplier                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  📄 PT_SUPPLIER_20251025.xlsx                          │ │
│  │  • Download  • WA Web  • WA App  • Send Email        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Button Visibility Logic

### ✅ Button SHOWS When:
- You upload **both** completed IM file + email mapping file
- After processing, **at least one** supplier has an email address mapped
- The button appears in **purple color** next to "Download All Files (ZIP)"

### ❌ Button HIDDEN When:
- You only upload completed IM file (no email mapping)
- Email mapping file uploaded but no suppliers match
- No email addresses found in the mapping

---

## 🎬 Step-by-Step Example

### Scenario: Upload files with email mapping

**Step 1: Upload Files**
```
✅ Upload: Completed IM file
✅ Upload: Email mapping file (with Column A=Supplier, B=Email)
❌ Upload: WA mapping (optional - not needed for email)
```

**Step 2: Click "Process & Split Files"**
```
Processing... ⏳
```

**Step 3: After Processing**
```
Results appear!

Bulk Actions:
┌──────────────────────────┐  ┌───────────────────────┐
│ Download All Files (ZIP) │  │ Send All Emails    │  ← BUTTON APPEARS!
└──────────────────────────┘  └───────────────────────┘
                                   ↑
                        Purple button, ready to click!
```

**Step 4: Click "Send All Emails"**
```
Confirmation: "Send 3 emails to suppliers?"
Click OK → Emails sent! ✅
Notification: "All 3 emails sent successfully!"
```

---

## 📝 What Happens When You Click

### Individual Email Buttons (per file):
```javascript
Click "Send Email" on a file
     ↓
Confirmation: "Send file to supplier@example.com?"
     ↓
Click OK
     ↓
Notification: "Sending email..."
     ↓
Email sent with file attached!
     ↓
Notification: "Email sent successfully!"
```

### Bulk "Send All Emails" Button:
```javascript
Click "Send All Emails"
     ↓
Confirmation: "Send 10 emails to suppliers?"
     ↓
Click OK
     ↓
Notification: "Sending 10 emails..."
     ↓
API processes all emails in batch
     ↓
Notification: "All 10 emails sent successfully!"
          OR
Notification: "Sent 8 emails, 2 failed" (with details in console)
```

---

## 🛠️ Troubleshooting

### Problem: Button doesn't appear after processing

**Check:**
1. ✅ Did you upload email mapping file?
   - If no → Upload it and process again

2. ✅ Does email mapping file have correct format?
   - Column A: Supplier name (exactly as in IM file)
   - Column B: Email address
   - Row 1: Headers (skipped)
   - Row 2+: Data

3. ✅ Do supplier names match?
   - Open IM file → Check supplier names in Column D
   - Open email mapping → Check Column A matches exactly
   - Example: "PT. MARGA NUSANTARA JAYA" must match exactly

4. ✅ Check browser console for errors:
   - Press F12 → Console tab
   - Look for error messages

### Problem: Button shows but nothing happens when clicked

**Check:**
1. ✅ Is email configured on server?
   - Environment variables set: `SENDER_EMAIL` and `SENDER_PASSWORD`
   - Backend API running on port 5002
   - Check API console for error messages

2. ✅ Error message: "Email not configured"?
   - Solution: Set environment variables
   ```bash
   export SENDER_EMAIL="your-email@gmail.com"
   export SENDER_PASSWORD="your-app-password"
   python3 finance/im-splitter.py
   ```

3. ✅ Error message: "Authentication failed"?
   - Solution: Use Gmail App Password (not regular password)
   - Generate at: https://myaccount.google.com/apppasswords

---

## 💡 Tips

### Tip 1: Test with One Supplier First
```
1. Create test email mapping with just 1 supplier
2. Upload and process
3. Click individual "Send Email" button
4. Verify email received
5. Then use "Send All Emails" for bulk sending
```

### Tip 2: Check Email Status
```
After clicking "Send All Emails":
- Green notification = All sent ✅
- Orange notification = Some failed ⚠️
- Red notification = Error occurred ❌

For failed emails:
- Press F12 → Console tab
- Look for "Failed emails:" log
- Shows which emails failed and why
```

### Tip 3: Button Visibility
```
The button is SMART:
- Uploaded email mapping? → Button shows ✅
- No email mapping? → Button hidden ❌
- Partial mapping? → Button shows for mapped suppliers only ✅
```

---

## 🎨 Button Styling

**Color:** Purple (`bg-purple-600`)  
**Size:** Same as "Download All Files" button  
**Icon:** ✉️ Envelope icon  
**Text:** "Send All Emails"  
**Location:** Top section, right side, next to Download button

---

## ✅ Quick Checklist

Before expecting to see the button:

- [ ] Uploaded completed IM file ✅
- [ ] Uploaded email mapping file ✅
- [ ] Email mapping has correct format (Column A=Supplier, B=Email) ✅
- [ ] Supplier names in mapping match IM file ✅
- [ ] Clicked "Process & Split Files" ✅
- [ ] Wait for processing to complete ✅
- [ ] Look at top section → "Send All Emails" button should appear! ✅

---

## 🔗 Related Documentation

- **Email Setup:** See `EMAIL_FEATURE_SUMMARY.md`
- **Gmail App Password:** https://support.google.com/accounts/answer/185833
- **PV Splitter Reference:** `finance/pv-splitter.py` (same email system)

---

## 🎯 Summary

**The "Send All Emails" button:**
- ✅ EXISTS in the code
- ✅ Located at top of results section
- ✅ Next to "Download All Files (ZIP)" button
- ✅ Purple color, easy to see
- ✅ Shows automatically when email mappings exist
- ✅ Hides automatically when no email mappings
- ✅ One click sends to all suppliers with email addresses
- ✅ Confirmation dialog before sending
- ✅ Progress notifications
- ✅ Success/failure reporting

**If you don't see it:**
1. Check if email mapping file was uploaded
2. Check if suppliers in mapping match IM file
3. Check browser console for errors
4. Verify button is in top section (not bottom with individual files)

**The button is there and working! Just make sure to upload the email mapping file.** 🚀
