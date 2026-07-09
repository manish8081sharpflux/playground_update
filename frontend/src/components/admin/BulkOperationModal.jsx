import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Loader, Upload, Archive, Trash2 } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

/**
 * BulkOperationModal - Epic 02 Story 05
 * Modal for executing bulk operations with progress tracking
 *
 * Acceptance Criteria:
 * BULK-05: Progress indicator during bulk operations
 * BULK-06: Summary report after bulk operation completion
 */
export default function BulkOperationModal({
  isOpen,
  onClose,
  operation, // 'publish', 'archive', 'delete'
  selectedCourses,
  onSuccess
}) {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const getOperationConfig = () => {
    switch (operation) {
      case 'publish':
        return {
          title: 'Bulk Publish Courses',
          icon: Upload,
          color: 'green',
          actionText: 'Publishing',
          successText: 'published'
        };
      case 'archive':
        return {
          title: 'Bulk Archive Courses',
          icon: Archive,
          color: 'orange',
          actionText: 'Archiving',
          successText: 'archived'
        };
      case 'delete':
        return {
          title: 'Bulk Delete Courses',
          icon: Trash2,
          color: 'red',
          actionText: 'Deleting',
          successText: 'deleted'
        };
      default:
        return {
          title: 'Bulk Operation',
          icon: Loader,
          color: 'gray',
          actionText: 'Processing',
          successText: 'processed'
        };
    }
  };

  const config = getOperationConfig();
  const Icon = config.icon;

  const formatErrorDetail = (detail) => {
    if (!detail) return "";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map(formatErrorDetail).filter(Boolean).join("; ");
    }
    if (typeof detail === "object") {
      return (
        detail.message ||
        detail.error ||
        detail.msg ||
        detail.reason ||
        detail.detail ||
        Object.entries(detail)
          .map(([key, value]) => `${key}: ${formatErrorDetail(value)}`)
          .filter(Boolean)
          .join("; ")
      );
    }
    return String(detail);
  };

  const getBulkOperationErrorMessage = (error) => {
    const data = error?.response?.data;
    const details = [
      typeof data === "string" ? data : null,
      data?.message,
      data?.errors,
      data?.error,
      data?.details,
      data?.validationErrors,
    ]
      .map(formatErrorDetail)
      .filter(Boolean);

    if (details.length > 0) {
      return Array.from(new Set(details)).join(" - ");
    }

    if (error?.message && !/^Request failed with status code/i.test(error.message)) {
      return error.message;
    }

    return "The server did not return a detailed error message.";
  };

  const executeBulkOperation = async () => {
    setProcessing(true);
    const operationResults = {
      successful: [],
      failed: []
    };

    for (let i = 0; i < selectedCourses.length; i++) {
      const course = selectedCourses[i];
      setCurrentIndex(i + 1);

      try {
        let response;
        switch (operation) {
          case 'publish':
            response = await api.put(`/api/v2/lms/admin/courses/${course._id}/publish`, {});
            break;
          case 'archive':
            response = await api.put(`/api/v2/lms/admin/courses/${course._id}/archive`, {});
            break;
          case 'delete':
            response = await api.delete(`/api/v2/lms/admin/courses/${course._id}`);
            break;
          default:
            throw new Error('Unknown operation');
        }

        if (response.data.success) {
          operationResults.successful.push({
            courseId: course._id,
            title: course.title
          });
        }
      } catch (error) {
        console.error(`Error ${config.actionText.toLowerCase()} course ${course.title}:`, error);
        operationResults.failed.push({
          courseId: course._id,
          title: course.title,
          error: getBulkOperationErrorMessage(error)
        });
      }
    }

    setResults(operationResults);
    setProcessing(false);

    // Show toast notification
    if (operationResults.failed.length === 0) {
      toast.success(`All ${selectedCourses.length} courses ${config.successText} successfully!`);
    } else if (operationResults.successful.length === 0) {
      toast.error(`Failed to ${operation} all courses`);
    } else {
      toast.success(
        `${operationResults.successful.length} courses ${config.successText}, ${operationResults.failed.length} failed`
      );
    }
  };

  const handleStart = () => {
    executeBulkOperation();
  };

  const handleClose = () => {
    if (results) {
      onSuccess();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`bg-${config.color}-600 text-white py-4 px-6 flex flex-shrink-0 justify-between items-center`}>
          <div className="flex items-center gap-3">
            <Icon size={28} />
            <h2 className="text-2xl font-bold">{config.title}</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={processing}
            className="text-white hover:text-gray-200 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-scroll custom-scrollbar p-8">
          {!processing && !results && (
            <>
              {/* Confirmation */}
              <div className="mb-6">
                <p className="text-gray-700 text-lg mb-4">
                  You are about to <span className="font-bold">{operation}</span>{' '}
                  <span className="font-bold">{selectedCourses.length}</span>{' '}
                  {selectedCourses.length === 1 ? 'course' : 'courses'}:
                </p>
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <ul className="space-y-2">
                    {selectedCourses.map((course) => (
                      <li key={course._id} className="flex items-center gap-2 text-gray-700">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        <span>{course.title}</span>
                        <span className="text-xs text-gray-500">({course.status})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {operation === 'delete' && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-800 font-semibold">
                    ⚠️ Warning: This action cannot be undone!
                  </p>
                </div>
              )}
            </>
          )}

          {processing && (
            <>
              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-700 font-semibold">
                    {config.actionText} courses...
                  </p>
                  <p className="text-gray-600">
                    {currentIndex} / {selectedCourses.length}
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`bg-${config.color}-600 h-full transition-all duration-300 rounded-full`}
                    style={{ width: `${(currentIndex / selectedCourses.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
              </div>
            </>
          )}

          {results && (
            <>
              {/* Results Summary */}
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Operation Complete
                  </h3>
                  <p className="text-gray-600">
                    {results.successful.length} succeeded, {results.failed.length} failed
                  </p>
                </div>

                {/* Successful */}
                {results.successful.length > 0 && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="text-green-600" size={20} />
                      <h4 className="font-bold text-green-800">
                        Successfully {config.successText} ({results.successful.length})
                      </h4>
                    </div>
                    <ul className="space-y-1 ml-7">
                      {results.successful.map((item) => (
                        <li key={item.courseId} className="text-sm text-gray-700">
                          {item.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Failed */}
                {results.failed.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="text-red-600" size={20} />
                      <h4 className="font-bold text-red-800">
                        Failed ({results.failed.length})
                      </h4>
                    </div>
                    <ul className="space-y-2 ml-7">
                      {results.failed.map((item) => (
                        <li key={item.courseId} className="text-sm">
                          <span className="text-gray-700 font-medium">{item.title}</span>
                          <span className="text-red-600 block ml-2">Error: {item.error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 flex flex-shrink-0 justify-between items-center border-t border-gray-200">
          {!results ? (
            <>
              <button
                onClick={handleClose}
                disabled={processing}
                className="px-6 py-2 text-gray-700 hover:text-gray-900 font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleStart}
                disabled={processing}
                className={`px-8 py-3 bg-${config.color}-600 hover:bg-${config.color}-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors shadow-md`}
              >
                {processing ? `${config.actionText}...` : `${operation.charAt(0).toUpperCase() + operation.slice(1)} All`}
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="ml-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors shadow-md"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
