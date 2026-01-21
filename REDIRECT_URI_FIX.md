# Fix redirect_uri_mismatch Error - Step-by-Step Guide

## Problem

You're seeing `Error 400: redirect_uri_mismatch` when trying to connect to Google Drive. This means the redirect URI your app is using doesn't match what's configured in Google Cloud Console.

## Root Cause

Google Identity Services (GSI) automatically uses your current page origin as the redirect URI. For example:
- If you're on `https://issue-tracker-app-1768880804.web.app/submit`
- The redirect URI will be: `https://issue-tracker-app-1768880804.web.app`

**Important**: The redirect URI is just the origin (protocol + domain), NOT the full path.

## Step-by-Step Fix

### Step 1: Open Browser Console

1. Open your app: https://issue-tracker-app-1768880804.web.app
2. Press `F12` or right-click → "Inspect" → "Console" tab
3. Click "Connect" on the Google Drive card
4. Look for logs starting with `[Google Drive Auth]`
5. Note the "Expected redirect URI" value

### Step 2: Go to Google Cloud Console

1. Open: https://console.cloud.google.com/apis/credentials
2. Make sure you're in the correct project (the one with your OAuth Client ID)

### Step 3: Find Your OAuth Client ID

1. Look for: `812642204688-6gg9ltrqq2q4uo1nbdok789tq8ai40cg.apps.googleusercontent.com`
2. Click on it to edit

### Step 4: Add Authorized JavaScript Origins

1. Scroll to **"Authorized JavaScript origins"** section
2. Click **"+ ADD URI"** button
3. Add these URLs **ONE AT A TIME** (exact, no trailing slashes):

   ```
   http://localhost:5173
   https://issue-tracker-app-1768880804.web.app
   https://issue-tracker-app-1768880804.firebaseapp.com
   ```

4. **Important**: 
   - No trailing slashes (`/`)
   - No paths (just the origin)
   - Exact match required

### Step 5: Add Authorized Redirect URIs

1. Scroll to **"Authorized redirect URIs"** section
2. Click **"+ ADD URI"** button
3. Add the **SAME URLs** as above:

   ```
   http://localhost:5173
   https://issue-tracker-app-1768880804.web.app
   https://issue-tracker-app-1768880804.firebaseapp.com
   ```

4. **Important**: 
   - These should match the JavaScript origins exactly
   - No trailing slashes
   - No paths

### Step 6: Save Changes

1. Scroll to the bottom
2. Click **"SAVE"** button
3. Wait for confirmation message

### Step 7: Wait for Propagation

- **Wait 5-10 minutes** for changes to propagate across Google's servers
- Changes are not instant!

### Step 8: Clear Browser Cache

1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cached images and files"
3. Clear cache
4. Or use **Incognito/Private mode** for testing

### Step 9: Test Again

1. Refresh your app
2. Click "Connect" on Google Drive card
3. Check browser console for any errors
4. If still failing, check the console logs for the exact redirect URI being used

## Verification Checklist

Before testing, verify:

- [ ] All three URLs are in "Authorized JavaScript origins"
- [ ] All three URLs are in "Authorized Redirect URIs"
- [ ] No trailing slashes on any URL
- [ ] URLs match exactly (case-sensitive)
- [ ] Changes were saved successfully
- [ ] Waited 5-10 minutes after saving
- [ ] Browser cache cleared or using incognito mode

## Common Mistakes

### ❌ Wrong:
```
https://issue-tracker-app-1768880804.web.app/    ← Trailing slash
https://issue-tracker-app-1768880804.web.app/submit  ← Includes path
http://issue-tracker-app-1768880804.web.app  ← Wrong protocol (http vs https)
```

### ✅ Correct:
```
https://issue-tracker-app-1768880804.web.app  ← Exact origin, no trailing slash
```

## Debugging

If the error persists after following all steps:

1. **Check Browser Console**:
   - Look for `[Google Drive Auth]` logs
   - Note the "Expected redirect URI"
   - Verify it matches what's in Google Cloud Console

2. **Verify Client ID**:
   - Check that the Client ID in your `.env` file matches the one in Google Cloud Console
   - The Client ID should be: `812642204688-6gg9ltrqq2q4uo1nbdok789tq8ai40cg.apps.googleusercontent.com`

3. **Check OAuth Consent Screen**:
   - Go to: https://console.cloud.google.com/apis/credentials/consent
   - Verify your email is in "Test users" list
   - Verify scopes include `https://www.googleapis.com/auth/drive.file`

4. **Verify API is Enabled**:
   - Go to: https://console.cloud.google.com/apis/library
   - Search for "Google Drive API"
   - Ensure it shows "Enabled"

## Quick Reference URLs

- **Google Cloud Console Credentials**: https://console.cloud.google.com/apis/credentials
- **OAuth Consent Screen**: https://console.cloud.google.com/apis/credentials/consent
- **API Library**: https://console.cloud.google.com/apis/library
- **Your App**: https://issue-tracker-app-1768880804.web.app

## Still Not Working?

If you've followed all steps and it's still not working:

1. Double-check the exact redirect URI from browser console logs
2. Verify the Client ID matches in both places
3. Try creating a new OAuth Client ID (as a last resort)
4. Check if there are any browser extensions blocking the OAuth flow

## Expected Behavior After Fix

Once configured correctly:
1. Click "Connect" → Google sign-in popup appears
2. Sign in with your Google account
3. Grant permissions
4. See "Connected to Google Drive" status
5. Can now upload files

---

**Last Updated**: Based on current implementation
**Client ID**: `812642204688-6gg9ltrqq2q4uo1nbdok789tq8ai40cg.apps.googleusercontent.com`
