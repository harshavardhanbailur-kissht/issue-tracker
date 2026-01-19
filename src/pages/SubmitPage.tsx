import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { createSubmission } from '@/lib/submissions';
import type { SubmissionFormData } from '@/types';

const ACTIONABLE_OPTIONS = [
  'Follow up required',
  'Data correction needed',
  'Status update needed',
  'Documentation required',
  'Other',
];

export default function SubmitPage() {
  const { role } = useSimpleAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<SubmissionFormData>({
    actionable: '',
    detailedActionable: '',
    lsqLink: '',
    urn: '',
    attachmentFile: undefined,
    comments: '',
  });
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ submissionId: string } | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large. Please use a file under 10MB.');
        return;
      }
      setFormData(prev => ({ ...prev, attachmentFile: file }));
      setAttachmentPreview(URL.createObjectURL(file));
    }
  };

  const removeAttachment = () => {
    setFormData(prev => ({ ...prev, attachmentFile: undefined }));
    setAttachmentPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.actionable) {
      toast.error('Please select an actionable');
      return;
    }

    if (!formData.detailedActionable.trim()) {
      toast.error('Please provide detailed actionable');
      return;
    }

    if (!formData.lsqLink.trim()) {
      toast.error('Please provide LSQ Link');
      return;
    }

    if (!formData.urn.trim()) {
      toast.error('Please provide URN');
      return;
    }

    if (!formData.attachmentFile) {
      toast.error('Please attach a file');
      return;
    }

    if (!role) {
      toast.error('You must be logged in');
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionId = await createSubmission(formData, role);
      setSuccess({ submissionId });
      toast.success(`Submission ${submissionId} created successfully!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnother = () => {
    setFormData({
      actionable: '',
      detailedActionable: '',
      lsqLink: '',
      urn: '',
      attachmentFile: undefined,
      comments: '',
    });
    setAttachmentPreview(null);
    setSuccess(null);
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
          
          <div className="py-4 px-6 rounded-xl bg-gray-50 border-2 border-gray-200 mb-8">
            <p className="text-3xl font-mono font-bold text-blue-600">{success.submissionId}</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit Form</h1>
        <p className="text-gray-600">Fill out the form below to submit your request</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Actionable */}
          <div>
            <label htmlFor="actionable" className="block text-sm font-medium text-gray-700 mb-2">
              Actionable <span className="text-red-500">*</span>
            </label>
            <select
              id="actionable"
              name="actionable"
              value={formData.actionable}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Choose an option</option>
              {ACTIONABLE_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Detailed Actionable */}
          <div>
            <label htmlFor="detailedActionable" className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Actionable <span className="text-red-500">*</span>
            </label>
            <textarea
              id="detailedActionable"
              name="detailedActionable"
              value={formData.detailedActionable}
              onChange={handleInputChange}
              required
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Provide detailed description of the actionable item..."
            />
          </div>

          {/* LSQ Link */}
          <div>
            <label htmlFor="lsqLink" className="block text-sm font-medium text-gray-700 mb-2">
              LSQ Link <span className="text-red-500">*</span>
            </label>
            <input
              id="lsqLink"
              name="lsqLink"
              type="url"
              value={formData.lsqLink}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="https://..."
            />
          </div>

          {/* URN */}
          <div>
            <label htmlFor="urn" className="block text-sm font-medium text-gray-700 mb-2">
              URN of Applicant / Co-Applicant <span className="text-red-500">*</span>
            </label>
            <input
              id="urn"
              name="urn"
              type="text"
              value={formData.urn}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Enter URN"
            />
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachment <span className="text-red-500">*</span>
            </label>
            {attachmentPreview ? (
              <div className="relative inline-block">
                <div className="p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-700 mb-2">{formData.attachmentFile?.name}</p>
                  {formData.attachmentFile?.type.startsWith('image/') && (
                    <img
                      src={attachmentPreview}
                      alt="Preview"
                      className="max-h-48 rounded-lg"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={removeAttachment}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF up to 10MB</p>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              required={!attachmentPreview}
            />
          </div>

          {/* Comments/Remarks */}
          <div>
            <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
              Comments/Remarks <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="comments"
              name="comments"
              value={formData.comments}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Any additional comments or remarks..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
