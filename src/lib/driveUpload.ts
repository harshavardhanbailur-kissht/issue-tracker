/**
 * Google Drive Upload Service via Firebase Functions
 * Uses Service Account to upload files to Business Drive
 */

import { functions } from './firebase';
import { getApp } from 'firebase/app';

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

/**
 * Convert File to Base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (data:image/png;base64,)
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload file to Google Drive via Firebase Functions
 */
export async function uploadFileToDrive(
  file: File,
  submissionId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Convert file to base64
    if (onProgress) {
      onProgress({
        loaded: 0,
        total: file.size,
        percentage: 0,
      });
    }

    const base64Data = await fileToBase64(file);

    if (onProgress) {
      onProgress({
        loaded: file.size,
        total: file.size,
        percentage: 50, // Simulate progress
      });
    }

    // Get the function URL from Firebase config
    const app = getApp();
    const projectId = app.options.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'issue-tracker-app-1768880804';
    const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/uploadToDrive`;

    // Call Firebase Function via HTTP
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: {
          name: file.name,
          data: base64Data,
          mimeType: file.type || 'application/octet-stream',
        },
        submissionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    const result: UploadResult = await response.json();

    if (onProgress) {
      onProgress({
        loaded: file.size,
        total: file.size,
        percentage: 100,
      });
    }

    return result;
  } catch (error: any) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Validate file size
 */
export function validateFileSize(file: File): {
  valid: boolean;
  warning: boolean;
  message?: string;
  sizeMB: number;
} {
  const FILE_SIZE_WARNING_BYTES = 100 * 1024 * 1024; // 100 MB
  const FILE_SIZE_MAX_BYTES = 200 * 1024 * 1024; // 200 MB

  const sizeMB = file.size / (1024 * 1024);

  if (file.size > FILE_SIZE_MAX_BYTES) {
    return {
      valid: false,
      warning: false,
      message: `File size (${sizeMB.toFixed(2)} MB) exceeds maximum limit of 200 MB`,
      sizeMB,
    };
  }

  if (file.size >= FILE_SIZE_WARNING_BYTES) {
    return {
      valid: true,
      warning: true,
      message: `Large file detected (${sizeMB.toFixed(2)} MB). Upload may take longer.`,
      sizeMB,
    };
  }

  return {
    valid: true,
    warning: false,
    sizeMB,
  };
}

/**
 * Validate total file size for multiple files
 */
export function validateTotalFileSize(files: File[]): {
  valid: boolean;
  warning: boolean;
  message?: string;
  totalSizeMB: number;
} {
  const FILE_SIZE_WARNING_BYTES = 100 * 1024 * 1024; // 100 MB
  const FILE_SIZE_MAX_BYTES = 200 * 1024 * 1024; // 200 MB

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalSizeMB = totalSize / (1024 * 1024);

  if (totalSize > FILE_SIZE_MAX_BYTES) {
    return {
      valid: false,
      warning: false,
      message: `Total file size (${totalSizeMB.toFixed(2)} MB) exceeds maximum limit of 200 MB`,
      totalSizeMB,
    };
  }

  if (totalSize >= FILE_SIZE_WARNING_BYTES) {
    return {
      valid: true,
      warning: true,
      message: `Large total file size detected (${totalSizeMB.toFixed(2)} MB). Upload may take longer.`,
      totalSizeMB,
    };
  }

  return {
    valid: true,
    warning: false,
    totalSizeMB,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
