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

export type ProgressCallback = (progress: UploadProgress) => void;

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

      // Debug logging to identify redirect URI issues
      console.log('[Google Drive Auth] Current origin:', window.location.origin);
      console.log('[Google Drive Auth] Full URL:', window.location.href);
      console.log('[Google Drive Auth] Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
      console.log('[Google Drive Auth] Expected redirect URI:', window.location.origin);
      console.log('[Google Drive Auth] Make sure this exact URL is in Google Cloud Console:');
      console.log('[Google Drive Auth] - Authorized JavaScript origins');
      console.log('[Google Drive Auth] - Authorized redirect URIs');

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
  const token = accessToken;
  accessToken = null;
  sessionStorage.removeItem('gdrive_token');

  if (typeof google !== 'undefined' && google.accounts?.oauth2 && token) {
    google.accounts.oauth2.revoke(token, () => {});
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
