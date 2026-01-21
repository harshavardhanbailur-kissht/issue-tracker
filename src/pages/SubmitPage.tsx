import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { createSubmission } from '@/lib/submissions';
import { validateTotalFileSize, formatFileSize, type UploadProgress } from '@/lib/driveUpload';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<SubmissionFormData>({
    actionable: '',
    detailedActionable: '',
    lsqLink: '',
    urn: '',
    attachmentFiles: [],
    comments: '',
  });
  const [attachmentPreviews, setAttachmentPreviews] = useState<Map<string, string>>(new Map());
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [success, setSuccess] = useState<{ submissionId: string } | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
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

  // Set up paste event listener
  useEffect(() => {
    const handlePaste = async (e: Event) => {
      const clipboardEvent = e as ClipboardEvent;

      // Check if clipboard contains image data
      const items = clipboardEvent.clipboardData?.items;
      if (!items) return;

      // Find image item in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Handle images (screenshots, copied images)
        if (item.type.indexOf('image') !== -1) {
          clipboardEvent.preventDefault();
          
          const blob = item.getAsFile();
          if (!blob) return;

          // Create a File object from the blob
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

    // Attachments are optional - no validation needed

    if (!role) {
      toast.error('You must be logged in');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(null);

    try {
      const submissionId = await createSubmission(
        formData,
        role,
        (progress) => setUploadProgress(progress)
      );
      setSuccess({ submissionId });
      toast.success(`Submission ${submissionId} created successfully!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create submission');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleSubmitAnother = () => {
    // Revoke all preview URLs
    attachmentPreviews.forEach(url => URL.revokeObjectURL(url));
    
    setFormData({
      actionable: '',
      detailedActionable: '',
      lsqLink: '',
      urn: '',
      attachmentFiles: [],
      comments: '',
    });
    setAttachmentPreviews(new Map());
    setFileSizeWarning(null);
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

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments <span className="text-gray-400">(optional)</span>
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
            {isSubmitting ? (uploadProgress ? 'Uploading...' : 'Submitting...') : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
