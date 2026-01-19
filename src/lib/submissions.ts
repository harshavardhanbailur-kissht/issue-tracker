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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
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
 * Upload attachment to Firebase Storage
 */
async function uploadAttachment(file: File, submissionId: string): Promise<string> {
  const extension = file.name.split('.').pop() || 'bin';
  const filename = `${Date.now()}.${extension}`;
  const storageRef = ref(storage, `submissions/${submissionId}/${filename}`);
  
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Create a new submission
 */
export async function createSubmission(
  data: SubmissionFormData,
  role: UserRole
): Promise<string> {
  // Generate submission ID
  const submissionId = await generateSubmissionId();
  
  // Upload attachment if provided
  let attachmentUrl: string | undefined;
  if (data.attachmentFile) {
    attachmentUrl = await uploadAttachment(data.attachmentFile, submissionId);
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
    comments: data.comments,
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
