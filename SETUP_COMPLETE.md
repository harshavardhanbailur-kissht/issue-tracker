# Setup Complete! ✅

## What You Have:

1. ✅ **Service Account Key**: `functions/service-account-key.json`
   - Email: `issue-tracker-app-1768880804@appspot.gserviceaccount.com`
   - Project: `issue-tracker-app-1768880804`

2. ✅ **Google Drive Folder ID**: `1HRyVZ_m6tGGPyrBqiJIhmMeAfhVj6Za2`
   - Folder: "Issue Tracker Submissions"
   - Shared with Service Account (Editor permission)

## Next Steps: Configure Firebase Functions

### Option A: For Production (Recommended)

Set environment variables/secrets in Firebase:

```bash
# Set Service Account Key (paste entire JSON when prompted)
firebase functions:secrets:set SERVICE_ACCOUNT_KEY
# When prompted, paste the entire JSON content from the file

# Set Folder ID
firebase functions:secrets:set GOOGLE_DRIVE_FOLDER_ID
# When prompted, paste: 1HRyVZ_m6tGGPyrBqiJIhmMeAfhVj6Za2
```

### Option B: For Local Development

The file is already in `functions/service-account-key.json` - the code will use it automatically.

## Deploy Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:uploadToDrive
```

## Test

After deployment, try uploading a file from your app. It should work without CORS errors!

