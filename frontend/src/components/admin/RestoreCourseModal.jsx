import React, { useState } from 'react';
import { X, CheckCircle, RotateCcw, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

/**
 * RestoreCourseModal - Epic 02 Story 05
 * Modal for restoring archived courses with status selection
 *
 * Acceptance Criteria:
 * REST-01: "Restore" button in context menu opens restore modal
 * REST-02: Modal displays course archived date, archived by admin, reason
 * REST-03: Radio buttons: "Restore to Published" vs "Restore to Draft"
 * REST-04: Explanation of each restoration option displayed
 * REST-05: "Restore Course" button executes restore with selected status
 * REST-06: Success message and course list refresh after restore
 */
export default function RestoreCourseModal({
  isOpen,
  onClose,
  course,
  onRestoreSuccess
}) {
  const [restoring, setRestoring] = useState(false);
  const [restoreToStatus, setRestoreToStatus] = useState('published');

  const handleRestore = async () => {
    try {
      setRestoring(true);
      const response = await api.put(`/api/v2/lms/admin/courses/${course._id}/restore`, {
        restoreToStatus
      });

      if (response.data.success) {
        toast.success(`Course restored to ${restoreToStatus} status successfully!`);
        onRestoreSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error restoring course:', error);
      toast.error('Failed to restore course');
    } finally {
      setRestoring(false);
    }
  };

  if (!isOpen) return null;

  // Format archived date
  const archivedDate = course?.archivedAt
    ? new Date(course.archivedAt).toLocaleString()
    : 'Unknown';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white py-4 px-6 flex flex-shrink-0 justify-between items-center">
          <div className="flex items-center gap-3">
            <RotateCcw size={28} />
            <div>
              <h2 className="text-2xl font-bold">Restore Archived Course</h2>
              <p className="text-blue-100 text-sm mt-1">{course?.title}</p>
            </div>
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
        <div className="flex-1 overflow-y-scroll custom-scrollbar p-8">
          {/* Archive Information */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Archive Information:</h3>
            <div className="space-y-2 text-gray-700">
              <div className="flex">
                <span className="font-semibold w-40">Archived Date:</span>
                <span>{archivedDate}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-40">Archived By:</span>
                <span>{course?.archivedBy || 'Admin'}</span>
              </div>
              {course?.archiveReason && (
                <div className="flex">
                  <span className="font-semibold w-40">Reason:</span>
                  <span className="italic text-gray-600">"{course.archiveReason}"</span>
                </div>
              )}
            </div>
          </div>

          {/* Restore Options */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Choose Restoration Status:</h3>

            {/* Restore to Published */}
            <div className="border-2 border-gray-300 rounded-lg p-4 mb-4 hover:border-green-400 transition-colors">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="restoreStatus"
                  value="published"
                  checked={restoreToStatus === 'published'}
                  onChange={(e) => setRestoreToStatus(e.target.value)}
                  className="mt-1 w-5 h-5 text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <span className="font-bold text-gray-900">Restore to Published</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    Immediately make the course available to coaches and students
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>Course visible in coach assignment interface</li>
                    <li>Students can access and continue their progress</li>
                    <li>Progress tracking and quizzes enabled</li>
                    <li>Course structure locked (content editable)</li>
                  </ul>
                </div>
              </label>
            </div>

            {/* Restore to Draft */}
            <div className="border-2 border-gray-300 rounded-lg p-4 hover:border-yellow-400 transition-colors">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="restoreStatus"
                  value="draft"
                  checked={restoreToStatus === 'draft'}
                  onChange={(e) => setRestoreToStatus(e.target.value)}
                  className="mt-1 w-5 h-5 text-yellow-600 focus:ring-yellow-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="text-yellow-600" size={20} />
                    <span className="font-bold text-gray-900">Restore to Draft</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    Restore as draft for review and updates before publishing
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>Course hidden from coaches and students</li>
                    <li>Full editing capabilities (structure & content)</li>
                    <li>Review and update content before re-publishing</li>
                    <li>Must pass validation checks to publish again</li>
                  </ul>
                </div>
              </label>
            </div>
          </div>

          {/* Information Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 mt-0.5" size={20} />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">Note:</p>
                <p>
                  Restoring this course will preserve all existing student progress data.
                  Students who were enrolled before archiving will still have access to their work.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 flex flex-shrink-0 justify-between items-center border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:text-gray-900 font-semibold transition-colors"
            disabled={restoring}
          >
            Cancel
          </button>

          <button
            onClick={handleRestore}
            disabled={restoring}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors shadow-md flex items-center gap-2"
          >
            <RotateCcw size={20} />
            {restoring ? 'Restoring...' : 'Restore Course'}
          </button>
        </div>
      </div>
    </div>
  );
}
