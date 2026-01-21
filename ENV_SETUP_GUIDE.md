# Environment Variables Setup Guide

## Problem
You're seeing `YOUR_PROJECT_ID` in errors because environment variables aren't set in your deployed environment (Vercel/Firebase Hosting).

## Solution: Set Environment Variables

### For Vercel Deployment

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project: `issue-tracker`

2. **Navigate to Settings**
   - Click on your project
   - Go to **Settings** → **Environment Variables**

3. **Add These Variables:**
   ```
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=issue-tracker-app-1768880804.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=issue-tracker-app-1768880804
   VITE_FIREBASE_STORAGE_BUCKET=issue-tracker-app-1768880804.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Get Values from Firebase Console:**
   - Go to: https://console.firebase.google.com/project/issue-tracker-app-1768880804/settings/general
   - Scroll to "Your apps" section
   - Click on the web app (</> icon)
   - Copy the config values

5. **Set for All Environments:**
   - Production ✅
   - Preview ✅
   - Development ✅

6. **Redeploy:**
   - After adding variables, Vercel will automatically redeploy
   - Or manually trigger: Deployments → ... → Redeploy

### For Firebase Hosting Deployment

Firebase Hosting doesn't support `.env` files directly. You have two options:

#### Option 1: Use Firebase Config (Recommended)
Update `src/lib/firebase.ts` to use Firebase's built-in config:

```typescript
// Firebase automatically detects project when deployed to Firebase Hosting
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIza...", // Get from Firebase Console
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "issue-tracker-app-1768880804.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "issue-tracker-app-1768880804",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "issue-tracker-app-1768880804.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "812642204688",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:812642204688:web:...",
};
```

#### Option 2: Build with Environment Variables
Set environment variables before building:

```bash
export VITE_FIREBASE_PROJECT_ID=issue-tracker-app-1768880804
# ... set other vars
npm run build
firebase deploy --only hosting
```

### Quick Fix: Update firebase.ts with Actual Values

If you want a quick fix, you can temporarily hardcode the values (not recommended for production):

1. Get your Firebase config from: https://console.firebase.google.com/project/issue-tracker-app-1768880804/settings/general
2. Update `src/lib/firebase.ts` with actual values as fallbacks

## Verify It's Working

After setting environment variables:

1. **Check Browser Console:**
   - Should NOT see "YOUR_PROJECT_ID"
   - Should see actual project ID in network requests

2. **Test Firestore Access:**
   - Try submitting a form
   - Should work without permission errors

3. **Check Network Tab:**
   - Firestore requests should go to: `firestore.googleapis.com/v1/projects/issue-tracker-app-1768880804/...`
   - NOT: `firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/...`

## Current Firebase Project

- **Project ID:** `issue-tracker-app-1768880804`
- **Project Name:** Issue Tracker
- **Console:** https://console.firebase.google.com/project/issue-tracker-app-1768880804

## Get Firebase Config Values

1. Go to Firebase Console: https://console.firebase.google.com/project/issue-tracker-app-1768880804/settings/general
2. Scroll to "Your apps"
3. Click on web app (</>)
4. Copy the `firebaseConfig` object values

## Important Notes

- ✅ `.env` file works for **local development**
- ❌ `.env` file does NOT work for **Vercel** (must set in dashboard)
- ❌ `.env` file does NOT work for **Firebase Hosting** (must hardcode or use build-time vars)
- ✅ Environment variables are embedded at **build time** (not runtime)
- ✅ After setting vars, you must **rebuild and redeploy**
