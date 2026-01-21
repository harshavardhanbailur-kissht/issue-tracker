import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Google Drive API with Service Account
let driveClient: any = null;

function getDriveClient() {
  if (driveClient) {
    return driveClient;
  }

  // Load service account credentials
  // Option 1: From file (for local development)
  const keyPath = path.join(__dirname, '../service-account-key.json');
  let credentials: any;

  if (fs.existsSync(keyPath)) {
    // Local development: load from file
    credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  } else {
    // Production: use environment variable
    const serviceAccountJson = process.env.SERVICE_ACCOUNT_KEY;
    if (!serviceAccountJson) {
      throw new Error('SERVICE_ACCOUNT_KEY environment variable not set');
    }
    credentials = JSON.parse(serviceAccountJson);
  }

  // Get folder ID from environment
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable not set');
  }

  // Create auth client
  const auth = new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    ['https://www.googleapis.com/auth/drive'],
    undefined
  );

  // Create Drive client
  driveClient = google.drive({ version: 'v3', auth });

  return driveClient;
}

interface UploadRequest {
  file: {
    name: string;
    data: string; // Base64 encoded
    mimeType: string;
  };
  submissionId: string;
}

interface UploadResponse {
  fileId: string;
  fileName: string;
  shareableUrl: string;
  webViewLink: string;
}

// CORS configuration
const allowedOrigins = [
  'https://issue-tracker-app-1768880804.web.app',
  'https://issue-tracker-app-1768880804.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

/**
 * Set CORS headers
 */
function setCorsHeaders(req: any, res: any) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.includes('*')) {
    res.set('Access-Control-Allow-Origin', '*');
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Max-Age', '3600');
}

/**
 * Upload file to Google Drive using Service Account
 * Uses HTTP function with CORS support
 */
export const uploadToDrive = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  setCorsHeaders(req, res);

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const data: UploadRequest = req.body;

    // Validate request data
    if (!data || !data.file || !data.submissionId) {
      res.status(400).json({ error: 'Missing required fields: file, submissionId' });
      return;
    }

    const drive = getDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;

    // Create folder structure: Issue Tracker Submissions / SUB-XXXX /
    const mainFolderId = await getOrCreateFolder(drive, 'Issue Tracker Submissions', folderId);
    const submissionFolderId = await getOrCreateFolder(drive, data.submissionId, mainFolderId);

    // Convert base64 to buffer
    // Remove data URL prefix if present (data:image/png;base64,)
    const base64Data = data.file.data.includes(',') 
      ? data.file.data.split(',')[1] 
      : data.file.data;
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // Upload file
    const fileMetadata = {
      name: data.file.name,
      parents: [submissionFolderId],
    };

    const media = {
      mimeType: data.file.mimeType,
      body: fileBuffer,
    };

    const uploadResponse = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,name,webViewLink',
    });

    const fileId = uploadResponse.data.id!;

    // Set permissions (anyone with link can view)
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get shareable URL
    const shareableUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    const webViewLink = uploadResponse.data.webViewLink || shareableUrl;

    const response: UploadResponse = {
      fileId: fileId,
      fileName: data.file.name,
      shareableUrl: shareableUrl,
      webViewLink: webViewLink,
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Failed to upload file',
      message: error.message,
    });
  }
});

/**
 * Get or create folder in Google Drive
 */
async function getOrCreateFolder(
  drive: any,
  folderName: string,
  parentId?: string
): Promise<string> {
  // Search for existing folder
  const query = parentId
    ? `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`;

  const searchResponse = await drive.files.list({
    q: query,
    fields: 'files(id,name)',
    spaces: 'drive',
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id!;
  }

  // Create new folder
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined,
  };

  const createResponse = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
  });

  return createResponse.data.id!;
}

/**
 * Scheduled function to purge files older than 14 days
 * Runs every 2 weeks
 */
export const purgeOldFiles = functions.pubsub
  .schedule('every 14 days')
  .onRun(async (context) => {
    try {
      const drive = getDriveClient();
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;

      // Calculate cutoff date (14 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 14);
      const cutoffDateStr = cutoffDate.toISOString();

      console.log(`Purging files older than ${cutoffDateStr}`);

      // Find main folder
      const mainFolderId = await getOrCreateFolder(drive, 'Issue Tracker Submissions', folderId);

      // List all files in the main folder and subfolders
      const query = `'${mainFolderId}' in parents and createdTime < '${cutoffDateStr}' and trashed=false`;

      let nextPageToken: string | undefined;
      let totalDeleted = 0;

      do {
        const listResponse = await drive.files.list({
          q: query,
          fields: 'nextPageToken,files(id,name,createdTime)',
          pageToken: nextPageToken,
          pageSize: 1000,
        });

        const files = listResponse.data.files || [];

        // Delete each file
        for (const file of files) {
          try {
            await drive.files.delete({
              fileId: file.id!,
            });
            console.log(`Deleted file: ${file.name} (${file.id})`);
            totalDeleted++;
          } catch (error: any) {
            console.error(`Failed to delete file ${file.id}:`, error.message);
          }
        }

        nextPageToken = listResponse.data.nextPageToken || undefined;
      } while (nextPageToken);

      // Also delete empty submission folders
      const foldersQuery = `'${mainFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const foldersResponse = await drive.files.list({
        q: foldersQuery,
        fields: 'files(id,name)',
      });

      const folders = foldersResponse.data.files || [];
      for (const folder of folders) {
        // Check if folder is empty
        const folderContents = await drive.files.list({
          q: `'${folder.id}' in parents and trashed=false`,
          fields: 'files(id)',
        });

        if (!folderContents.data.files || folderContents.data.files.length === 0) {
          // Folder is empty, delete it
          try {
            await drive.files.delete({
              fileId: folder.id!,
            });
            console.log(`Deleted empty folder: ${folder.name} (${folder.id})`);
          } catch (error: any) {
            console.error(`Failed to delete folder ${folder.id}:`, error.message);
          }
        }
      }

      console.log(`Purge complete. Deleted ${totalDeleted} files.`);

      // Also delete old Firestore documents
      const db = admin.firestore();
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

      const oldSubmissions = await db
        .collection('submissions')
        .where('submittedAt', '<', cutoffTimestamp)
        .get();

      const batch = db.batch();
      oldSubmissions.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Deleted ${oldSubmissions.size} old Firestore documents.`);

      return null;
    } catch (error: any) {
      console.error('Purge error:', error);
      throw error;
    }
  });
