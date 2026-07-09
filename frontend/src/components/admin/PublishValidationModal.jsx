import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

/**
 * PublishValidationModal - Epic 02 Story 05
 * Displays validation checks before publishing a course
 *
 * Acceptance Criteria:
 * VAL-01: "Publish" button opens validation modal
 * VAL-02: Validation checks run for all required fields
 * VAL-03: All checks display with ✓ (pass), ❌ (fail), or ⚠️ (warning)
 * VAL-04: Required checks must pass before publishing
 * VAL-05: Warning checks allow publishing but show improvement suggestions
 * VAL-06: Error summary shows count of errors
 * VAL-07: "Fix Issues" button closes modal
 * VAL-08: Successful validation shows ready message
 */
export default function PublishValidationModal({
  isOpen,
  onClose,
  course,
  onPublishSuccess
}) {
  const [loading, setLoading] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [notifyCoaches, setNotifyCoaches] = useState(false);

  // Fetch validation results when modal opens
  useEffect(() => {
    if (isOpen && course) {
      runValidation();
    }
  }, [isOpen, course]);

  const runValidation = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v2/lms/admin/courses/${course._id}/validate`);
      setValidationResults(response.data);
    } catch (error) {
      console.error('Error validating course:', error);
      toast.error('Failed to validate course');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      const response = await api.put(`/api/v2/lms/admin/courses/${course._id}/publish`, {
        notifyCoaches
      });

      if (response.data.success) {
        toast.success('Course published successfully!');
        onPublishSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error publishing course:', error);
      toast.error('Failed to publish course');
    } finally {
      setPublishing(false);
    }
  };

  const getCheckIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'fail':
        return <XCircle className="text-red-600" size={20} />;
      case 'warning':
        return <AlertCircle className="text-yellow-600" size={20} />;
      default:
        return null;
    }
  };

  const getCheckStyle = (status) => {
    switch (status) {
      case 'pass':
        return 'text-gray-700';
      case 'fail':
        return 'text-red-700 font-semibold';
      case 'warning':
        return 'text-yellow-700';
      default:
        return 'text-gray-700';
    }
  };

  if (!isOpen) return null;

  const errorCount = validationResults?.errors?.length || 0;
  const canPublish = validationResults?.canPublish || false;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-purple-600 text-white py-4 px-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Publish Course</h2>
            <p className="text-purple-100 text-sm mt-1">{course?.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Running validation checks...</span>
            </div>
          ) : validationResults ? (
            <>
              {/* Validation Checks */}
              <div className="space-y-2 mb-6">
                {validationResults.checks.map((check) => (
                  <div
                    key={check.id}
                    className={`flex items-start gap-3 py-2 ${getCheckStyle(check.status)}`}
                  >
                    <div className="mt-0.5">{getCheckIcon(check.status)}</div>
                    <div className="flex-1">
                      <span className="font-medium">{check.label}:</span>{' '}
                      <span>{check.message}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-300 pt-6 mb-6"></div>

              {/* Result Summary */}
              {canPublish ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-600 mt-1" size={24} />
                    <div>
                      <h3 className="text-lg font-bold text-green-800 mb-3">
                        ✅ All required checks passed! Course is ready to publish.
                      </h3>
                      <div className="text-gray-700 space-y-1">
                        <p className="font-semibold mb-2">Publishing will:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Make course visible to coaches in assignment interface</li>
                          <li>Allow students to access course content</li>
                          <li>Enable progress tracking and quiz taking</li>
                          <li>Lock course structure (content can still be edited)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="text-red-600 mt-1" size={24} />
                    <div>
                      <h3 className="text-lg font-bold text-red-800 mb-3">
                        ❌ Cannot publish: {errorCount} error{errorCount !== 1 ? 's' : ''} must be fixed
                      </h3>
                      <div className="text-gray-700">
                        <p className="font-semibold mb-2">Required Actions:</p>
                        <ul className="list-decimal list-inside space-y-1 ml-2">
                          {validationResults.errors.map((error, index) => (
                            <li key={index} className="text-red-700">{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notify Coaches Checkbox */}
              {canPublish && (
                <div className="border-2 border-gray-300 rounded-lg p-4 mb-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyCoaches}
                      onChange={(e) => setNotifyCoaches(e.target.checked)}
                      className="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-gray-700">
                      Send notification to all coaches about new course availability
                    </span>
                  </label>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 flex justify-between items-center border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:text-gray-900 font-semibold transition-colors"
            disabled={publishing}
          >
            {canPublish ? 'Cancel' : 'Fix Issues'}
          </button>

          {canPublish && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors shadow-md"
            >
              {publishing ? 'Publishing...' : 'Publish Course'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
