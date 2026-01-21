import { google } from 'googleapis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS headers
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '3600');
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

// Initialize Google Drive client
async function getDriveClient() {
  // Load service account credentials from environment variable
  const serviceAccountJson = process.env.SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error('SERVICE_ACCOUNT_KEY environment variable not set');
  }

  const credentials = JSON.parse(serviceAccountJson);
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable not set');
  }

  // Create auth client
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  // Authorize the client
  await auth.authorize();

  // Create Drive client
  return {
    drive: google.drive({ version: 'v3', auth }),
    folderId,
  };
}

// Get or create folder in Google Drive
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).end();
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

    const { drive, folderId } = await getDriveClient();

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
}
