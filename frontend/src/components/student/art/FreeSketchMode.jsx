import React, { useState } from 'react';
import CanvasPreview from './CanvasPreview';
import CanvasDrawingTool from './CanvasDrawingTool';
import toast from 'react-hot-toast';
import { api, apiWithoutContentType } from '../../../api';

/**
 * FreeSketchMode Component - Story 12.9 (FIX-014)
 * Open canvas for creative expression with personal gallery.
 * Now supports both in-browser drawing (HTML5 Canvas) and file upload.
 */
export default function FreeSketchMode({ data, studentId, onRefresh }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inputMode, setInputMode] = useState('draw'); // 'draw' | 'upload'

  const gallery = data?.gallery || [];

  const handleSave = async () => {
    if (!selectedFile) {
      toast.error('Please select an artwork file first');
      return;
    }
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('artwork', selectedFile);
      formData.append('title', `Sketch - ${new Date().toLocaleDateString()}`);

      await apiWithoutContentType.post(
        `/api/v2/lms/student/${studentId}/courses/art/gallery`,
        formData
      );
      toast.success('Artwork saved to your gallery!');
      setSelectedFile(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to save artwork';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('Please select an artwork file first');
      return;
    }
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('artwork', selectedFile);
      formData.append('type', 'art');
      formData.append('mode', 'free_sketch');

      await apiWithoutContentType.post(
        `/api/v2/lms/student/${studentId}/courses/art/submissions`,
        formData
      );
      toast.success('Artwork submitted for grading!');
      setSelectedFile(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit artwork';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Called by CanvasDrawingTool when the user clicks "Save & Submit Drawing".
   * Converts the canvas Blob into a File and submits it via the existing API.
   */
  const handleCanvasBlobReady = async (blob) => {
    if (!blob) {
      toast.error('Failed to export drawing');
      return;
    }

    const file = new File(
      [blob],
      `sketch-${Date.now()}.png`,
      { type: 'image/png' }
    );

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('artwork', file);
      formData.append('type', 'art');
      formData.append('mode', 'free_sketch');
      formData.append('title', `Sketch - ${new Date().toLocaleDateString()}`);

      await apiWithoutContentType.post(
        `/api/v2/lms/student/${studentId}/courses/art/submissions`,
        formData
      );
      toast.success('Drawing submitted for grading!');
      if (onRefresh) onRefresh();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit drawing';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-pink-50 rounded-lg p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Free Sketch</h2>
        <p className="text-gray-700">
          Create anything you like! Draw directly in the browser or upload your artwork.
        </p>
      </div>

      {/* Input Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Create with:</span>
        <button
          type="button"
          onClick={() => setInputMode('draw')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            inputMode === 'draw'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'bg-white text-gray-700 border border-pink-300 hover:bg-pink-50'
          }`}
        >
          Draw Here
        </button>
        <button
          type="button"
          onClick={() => setInputMode('upload')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            inputMode === 'upload'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'bg-white text-gray-700 border border-pink-300 hover:bg-pink-50'
          }`}
        >
          Upload a File
        </button>
      </div>

      {/* Drawing Canvas */}
      {inputMode === 'draw' && (
        <CanvasDrawingTool onBlobReady={handleCanvasBlobReady} />
      )}

      {/* File Upload (existing CanvasPreview) */}
      {inputMode === 'upload' && (
        <CanvasPreview
          onSubmit={handleSubmit}
          onSave={handleSave}
          showSaveButton={true}
          file={selectedFile}
          onFileChange={setSelectedFile}
        />
      )}

      {/* Loading states */}
      {(saving || submitting) && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-600"></div>
          <span>{saving ? 'Saving to gallery...' : 'Submitting artwork...'}</span>
        </div>
      )}

      {/* My Gallery */}
      {gallery.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">My Gallery</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {gallery.map((artwork) => (
              <div
                key={artwork.id}
                className="border border-gray-300 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <img
                    src={artwork.artworkUrl}
                    alt={artwork.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {artwork.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(artwork.createdAt).toLocaleDateString()}
                  </p>
                  {artwork.submitted && (
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Submitted
                      </span>
                      {artwork.grade && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Grade: {artwork.grade}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
