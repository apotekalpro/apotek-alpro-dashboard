# WhatsApp Integration Guide - IM Splitter

## 📱 Overview

The IM Splitter tool integrates with WhatsApp to distribute split files to suppliers. Due to browser security limitations, **automatic file attachment is not possible**. This guide explains how to achieve the best user experience with the available WhatsApp APIs.

---

## 🔍 Technical Limitations

### Why Can't Files Be Auto-Attached?

1. **Browser Security Policy**: Browsers do not allow websites to programmatically attach files to external applications (like WhatsApp) via URL parameters
2. **WhatsApp API Restrictions**: WhatsApp's public URL API only supports text messages, not file attachments
3. **Cross-Origin Restrictions**: Downloaded files cannot be accessed by JavaScript due to same-origin policy

### What IS Possible?

✅ Pre-fill text messages  
✅ Open WhatsApp Web or App  
✅ **Target specific groups (with invite links)**  
✅ **Target specific contacts (with phone numbers)**  
✅ Download files to local system  
❌ Automatically attach files  
❌ Directly open groups without invite links  

---

## ✨ Implementation - Three Targeting Options

### Option 1: Group Invite Link (✅ RECOMMENDED)

**Best user experience** - Opens directly in the specific WhatsApp group.

#### How to Get Group Invite Link:
1. Open WhatsApp group
2. Click group name → "Invite to Group via Link"
3. Copy the link (format: `https://chat.whatsapp.com/ABCdefGHI123xyz`)

#### Mapping File Format:
```
Column A: PT SUPPLIER NAME
Column B: https://chat.whatsapp.com/ABCdefGHI123xyz
```

#### What Happens:
- User clicks "WA Web" or "WA App" button
- File downloads to browser's download folder
- WhatsApp opens **directly in the specific group**
- Pre-filled message appears
- Instruction popup shows: "✅ Opening directly via group invite link"
- User clicks attachment icon (📎) → selects downloaded file → sends

#### URL Scheme Used:
```javascript
// WhatsApp Web
https://web.whatsapp.com/accept?code=ABCdefGHI123xyz&text=Pre-filled%20message

// WhatsApp App
https://chat.whatsapp.com/ABCdefGHI123xyz?text=Pre-filled%20message
```

---

### Option 2: Phone Number (✅ GOOD)

**Good user experience** - Opens direct chat with contact (individual or group admin).

#### Format:
```
Column A: PT SUPPLIER NAME
Column B: +628123456789
```

#### What Happens:
- User clicks "WA Web" or "WA App" button
- File downloads
- WhatsApp opens **directly in chat with that phone number**
- Pre-filled message appears
- Instruction popup shows: "✅ Opening chat with: +628123456789"
- User attaches file and sends

#### URL Scheme Used:
```javascript
// WhatsApp Web
https://web.whatsapp.com/send?phone=628123456789&text=Pre-filled%20message

// WhatsApp App
https://wa.me/628123456789?text=Pre-filled%20message
```

---

### Option 3: Group Name (⚠️ FALLBACK)

**Manual search required** - Opens WhatsApp with pre-filled message but user must search for group.

#### Format:
```
Column A: PT SUPPLIER NAME
Column B: Finance ALPRO Group
```

#### What Happens:
- User clicks "WA Web" or "WA App" button
- File downloads
- WhatsApp opens in "forward" mode (contact/group selector)
- Pre-filled message appears
- Instruction popup shows: "⚠️ Manual search required for: Finance ALPRO Group"
- User searches for group → selects it → attaches file → sends

#### URL Scheme Used:
```javascript
// WhatsApp Web
https://web.whatsapp.com/send?text=Pre-filled%20message

// WhatsApp App
https://wa.me/?text=Pre-filled%20message
```

---

## 🔧 Code Implementation

### Frontend Logic (`serah-terima-im-split.html`)

```javascript
async function sendToWhatsAppWeb(filename, waTarget, supplierClean) {
    // Validate target exists
    if (!waTarget) {
        showNotification('No WhatsApp target mapped for this supplier', 'error');
        return;
    }

    // Download file first
    downloadFile(filename);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate message
    const message = `Serah Terima IM - ${supplierClean}\n\nFile: ${filename}\n\nMohon di-download dan di-check. Terima kasih!`;
    const encodedMessage = encodeURIComponent(message);

    // Determine URL based on target type
    let waLink;
    
    // Check if waTarget is a group invite link
    if (waTarget.includes('chat.whatsapp.com/')) {
        const inviteCode = waTarget.split('chat.whatsapp.com/')[1];
        waLink = `https://web.whatsapp.com/accept?code=${inviteCode}&text=${encodedMessage}`;
    }
    // Check if waTarget is a phone number
    else if (/^[+]?[0-9]{10,15}$/.test(waTarget.replace(/[-\s]/g, ''))) {
        const phone = waTarget.replace(/[-\s]/g, '');
        waLink = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    }
    // Fallback to group name search
    else {
        waLink = `https://web.whatsapp.com/send?text=${encodedMessage}`;
    }
    
    showWhatsAppInstructions(waTarget, 'Web', filename);
    window.open(waLink, '_blank');
}
```

### Dynamic Instructions

The instruction popup adapts based on target type:

```javascript
// Detect target type
const isInviteLink = waTarget.includes('chat.whatsapp.com/');
const isPhoneNumber = /^[+]?[0-9]{10,15}$/.test(waTarget.replace(/[-\s]/g, ''));

// Show appropriate message
if (isInviteLink) {
    targetInfo = '<li>✅ Opening directly via group invite link</li>';
} else if (isPhoneNumber) {
    targetInfo = `<li>✅ Opening chat with: <strong>${waTarget}</strong></li>`;
} else {
    targetInfo = `<li>⚠️ Manual search required for: <strong>${waTarget}</strong></li>`;
}
```

---

## 📋 Mapping File Template

Download the template from the interface or create manually:

| Column A (Supplier Name) | Column B (WhatsApp Target) | Notes |
|--------------------------|---------------------------|-------|
| PV001 - PT SUPPLIER ABC | https://chat.whatsapp.com/XYZ123 | ✅ Recommended |
| PV002 - CV SUPPLIER DEF | +628123456789 | ✅ Direct chat |
| PV003 - PT SUPPLIER GHI | Finance Group Name | ⚠️ Manual search |

---

## 🎯 User Workflow

### Ideal Workflow (With Invite Links):
1. Process files → Split completes
2. Click "WA Web" or "WA App" button
3. File downloads automatically
4. WhatsApp opens **directly in group**
5. Click attachment icon (📎)
6. Select downloaded file
7. Click Send ➤

**Total steps: 4 clicks** (Button → Attach → Select → Send)

### Alternative Workflow (Phone Number):
1. Process files → Split completes
2. Click WhatsApp button
3. File downloads
4. WhatsApp opens **in direct chat**
5. Attach file and send

**Total steps: 4 clicks**

### Fallback Workflow (Group Name):
1. Process files → Split completes
2. Click WhatsApp button
3. File downloads
4. WhatsApp opens in forward mode
5. **Search for group name**
6. Select group
7. Attach file and send

**Total steps: 6 clicks** (requires manual search)

---

## 💡 Best Practices

### For Administrators:
1. **Collect group invite links** from all relevant WhatsApp groups
2. **Update mapping file** with invite links (Column B)
3. **Share template** with users to make setup easy
4. **Use consistent naming** between IM file and mapping file

### For Users:
1. **Download template** from the interface
2. **Use invite links** whenever possible for best experience
3. **Keep mapping file updated** when groups change
4. **Check instruction popup** for target-specific guidance

---

## 🔄 Migration Guide

### Upgrading from Group Names to Invite Links:

#### Step 1: Export Current Mapping
Open your current mapping file (with group names in Column B)

#### Step 2: Collect Invite Links
For each group in Column B:
1. Open the WhatsApp group
2. Click group info → "Invite to Group via Link"
3. Copy the invite link

#### Step 3: Update Mapping File
Replace group names with invite links:

**Before:**
```
PT SUPPLIER ABC | Finance Group
```

**After:**
```
PT SUPPLIER ABC | https://chat.whatsapp.com/ABC123xyz
```

#### Step 4: Test
1. Upload new mapping file
2. Process test file
3. Click WhatsApp button
4. Verify it opens directly in group

---

## 🐛 Troubleshooting

### Issue: WhatsApp opens but not in specific group
**Cause:** Using group name instead of invite link  
**Solution:** Update mapping file with group invite links

### Issue: File not attached
**Expected Behavior:** Files cannot be auto-attached due to browser security  
**Solution:** User must manually attach after WhatsApp opens (this is normal)

### Issue: Phone number not working
**Cause:** Invalid format  
**Solution:** Use format `+628123456789` (include country code)

### Issue: Invite link expired
**Cause:** Group admin reset the link  
**Solution:** Get new invite link from group admin and update mapping

---

## 📊 Comparison Table

| Method | Direct Opening | Manual Steps | User Experience | Recommendation |
|--------|---------------|--------------|-----------------|----------------|
| **Invite Link** | ✅ Yes | 4 clicks | ⭐⭐⭐⭐⭐ Excellent | **BEST** |
| **Phone Number** | ✅ Yes | 4 clicks | ⭐⭐⭐⭐ Very Good | Good |
| **Group Name** | ❌ No | 6+ clicks | ⭐⭐⭐ Acceptable | Fallback only |

---

## 🔐 Security & Privacy

### Group Invite Links:
- ✅ Can be reset by group admin anytime
- ✅ Admin controls who can join
- ✅ Can set expiration dates
- ⚠️ Anyone with link can join (until reset)

### Phone Numbers:
- ✅ Direct 1-on-1 or existing group chat
- ✅ No unwanted group joins
- ⚠️ Exposes phone number to system

### Group Names:
- ✅ No sensitive info exposed
- ❌ Requires user to have group in contacts

---

## 🚀 Future Enhancements

### Possible Improvements:
1. **WhatsApp Business API** (requires paid account)
   - Can send files programmatically
   - Requires webhook setup and verification
   - Monthly costs apply

2. **Browser Extension** (requires user installation)
   - Can access local files
   - Can interact with WhatsApp Web
   - Requires store approval and user trust

3. **Desktop Application** (requires separate app)
   - Full file system access
   - Can automate attachment
   - Requires installation and maintenance

### Why Current Solution is Best:
- ✅ No additional setup required
- ✅ Works in any browser
- ✅ No installation needed
- ✅ No monthly costs
- ✅ Secure and privacy-focused
- ✅ With invite links, only 4 clicks needed

---

## 📞 Support

For questions or issues:
1. Download mapping template from interface
2. Follow examples in template
3. Check this guide for troubleshooting
4. Review `TROUBLESHOOTING.md` for system issues

---

## ✅ Summary

**What Works:**
- ✅ File downloads automatically
- ✅ WhatsApp opens with pre-filled message
- ✅ **Direct group opening** (with invite links)
- ✅ **Direct chat opening** (with phone numbers)
- ✅ Clear visual instructions
- ✅ Copy filename to clipboard
- ✅ Template download

**What Requires Manual Action:**
- 📎 File attachment (browser security limitation)
- 🔍 Group search (if using group names instead of invite links)

**Best Practice:**
Use invite links in mapping file for optimal 4-click user experience! 🎯
