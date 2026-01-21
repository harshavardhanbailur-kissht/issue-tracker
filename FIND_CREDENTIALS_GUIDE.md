# How to Find Service Account Key and Google Drive Folder ID

## Quick Overview

You need two things:
1. **Service Account Key** (JSON file) - For Firebase Functions to authenticate
2. **Google Drive Folder ID** - The folder where files will be uploaded

---

## Part 1: Finding Service Account Key

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Make sure you're in the correct project (check top bar)
   - Your project: `issue-tracker-app-1768880804` (or your Firebase project)

### Step 2: Navigate to Service Accounts

**Option A: Via Menu**
- Click the hamburger menu (☰) in top left
- Go to: **IAM & Admin** → **Service Accounts**

**Option B: Direct Link**
- Visit: https://console.cloud.google.com/iam-admin/serviceaccounts

### Step 3: Create Service Account (if you don't have one)

1. Click **"+ CREATE SERVICE ACCOUNT"** (top of page)
2. Fill in:
   - **Service account name**: `issue-tracker-drive-uploader`
   - **Service account ID**: Auto-generated (or customize)
   - **Description**: "Service account for uploading files to Business Drive"
3. Click **"CREATE AND CONTINUE"**
4. Skip role assignment (click **"CONTINUE"**)
5. Click **"DONE"**

### Step 4: Create and Download Key

1. **Click on the service account** you just created (or existing one)
2. Go to **"KEYS"** tab (top menu)
3. Click **"ADD KEY"** → **"Create new key"**
4. Select **"JSON"** format
5. Click **"CREATE"**
6. **A JSON file will download automatically** - this is your Service Account Key!

### Step 5: Find the Service Account Email

The Service Account email is in the JSON file you downloaded. Open it and look for:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "issue-tracker-drive-uploader@your-project.iam.gserviceaccount.com",
  ...
}
```

**Copy the `client_email` value** - you'll need it to share the folder.

---

## Part 2: Finding Google Drive Folder ID

### Step 1: Create or Open Folder in Google Drive

1. Go to: https://drive.google.com
2. Sign in with your **Business Google account**
3. **Create a new folder** (or use existing):
   - Click **"New"** → **"Folder"**
   - Name it: `Issue Tracker Submissions` (or any name)
   - Click **"Create"**

### Step 2: Get Folder ID from URL

1. **Open the folder** you just created
2. Look at the URL in your browser address bar:

```
https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz123456
                                    ↑
                            This is your Folder ID!
```

3. **Copy the Folder ID** (the long string after `/folders/`)
   - Example: `1AbCdEfGhIjKlMnOpQrStUvWxYz123456`

### Alternative: Get Folder ID from Folder Properties

1. Right-click the folder → **"Get link"** or **"Share"**
2. The link will be: `https://drive.google.com/drive/folders/FOLDER_ID`
3. Copy the Folder ID from the link

---

## Part 3: Share Folder with Service Account

**IMPORTANT**: The Service Account needs access to upload files!

1. **Open the folder** in Google Drive
2. **Right-click** → **"Share"**
3. In the **"Add people and groups"** field, paste:
   - Your Service Account email (from Step 5 above)
   - Format: `issue-tracker-drive-uploader@YOUR_PROJECT_ID.iam.gserviceaccount.com`
4. Set permission to **"Editor"** (dropdown)
5. **Uncheck** "Notify people" (Service Account doesn't need email)
6. Click **"Share"**

---

## Part 4: Configure Firebase Functions

### Option A: Using Environment Variables (Recommended for Production)

1. **Convert JSON to single line** (for environment variable):
   ```bash
   # On Mac/Linux:
   cat service-account-key.json | jq -c
   
   # Or manually: Open JSON file, remove all line breaks
   ```

2. **Set Firebase Functions secrets**:
   ```bash
   # Set Service Account Key (will prompt you to paste the JSON)
   firebase functions:secrets:set SERVICE_ACCOUNT_KEY
   # Paste the entire JSON content when prompted
   
   # Set Folder ID
   firebase functions:secrets:set GOOGLE_DRIVE_FOLDER_ID
   # Paste your folder ID when prompted
   ```

### Option B: Using Local File (For Development)

1. **Place JSON file** in `functions/` directory:
   ```bash
   cp ~/Downloads/service-account-key.json functions/service-account-key.json
   ```

2. **Make sure it's in .gitignore**:
   ```bash
   echo "functions/service-account-key.json" >> .gitignore
   ```

3. The code will automatically detect and use it locally.

---

## Quick Reference

### Service Account Key Location:
- **File**: `service-account-key.json` (downloaded from Google Cloud Console)
- **Contains**: `client_email`, `private_key`, `project_id`, etc.
- **Keep secure**: Never commit to Git!

### Google Drive Folder ID:
- **Format**: Long alphanumeric string (e.g., `1AbCdEfGhIjKlMnOpQrStUvWxYz123456`)
- **Found in**: URL when folder is open
- **Example URL**: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

### Service Account Email:
- **Format**: `service-account-name@project-id.iam.gserviceaccount.com`
- **Found in**: JSON file (`client_email` field) or Google Cloud Console
- **Used for**: Sharing folder with Service Account

---

## Verification Checklist

- [ ] Service Account created in Google Cloud Console
- [ ] Service Account JSON key downloaded
- [ ] Service Account email copied (`client_email` from JSON)
- [ ] Google Drive API enabled (APIs & Services → Library → Google Drive API)
- [ ] Folder created in Google Drive
- [ ] Folder ID copied from URL
- [ ] Folder shared with Service Account (Editor permission)
- [ ] Service Account Key configured in Firebase Functions
- [ ] Folder ID configured in Firebase Functions

---

## Troubleshooting

### "Service Account Key not found"
- Check that JSON file is in `functions/` directory
- Or verify environment variable is set: `firebase functions:config:get`

### "Folder not found" error
- Verify folder ID is correct (no extra spaces)
- Ensure folder is shared with Service Account email
- Check Service Account has "Editor" permission

### "Permission denied"
- Service Account must have "Editor" access to folder
- Verify Service Account email matches exactly
- Re-share folder if needed

---

## Security Reminders

⚠️ **NEVER commit `service-account-key.json` to Git!**

- Add to `.gitignore`: `functions/service-account-key.json`
- Use environment variables/secrets in production
- Keep JSON file secure and private
- Revoke keys if compromised

---

**Need Help?** Check:
- `SERVICE_ACCOUNT_SETUP.md` - Detailed setup guide
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- Firebase Console → Functions → Configuration
