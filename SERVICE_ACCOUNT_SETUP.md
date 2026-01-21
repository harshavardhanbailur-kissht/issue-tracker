# Service Account Setup Guide - Use Your Business Drive

## Overview

This guide will help you set up a Service Account to upload files directly to YOUR Business Drive, eliminating OAuth popups and enabling automatic purging.

---

## Step 1: Create Service Account

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create one)

2. **Navigate to Service Accounts**
   - Go to: IAM & Admin → Service Accounts
   - Or direct link: https://console.cloud.google.com/iam-admin/serviceaccounts

3. **Create Service Account**
   - Click "+ CREATE SERVICE ACCOUNT"
   - **Service account name**: `issue-tracker-drive-uploader`
   - **Service account ID**: Auto-generated (or customize)
   - **Description**: "Service account for uploading files to Business Drive"
   - Click "CREATE AND CONTINUE"

4. **Grant Roles** (Optional - not needed for Drive API)
   - Skip role assignment for now
   - Click "CONTINUE"
   - Click "DONE"

5. **Create Key**
   - Click on the service account you just created
   - Go to "KEYS" tab
   - Click "ADD KEY" → "Create new key"
   - Select "JSON"
   - Click "CREATE"
   - **IMPORTANT**: Save the downloaded JSON file securely
   - **File name**: `service-account-key.json`
   - **DO NOT commit this file to Git!**

---

## Step 2: Enable Google Drive API

1. **Go to APIs & Services**
   - Visit: https://console.cloud.google.com/apis/library
   - Search for "Google Drive API"
   - Click on it
   - Click "ENABLE"

---

## Step 3: Create Folder in Your Business Drive

1. **Open Google Drive**
   - Go to: https://drive.google.com
   - Sign in with your Business account

2. **Create Folder**
   - Click "New" → "Folder"
   - Name: `Issue Tracker Submissions`
   - Click "Create"

3. **Get Folder ID**
   - Open the folder
   - Look at the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
   - Copy the `FOLDER_ID_HERE` part
   - **Save this ID** - you'll need it for Firebase Functions

4. **Share Folder with Service Account**
   - Right-click the folder → "Share"
   - In the "Add people and groups" field, paste the Service Account email
   - Service Account email format: `issue-tracker-drive-uploader@YOUR_PROJECT_ID.iam.gserviceaccount.com`
   - Set permission to "Editor"
   - **Uncheck** "Notify people" (Service Account doesn't need notifications)
   - Click "Share"

---

## Step 4: Note Your Service Account Email

The Service Account email will be:
```
issue-tracker-drive-uploader@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

You can find it in:
- Google Cloud Console → IAM & Admin → Service Accounts
- Or in the downloaded JSON file (field: `client_email`)

---

## Step 5: Configure Firebase Functions

1. **Store Service Account Key**
   - Place `service-account-key.json` in `functions/` directory (we'll create this)
   - **DO NOT commit to Git** (add to `.gitignore`)

2. **Set Environment Variables**
   - In Firebase Functions, we'll use the JSON file directly
   - Or store as environment variable (more secure)

---

## Quick Checklist

- [ ] Service Account created
- [ ] Service Account JSON key downloaded
- [ ] Google Drive API enabled
- [ ] Folder created in your Business Drive
- [ ] Folder ID copied
- [ ] Folder shared with Service Account (Editor permission)
- [ ] Service Account email noted

---

## Next Steps

After completing these steps, the Firebase Functions code will:
1. Use Service Account to authenticate
2. Upload files to your Business Drive folder
3. Schedule automatic purging every 2 weeks

---

## Security Notes

- **Never commit** `service-account-key.json` to Git
- Add to `.gitignore`: `functions/service-account-key.json`
- Service Account has access only to the shared folder
- Can be revoked anytime from Google Cloud Console

---

**Last Updated**: Based on current implementation
**Project**: Issue Tracker
