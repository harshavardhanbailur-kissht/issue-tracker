import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { getSubmissionById } from '@/lib/submissions';
import type { Submission } from '@/types';

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSubmission = async () => {
      if (!id) {
        setError('Invalid submission ID');
        setLoading(false);
        return;
      }

      try {
        const data = await getSubmissionById(id);
        if (data) {
          setSubmission(data);
        } else {
          setError('Submission not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load submission');
      } finally {
        setLoading(false);
      }
    };

    loadSubmission();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
        <p className="text-gray-500 mb-6">{error || 'Submission not found'}</p>
        <Link
          to="/submissions"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to List
        </Link>
      </div>
    );
  }

  const submittedAt = submission.submittedAt?.toDate 
    ? submission.submittedAt.toDate() 
    : new Date(submission.submittedAt as unknown as string);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            to="/submissions"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to List
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Submission Details</h1>
        </div>
        <div className="px-4 py-2 bg-blue-100 rounded-lg">
          <span className="font-mono font-semibold text-blue-700">{submission.id}</span>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
        {/* Submission Info */}
        <div className="grid grid-cols-2 gap-4 pb-6 border-b border-gray-200">
          <div>
            <label className="text-sm font-medium text-gray-500">Submitted By</label>
            <p className="mt-1 text-sm text-gray-900 capitalize">
              {submission.submittedBy.replace(/_/g, ' ')}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Submitted At</label>
            <p className="mt-1 text-sm text-gray-900">
              {format(submittedAt, 'PPpp')}
            </p>
          </div>
        </div>

        {/* Form Type Indicator */}
        {submission.formType === 'loan_issue' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">📋 Loan Issue Form Submission</p>
          </div>
        )}

        {/* Loan Issue Form Fields */}
        {submission.formType === 'loan_issue' ? (
          <>
            {/* Entity */}
            {submission.entity && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entity</label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900">{submission.entity}</p>
                </div>
              </div>
            )}

            {/* Issue Type */}
            {submission.issueType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Issue Type</label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900">{submission.issueType}</p>
                </div>
              </div>
            )}

            {/* Sub-Issue */}
            {submission.subIssue && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sub-Issue</label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900">{submission.subIssue}</p>
                </div>
              </div>
            )}

            {/* Action Requested */}
            {submission.actionRequested && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action Requested</label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900">{submission.actionRequested}</p>
                </div>
              </div>
            )}

            {/* Recommended Action (Decision Tree Result) */}
            {submission.recommendedAction && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recommended Action (Decision Tree)</label>
                <div className="px-4 py-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-900 font-medium">{submission.recommendedAction}</p>
                </div>
              </div>
            )}

            {/* Reason */}
            {submission.reason && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900">{submission.reason}</p>
                </div>
              </div>
            )}

            {/* Next Steps */}
            {submission.nextSteps && submission.nextSteps.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Next Steps</label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <ul className="list-disc list-inside space-y-1">
                    {submission.nextSteps.map((step, idx) => (
                      <li key={idx} className="text-gray-900">{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Opportunity ID */}
            {submission.opportunityId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Opportunity ID</label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900 font-mono">{submission.opportunityId}</p>
                </div>
              </div>
            )}

            {/* Name */}
            {submission.name && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applicant/Co-Applicant Name</label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900">{submission.name}</p>
                </div>
              </div>
            )}

            {/* Date */}
            {submission.date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900">{submission.date}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Standard Form Fields */}
            {/* Actionable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Actionable</label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-900">{submission.actionable}</p>
              </div>
            </div>

            {/* Detailed Actionable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Detailed Actionable</label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-900 whitespace-pre-wrap">{submission.detailedActionable}</p>
              </div>
            </div>
          </>
        )}

        {/* LSQ Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">LSQ Link</label>
          <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
            <a
              href={submission.lsqLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline break-all"
            >
              {submission.lsqLink}
            </a>
          </div>
        </div>

        {/* URN */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">URN of Applicant / Co-Applicant</label>
          <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-900 font-mono">{submission.urn}</p>
          </div>
        </div>

        {/* Attachments */}
        {(submission.attachments && submission.attachments.length > 0) || submission.attachmentUrl ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {submission.attachments && submission.attachments.length > 1 ? 'Attachments' : 'Attachment'}
            </label>
            <div className="space-y-3">
              {/* Multiple attachments (new format) */}
              {submission.attachments && submission.attachments.length > 0 ? (
                submission.attachments.map((attachment, index) => (
                  <div key={attachment.driveId || index} className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{attachment.fileName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {attachment.fileSize ? `${(attachment.fileSize / (1024 * 1024)).toFixed(2)} MB` : ''}
                        </p>
                      </div>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm.14 19.018c-3.868 0-7-3.14-7-7.018 0-3.878 3.132-7.018 7-7.018 1.89 0 3.47.697 4.682 1.829l-1.974 1.978v-.004c-.735-.702-1.667-1.062-2.708-1.062-2.31 0-4.187 1.956-4.187 4.273 0 2.315 1.877 4.277 4.187 4.277 2.096 0 3.522-1.202 3.816-2.852H12.14v-2.737h6.585c.088.47.135.96.135 1.474 0 4.01-2.677 6.86-6.72 6.86z"/>
                        </svg>
                        View in Google Drive
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                /* Single attachment (backward compatibility) */
                submission.attachmentUrl && (
                  <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                    <a
                      href={submission.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm.14 19.018c-3.868 0-7-3.14-7-7.018 0-3.878 3.132-7.018 7-7.018 1.89 0 3.47.697 4.682 1.829l-1.974 1.978v-.004c-.735-.702-1.667-1.062-2.708-1.062-2.31 0-4.187 1.956-4.187 4.273 0 2.315 1.877 4.277 4.187 4.277 2.096 0 3.522-1.202 3.816-2.852H12.14v-2.737h6.585c.088.47.135.96.135 1.474 0 4.01-2.677 6.86-6.72 6.86z"/>
                      </svg>
                      {submission.attachmentUrl.includes('drive.google.com') ? 'View in Google Drive' : 'View Attachment'}
                    </a>

                    {/* Inline preview for images (only for Firebase Storage URLs, not Google Drive) */}
                    {!submission.attachmentUrl.includes('drive.google.com') && 
                     submission.attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                      <div className="mt-4">
                        <img
                          src={submission.attachmentUrl}
                          alt="Attachment"
                          className="max-w-full max-h-96 rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        ) : null}

        {/* Comments/Remarks */}
        {submission.comments && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comments/Remarks</label>
            <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-900 whitespace-pre-wrap">{submission.comments}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
