# Architecture Guide: Firebase Storage & Serverless Setup

## Overview

This project uses **Firebase** (Google's serverless platform) which includes:
- **Firebase Storage**: Built on Google Cloud Storage (similar to Google Drive but optimized for apps)
- **Firestore**: Serverless NoSQL database
- **Firebase Hosting**: Static website hosting

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                        │
│                  (React + TypeScript)                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTPS Requests
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│  Firebase        │          │  Firebase        │
│  Storage         │          │  Firestore       │
│  (File Storage)  │          │  (Database)      │
└──────────────────┘          └──────────────────┘
        │                               │
        │                               │
        └───────────────┬───────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Google Cloud     │
              │  Infrastructure   │
              └──────────────────┘
```

## How It Works: Complete Flow

### 1. File Upload Flow (Firebase Storage)

```
User selects file
    ↓
File stored in browser memory (File object)
    ↓
createSubmission() called
    ↓
uploadAttachment() function:
    - Creates storage reference: submissions/{submissionId}/{filename}
    - Uploads file bytes to Firebase Storage
    - Gets download URL
    ↓
File stored in Google Cloud Storage bucket
    ↓
Download URL saved in Firestore document
```

**Code Flow:**

```typescript
// 1. User selects file in browser
<input type="file" onChange={handleFileChange} />
// File object stored in React state

// 2. On form submit, file is uploaded
const attachmentUrl = await uploadAttachment(file, submissionId);

// 3. uploadAttachment function (in lib/submissions.ts)
async function uploadAttachment(file: File, submissionId: string): Promise<string> {
  // Create a reference to the storage location
  const storageRef = ref(storage, `submissions/${submissionId}/${filename}`);
  
  // Upload the file bytes
  await uploadBytes(storageRef, file);
  
  // Get the public URL
  return getDownloadURL(storageRef);
}
```

### 2. Database Storage Flow (Firestore)

```
Form data collected
    ↓
Generate unique ID (SUB-0001)
    ↓
Create Firestore document:
    - Collection: "submissions"
    - Document ID: "SUB-0001"
    - Fields: actionable, lsqLink, urn, etc.
    ↓
Document saved to Firestore
    ↓
Real-time listeners notified
    ↓
UI updates automatically
```

**Code Flow:**

```typescript
// 1. Generate ID using transaction (prevents duplicates)
const submissionId = await generateSubmissionId();
// Uses Firestore transaction to atomically increment counter

// 2. Create document
const docRef = doc(db, 'submissions', submissionId);
await setDoc(docRef, submissionData);

// 3. Real-time subscription
subscribeToSubmissions((submissions) => {
  // This callback fires whenever submissions change
  setSubmissions(submissions);
});
```

## Key Components Explained

### Firebase Storage (File Storage)

**What it is:**
- Google Cloud Storage bucket managed by Firebase
- Stores files (images, PDFs, documents)
- Provides secure URLs for file access
- Handles file uploads/downloads

**Storage Structure:**
```
your-bucket.appspot.com/
  └── submissions/
      ├── SUB-0001/
      │   └── 1234567890.pdf
      ├── SUB-0002/
      │   └── 1234567891.jpg
      └── SUB-0003/
          └── 1234567892.png
```

**Security Rules:**
```javascript
// storage.rules
match /submissions/{submissionId}/{allPaths=**} {
  allow read, write: if true;  // For now, allow all
  // In production, add authentication checks
}
```

### Firestore (Serverless Database)

**What it is:**
- NoSQL document database
- Real-time synchronization
- Automatic scaling
- No server management needed

**Database Structure:**
```
Firestore Database
├── submissions (collection)
│   ├── SUB-0001 (document)
│   │   ├── id: "SUB-0001"
│   │   ├── actionable: "Follow up required"
│   │   ├── lsqLink: "https://..."
│   │   ├── attachmentUrl: "https://storage.googleapis.com/..."
│   │   ├── submittedBy: "product_support"
│   │   └── submittedAt: Timestamp
│   ├── SUB-0002 (document)
│   └── SUB-0003 (document)
└── counters (collection)
    └── SUBMISSION_COUNTER (document)
        └── value: 3
```

**Security Rules:**
```javascript
// firestore.rules
match /submissions/{submissionId} {
  allow read, create: if true;  // Allow all for now
  allow update, delete: if false; // No updates/deletes
}
```

## Complete Setup Process

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: "issue-tracker"
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Firebase Services

#### Enable Firestore Database:
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Start in **production mode** (we'll add rules later)
4. Choose location (e.g., `us-central`)
5. Click "Enable"

#### Enable Storage:
1. Go to "Storage"
2. Click "Get started"
3. Start in **production mode**
4. Use same location as Firestore
5. Click "Done"

### Step 3: Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll to "Your apps"
3. Click Web icon (`</>`)
4. Register app: "issue-tracker-web"
5. Copy the config object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "issue-tracker.firebaseapp.com",
  projectId: "issue-tracker",
  storageBucket: "issue-tracker.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 4: Configure Environment Variables

Create `.env` file in project root:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=issue-tracker.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=issue-tracker
VITE_FIREBASE_STORAGE_BUCKET=issue-tracker.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 5: Deploy Security Rules

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project
firebase init

# Deploy rules
firebase deploy --only firestore:rules,storage
```

### Step 6: Initialize Firebase in Code

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

## Detailed Logic Flow

### Submission Creation Flow

```typescript
// 1. User fills form and clicks submit
handleSubmit() {
  // 2. Validate form data
  if (!formData.actionable) return;
  
  // 3. Call createSubmission
  const submissionId = await createSubmission(formData, role);
}

// 4. createSubmission function
async function createSubmission(data, role) {
  // 4a. Generate unique ID
  const submissionId = await generateSubmissionId();
  // Uses Firestore transaction to increment counter atomically
  
  // 4b. Upload file if exists
  let attachmentUrl;
  if (data.attachmentFile) {
    attachmentUrl = await uploadAttachment(
      data.attachmentFile, 
      submissionId
    );
    // File uploaded to Firebase Storage
    // Returns public URL
  }
  
  // 4c. Create Firestore document
  const docRef = doc(db, 'submissions', submissionId);
  await setDoc(docRef, {
    id: submissionId,
    actionable: data.actionable,
    lsqLink: data.lsqLink,
    urn: data.urn,
    attachmentUrl: attachmentUrl,
    submittedBy: role,
    submittedAt: serverTimestamp(),
  });
  
  // 4d. Return ID
  return submissionId;
}
```

### ID Generation Logic

```typescript
async function generateSubmissionId(): Promise<string> {
  const counterRef = doc(db, 'counters', 'SUBMISSION_COUNTER');
  
  // Use transaction to prevent race conditions
  return await runTransaction(db, async (transaction) => {
    // Read current counter value
    const counterDoc = await transaction.get(counterRef);
    let currentValue = 0;
    
    if (counterDoc.exists()) {
      currentValue = counterDoc.data().value || 0;
    }
    
    // Increment
    const nextValue = currentValue + 1;
    
    // Write new value
    transaction.set(counterRef, { value: nextValue });
    
    // Return formatted ID
    return `SUB-${String(nextValue).padStart(4, '0')}`;
  });
}
```

**Why use transactions?**
- Prevents duplicate IDs if multiple users submit simultaneously
- Atomic operation (all-or-nothing)
- Ensures counter is always accurate

### Real-time Updates Logic

```typescript
// Subscribe to submissions collection
export function subscribeToSubmissions(callback) {
  const q = query(
    collection(db, 'submissions'),
    orderBy('submittedAt', 'desc')
  );
  
  // onSnapshot listens for changes
  return onSnapshot(q, (snapshot) => {
    // This fires whenever:
    // - New document added
    // - Document updated
    // - Document deleted
    // - Initial load
    
    const submissions = snapshot.docs.map(doc => doc.data());
    callback(submissions); // Update UI
  });
}

// Usage in component
useEffect(() => {
  const unsubscribe = subscribeToSubmissions((submissions) => {
    setSubmissions(submissions); // React state update
  });
  
  return () => unsubscribe(); // Cleanup on unmount
}, []);
```

## File Upload Detailed Logic

### Step-by-Step File Upload

```typescript
// 1. User selects file
const handleFileChange = (e) => {
  const file = e.target.files[0];
  // File object contains:
  // - name: "document.pdf"
  // - size: 1024000 (bytes)
  // - type: "application/pdf"
  // - data: Blob (binary data)
  
  setFormData({ ...formData, attachmentFile: file });
};

// 2. On form submit
const attachmentUrl = await uploadAttachment(file, submissionId);

// 3. uploadAttachment function
async function uploadAttachment(file: File, submissionId: string) {
  // 3a. Generate unique filename
  const extension = file.name.split('.').pop() || 'bin';
  const filename = `${Date.now()}.${extension}`;
  // Example: "1703123456789.pdf"
  
  // 3b. Create storage reference
  const storageRef = ref(storage, `submissions/${submissionId}/${filename}`);
  // Path: submissions/SUB-0001/1703123456789.pdf
  
  // 3c. Upload file bytes
  await uploadBytes(storageRef, file);
  // This uploads the actual file to Google Cloud Storage
  // Firebase handles:
  // - Network retries
  // - Progress tracking
  // - Error handling
  
  // 3d. Get public download URL
  const downloadUrl = await getDownloadURL(storageRef);
  // Returns: "https://firebasestorage.googleapis.com/v0/b/..."
  
  return downloadUrl;
}
```

### Storage Path Structure

```
Firebase Storage Bucket
│
└── submissions/
    ├── SUB-0001/
    │   ├── 1703123456789.pdf
    │   └── metadata (handled by Firebase)
    ├── SUB-0002/
    │   └── 1703123457890.jpg
    └── SUB-0003/
        └── 1703123458901.png
```

**Benefits:**
- Organized by submission ID
- Easy to find files for a specific submission
- Can delete entire folder if submission deleted
- Clear structure for maintenance

## Database Query Logic

### Fetching All Submissions

```typescript
async function getAllSubmissions(): Promise<Submission[]> {
  // 1. Create query
  const q = query(
    collection(db, 'submissions'),        // Collection name
    orderBy('submittedAt', 'desc')        // Order by date (newest first)
  );
  
  // 2. Execute query
  const snapshot = await getDocs(q);
  // Returns QuerySnapshot with all matching documents
  
  // 3. Transform to array
  return snapshot.docs.map(doc => doc.data() as Submission);
  // Each doc has:
  // - id: document ID
  // - data(): document fields
}
```

### Fetching Single Submission

```typescript
async function getSubmissionById(submissionId: string) {
  // 1. Create document reference
  const docRef = doc(db, 'submissions', submissionId.toUpperCase());
  // Path: submissions/SUB-0001
  
  // 2. Get document
  const docSnap = await getDoc(docRef);
  
  // 3. Check if exists
  if (!docSnap.exists()) {
    return null;
  }
  
  // 4. Return data
  return docSnap.data() as Submission;
}
```

## Serverless Architecture Benefits

### Why Serverless?

1. **No Server Management**
   - No need to set up, configure, or maintain servers
   - Google handles all infrastructure

2. **Automatic Scaling**
   - Handles 1 user or 1 million users
   - No capacity planning needed

3. **Pay-as-you-go**
   - Only pay for what you use
   - Free tier available

4. **Real-time Updates**
   - Built-in real-time synchronization
   - No polling needed

5. **Global CDN**
   - Files served from edge locations
   - Fast access worldwide

### Cost Structure

**Firestore:**
- Free tier: 50K reads/day, 20K writes/day
- Paid: $0.06 per 100K reads, $0.18 per 100K writes

**Storage:**
- Free tier: 5GB storage, 1GB/day downloads
- Paid: $0.026/GB storage, $0.12/GB downloads

**Hosting:**
- Free tier: 10GB storage, 360MB/day transfer
- Paid: $0.026/GB storage, $0.15/GB transfer

## Replication Steps

### To Replicate This Setup:

1. **Create New Firebase Project**
   ```bash
   # Go to Firebase Console
   # Create new project
   # Enable Firestore and Storage
   ```

2. **Copy Configuration Files**
   ```bash
   # Copy these files from this project:
   - firebase.json
   - firestore.rules
   - storage.rules
   - src/lib/firebase.ts
   ```

3. **Update Environment Variables**
   ```bash
   # Create .env with your Firebase config
   ```

4. **Install Dependencies**
   ```bash
   npm install firebase react react-dom react-router-dom
   ```

5. **Deploy Rules**
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

6. **Test Upload**
   ```typescript
   // Test file upload
   const file = new File(['test'], 'test.txt');
   const url = await uploadAttachment(file, 'TEST-0001');
   console.log('Upload URL:', url);
   ```

## Security Considerations

### Current Setup (Development)
- Rules allow all reads/writes
- No authentication required
- Suitable for internal/testing use

### Production Setup (Recommended)
```javascript
// firestore.rules
match /submissions/{submissionId} {
  // Only authenticated users can create
  allow create: if request.auth != null;
  
  // Only authenticated users can read
  allow read: if request.auth != null;
  
  // No updates/deletes
  allow update, delete: if false;
}

// storage.rules
match /submissions/{submissionId}/{allPaths=**} {
  // Only authenticated users
  allow read, write: if request.auth != null;
}
```

Then add Firebase Authentication:
```typescript
import { getAuth, signInAnonymously } from 'firebase/auth';

// Sign in anonymously to satisfy rules
const auth = getAuth();
await signInAnonymously(auth);
```

## Troubleshooting

### Common Issues

1. **File upload fails**
   - Check storage rules
   - Verify file size limits
   - Check network connection

2. **Database read fails**
   - Check Firestore rules
   - Verify collection name
   - Check Firebase config

3. **Real-time updates not working**
   - Verify onSnapshot is called
   - Check for unsubscribe calls
   - Verify query is correct

### Debug Tips

```typescript
// Enable Firestore logging
import { enableIndexedDbPersistence } from 'firebase/firestore';
enableIndexedDbPersistence(db);

// Check storage upload progress
uploadBytes(storageRef, file).then((snapshot) => {
  console.log('Upload complete:', snapshot);
});
```

## Summary

This architecture uses:
- **Firebase Storage** (Google Cloud Storage) for files
- **Firestore** (NoSQL database) for structured data
- **Real-time listeners** for live updates
- **Transactions** for atomic operations
- **Serverless** - no backend code needed

All data flows through Firebase's infrastructure, which is:
- Scalable
- Reliable
- Secure
- Cost-effective

The entire backend is handled by Firebase - you only write frontend code!
