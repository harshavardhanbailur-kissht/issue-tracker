# Google Drive Setup Guide - Step by Step

This guide will walk you through setting up Google Drive API integration for the Issue Tracker application.

---

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Your Firebase project URL: `https://issue-tracker-app-1768880804.web.app`

---

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click the project dropdown at the top (next to "Google Cloud")
   - Click "New Project"
   - **Project Name**: `issue-tracker-drive` (or any name you prefer)
   - **Organization**: Leave as default (or select your organization)
   - Click "Create"
   - Wait for the project to be created (10-20 seconds)

3. **Select the Project**
   - Once created, select it from the project dropdown

---

## Step 2: Enable Google Drive API

1. **Navigate to APIs & Services**
   - In the left sidebar, click "APIs & Services" → "Library"
   - Or go directly to: https://console.cloud.google.com/apis/library

2. **Search for Google Drive API**
   - In the search bar, type: "Google Drive API"
   - Click on "Google Drive API" from the results

3. **Enable the API**
   - Click the blue "Enable" button
   - Wait for it to enable (may take a few seconds)
   - You should see "API enabled" confirmation

---

## Step 3: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**
   - In the left sidebar, click "APIs & Services" → "OAuth consent screen"
   - Or go directly to: https://console.cloud.google.com/apis/credentials/consent

2. **Select User Type**
   - Choose "External" (unless you're using Google Workspace, then choose "Internal")
   - Click "Create"

3. **Fill in App Information**
   - **App name**: `Issue Tracker`
   - **User support email**: Select your email
   - **App logo**: (Optional) Upload a logo if you have one
   - **App domain**: Leave blank for now
   - **Application home page**: `https://issue-tracker-app-1768880804.web.app`
   - **Privacy policy link**: (Optional) Leave blank for testing
   - **Terms of service link**: (Optional) Leave blank for testing
   - **Authorized domains**: Click "Add Domain" and add:
     - `issue-tracker-app-1768880804.web.app`
     - `firebaseapp.com`
   - Click "Save and Continue"

4. **Add Scopes**
   - Click "Add or Remove Scopes"
   - Search for: `https://www.googleapis.com/auth/drive.file`
   - Check the box next to it
   - Click "Update"
   - Click "Save and Continue"

5. **Add Test Users** (Important for testing)
   - Click "Add Users"
   - Add your email address (the one you'll use to test)
   - Add any other email addresses that need access
   - Click "Add"
   - Click "Save and Continue"

6. **Review and Submit**
   - Review the summary
   - Click "Back to Dashboard"
   - **Note**: For production, you'll need to submit for verification, but for testing, this is fine

---

## Step 4: Create OAuth 2.0 Client ID

1. **Go to Credentials**
   - In the left sidebar, click "APIs & Services" → "Credentials"
   - Or go directly to: https://console.cloud.google.com/apis/credentials

2. **Create OAuth 2.0 Client ID**
   - Click "+ Create Credentials" at the top
   - Select "OAuth 2.0 Client ID"

3. **Configure OAuth Client**
   - **Application type**: Select "Web application"
   - **Name**: `Issue Tracker Web Client`

4. **Add Authorized JavaScript origins**
   - Click "+ Add URI" under "Authorized JavaScript origins"
   - Add these URLs (one at a time):
     ```
     http://localhost:5173
     https://issue-tracker-app-1768880804.web.app
     https://issue-tracker-app-1768880804.firebaseapp.com
     ```

5. **Add Authorized redirect URIs**
   - Click "+ Add URI" under "Authorized redirect URIs"
   - Add these URLs (one at a time):
     ```
     http://localhost:5173
     https://issue-tracker-app-1768880804.web.app
     https://issue-tracker-app-1768880804.firebaseapp.com
     ```

6. **Create**
   - Click "Create"
   - **IMPORTANT**: A popup will appear with your Client ID
   - **Copy the Client ID** - it looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
   - **Save this somewhere safe** - you'll need it in Step 6
   - Click "OK"

---

## Step 5: Create API Key

1. **Create API Key**
   - Still in Credentials page
   - Click "+ Create Credentials" → "API Key"
   - A popup will appear with your API Key
   - **Copy the API Key** - it looks like: `AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz`
   - **Save this somewhere safe** - you'll need it in Step 6
   - Click "Close"

2. **Restrict the API Key** (Recommended for security)
   - Click on the API Key you just created (or find it in the list)
   - Under "API restrictions", select "Restrict key"
   - Check "Google Drive API"
   - Under "Application restrictions", select "HTTP referrers (web sites)"
   - Click "+ Add an item" and add:
     ```
     http://localhost:5173/*
     https://issue-tracker-app-1768880804.web.app/*
     https://issue-tracker-app-1768880804.firebaseapp.com/*
     ```
   - Click "Save"
   - Wait for changes to apply (may take a few minutes)

---

## Step 6: Add Environment Variables

1. **Create `.env` file** (if it doesn't exist)
   ```bash
   cd "/Users/harshavardhanbailur/Desktop/Ring Kissht/issue-tracker"
   cp .env.example .env
   ```

2. **Edit `.env` file**
   - Open `.env` in your editor
   - Add your Firebase config (if not already there)
   - Add the Google Drive credentials:

   ```env
   # Firebase Configuration (existing)
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=issue-tracker-app-1768880804.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=issue-tracker-app-1768880804
   VITE_FIREBASE_STORAGE_BUCKET=issue-tracker-app-1768880804.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=812642204688
   VITE_FIREBASE_APP_ID=your-firebase-app-id

   # Google Drive API (NEW - add these)
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   VITE_GOOGLE_API_KEY=your-api-key
   VITE_GOOGLE_DRIVE_FOLDER_ID=
   ```

3. **Replace the placeholders**:
   - `your-client-id.apps.googleusercontent.com` → Your OAuth Client ID from Step 4
   - `your-api-key` → Your API Key from Step 5
   - `VITE_GOOGLE_DRIVE_FOLDER_ID` → Leave empty (optional - for organizing files in a specific folder)

---

## Step 7: Test Locally

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open the application**
   - Go to: http://localhost:5173
   - Log in as Product Support (password: 1111)

3. **Test Google Drive Connection**
   - You should see "Google Drive Connection Required" card
   - Click "Connect" button
   - A Google sign-in popup should appear
   - Sign in with one of your test user emails
   - Grant permissions
   - You should see "Connected to Google Drive" status

4. **Test File Upload**
   - Fill out the form
   - Select a file (try a small file first, < 100MB)
   - Click "Submit"
   - You should see upload progress
   - After successful upload, you'll get a submission ID

---

## Step 8: Deploy to Production

1. **Set Environment Variables in Firebase Hosting** (if using Firebase Hosting)

   **Option A: Using Firebase Console**
   - Go to: https://console.firebase.google.com/project/issue-tracker-app-1768880804/hosting
   - Click on "Functions" → "Environment variables" (if available)
   - Add the variables

   **Option B: Using Firebase CLI** (Recommended)
   ```bash
   # Note: Firebase Hosting doesn't support environment variables directly
   # You'll need to build with environment variables and deploy
   ```

   **Option C: Build with environment variables**
   ```bash
   # Set environment variables and build
   export VITE_GOOGLE_CLIENT_ID=your-client-id
   export VITE_GOOGLE_API_KEY=your-api-key
   npm run build
   firebase deploy --only hosting
   ```

2. **Update OAuth Redirect URIs** (if deploying to new domain)
   - Go back to Google Cloud Console → Credentials
   - Edit your OAuth 2.0 Client ID
   - Add your production domain to authorized redirect URIs
   - Save

---

## Step 9: Verify Deployment

1. **Visit your live site**
   - Go to: https://issue-tracker-app-1768880804.web.app
   - Log in as Product Support

2. **Test Google Drive Connection**
   - Click "Connect" on Google Drive card
   - Sign in and grant permissions
   - Verify connection works

3. **Test File Upload**
   - Upload a test file
   - Verify it uploads successfully
   - Check that Tech Support can view the file via the shareable link

---

## Troubleshooting

### Issue: "Google API script not loaded"
**Solution**: 
- Check that scripts are in `index.html`
- Clear browser cache
- Check browser console for errors

### Issue: "Failed to initialize Google API"
**Solution**:
- Verify `VITE_GOOGLE_API_KEY` is correct
- Check API Key restrictions in Google Cloud Console
- Ensure Google Drive API is enabled

### Issue: "OAuth consent screen error"
**Solution**:
- Verify your email is added as a test user
- Check OAuth consent screen is configured
- Ensure scopes include `drive.file`

### Issue: "Not authenticated" error
**Solution**:
- Clear browser sessionStorage
- Try signing in again
- Check `VITE_GOOGLE_CLIENT_ID` is correct

### Issue: "Upload failed"
**Solution**:
- Check file size (must be < 200MB)
- Verify you're signed in to Google Drive
- Check browser console for detailed error
- Verify OAuth token is valid

### Issue: "File permissions error"
**Solution**:
- The app automatically sets permissions, but if files aren't shareable:
- Go to Google Drive → Find the file → Right click → Share → Change to "Anyone with the link"

---

## Quick Reference

### Important URLs

- **Google Cloud Console**: https://console.cloud.google.com/
- **APIs & Services**: https://console.cloud.google.com/apis
- **OAuth Consent Screen**: https://console.cloud.google.com/apis/credentials/consent
- **Credentials**: https://console.cloud.google.com/apis/credentials
- **Firebase Console**: https://console.firebase.google.com/project/issue-tracker-app-1768880804
- **Live App**: https://issue-tracker-app-1768880804.web.app

### Environment Variables Needed

```env
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSy...
VITE_GOOGLE_DRIVE_FOLDER_ID= (optional)
```

### File Size Limits

- **Warning**: 100 MB
- **Maximum**: 200 MB
- **Chunk size**: 5 MB (for resumable uploads)

---

## Security Best Practices

1. **Restrict API Key**: Always restrict your API Key to specific APIs and domains
2. **Use Test Users**: Add only necessary emails as test users
3. **Review Permissions**: Users only get `drive.file` scope (can only access files created by the app)
4. **Monitor Usage**: Check Google Cloud Console for API usage and errors
5. **Rotate Keys**: If keys are compromised, regenerate them immediately

---

## Next Steps After Setup

1. ✅ Test file uploads with various file sizes
2. ✅ Verify Tech Support can view files without authentication
3. ✅ Test with multiple users
4. ✅ Monitor Google Cloud Console for any errors
5. ✅ Consider setting up a shared Google Drive folder (optional)

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Google Cloud Console → APIs & Services → Dashboard for API errors
3. Verify all environment variables are set correctly
4. Ensure OAuth consent screen is properly configured

---

**Last Updated**: Based on current implementation
**Project**: Issue Tracker
**Firebase Project**: issue-tracker-app-1768880804
