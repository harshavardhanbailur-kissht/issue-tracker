import { Timestamp } from 'firebase/firestore';

export type UserRole = 'product_support' | 'tech_support_team' | 'sm';

export interface Attachment {
  url: string; // Google Drive shareable URL
  driveId: string; // Google Drive file ID
  fileName: string; // Original file name
  fileSize: number; // File size in bytes
}

export interface Submission {
  id: string; // SUB-0001 format
  actionable: string; // Selected from dropdown
  detailedActionable: string; // Text description
  lsqLink: string; // URL
  urn: string; // Applicant/Co-Applicant URN
  attachmentUrl?: string; // DEPRECATED: Google Drive shareable URL (kept for backward compatibility)
  attachmentDriveId?: string; // DEPRECATED: Google Drive file ID (kept for backward compatibility)
  attachments?: Attachment[]; // Array of attachments (multiple files support)
  comments?: string; // Optional remarks
  submittedBy: UserRole;
  submittedAt: Timestamp;
  createdAt: Timestamp;
  // Loan Issue Form specific fields
  formType?: 'standard' | 'loan_issue'; // Distinguish form types
  entity?: string; // Applicant or Co-applicant
  issueType?: string; // Issue type from loan issue form
  subIssue?: string; // Sub-issue (conditional)
  actionRequested?: string; // Action requested
  opportunityId?: string; // Opportunity ID (IDEP format)
  name?: string; // Applicant/Co-Applicant Name
  date?: string; // Date field
  recommendedAction?: string; // Decision tree result
  reason?: string; // Decision tree reason
  nextSteps?: string[]; // Decision tree next steps
}

export interface SubmissionFormData {
  actionable: string;
  detailedActionable: string;
  lsqLink: string;
  urn: string;
  attachmentFile?: File; // DEPRECATED: Single file (kept for backward compatibility)
  attachmentFiles?: File[]; // Multiple files support
  comments?: string;
}

export interface LoanIssueFormData {
  entity: string; // Applicant or Co-applicant
  issueType: string;
  subIssue?: string;
  actionRequested: string;
  opportunityId: string; // IDEP[A-Z0-9]+ format
  lsqUrl: string; // URL
  date: string; // Date
  name: string; // Applicant/Co-Applicant Name
  notes?: string; // Additional Notes
  attachmentFile?: File; // DEPRECATED: Single file (kept for backward compatibility)
  attachmentFiles?: File[]; // Multiple files support
}
