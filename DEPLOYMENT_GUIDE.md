# Deployment Guide - Service Account Setup

## Overview

This guide will help you deploy the Issue Tracker application with Service Account integration for Google Drive uploads.

---

## Prerequisites

1. Firebase CLI installed (`npm install -g firebase-tools`)
2. Google Cloud project with Firebase enabled
3. Service Account JSON key (see `SERVICE_ACCOUNT_SETUP.md`)

---

## Step 1: Install Functions Dependencies

```bash
cd functions
npm install
npm run build
cd ..
```

---

## Step 2: Configure Service Account

### Option A: Local Development (File-based)

1. Place `service-account-key.json` in `functions/` directory
2. The code will automatically detect and use it

### Option B: Production (Environment Variable)

1. Set Firebase Functions environment variable:
```bash
firebase functions:config:set \
  service_account.key="$(cat functions/service-account-key.json | jq -c)" \
  google_drive.folder_id="YOUR_FOLDER_ID"
```

Or use the newer `firebase functions:secrets`:
```bash
# Store service account key as secret
firebase functions:secrets:set SERVICE_ACCOUNT_KEY

# Set folder ID as config
firebase functions:config:set google_drive.folder_id="YOUR_FOLDER_ID"
```

---

## Step 3: Update Functions Code for Production

If using environment variables, update `functions/src/index.ts`:

```typescript
// Replace the credentials loading section with:
const serviceAccountJson = process.env.SERVICE_ACCOUNT_KEY || functions.config().service_account?.key;
if (!serviceAccountJson) {
  throw new Error('SERVICE_ACCOUNT_KEY not configured');
}
const credentials = typeof serviceAccountJson === 'string' 
  ? JSON.parse(serviceAccountJson) 
  : serviceAccountJson;

const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || functions.config().google_drive?.folder_id;
if (!folderId) {
  throw new Error('GOOGLE_DRIVE_FOLDER_ID not configured');
}
```

---

## Step 4: Deploy Functions

```bash
# Build functions
cd functions
npm run build
cd ..

# Deploy functions
firebase deploy --only functions
```

---

## Step 5: Deploy Frontend

```bash
# Build frontend
npm run build

# Deploy hosting
firebase deploy --only hosting
```

---

## Step 6: Verify Deployment

1. **Test Upload Function:**
   - Go to your deployed app
   - Submit a form with an attachment
   - Check Firebase Functions logs: `firebase functions:log`

2. **Test Purge Function:**
   - Wait for scheduled run (every 14 days)
   - Or trigger manually: `firebase functions:shell` → `purgeOldFiles()`

---

## Environment Variables Summary

### Required:
- `SERVICE_ACCOUNT_KEY`: JSON string of service account credentials
- `GOOGLE_DRIVE_FOLDER_ID`: Your Business Drive folder ID

### Optional:
- `FIREBASE_PROJECT_ID`: Auto-detected from Firebase config

---

## Troubleshooting

### Error: "SERVICE_ACCOUNT_KEY not configured"
- Ensure service account key is set as environment variable or config
- Check `firebase functions:config:get`

### Error: "GOOGLE_DRIVE_FOLDER_ID not configured"
- Set folder ID in Firebase config
- Verify folder is shared with Service Account email

### Error: "Permission denied"
- Ensure Service Account has "Editor" access to folder
- Check folder sharing settings in Google Drive

### Functions not deploying
- Run `npm run build` in `functions/` directory first
- Check `functions/tsconfig.json` is correct
- Verify Node.js version matches `package.json` engines (18)

---

## Security Notes

- **Never commit** `service-account-key.json` to Git
- Use Firebase Secrets for production
- Rotate service account keys periodically
- Limit Service Account permissions to specific folder

---

**Last Updated**: Based on current implementation
**Project**: Issue Tracker
