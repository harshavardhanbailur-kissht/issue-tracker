import { Timestamp } from 'firebase/firestore';

export type UserRole = 'sales_manager' | 'product_support';

export interface Submission {
  id: string; // SUB-0001 format
  actionable: string; // Selected from dropdown
  detailedActionable: string; // Text description
  lsqLink: string; // URL
  urn: string; // Applicant/Co-Applicant URN
  attachmentUrl?: string; // Firebase Storage URL
  comments?: string; // Optional remarks
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
