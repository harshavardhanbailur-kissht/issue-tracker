# How to Use a Shared Google Drive Instead of Personal Drive

## Current Setup (Personal Drive)

**Yes, files currently go to YOUR personal Google Drive:**
- When Product Support signs in, files upload to **their personal Drive**
- Uses **their storage quota** (15GB free per account)
- Files are in: `Issue Tracker Submissions/SUB-XXXX/` folder

## How to Change to Shared Drive

The code **already supports** using a shared folder! You just need to set `VITE_GOOGLE_DRIVE_FOLDER_ID`.

---

## Option 1: Shared Google Drive Folder (Easiest)

### Step 1: Create a Shared Folder

1. Go to [Google Drive](https://drive.google.com)
2. Create a new folder: `Issue Tracker Files` (or any name)
3. Right-click the folder → **Share**
4. Set permissions:
   - **Add people**: Add all Product Support team members
   - **Permission**: "Editor" (so they can upload)
   - Click "Send"

### Step 2: Get the Folder ID

1. Open the shared folder in Google Drive
2. Look at the URL in your browser:
   ```
   https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz123456
                                                      ↑
                                              This is the Folder ID
   ```
3. Copy the Folder ID (the long string after `/folders/`)

### Step 3: Update .env File

```bash
# Edit .env file
VITE_GOOGLE_DRIVE_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz123456
```

### Step 4: Redeploy

```bash
npm run build
firebase deploy --only hosting
```

**Result**: All files will now upload to the shared folder instead of personal Drive!

---

## Option 2: Google Workspace Shared Drive (Best for Teams)

### Benefits:
- ✅ Unlimited storage (depending on plan)
- ✅ Centralized storage for entire team
- ✅ Better organization and permissions
- ✅ No personal quota limits

### Setup Steps:

1. **Create Shared Drive** (requires Google Workspace admin)
   - Go to Google Drive → Shared drives
   - Click "New" → Name it "Issue Tracker Submissions"
   - Add team members with appropriate permissions

2. **Get Shared Drive Folder ID**
   - Open the Shared Drive
   - Copy the Folder ID from URL (same as Option 1)

3. **Update .env**
   ```env
   VITE_GOOGLE_DRIVE_FOLDER_ID=shared-drive-folder-id-here
   ```

4. **Update OAuth Scope** (if needed)
   - Current scope: `https://www.googleapis.com/auth/drive.file`
   - For Shared Drives, you might need: `https://www.googleapis.com/auth/drive`
   - Update in Google Cloud Console → OAuth Consent Screen → Scopes

5. **Redeploy**

---

## How It Works

When `VITE_GOOGLE_DRIVE_FOLDER_ID` is set:

```
Shared Folder (ID: xyz123)/
└── Issue Tracker Submissions/
    ├── SUB-0001/
    │   └── file.pdf
    ├── SUB-0002/
    │   └── file.jpg
    └── SUB-0003/
        └── file.png
```

When `VITE_GOOGLE_DRIVE_FOLDER_ID` is empty (current):

```
User's Personal Drive/
└── Issue Tracker Submissions/
    ├── SUB-0001/
    │   └── file.pdf
    └── ...
```

---

## Storage Comparison

| Setup | Storage Location | Storage Limit | Cost |
|-------|-----------------|---------------|------|
| **Personal Drive** (Current) | Each user's Drive | 15GB free/user | Free |
| **Shared Folder** | One shared folder | 15GB total | Free |
| **Shared Drive** (Workspace) | Team Shared Drive | Unlimited* | Paid plan |

*Unlimited depends on Google Workspace plan

---

## Quick Setup Guide

### For Shared Folder (Recommended for most cases):

1. **Create folder in Google Drive**
2. **Share with team members**
3. **Get folder ID from URL**
4. **Update .env**:
   ```env
   VITE_GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here
   ```
5. **Rebuild and deploy**:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### Finding Folder ID:

**Method 1: From URL**
- Open folder in Google Drive
- URL format: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
- Copy the `FOLDER_ID_HERE` part

**Method 2: Using Google Drive API** (if you have access)
```bash
# List folders
curl "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder'&access_token=YOUR_TOKEN"
```

---

## Important Notes

1. **Permissions**: The Google account that signs in must have access to the shared folder
2. **OAuth Scope**: Current scope (`drive.file`) works for shared folders
3. **Backward Compatibility**: Existing submissions with personal Drive links will still work
4. **Migration**: Old files stay in personal Drive, new files go to shared folder

---

## Testing

After setting `VITE_GOOGLE_DRIVE_FOLDER_ID`:

1. Test locally: `npm run dev`
2. Sign in to Google Drive
3. Upload a test file
4. Check that it appears in the shared folder (not personal Drive)
5. Verify Tech Support can view via shareable link

---

## Troubleshooting

**Issue**: "Folder not found" error
- **Solution**: Verify folder ID is correct
- Ensure the signed-in account has access to the folder

**Issue**: Files still going to personal Drive
- **Solution**: Clear browser cache, restart dev server
- Verify `.env` file has correct folder ID
- Check that folder ID doesn't have extra spaces

**Issue**: Permission denied
- **Solution**: Ensure folder is shared with the Google account
- Check folder permissions (Editor access needed)

---

## Future Migration Path

If you start with personal Drive and want to migrate later:

1. Set up shared folder/Drive
2. Update `VITE_GOOGLE_DRIVE_FOLDER_ID`
3. New submissions → go to shared location
4. Old submissions → remain accessible via original links
5. (Optional) Manually move old files if needed

---

**Last Updated**: Based on current implementation
**Code Location**: `src/lib/googleDrive.ts` - line ~475
