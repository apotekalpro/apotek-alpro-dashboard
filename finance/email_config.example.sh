#!/bin/bash
# Email Configuration for PV Splitter
# Copy this file to email_config.sh and fill in your details
# Run: source finance/email_config.sh before starting the server

# SMTP Server Configuration
export SMTP_SERVER="smtp.gmail.com"
export SMTP_PORT="587"

# Sender Email Configuration
# For Gmail: Use your email and an App Password (not your regular password)
# How to get Gmail App Password:
# 1. Go to https://myaccount.google.com/security
# 2. Enable 2-Step Verification if not already enabled
# 3. Go to https://myaccount.google.com/apppasswords
# 4. Select "Mail" and "Other (Custom name)" - name it "PV Splitter"
# 5. Copy the generated 16-character password

export SENDER_EMAIL="your-email@apotekaipro.com"
export SENDER_PASSWORD="your-app-password-here"
export SENDER_NAME="Apotek Alpro Finance Team"

# Usage:
# 1. Copy this file: cp finance/email_config.example.sh finance/email_config.sh
# 2. Edit email_config.sh with your credentials
# 3. Load the config: source finance/email_config.sh
# 4. Start the server: python3 finance/pv-splitter.py

echo "Email configuration loaded for: $SENDER_EMAIL"
