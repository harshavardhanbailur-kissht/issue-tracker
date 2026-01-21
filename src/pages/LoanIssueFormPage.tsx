import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { createLoanIssueSubmission } from '@/lib/submissions';
import { validateTotalFileSize, formatFileSize, type UploadProgress } from '@/lib/driveUpload';
import type { LoanIssueFormData } from '@/types';

const ENTITY_OPTIONS = ['Applicant', 'Co-applicant'];

const ISSUE_TYPE_OPTIONS = [
  'Pan Issue (e.g., mapping error, verification failed, primary PAN available)',
  'Swapping (e.g., reassign applicant to co-applicant or vice versa)',
  'Wrong Details Updated by SM (e.g., phone no, income, property type wrong)',
  'System Issue UI (e.g., form not accessible, data not saving)',
  'Link Expired (e.g., Account Aggregator, IMD link)',
  'Relogin Request (e.g., fresh CIBIL pull needed)',
  'Old Case (e.g., reject to re-login with fresh data)',
  'Not Interested in Further Loan Process',
  'BT/Topup Case Error (e.g., wrong loan type selected)',
  'Other (free-text fallback)',
];

const SUB_ISSUES_MAP: Record<string, string[]> = {
  'Pan Issue (e.g., mapping error, verification failed, primary PAN available)': [
    'Mapping Error',
    'Verification Failed',
    'Primary PAN Available',
    'Duplicate PAN',
  ],
  'Wrong Details Updated by SM (e.g., phone no, income, property type wrong)': [
    'Phone No Wrong',
    'Income Wrong (Yes/No)',
    'Property Type Wrong',
    'Loan Type Wrong',
  ],
  'Link Expired (e.g., Account Aggregator, IMD link)': [
    'Account Aggregator',
    'IMD',
  ],
};

const ACTION_OPTIONS = [
  'Reject Lead (full or entity-specific)',
  'Reopen Task (e.g., KYC, Loan & Property Details, Income Details)',
  'Generate New Link (e.g., AA, IMD)',
  'Change Field (e.g., Income Yes/No, Program Type)',
  'Move to CPA Tray',
  'Resolve Mapping (e.g., provide full phone no)',
  'No Action (resolve as is)',
];

// Decision Tree Algorithm
function processLoanIssueDecisionTree(formData: LoanIssueFormData) {
  let recommendedAction = formData.actionRequested;
  let reason = '';
  const nextSteps: string[] = [];

  const issueType = formData.issueType;
  const subIssue = formData.subIssue || '';
  const notes = (formData.notes || '').toLowerCase();

  if (issueType.includes('Pan Issue')) {
    if (subIssue === 'Primary PAN Available' || notes.includes('primary')) {
      recommendedAction = 'Reject Lead (full or entity-specific)';
    } else {
      recommendedAction = 'Resolve Mapping (e.g., provide full phone no)';
    }
    reason = 'PAN verification or mapping failure detected. Common in data (e.g., primary PAN available).';
    nextSteps.push('Relogin with correct mobile no linked to PAN.');
    nextSteps.push('API Call: Check PAN mapping in database (e.g., query for full phone no).');
  } else if (issueType.includes('Swapping')) {
    recommendedAction = 'Reject Lead (full or entity-specific)';
    reason = 'Role swap required (applicant ↔ co-applicant). Frequent in data for adding to another lead.';
    nextSteps.push('Add entity to target lead as opposite of current entity.');
    nextSteps.push('API Call: Update LSQ opportunity with new structure.');
  } else if (issueType.includes('Wrong Details Updated by SM')) {
    recommendedAction = 'Reopen Task (e.g., KYC, Loan & Property Details, Income Details)';
    reason = 'SM error (e.g., wrong phone, income, property). Reopen affected task.';
    if (notes.includes('income')) {
      nextSteps.push('Change income Yes/No via backend update.');
    }
    nextSteps.push('API Call: Reopen specific task (e.g., Loan & Property Details).');
  } else if (issueType.includes('System Issue UI')) {
    if (notes.includes('resolved')) {
      recommendedAction = 'No Action (resolve as is)';
    } else {
      recommendedAction = 'Reject Lead (full or entity-specific)';
    }
    reason = 'UI error (e.g., form not accessible). Check for intermittent issues.';
    nextSteps.push('Instruct SM to clear cache/relogin.');
    nextSteps.push('Escalate to tech if persistent (log error screenshot).');
  } else if (issueType.includes('Link Expired')) {
    recommendedAction = 'Generate New Link (e.g., AA, IMD)';
    reason = 'AA/IMD link expired. Common timeout issue in data.';
    nextSteps.push('API Call: Regenerate link and send to user.');
  } else if (issueType.includes('Relogin Request') || issueType.includes('Old Case')) {
    recommendedAction = 'Reject Lead (full or entity-specific)';
    reason = 'Old/duplicate case; relogin for fresh CIBIL.';
    nextSteps.push('API Call: Pull fresh CIBIL report after reject.');
  } else if (issueType.includes('Not Interested')) {
    recommendedAction = 'Reject Lead (full or entity-specific)';
    reason = 'Customer disinterest.';
    nextSteps.push('Mark as closed in CRM.');
  } else if (issueType.includes('BT/Topup Case Error')) {
    recommendedAction = 'Reopen Task (e.g., KYC, Loan & Property Details, Income Details)';
    reason = 'Wrong loan type (BT/Topup vs. fresh).';
    nextSteps.push('Update loan type and resubmit.');
  } else {
    // "Other"
    recommendedAction = 'Manual Review';
    reason = 'Unclassified issue.';
    nextSteps.push('Escalate to support team.');
  }

  // Override check for audit
  if (formData.actionRequested !== recommendedAction) {
    reason += ` (Overridden from requested: ${formData.actionRequested})`;
  }

  return {
    recommendedAction,
    reason,
    nextSteps,
  };
}

export default function LoanIssueFormPage() {
  const { role } = useSimpleAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<LoanIssueFormData>({
    entity: '',
    issueType: '',
    subIssue: '',
    actionRequested: '',
    opportunityId: '',
    lsqUrl: '',
    date: new Date().toISOString().split('T')[0],
    name: '',
    notes: '',
    attachmentFiles: [],
  });

  const [showSubIssue, setShowSubIssue] = useState(false);
  const [attachmentPreviews, setAttachmentPreviews] = useState<Map<string, string>>(new Map());
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [success, setSuccess] = useState<{ submissionId: string; decisionResult: any } | null>(null);

  // Update sub-issue visibility when issue type changes
  useEffect(() => {
    const issueType = formData.issueType;
    if (issueType && SUB_ISSUES_MAP[issueType] && SUB_ISSUES_MAP[issueType].length > 0) {
      setShowSubIssue(true);
    } else {
      setShowSubIssue(false);
      setFormData(prev => ({ ...prev, subIssue: '' }));
    }
  }, [formData.issueType]);

  // Ensure date is always set to current date on mount
  useEffect(() => {
    const currentDate = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, date: currentDate }));
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    // Prevent date field from being changed
    if (name === 'date') {
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const processFiles = (newFiles: File[]) => {
    setFileSizeWarning(null);

    // Combine existing files with new files
    const allFiles = [...(formData.attachmentFiles || []), ...newFiles];

    // Validate total file size (100 MB warning, 200 MB limit)
    const validation = validateTotalFileSize(allFiles);

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

    // Add new files to form data
    setFormData(prev => ({ 
      ...prev, 
      attachmentFiles: allFiles 
    }));

    // Create previews for new files
    const newPreviews = new Map(attachmentPreviews);
    newFiles.forEach(file => {
      const fileId = `${file.name}-${file.size}-${file.lastModified}`;
      newPreviews.set(fileId, URL.createObjectURL(file));
    });
    setAttachmentPreviews(newPreviews);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input to allow selecting same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const handlePaste = async (e: Event) => {
      const clipboardEvent = e as ClipboardEvent;

      const items = clipboardEvent.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.type.indexOf('image') !== -1) {
          clipboardEvent.preventDefault();
          
          const blob = item.getAsFile();
          if (!blob) return;

          const file = new File(
            [blob],
            `screenshot-${Date.now()}.png`,
            { type: blob.type || 'image/png' }
          );

          toast.success('📸 Screenshot pasted!');
          processFiles([file]);
          return;
        }
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  const removeAttachment = (fileToRemove: File) => {
    const fileId = `${fileToRemove.name}-${fileToRemove.size}-${fileToRemove.lastModified}`;
    
    // Remove file from form data
    setFormData(prev => ({
      ...prev,
      attachmentFiles: (prev.attachmentFiles || []).filter(f => f !== fileToRemove)
    }));

    // Revoke preview URL and remove from map
    const previewUrl = attachmentPreviews.get(fileId);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const newPreviews = new Map(attachmentPreviews);
    newPreviews.delete(fileId);
    setAttachmentPreviews(newPreviews);

    // Revalidate total size
    const remainingFiles = (formData.attachmentFiles || []).filter(f => f !== fileToRemove);
    if (remainingFiles.length === 0) {
      setFileSizeWarning(null);
    } else {
      const validation = validateTotalFileSize(remainingFiles);
      if (validation.warning) {
        setFileSizeWarning(validation.message!);
      } else {
        setFileSizeWarning(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.entity) {
      toast.error('Please select an entity');
      return;
    }

    if (!formData.issueType) {
      toast.error('Please select an issue type');
      return;
    }

    if (showSubIssue && !formData.subIssue) {
      toast.error('Please select a sub-issue');
      return;
    }

    if (!formData.actionRequested) {
      toast.error('Please select an action requested');
      return;
    }

    // Validate Opportunity ID format: IDEP[A-Z0-9]+
    const oppIdPattern = /^IDEP[A-Z0-9]+$/i;
    if (!oppIdPattern.test(formData.opportunityId)) {
      toast.error('Opportunity ID must be in format IDEP followed by letters/numbers');
      return;
    }

    if (!formData.lsqUrl.trim()) {
      toast.error('Please provide LSQ URL');
      return;
    }

    if (!formData.date) {
      toast.error('Please select a date');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please provide Applicant/Co-Applicant Name');
      return;
    }

    if (formData.issueType.includes('Other') && !formData.notes?.trim()) {
      toast.error('Notes are required for "Other" issue type');
      return;
    }

    if (!role) {
      toast.error('You must be logged in');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(null);

    try {
      // Ensure date is current at submission time
      const currentDate = new Date().toISOString().split('T')[0];
      const submissionData = { ...formData, date: currentDate };
      
      // Process decision tree
      const decisionResult = processLoanIssueDecisionTree(submissionData);

      // Create submission
      const submissionId = await createLoanIssueSubmission(
        submissionData,
        role,
        decisionResult,
        (progress) => setUploadProgress(progress)
      );

      setSuccess({ submissionId, decisionResult });
      toast.success(`Submission ${submissionId} created successfully!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create submission');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleSubmitAnother = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    setFormData({
      entity: '',
      issueType: '',
      subIssue: '',
      actionRequested: '',
      opportunityId: '',
      lsqUrl: '',
      date: currentDate,
      name: '',
      notes: '',
      attachmentFiles: [],
    });
    // Revoke all preview URLs
    attachmentPreviews.forEach(url => URL.revokeObjectURL(url));
    setAttachmentPreviews(new Map());
    setFileSizeWarning(null);
    setSuccess(null);
    setShowSubIssue(false);
  };

  // Success state
  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Successful! 🎉</h2>
          <p className="text-gray-600 mb-6">Your submission has been logged with ID:</p>
          
          <div className="py-4 px-6 rounded-xl bg-gray-50 border-2 border-gray-200 mb-6">
            <p className="text-3xl font-mono font-bold text-blue-600">{success.submissionId}</p>
          </div>

          {/* Decision Tree Results */}
          <div className="bg-blue-50 rounded-xl p-6 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">Decision Tree Analysis:</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Recommended Action: </span>
                <span className="text-gray-900">{success.decisionResult.recommendedAction}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Reason: </span>
                <span className="text-gray-900">{success.decisionResult.reason}</span>
              </div>
              {success.decisionResult.nextSteps.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Next Steps: </span>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-gray-900">
                    {success.decisionResult.nextSteps.map((step: string, idx: number) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Loan Issue Form</h1>
        <p className="text-gray-600">Submit loan issue details for processing</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Entity */}
          <div>
            <label htmlFor="entity" className="block text-sm font-medium text-gray-700 mb-2">
              Entity <span className="text-red-500">*</span>
            </label>
            <select
              id="entity"
              name="entity"
              value={formData.entity}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Choose an option</option>
              {ENTITY_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Issue Type */}
          <div>
            <label htmlFor="issueType" className="block text-sm font-medium text-gray-700 mb-2">
              Issue Type <span className="text-red-500">*</span>
            </label>
            <select
              id="issueType"
              name="issueType"
              value={formData.issueType}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Choose an option</option>
              {ISSUE_TYPE_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Sub-Issue (Conditional) */}
          {showSubIssue && (
            <div>
              <label htmlFor="subIssue" className="block text-sm font-medium text-gray-700 mb-2">
                Sub-Issue <span className="text-red-500">*</span>
              </label>
              <select
                id="subIssue"
                name="subIssue"
                value={formData.subIssue}
                onChange={handleInputChange}
                required={showSubIssue}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Choose an option</option>
                {SUB_ISSUES_MAP[formData.issueType]?.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          )}

          {/* Action Requested */}
          <div>
            <label htmlFor="actionRequested" className="block text-sm font-medium text-gray-700 mb-2">
              Action Requested <span className="text-red-500">*</span>
            </label>
            <select
              id="actionRequested"
              name="actionRequested"
              value={formData.actionRequested}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Choose an option</option>
              {ACTION_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Opportunity ID */}
          <div>
            <label htmlFor="opportunityId" className="block text-sm font-medium text-gray-700 mb-2">
              Opportunity ID <span className="text-red-500">*</span>
            </label>
            <input
              id="opportunityId"
              name="opportunityId"
              type="text"
              value={formData.opportunityId}
              onChange={handleInputChange}
              required
              pattern="IDEP[A-Z0-9]+"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
              placeholder="IDEP123456"
            />
            <p className="mt-1 text-xs text-gray-500">Format: IDEP followed by letters/numbers</p>
          </div>

          {/* LSQ URL */}
          <div>
            <label htmlFor="lsqUrl" className="block text-sm font-medium text-gray-700 mb-2">
              LSQ URL <span className="text-red-500">*</span>
            </label>
            <input
              id="lsqUrl"
              name="lsqUrl"
              type="url"
              value={formData.lsqUrl}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="https://..."
            />
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              id="date"
              name="date"
              type="date"
              value={formData.date}
              readOnly
              disabled
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">Current date (automatically set)</p>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Applicant/Co-Applicant Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Enter name"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes {formData.issueType.includes('Other') && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              required={formData.issueType.includes('Other')}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            
            {/* File List */}
            {formData.attachmentFiles && formData.attachmentFiles.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.attachmentFiles.map((file) => {
                  const fileId = `${file.name}-${file.size}-${file.lastModified}`;
                  const previewUrl = attachmentPreviews.get(fileId);
                  const isImage = file.type.startsWith('image/');
                  const isVideo = file.type.startsWith('video/');
                  
                  return (
                    <div key={fileId} className="relative p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {isImage && <span className="text-xl">📄</span>}
                            {isVideo && <span className="text-xl">🎥</span>}
                            {!isImage && !isVideo && <span className="text-xl">📎</span>}
                            <p className="text-sm text-gray-700 font-medium truncate">{file.name}</p>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          {previewUrl && isImage && (
                            <img
                              src={previewUrl}
                              alt={file.name}
                              className="max-h-32 rounded-lg"
                            />
                          )}
                          {previewUrl && isVideo && (
                            <video
                              src={previewUrl}
                              controls
                              className="max-h-32 rounded-lg w-full"
                            >
                              Your browser does not support video playback.
                            </video>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(file)}
                          className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {/* Total Size and Warning */}
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Total Size:</span>
                    <span className="text-sm text-gray-600">
                      {formatFileSize(
                        formData.attachmentFiles.reduce((sum, f) => sum + f.size, 0)
                      )} / 200 MB
                    </span>
                  </div>
                  {fileSizeWarning && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 flex items-center gap-1">
                        <span>⚠️</span> {fileSizeWarning}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600">
                Click to upload multiple files, drag and drop, or paste (Ctrl/Cmd+V)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Images, Videos, PDFs - Total limit: 200MB (warning at 100MB)
              </p>
              <p className="text-xs text-blue-600 mt-1 font-medium">
                💡 Tip: Take a screenshot and paste it here (Ctrl+V / Cmd+V)
              </p>
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Uploading file...</span>
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (uploadProgress ? 'Uploading...' : 'Submitting...') : 'Submit & Process'}
          </button>
        </form>
      </div>
    </div>
  );
}
