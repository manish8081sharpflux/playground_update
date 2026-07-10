import React from 'react';

/**
 * SubmissionModal Component - Story 12.9 (FIX-014)
 * Confirmation dialog for submitting artwork.
 * Now shows a real file preview instead of Artweaver placeholder.
 */
export default function SubmissionModal({ mode, metadata, onClose, onSubmit, file, task }) {
  const [title, setTitle] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const previewUrl = file ? URL.createObjectURL(file) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        ...metadata,
        title: title || 'Untitled Artwork',
        mode
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'workshop': return 'Workshop';
      case 'free_sketch': return 'Free Sketch';
      case 'art_story': return 'Art Story';
      case 'competition': return 'Competition';
      default: return 'Artwork';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="shrink-0 rounded-t-lg bg-pink-600 px-6 py-4 text-white">
          <h2 className="text-xl font-bold">Submit Artwork</h2>
          <p className="text-pink-100 text-sm mt-1">
            Submit your artwork for coach review
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Artwork Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your artwork a title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Submission Details</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>&bull; Type: {getModeLabel()}</p>
                {(task || metadata?.taskTitle) && (
                  <p>&bull; Task: {task?.title || metadata.taskTitle}</p>
                )}
                <p>&bull; Coach will review your artwork</p>
                <p>&bull; You will receive feedback and a grade</p>
                {file && (
                  <p className="break-words">&bull; File: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
                )}
                {mode === 'competition' && (
                  <p className="text-purple-700">&bull; Entry will be visible on leaderboard</p>
                )}
              </div>
            </div>

            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <h3 className="font-semibold text-pink-900 mb-2">Submitting for:</h3>
              <p className="text-sm font-bold text-gray-900">
                {task?.title || metadata?.taskTitle || 'Selected artwork task'}
              </p>
              {file && (
                <p className="mt-2 break-words text-sm text-gray-700">
                  <span className="font-semibold">File selected:</span> {file.name}
                </p>
              )}
              <p className="mt-2 text-xs font-semibold text-pink-800">
                Your artwork will be submitted only for this task.
              </p>
            </div>

            {/* Artwork Preview */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Artwork Preview:</p>
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Artwork preview"
                    className="w-full max-h-48 object-contain bg-gray-50"
                  />
                ) : (
                  <div
                    className="bg-gray-100 flex items-center justify-center"
                    style={{ minHeight: '120px' }}
                  >
                    <p className="text-gray-500 text-sm">No file selected</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="shrink-0 border-t border-gray-200 bg-white p-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
