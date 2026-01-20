# Google Drive Integration - Corrected Implementation Plan

## Overview

Replace Firebase Storage with Google Drive API for file uploads. Generate one-click shareable links for Tech Support Team. Maintain serverless architecture with **browser-compatible** client-side integration.

**File Size Requirements:**
- **Warning:** Show warning for files >= 100 MB
- **Hard Limit:** Block files > 200 MB

---

## Current vs Target Architecture

| Aspect | Current | Target |
|--------|---------|--------|
| Storage | Firebase Storage | Google Drive |
| Max File Size | 10 MB | 200 MB |
| Upload Method | `uploadBytes()` | Resumable Upload API |
| Link Access | Firebase URL | Google Drive shareable link |
| Viewer Experience | Direct download | Google Drive viewer (one-click) |

---

## Phase 1: Google Cloud Setup

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: `issue-tracker-drive`
3. Enable **Google Drive API**:
   - APIs & Services → Library → Search "Google Drive API" → Enable

### 1.2 Create OAuth 2.0 Credentials

1. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: **Web application**
3. Name: `Issue Tracker Web Client`
4. Authorized JavaScript origins:
   ```
   http://localhost:5173
   https://your-firebase-app.web.app
   ```
5. Authorized redirect URIs:
   ```
   http://localhost:5173
   https://your-firebase-app.web.app
   ```
6. Save Client ID and note it down

### 1.3 Create API Key (for gapi client)

1. APIs & Services → Credentials → Create Credentials → API Key
2. Restrict key:
   - Application restrictions: HTTP referrers
   - Add your domains
   - API restrictions: Google Drive API only

### 1.4 Configure OAuth Consent Screen

1. APIs & Services → OAuth consent screen
2. User Type: External (or Internal if using Workspace)
3. App name: `Issue Tracker`
4. Scopes: Add `https://www.googleapis.com/auth/drive.file`
5. Test users: Add your email addresses

---

## Phase 2: Environment Configuration

### 2.1 Update `.env`

```env
# Existing Firebase config...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# NEW: Google Drive API
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
VITE_GOOGLE_DRIVE_FOLDER_ID=optional-shared-folder-id
```

### 2.2 Update `.env.example`

```env
# Google Drive API (for file uploads)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
VITE_GOOGLE_DRIVE_FOLDER_ID=optional-folder-id
```

---

## Phase 3: Add Google API Scripts

### 3.1 Update `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Issue Tracker</title>
    <!-- Google Identity Services -->
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <!-- Google API Client -->
    <script src="https://apis.google.com/js/api.js" async defer></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 3.2 Add Type Definitions

Create `src/types/google.d.ts`:

```typescript
declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClient {
        requestAccessToken(options?: { prompt?: string }): void;
      }

      interface TokenResponse {
        access_token: string;
        expires_in: number;
        token_type: string;
        scope: string;
        error?: string;
        error_description?: string;
      }

      function initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type: string; message: string }) => void;
      }): TokenClient;
    }
  }
}

declare namespace gapi {
  function load(api: string, callback: () => void): void;

  namespace client {
    function init(config: {
      apiKey: string;
      discoveryDocs: string[];
    }): Promise<void>;

    function setToken(token: { access_token: string }): void;
    function getToken(): { access_token: string } | null;

    namespace drive {
      namespace files {
        function create(params: {
          resource: { name: string; mimeType?: string; parents?: string[] };
          media?: { mimeType: string; body: string };
          fields?: string;
        }): Promise<{ result: { id: string; name: string; webViewLink: string } }>;
      }

      namespace permissions {
        function create(params: {
          fileId: string;
          resource: { role: string; type: string };
        }): Promise<void>;
      }
    }
  }
}
```

---

## Phase 4: Create Google Drive Service Module

### 4.1 Create `src/lib/googleDrive.ts`

```typescript
/**
 * Google Drive API Service for Browser
 *
 * Uses:
 * - Google Identity Services (gsi) for OAuth2
 * - gapi.client for Drive API calls
 * - Resumable upload for large files
 */

// ============================================
// CONSTANTS
// ============================================

const FILE_SIZE_WARNING_BYTES = 100 * 1024 * 1024;  // 100 MB
const FILE_SIZE_MAX_BYTES = 200 * 1024 * 1024;      // 200 MB
const CHUNK_SIZE = 5 * 1024 * 1024;                  // 5 MB chunks for resumable upload

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// ============================================
// TYPES
// ============================================

export interface FileSizeValidation {
  valid: boolean;
  warning: boolean;
  message?: string;
  sizeMB: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  shareableUrl: string;
  webViewLink: string;
}

type ProgressCallback = (progress: UploadProgress) => void;

// ============================================
// STATE
// ============================================

let gapiInitialized = false;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;

// ============================================
// FILE SIZE VALIDATION
// ============================================

/**
 * Validate file size against limits
 * - Warning at 100 MB
 * - Hard limit at 200 MB
 */
export function validateFileSize(file: File): FileSizeValidation {
  const sizeMB = file.size / (1024 * 1024);

  if (file.size > FILE_SIZE_MAX_BYTES) {
    return {
      valid: false,
      warning: false,
      sizeMB,
      message: `File size (${sizeMB.toFixed(1)} MB) exceeds maximum limit of 200 MB`,
    };
  }

  if (file.size >= FILE_SIZE_WARNING_BYTES) {
    return {
      valid: true,
      warning: true,
      sizeMB,
      message: `Large file detected (${sizeMB.toFixed(1)} MB). Upload may take longer.`,
    };
  }

  return {
    valid: true,
    warning: false,
    sizeMB,
  };
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Load and initialize Google API client
 */
export function initializeGoogleAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (gapiInitialized) {
      resolve();
      return;
    }

    // Check if gapi is loaded
    if (typeof gapi === 'undefined') {
      reject(new Error('Google API script not loaded. Please refresh the page.'));
      return;
    }

    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInitialized = true;
        resolve();
      } catch (error) {
        reject(new Error(`Failed to initialize Google API: ${error}`));
      }
    });
  });
}

/**
 * Initialize OAuth2 token client
 */
function initTokenClient(): google.accounts.oauth2.TokenClient {
  if (tokenClient) {
    return tokenClient;
  }

  if (typeof google === 'undefined' || !google.accounts?.oauth2) {
    throw new Error('Google Identity Services not loaded. Please refresh the page.');
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: () => {}, // Will be overridden per request
  });

  return tokenClient;
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Check if user is authenticated with Google Drive
 */
export function isAuthenticated(): boolean {
  return accessToken !== null && gapi.client?.getToken() !== null;
}

/**
 * Authenticate user with Google Drive
 * Returns access token on success
 */
export function authenticateGoogleDrive(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const client = initTokenClient();

      // Override callback for this request
      (client as any).callback = (response: google.accounts.oauth2.TokenResponse) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }

        accessToken = response.access_token;
        gapi.client.setToken({ access_token: response.access_token });

        // Store in sessionStorage for session persistence
        sessionStorage.setItem('gdrive_token', response.access_token);

        resolve(response.access_token);
      };

      // Check for existing token in session
      const storedToken = sessionStorage.getItem('gdrive_token');
      if (storedToken) {
        accessToken = storedToken;
        gapi.client.setToken({ access_token: storedToken });
        resolve(storedToken);
        return;
      }

      // Request new token
      client.requestAccessToken({ prompt: '' });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Sign out from Google Drive
 */
export function signOutGoogleDrive(): void {
  accessToken = null;
  sessionStorage.removeItem('gdrive_token');

  if (typeof google !== 'undefined' && google.accounts?.oauth2) {
    google.accounts.oauth2.revoke(accessToken || '', () => {});
  }
}

// ============================================
// FOLDER MANAGEMENT
// ============================================

/**
 * Create a folder in Google Drive (or get existing)
 */
async function getOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
  // Search for existing folder
  const query = parentId
    ? `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`;

  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const searchResult = await searchResponse.json();

  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

  // Create new folder
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined,
  };

  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  const folder = await createResponse.json();
  return folder.id;
}

// ============================================
// FILE UPLOAD
// ============================================

/**
 * Upload file to Google Drive with progress tracking
 * Uses resumable upload for files > 5MB
 */
export async function uploadFileToDrive(
  file: File,
  submissionId: string,
  onProgress?: ProgressCallback
): Promise<UploadResult> {
  if (!accessToken) {
    throw new Error('Not authenticated. Please sign in to Google Drive first.');
  }

  // Validate file size
  const validation = validateFileSize(file);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  // Create folder structure: Issue Tracker Submissions / SUB-XXXX /
  const rootFolderId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || undefined;
  const mainFolderId = await getOrCreateFolder('Issue Tracker Submissions', rootFolderId);
  const submissionFolderId = await getOrCreateFolder(submissionId, mainFolderId);

  // Generate filename
  const extension = file.name.split('.').pop() || 'bin';
  const filename = `${Date.now()}.${extension}`;

  // Use resumable upload for large files, simple upload for small files
  let fileId: string;

  if (file.size > CHUNK_SIZE) {
    fileId = await resumableUpload(file, filename, submissionFolderId, onProgress);
  } else {
    fileId = await simpleUpload(file, filename, submissionFolderId, onProgress);
  }

  // Set file permissions (anyone with link can view)
  await setFilePermissions(fileId);

  // Get shareable link
  const shareableUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  const webViewLink = `https://drive.google.com/file/d/${fileId}/view`;

  return {
    fileId,
    fileName: filename,
    shareableUrl,
    webViewLink,
  };
}

/**
 * Simple upload for files <= 5MB
 */
async function simpleUpload(
  file: File,
  filename: string,
  folderId: string,
  onProgress?: ProgressCallback
): Promise<string> {
  const metadata = {
    name: filename,
    parents: [folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  // Report initial progress
  onProgress?.({ loaded: 0, total: file.size, percentage: 0 });

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Upload failed');
  }

  // Report complete
  onProgress?.({ loaded: file.size, total: file.size, percentage: 100 });

  const result = await response.json();
  return result.id;
}

/**
 * Resumable upload for files > 5MB
 * Uploads in chunks with progress tracking
 */
async function resumableUpload(
  file: File,
  filename: string,
  folderId: string,
  onProgress?: ProgressCallback
): Promise<string> {
  // Step 1: Initiate resumable upload session
  const metadata = {
    name: filename,
    parents: [folderId],
  };

  const initResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': file.type,
        'X-Upload-Content-Length': file.size.toString(),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initResponse.ok) {
    throw new Error('Failed to initiate upload');
  }

  const uploadUrl = initResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('No upload URL received');
  }

  // Step 2: Upload file in chunks
  let uploadedBytes = 0;

  while (uploadedBytes < file.size) {
    const chunkEnd = Math.min(uploadedBytes + CHUNK_SIZE, file.size);
    const chunk = file.slice(uploadedBytes, chunkEnd);

    const chunkResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${uploadedBytes}-${chunkEnd - 1}/${file.size}`,
        'Content-Type': file.type,
      },
      body: chunk,
    });

    if (chunkResponse.status === 200 || chunkResponse.status === 201) {
      // Upload complete
      const result = await chunkResponse.json();
      onProgress?.({ loaded: file.size, total: file.size, percentage: 100 });
      return result.id;
    } else if (chunkResponse.status === 308) {
      // Resume incomplete - continue uploading
      const range = chunkResponse.headers.get('Range');
      if (range) {
        uploadedBytes = parseInt(range.split('-')[1], 10) + 1;
      } else {
        uploadedBytes = chunkEnd;
      }

      const percentage = Math.round((uploadedBytes / file.size) * 100);
      onProgress?.({ loaded: uploadedBytes, total: file.size, percentage });
    } else {
      throw new Error(`Chunk upload failed with status ${chunkResponse.status}`);
    }
  }

  throw new Error('Upload failed: unexpected end of upload');
}

/**
 * Set file permissions to "anyone with link can view"
 */
async function setFilePermissions(fileId: string): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    }
  );

  if (!response.ok) {
    console.warn('Failed to set file permissions, file may not be publicly accessible');
  }
}

// ============================================
// UTILITY
// ============================================

/**
 * Check if Google Drive is available and configured
 */
export function isGoogleDriveConfigured(): boolean {
  return !!(
    import.meta.env.VITE_GOOGLE_CLIENT_ID &&
    import.meta.env.VITE_GOOGLE_API_KEY
  );
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
```

---

## Phase 5: Create Google Drive Auth Context

### 5.1 Create `src/contexts/GoogleDriveContext.tsx`

```typescript
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  initializeGoogleAPI,
  authenticateGoogleDrive,
  signOutGoogleDrive,
  isAuthenticated,
  isGoogleDriveConfigured,
} from '@/lib/googleDrive';

interface GoogleDriveContextType {
  isConfigured: boolean;
  isInitialized: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const GoogleDriveContext = createContext<GoogleDriveContextType | null>(null);

export function GoogleDriveProvider({ children }: { children: ReactNode }) {
  const [isConfigured] = useState(isGoogleDriveConfigured());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Google API on mount
  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        await initializeGoogleAPI();
        setIsInitialized(true);
        setIsSignedIn(isAuthenticated());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize Google API');
      } finally {
        setIsLoading(false);
      }
    };

    // Wait for scripts to load
    const checkAndInit = () => {
      if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
        init();
      } else {
        setTimeout(checkAndInit, 100);
      }
    };

    checkAndInit();
  }, [isConfigured]);

  const signIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authenticateGoogleDrive();
      setIsSignedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    signOutGoogleDrive();
    setIsSignedIn(false);
  }, []);

  return (
    <GoogleDriveContext.Provider
      value={{
        isConfigured,
        isInitialized,
        isSignedIn,
        isLoading,
        error,
        signIn,
        signOut,
      }}
    >
      {children}
    </GoogleDriveContext.Provider>
  );
}

export function useGoogleDrive() {
  const context = useContext(GoogleDriveContext);
  if (!context) {
    throw new Error('useGoogleDrive must be used within GoogleDriveProvider');
  }
  return context;
}
```

---

## Phase 6: Update Submissions Service

### 6.1 Update `src/lib/submissions.ts`

```typescript
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  runTransaction,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { uploadFileToDrive, type UploadProgress } from './googleDrive';
import type { Submission, SubmissionFormData, UserRole } from '@/types';

const SUBMISSIONS_COLLECTION = 'submissions';
const COUNTERS_COLLECTION = 'counters';

/**
 * Generate next submission ID (SUB-0001 format) using transaction
 */
async function generateSubmissionId(): Promise<string> {
  const counterRef = doc(db, COUNTERS_COLLECTION, 'SUBMISSION_COUNTER');

  const newId = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let currentValue = 0;
    if (counterDoc.exists()) {
      currentValue = counterDoc.data().value || 0;
    }

    const nextValue = currentValue + 1;
    transaction.set(counterRef, { value: nextValue });

    return `SUB-${String(nextValue).padStart(4, '0')}`;
  });

  return newId;
}

/**
 * Create a new submission with Google Drive upload
 */
export async function createSubmission(
  data: SubmissionFormData,
  role: UserRole,
  onUploadProgress?: (progress: UploadProgress) => void
): Promise<string> {
  // Generate submission ID first (needed for folder name)
  const submissionId = await generateSubmissionId();

  // Upload attachment to Google Drive if provided
  let attachmentUrl: string | undefined;
  let attachmentDriveId: string | undefined;

  if (data.attachmentFile) {
    const uploadResult = await uploadFileToDrive(
      data.attachmentFile,
      submissionId,
      onUploadProgress
    );
    attachmentUrl = uploadResult.shareableUrl;
    attachmentDriveId = uploadResult.fileId;
  }

  // Create submission document
  const submissionData: Omit<Submission, 'createdAt' | 'submittedAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    submittedAt: ReturnType<typeof serverTimestamp>;
  } = {
    id: submissionId,
    actionable: data.actionable,
    detailedActionable: data.detailedActionable,
    lsqLink: data.lsqLink,
    urn: data.urn,
    attachmentUrl,
    attachmentDriveId,  // NEW: Store Drive file ID
    comments: data.comments,
    submittedBy: role,
    createdAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
  };

  const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  await setDoc(docRef, submissionData);

  return submissionId;
}

// ... rest of the file remains the same (getSubmissionById, getAllSubmissions, subscribeToSubmissions)
```

---

## Phase 7: Update Types

### 7.1 Update `src/types/index.ts`

```typescript
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'product_support' | 'tech_support_team';

export interface Submission {
  id: string;
  actionable: string;
  detailedActionable: string;
  lsqLink: string;
  urn: string;
  attachmentUrl?: string;
  attachmentDriveId?: string;  // NEW: Google Drive file ID
  comments?: string;
  submittedBy: UserRole;
  submittedAt: Timestamp;
  createdAt: Timestamp;
}

export interface SubmissionFormData {
  actionable: string;
  detailedActionable: string;
  lsqLink: string;
  urn: string;
  attachmentFile?: File;
  comments?: string;
}
```

---

## Phase 8: Update Submit Page

### 8.1 Update `src/pages/SubmitPage.tsx`

```typescript
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useGoogleDrive } from '@/contexts/GoogleDriveContext';
import { createSubmission } from '@/lib/submissions';
import { validateFileSize, formatFileSize, type UploadProgress } from '@/lib/googleDrive';
import type { SubmissionFormData } from '@/types';

const ACTIONABLE_OPTIONS = [
  'Follow up required',
  'Data correction needed',
  'Status update needed',
  'Documentation required',
  'Other',
];

export default function SubmitPage() {
  const { role } = useSimpleAuth();
  const { isSignedIn, isLoading: isGoogleLoading, signIn, error: googleError } = useGoogleDrive();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<SubmissionFormData>({
    actionable: '',
    detailedActionable: '',
    lsqLink: '',
    urn: '',
    attachmentFile: undefined,
    comments: '',
  });
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [success, setSuccess] = useState<{ submissionId: string } | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileSizeWarning(null);

    if (file) {
      // Validate file size (100 MB warning, 200 MB limit)
      const validation = validateFileSize(file);

      if (!validation.valid) {
        toast.error(validation.message!);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      if (validation.warning) {
        setFileSizeWarning(validation.message!);
        toast(validation.message!, {
          icon: '⚠️',
          duration: 5000,
          style: { background: '#FEF3C7', color: '#92400E' }
        });
      }

      setFormData(prev => ({ ...prev, attachmentFile: file }));
      setAttachmentPreview(URL.createObjectURL(file));
    }
  };

  const removeAttachment = () => {
    setFormData(prev => ({ ...prev, attachmentFile: undefined }));
    setAttachmentPreview(null);
    setFileSizeWarning(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn();
      toast.success('Connected to Google Drive');
    } catch {
      toast.error('Failed to connect to Google Drive');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Google Drive connection
    if (!isSignedIn) {
      toast.error('Please connect to Google Drive first');
      return;
    }

    if (!formData.actionable) {
      toast.error('Please select an actionable');
      return;
    }

    if (!formData.detailedActionable.trim()) {
      toast.error('Please provide detailed actionable');
      return;
    }

    if (!formData.lsqLink.trim()) {
      toast.error('Please provide LSQ Link');
      return;
    }

    if (!formData.urn.trim()) {
      toast.error('Please provide URN');
      return;
    }

    if (!formData.attachmentFile) {
      toast.error('Please attach a file');
      return;
    }

    if (!role) {
      toast.error('You must be logged in');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(null);

    try {
      const submissionId = await createSubmission(
        formData,
        role,
        (progress) => setUploadProgress(progress)
      );
      setSuccess({ submissionId });
      toast.success(`Submission ${submissionId} created successfully!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create submission');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleSubmitAnother = () => {
    setFormData({
      actionable: '',
      detailedActionable: '',
      lsqLink: '',
      urn: '',
      attachmentFile: undefined,
      comments: '',
    });
    setAttachmentPreview(null);
    setFileSizeWarning(null);
    setSuccess(null);
  };

  // Success state (same as before)
  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Successful!</h2>
          <p className="text-gray-600 mb-6">Your submission has been logged with ID:</p>

          <div className="py-4 px-6 rounded-xl bg-gray-50 border-2 border-gray-200 mb-8">
            <p className="text-3xl font-mono font-bold text-blue-600">{success.submissionId}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmitAnother}
              className="flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit Form</h1>
        <p className="text-gray-600">Fill out the form below to submit your request</p>
      </div>

      {/* Google Drive Connection Card */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isSignedIn ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <svg className={`w-5 h-5 ${isSignedIn ? 'text-green-600' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm.14 19.018c-3.868 0-7-3.14-7-7.018 0-3.878 3.132-7.018 7-7.018 1.89 0 3.47.697 4.682 1.829l-1.974 1.978v-.004c-.735-.702-1.667-1.062-2.708-1.062-2.31 0-4.187 1.956-4.187 4.273 0 2.315 1.877 4.277 4.187 4.277 2.096 0 3.522-1.202 3.816-2.852H12.14v-2.737h6.585c.088.47.135.96.135 1.474 0 4.01-2.677 6.86-6.72 6.86z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {isSignedIn ? 'Connected to Google Drive' : 'Google Drive Connection Required'}
              </p>
              <p className="text-sm text-gray-500">
                {isSignedIn ? 'Files will be uploaded to your Drive' : 'Connect to upload attachments'}
              </p>
            </div>
          </div>

          {!isSignedIn && (
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isGoogleLoading ? 'Connecting...' : 'Connect'}
            </button>
          )}

          {isSignedIn && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
              Connected
            </span>
          )}
        </div>

        {googleError && (
          <p className="mt-2 text-sm text-red-600">{googleError}</p>
        )}
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ... other form fields remain the same ... */}

          {/* Actionable */}
          <div>
            <label htmlFor="actionable" className="block text-sm font-medium text-gray-700 mb-2">
              Actionable <span className="text-red-500">*</span>
            </label>
            <select
              id="actionable"
              name="actionable"
              value={formData.actionable}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Choose an option</option>
              {ACTIONABLE_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Detailed Actionable */}
          <div>
            <label htmlFor="detailedActionable" className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Actionable <span className="text-red-500">*</span>
            </label>
            <textarea
              id="detailedActionable"
              name="detailedActionable"
              value={formData.detailedActionable}
              onChange={handleInputChange}
              required
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Provide detailed description of the actionable item..."
            />
          </div>

          {/* LSQ Link */}
          <div>
            <label htmlFor="lsqLink" className="block text-sm font-medium text-gray-700 mb-2">
              LSQ Link <span className="text-red-500">*</span>
            </label>
            <input
              id="lsqLink"
              name="lsqLink"
              type="url"
              value={formData.lsqLink}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="https://..."
            />
          </div>

          {/* URN */}
          <div>
            <label htmlFor="urn" className="block text-sm font-medium text-gray-700 mb-2">
              URN of Applicant / Co-Applicant <span className="text-red-500">*</span>
            </label>
            <input
              id="urn"
              name="urn"
              type="text"
              value={formData.urn}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Enter URN"
            />
          </div>

          {/* Attachment - UPDATED */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachment <span className="text-red-500">*</span>
            </label>
            {attachmentPreview ? (
              <div className="relative">
                <div className="p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-700 font-medium">{formData.attachmentFile?.name}</p>
                    <span className="text-xs text-gray-500">
                      {formData.attachmentFile && formatFileSize(formData.attachmentFile.size)}
                    </span>
                  </div>
                  {formData.attachmentFile?.type.startsWith('image/') && (
                    <img
                      src={attachmentPreview}
                      alt="Preview"
                      className="max-h-48 rounded-lg"
                    />
                  )}
                  {fileSizeWarning && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 flex items-center gap-1">
                        <span>⚠️</span> {fileSizeWarning}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={removeAttachment}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isSignedIn}
                className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600">
                  {isSignedIn ? 'Click to upload or drag and drop' : 'Connect to Google Drive first'}
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF up to 200MB (warning at 100MB)</p>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              required={!attachmentPreview}
            />
          </div>

          {/* Upload Progress - NEW */}
          {uploadProgress && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Uploading to Google Drive...</span>
                <span className="text-sm text-blue-600">{uploadProgress.percentage}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)}
              </p>
            </div>
          )}

          {/* Comments/Remarks */}
          <div>
            <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
              Comments/Remarks <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="comments"
              name="comments"
              value={formData.comments}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Any additional comments or remarks..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !isSignedIn}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (uploadProgress ? 'Uploading...' : 'Submitting...') : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## Phase 9: Update App with Provider

### 9.1 Update `src/App.tsx` (or main router)

Add GoogleDriveProvider:

```typescript
import { GoogleDriveProvider } from '@/contexts/GoogleDriveContext';

function App() {
  return (
    <SimpleAuthProvider>
      <GoogleDriveProvider>
        <Router>
          {/* ... routes ... */}
        </Router>
      </GoogleDriveProvider>
    </SimpleAuthProvider>
  );
}
```

---

## Phase 10: Update Submission Detail Page

### 10.1 Update `src/pages/SubmissionDetailPage.tsx`

Update link display:

```typescript
{submission.attachmentUrl && (
  <div>
    <h2 className="text-lg font-semibold text-gray-900 mb-2">Attachment</h2>
    <a
      href={submission.attachmentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm.14 19.018c-3.868 0-7-3.14-7-7.018 0-3.878 3.132-7.018 7-7.018 1.89 0 3.47.697 4.682 1.829l-1.974 1.978v-.004c-.735-.702-1.667-1.062-2.708-1.062-2.31 0-4.187 1.956-4.187 4.273 0 2.315 1.877 4.277 4.187 4.277 2.096 0 3.522-1.202 3.816-2.852H12.14v-2.737h6.585c.088.47.135.96.135 1.474 0 4.01-2.677 6.86-6.72 6.86z"/>
      </svg>
      View in Google Drive
    </a>

    {/* Inline preview for images (check if Firebase URL or Drive URL) */}
    {submission.attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
      <div className="mt-3">
        <img
          src={submission.attachmentUrl}
          alt="Attachment"
          className="max-w-full max-h-96 rounded-lg border"
        />
      </div>
    )}
  </div>
)}
```

---

## Phase 11: Cleanup (After Migration)

### 11.1 Files to Remove/Modify

After confirming Google Drive integration works:

1. **Remove from `src/lib/firebase.ts`:**
   ```typescript
   // Remove these lines:
   import { getStorage } from 'firebase/storage';
   export const storage = getStorage(app);
   ```

2. **Remove from `src/lib/submissions.ts`:**
   ```typescript
   // Remove Firebase Storage imports and uploadAttachment function
   ```

3. **Delete `storage.rules`** (no longer needed)

4. **Update `firebase.json`:**
   - Remove storage deployment references

---

## File Size Validation Summary

| Size Range | Behavior |
|------------|----------|
| 0 - 99.99 MB | Normal upload, no warnings |
| 100 - 200 MB | Warning toast + yellow indicator, upload allowed |
| > 200 MB | Error toast, upload blocked |

---

## Testing Checklist

- [ ] Google API scripts load correctly
- [ ] OAuth consent screen configured properly
- [ ] Sign in to Google Drive works
- [ ] File size < 100 MB uploads without warning
- [ ] File size 100-200 MB shows warning but uploads
- [ ] File size > 200 MB is blocked with error
- [ ] Upload progress shows for large files
- [ ] Shareable links are generated correctly
- [ ] Tech Support can view files without Google sign-in
- [ ] Existing Firebase Storage URLs still work
- [ ] Error handling for network failures
- [ ] Token refresh works for long sessions

---

## Deployment Steps

1. Set up Google Cloud Project with OAuth credentials
2. Add environment variables to production
3. Update `index.html` with Google scripts
4. Add type definitions
5. Create `googleDrive.ts` service module
6. Create `GoogleDriveContext.tsx`
7. Update `submissions.ts`
8. Update `SubmitPage.tsx`
9. Update `SubmissionDetailPage.tsx`
10. Update `App.tsx` with provider
11. Test locally
12. Deploy to Firebase Hosting
13. Verify OAuth redirect URIs in Google Cloud Console
14. Test in production

---

## Rollback Plan

If issues occur:

1. Keep Firebase Storage code commented (not deleted) initially
2. Add feature flag: `VITE_USE_GOOGLE_DRIVE=true/false`
3. Support both upload methods during transition
4. Existing submissions with Firebase URLs continue working
