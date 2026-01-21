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
import { uploadFileToDrive, type UploadProgress } from './driveUpload';
import type { Submission, SubmissionFormData, LoanIssueFormData, UserRole, Attachment } from '@/types';

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
  
  // Upload attachments to Google Drive if provided
  let attachmentUrl: string | undefined;
  let attachmentDriveId: string | undefined;
  let attachments: Attachment[] | undefined;
  
  // Handle multiple files (new) or single file (backward compatibility)
  const filesToUpload = data.attachmentFiles || (data.attachmentFile ? [data.attachmentFile] : []);
  
  if (filesToUpload.length > 0) {
    attachments = [];
    
    // Upload all files sequentially
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      
      // Calculate progress for this file
      const fileProgress = onUploadProgress ? (progress: UploadProgress) => {
        // Calculate overall progress across all files
        const totalSize = filesToUpload.reduce((sum, f) => sum + f.size, 0);
        const uploadedSoFar = filesToUpload.slice(0, i).reduce((sum, f) => sum + f.size, 0);
        const currentFileProgress = (uploadedSoFar + progress.loaded) / totalSize;
        
        onUploadProgress({
          loaded: uploadedSoFar + progress.loaded,
          total: totalSize,
          percentage: Math.round(currentFileProgress * 100),
        });
      } : undefined;
      
      const uploadResult = await uploadFileToDrive(
        file,
        submissionId,
        fileProgress
      );
      
      attachments.push({
        url: uploadResult.shareableUrl,
        driveId: uploadResult.fileId,
        fileName: file.name,
        fileSize: file.size,
      });
      
      // Set first file as legacy fields for backward compatibility
      if (i === 0) {
        attachmentUrl = uploadResult.shareableUrl;
        attachmentDriveId = uploadResult.fileId;
      }
    }
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
    ...(attachmentUrl && { attachmentUrl }),
    ...(attachmentDriveId && { attachmentDriveId }),
    ...(attachments && attachments.length > 0 && { attachments }),
    ...(data.comments && { comments: data.comments }),
    submittedBy: role,
    createdAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
  };
  
  const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  await setDoc(docRef, submissionData);
  
  return submissionId;
}

/**
 * Create a new loan issue submission with Google Drive upload
 */
export async function createLoanIssueSubmission(
  data: LoanIssueFormData,
  role: UserRole,
  decisionResult: { recommendedAction: string; reason: string; nextSteps: string[] },
  onUploadProgress?: (progress: UploadProgress) => void
): Promise<string> {
  // Generate submission ID first (needed for folder name)
  const submissionId = await generateSubmissionId();
  
  // Upload attachments to Google Drive if provided
  let attachmentUrl: string | undefined;
  let attachmentDriveId: string | undefined;
  let attachments: Attachment[] | undefined;
  
  // Handle multiple files (new) or single file (backward compatibility)
  const filesToUpload = data.attachmentFiles || (data.attachmentFile ? [data.attachmentFile] : []);
  
  if (filesToUpload.length > 0) {
    attachments = [];
    
    // Upload all files sequentially
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      
      // Calculate progress for this file
      const fileProgress = onUploadProgress ? (progress: UploadProgress) => {
        // Calculate overall progress across all files
        const totalSize = filesToUpload.reduce((sum, f) => sum + f.size, 0);
        const uploadedSoFar = filesToUpload.slice(0, i).reduce((sum, f) => sum + f.size, 0);
        const currentFileProgress = (uploadedSoFar + progress.loaded) / totalSize;
        
        onUploadProgress({
          loaded: uploadedSoFar + progress.loaded,
          total: totalSize,
          percentage: Math.round(currentFileProgress * 100),
        });
      } : undefined;
      
      const uploadResult = await uploadFileToDrive(
        file,
        submissionId,
        fileProgress
      );
      
      attachments.push({
        url: uploadResult.shareableUrl,
        driveId: uploadResult.fileId,
        fileName: file.name,
        fileSize: file.size,
      });
      
      // Set first file as legacy fields for backward compatibility
      if (i === 0) {
        attachmentUrl = uploadResult.shareableUrl;
        attachmentDriveId = uploadResult.fileId;
      }
    }
  }
  
  // Create submission document with loan issue form data
  const submissionData: Omit<Submission, 'createdAt' | 'submittedAt'> & { 
    createdAt: ReturnType<typeof serverTimestamp>;
    submittedAt: ReturnType<typeof serverTimestamp>;
  } = {
    id: submissionId,
    formType: 'loan_issue',
    actionable: data.issueType, // Set actionable to issueType for display in list
    entity: data.entity,
    issueType: data.issueType,
    subIssue: data.subIssue,
    actionRequested: data.actionRequested,
    opportunityId: data.opportunityId,
    lsqLink: data.lsqUrl,
    urn: data.opportunityId, // Using opportunity ID as URN for loan issue forms
    name: data.name,
    date: data.date,
    detailedActionable: data.notes || '', // Using notes as detailed actionable
    ...(attachmentUrl && { attachmentUrl }),
    ...(attachmentDriveId && { attachmentDriveId }),
    ...(attachments && attachments.length > 0 && { attachments }),
    ...(data.notes && { comments: data.notes }),
    recommendedAction: decisionResult.recommendedAction,
    reason: decisionResult.reason,
    nextSteps: decisionResult.nextSteps,
    submittedBy: role,
    createdAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
  };
  
  const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  await setDoc(docRef, submissionData);
  
  return submissionId;
}

/**
 * Get submission by ID
 */
export async function getSubmissionById(submissionId: string): Promise<Submission | null> {
  const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId.toUpperCase());
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docSnap.data() as Submission;
}

/**
 * Get all submissions
 */
export async function getAllSubmissions(): Promise<Submission[]> {
  const q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    orderBy('submittedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => doc.data() as Submission);
}

/**
 * Subscribe to submissions (real-time updates)
 */
export function subscribeToSubmissions(
  callback: (submissions: Submission[]) => void
): () => void {
  const q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    orderBy('submittedAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const submissions = snapshot.docs.map(doc => doc.data() as Submission);
    callback(submissions);
  });
}
