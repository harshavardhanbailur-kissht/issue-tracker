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

        {/* Attachment */}
        {submission.attachmentUrl && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attachment</label>
            <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <a
                href={submission.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 underline"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                View Attachment
              </a>
              {submission.attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <div className="mt-4">
                  <img
                    src={submission.attachmentUrl}
                    alt="Attachment"
                    className="max-w-full rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>
        )}

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
