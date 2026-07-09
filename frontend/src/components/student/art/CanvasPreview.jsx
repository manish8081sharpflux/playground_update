import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * CanvasPreview Component - Story 12.9 (FIX-014)
 * Replaced Artweaver IPC placeholder with real file upload interface.
 * Users can select an image file, preview it, then submit or save.
 */
export default function CanvasPreview({ onSubmit, onSave, showSaveButton = false, file, onFileChange }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Please select an image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 20MB)
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 20MB.');
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    // Notify parent
    if (onFileChange) {
      onFileChange(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      // Reuse same validation via input change simulation
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const hasFile = file || previewUrl;

  const handleSubmit = () => {
    if (!hasFile) {
      toast.error('Please select an artwork file before submitting');
      return;
    }
    if (onSubmit) {
      onSubmit();
    }
  };

  const handleSave = () => {
    if (!hasFile) {
      toast.error('Please select an artwork file to save');
      return;
    }
    if (onSave) {
      onSave();
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onFileChange) {
      onFileChange(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* File Input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Select artwork file"
      />

      {/* Upload Area */}
      <div className="relative">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Artwork Upload</h3>
        <div
          className="border-2 border-dashed border-pink-300 rounded-lg overflow-hidden bg-gray-50 cursor-pointer hover:border-pink-500 hover:bg-pink-50 transition-colors"
          onClick={() => !previewUrl && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          role="button"
          tabIndex={0}
          aria-label="Upload artwork area - click or drag and drop an image"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!previewUrl) fileInputRef.current?.click();
            }
          }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ minHeight: '300px' }}
          >
            {/* Empty State */}
            {!previewUrl && (
              <div className="text-center p-8">
                <div className="text-6xl mb-4">+</div>
                <p className="text-gray-600 font-medium">
                  Click to select or drag and drop your artwork
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Supports JPEG, PNG, GIF, WebP (max 20MB)
                </p>
              </div>
            )}

            {/* Preview */}
            {previewUrl && (
              <div className="w-full">
                <img
                  src={previewUrl}
                  alt="Artwork preview"
                  className="w-full max-h-96 object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Replace / Clear buttons */}
      {previewUrl && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded-lg transition-colors"
          >
            Replace Image
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Action Buttons */}
      {hasFile && (
        <div className="flex gap-3 flex-wrap">
          {showSaveButton && (
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              Save to My Gallery
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Submit Artwork for Grading
          </button>
        </div>
      )}
    </div>
  );
}
