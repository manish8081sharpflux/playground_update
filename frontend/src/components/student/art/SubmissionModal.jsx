import React from 'react';

/**
 * SubmissionModal Component - Story 12.9 (FIX-014)
 * Confirmation dialog for submitting artwork.
 * Now shows a real file preview instead of Artweaver placeholder.
 */
export default function SubmissionModal({ mode, metadata, onClose, onSubmit, file }) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-pink-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold">Submit Artwork</h2>
          <p className="text-pink-100 text-sm mt-1">
            Submit your artwork for coach review
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
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

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Submission Details</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>&bull; Type: {getModeLabel()}</p>
              <p>&bull; Coach will review your artwork</p>
              <p>&bull; You will receive feedback and a grade</p>
              {file && (
                <p>&bull; File: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
              )}
              {mode === 'competition' && (
                <p className="text-purple-700">&bull; Entry will be visible on leaderboard</p>
              )}
            </div>
          </div>

          {/* Artwork Preview */}
          <div className="mb-4">
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

          {/* Buttons */}
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
        </form>
      </div>
    </div>
  );
}
