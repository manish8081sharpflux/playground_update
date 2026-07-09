import React, { useState, useEffect } from 'react';
import { api } from '../../api';

/**
 * PublishTranslationsModal - Epic 02 Story 04
 * Confirmation modal for publishing translations
 */
const PublishTranslationsModal = ({ isOpen, onClose, courseId, progress }) => {
  const [reviewChecked, setReviewChecked] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setReviewChecked(false);
      setError(null);
    }
  }, [isOpen]);

  const handlePublish = async () => {
    if (!reviewChecked) {
      setError('Please confirm that you have reviewed all translations');
      return;
    }

    try {
      setPublishing(true);
      setError(null);

      await api.put(`/api/v2/lms/admin/translations/courses/${courseId}/publish`);

      // Success! Close modal and notify parent
      alert('✅ Translations published successfully! Telugu content is now live for students.');
      onClose(true); // true indicates successful publish
    } catch (err) {
      console.error('Error publishing translations:', err);
      setError('Failed to publish translations. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  if (!isOpen) return null;

  const isFullyTranslated = progress?.percentage === 100;
  const untranslatedCount = progress ? progress.totalItems - progress.translatedItems : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => !publishing && onClose(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex flex-shrink-0 justify-between items-center p-8 pb-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Publish Translations</h2>
            <button
              onClick={() => !publishing && onClose(false)}
              disabled={publishing}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-scroll custom-scrollbar p-8">
          {/* Translation Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Translation Summary:</h3>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 space-y-3">
              {/* Overall Progress */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Overall Progress:</span>
                <span className={`text-lg font-bold ${progress?.percentage === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                  {progress?.translatedItems} / {progress?.totalItems} ({progress?.percentage}%)
                </span>
              </div>

              {/* Course */}
              <div className="flex items-center">
                {progress?.breakdown?.course?.translated === progress?.breakdown?.course?.total ? (
                  <span className="text-green-500 mr-2">✓</span>
                ) : (
                  <span className="text-yellow-500 mr-2">⚠️</span>
                )}
                <span className="text-gray-700">
                  <strong>Course Title & Description:</strong> {progress?.breakdown?.course?.translated} / {progress?.breakdown?.course?.total}
                </span>
              </div>

              {/* Modules */}
              <div className="flex items-center">
                {progress?.breakdown?.modules?.translated === progress?.breakdown?.modules?.total ? (
                  <span className="text-green-500 mr-2">✓</span>
                ) : (
                  <span className="text-yellow-500 mr-2">⚠️</span>
                )}
                <span className="text-gray-700">
                  <strong>Module Titles:</strong> {progress?.breakdown?.modules?.translated} / {progress?.breakdown?.modules?.total}
                </span>
              </div>

              {/* Chapters */}
              <div className="flex items-center">
                {progress?.breakdown?.chapters?.translated === progress?.breakdown?.chapters?.total ? (
                  <span className="text-green-500 mr-2">✓</span>
                ) : (
                  <span className="text-yellow-500 mr-2">⚠️</span>
                )}
                <span className="text-gray-700">
                  <strong>Chapter Titles:</strong> {progress?.breakdown?.chapters?.translated} / {progress?.breakdown?.chapters?.total}
                </span>
              </div>

              {/* Content Items */}
              <div className="flex items-center">
                {progress?.breakdown?.contentItems?.translated === progress?.breakdown?.contentItems?.total ? (
                  <span className="text-green-500 mr-2">✓</span>
                ) : (
                  <span className="text-yellow-500 mr-2">⚠️</span>
                )}
                <span className="text-gray-700">
                  <strong>Content Items:</strong> {progress?.breakdown?.contentItems?.translated} / {progress?.breakdown?.contentItems?.total}
                </span>
              </div>

              {/* Quizzes */}
              {progress?.breakdown?.quizzes && (
                <div className="flex items-center">
                  {progress?.breakdown?.quizzes?.translated === progress?.breakdown?.quizzes?.total ? (
                    <span className="text-green-500 mr-2">✓</span>
                  ) : (
                    <span className="text-yellow-500 mr-2">⚠️</span>
                  )}
                  <span className="text-gray-700">
                    <strong>Quizzes:</strong> {progress?.breakdown?.quizzes?.translated} / {progress?.breakdown?.quizzes?.total}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Warning for Incomplete Translations */}
          {!isFullyTranslated && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-yellow-600 text-2xl">⚠️</span>
                <div>
                  <p className="text-yellow-800 font-semibold mb-1">
                    Warning: {untranslatedCount} items are not yet translated
                  </p>
                  <p className="text-yellow-700 text-sm">
                    These items will remain in English for Telugu-speaking students until translation is complete.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Publishing Info */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-gray-700 font-semibold mb-2">Publishing will:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm ml-2">
              <li>Make all translated content immediately visible to Telugu students</li>
              <li>Update course language dropdown to include "తెలుగు" (Telugu) option</li>
              <li>Allow students to switch between English and Telugu dynamically</li>
              <li>Add Telugu (te) to the course languages field</li>
            </ul>
          </div>

          {/* Review Confirmation Checkbox */}
          <div className="mb-6">
            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={reviewChecked}
                onChange={(e) => setReviewChecked(e.target.checked)}
                disabled={publishing}
                className="w-5 h-5 text-purple-600 focus:ring-purple-500 rounded cursor-pointer mt-0.5 disabled:opacity-50"
              />
              <span className="ml-3 text-gray-700 font-medium group-hover:text-purple-600 transition-colors">
                ☑ I have reviewed all translations for accuracy and completeness
              </span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 mb-6">
              <p className="text-red-600 font-medium">❌ {error}</p>
            </div>
          )}

          </div>

          {/* Action Buttons */}
          <div className="flex flex-shrink-0 justify-end gap-4 p-8 pt-4 border-t border-gray-200">
            <button
              onClick={() => onClose(false)}
              disabled={publishing}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              onClick={handlePublish}
              disabled={!reviewChecked || publishing}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {publishing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Publishing...
                </>
              ) : (
                'Publish Translations'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PublishTranslationsModal;
