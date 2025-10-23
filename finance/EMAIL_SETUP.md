# PV Splitter - Automated Email Setup Guide

This guide will help you configure automated email sending for the PV Splitter tool.

## 📧 Overview

The PV Splitter can automatically send emails with Excel file attachments to recipients. This eliminates the need to manually attach files in Gmail.

## 🔧 Setup Instructions

### Option 1: Using Gmail (Recommended)

#### Step 1: Get Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/security
2. **Enable 2-Step Verification** (if not already enabled)
   - Click "2-Step Verification"
   - Follow the setup wizard
3. **Create App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Or search for "App passwords" in Google Account settings
   - Select "Mail" as the app
   - Select "Other (Custom name)" as the device
   - Enter name: "PV Splitter" or "Apotek Alpro Dashboard"
   - Click "Generate"
   - **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

#### Step 2: Configure Email Settings

**Method A: Using Environment Variables (Recommended for production)**

Create a file named `email_config.sh` in the `finance/` directory:

```bash
# Copy the example file
cp finance/email_config.example.sh finance/email_config.sh

# Edit the file with your details
nano finance/email_config.sh
```

Fill in your details:

```bash
export SMTP_SERVER="smtp.gmail.com"
export SMTP_PORT="587"
export SENDER_EMAIL="finance@apotekalpro.com"  # Your Gmail address
export SENDER_PASSWORD="abcd efgh ijkl mnop"   # The 16-char App Password
export SENDER_NAME="Apotek Alpro Finance Team"
```

**Method B: Set Environment Variables Directly**

Before starting the server:

```bash
export SENDER_EMAIL="finance@apotekalpro.com"
export SENDER_PASSWORD="your-app-password"
```

#### Step 3: Start the Server with Email Configuration

```bash
# Load the configuration
source finance/email_config.sh

# Start the PV Splitter backend
python3 finance/pv-splitter.py
```

You should see:
```
Email Configuration:
  - SMTP Server: smtp.gmail.com:587
  - Sender Email: finance@apotekalpro.com
  - Status: READY
```

### Option 2: Using Office 365 / Outlook

```bash
export SMTP_SERVER="smtp.office365.com"
export SMTP_PORT="587"
export SENDER_EMAIL="finance@apotekalpro.com"
export SENDER_PASSWORD="your-password"
export SENDER_NAME="Apotek Alpro Finance Team"
```

### Option 3: Using Custom SMTP Server

Contact your IT department for SMTP server details, then:

```bash
export SMTP_SERVER="mail.yourcompany.com"
export SMTP_PORT="587"  # or 465 for SSL
export SENDER_EMAIL="finance@apotekalpro.com"
export SENDER_PASSWORD="your-password"
export SENDER_NAME="Apotek Alpro Finance Team"
```

## 🧪 Testing Email Configuration

### 1. Check Configuration Status

Visit: `http://localhost:5001/api/test-email-config`

Or use curl:
```bash
curl http://localhost:5001/api/test-email-config
```

Expected response:
```json
{
  "configured": true,
  "smtp_server": "smtp.gmail.com",
  "smtp_port": 587,
  "sender_email": "fin***",
  "sender_name": "Apotek Alpro Finance Team",
  "password_set": true
}
```

### 2. Test Sending Email

In the PV Split tool:
1. Upload and split your Excel file
2. Click "Prepare Emails for Gmail"
3. You should see a blue button: **"Send All Emails Automatically"**
4. Click it to send a test email

## 🚀 Using Automated Email Sending

### In the Web Interface

1. **Upload Excel File** → The file with multiple sheets
2. **Split the File** → Click "Split Excel File" button
3. **Prepare Emails** → Click "Prepare Emails for Gmail"
4. **Send Automatically** → Click the blue "Send All Emails Automatically" button

### What Happens:

- ✅ Backend reads the split files from temp directory
- ✅ Creates email with proper subject and body
- ✅ Attaches all Excel files for each recipient
- ✅ Sends via SMTP (Gmail)
- ✅ Shows success/failure status

### Email Template

The automated email will look like this:

```
From: Apotek Alpro Finance Team <finance@apotekalpro.com>
To: recipient@company.com
Subject: PV Documents - PV202510-0136, PV202510-0137

Dear PT COMPANY NAME,

Please find attached your PV document(s):

- PT COMPANY NAME PV202510-0136.xlsx
- PT COMPANY NAME PV202510-0137.xlsx

Best regards,
Apotek Alpro Finance Team

[Attachments: 2 files]
```

## 🔒 Security Best Practices

### 1. Never Commit Credentials to Git

The following files are already in `.gitignore`:
- `finance/email_config.sh`
- `finance/.env`

### 2. Use App Passwords (Not Regular Passwords)

- ✅ Use Gmail App Passwords (16-character generated passwords)
- ❌ Never use your regular Gmail password

### 3. Restrict File Permissions

```bash
chmod 600 finance/email_config.sh
```

### 4. Use Environment Variables in Production

For production deployment:
- Use system environment variables
- Or use secret management services (AWS Secrets Manager, Azure Key Vault, etc.)

## 🐛 Troubleshooting

### Error: "Email not configured"

**Solution:** Set the environment variables before starting the server:
```bash
source finance/email_config.sh
python3 finance/pv-splitter.py
```

### Error: "Authentication failed"

**Possible causes:**
1. **Wrong password** - Make sure you're using the App Password, not your regular password
2. **2-Step Verification not enabled** - Enable it first
3. **Less secure app access** - Not needed with App Passwords

**Solution:**
1. Double-check your App Password
2. Generate a new App Password if needed
3. Ensure no extra spaces in the password

### Error: "SMTP connection failed"

**Possible causes:**
1. Wrong SMTP server or port
2. Firewall blocking port 587

**Solution:**
```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# Or use openssl
openssl s_client -starttls smtp -connect smtp.gmail.com:587
```

### Emails Going to Spam

**Solution:**
1. Add your domain to SPF records
2. Set up DKIM for your domain
3. Use a company email address (not personal Gmail)
4. Ask recipients to whitelist your email

## 📊 Monitoring

### Check Email Sending Logs

The backend prints logs for each email sent:

```
Sending email to: recipient@company.com
✓ Email sent successfully to: recipient@company.com
```

### Check Backend Health

```bash
curl http://localhost:5001/health
```

## 🔄 Switching Between Manual and Automated

You can use both methods:

1. **Automated** (when configured):
   - Click "Send All Emails Automatically"
   - Emails sent immediately with attachments

2. **Manual** (always available):
   - Click "Open All Gmail Compose Windows"
   - Download files manually
   - Attach files in Gmail
   - Review and send

## 💡 Tips

1. **Test with one email first** before sending to all recipients
2. **Check spam folders** after first send
3. **Verify email addresses** in Excel (D12 cells) before splitting
4. **Keep credentials secure** - never share or commit them
5. **Use company email** for better deliverability

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify email configuration: `http://localhost:5001/api/test-email-config`
3. Check server logs for error messages
4. Contact IT department for SMTP server issues

## 🎯 Quick Start Checklist

- [ ] Get Gmail App Password
- [ ] Create `finance/email_config.sh` file
- [ ] Fill in email credentials
- [ ] Load configuration: `source finance/email_config.sh`
- [ ] Start server: `python3 finance/pv-splitter.py`
- [ ] Verify status shows "READY"
- [ ] Test with one email
- [ ] Use for production

---

**Security Note:** Always keep your email credentials secure and never commit them to version control!
