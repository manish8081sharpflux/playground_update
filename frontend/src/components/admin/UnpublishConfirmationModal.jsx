import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

/**
 * UnpublishConfirmationModal - Epic 02 Story 05
 * Confirmation modal before unpublishing a course
 *
 * Acceptance Criteria:
 * UNPUB-01: "Unpublish" button available in context menu for published courses
 * UNPUB-02: Modal explains what happens when unpublishing
 * UNPUB-03: Unpublishing changes status from published -> draft
 * UNPUB-04: Success message displayed and course list refreshed
 * UNPUB-05: Action logged in audit trail
 */
export default function UnpublishConfirmationModal({
  isOpen,
  onClose,
  course,
  onUnpublishSuccess
}) {
  const [unpublishing, setUnpublishing] = useState(false);
  const [reason, setReason] = useState('');
  const [notifyCoaches, setNotifyCoaches] = useState(true);

  const handleUnpublish = async () => {
    try {
      setUnpublishing(true);
      const response = await api.put(`/api/v2/lms/admin/courses/${course._id}/unpublish`, {
        reason: reason.trim(),
        notifyCoaches
      });

      if (response.data.success) {
        toast.success('Course unpublished successfully!');
        onUnpublishSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error unpublishing course:', error);
      toast.error('Failed to unpublish course');
    } finally {
      setUnpublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-yellow-600 text-white py-4 px-6 flex flex-shrink-0 justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Unpublish Course</h2>
            <p className="text-yellow-100 text-sm mt-1">{course?.title}</p>
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
          {/* Warning Message */}
          <div className="flex items-start gap-3 mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <AlertTriangle className="text-yellow-600 mt-1" size={24} />
            <div>
              <p className="font-semibold text-yellow-800 mb-2">
                Warning: This will return the course to draft status
              </p>
              <p className="text-gray-700 text-sm">
                Unpublishing removes the course from active availability but preserves all content and student progress.
              </p>
            </div>
          </div>

          {/* What Happens When You Unpublish */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">What happens when you unpublish:</h3>
            <ul className="space-y-2">
              {[
                'Course status changes from "Published" to "Draft"',
                'Course hidden from coach assignment interface',
                'New students cannot be enrolled',
                'Existing student progress and data fully retained',
                'Students with in-progress work can still complete',
                'Full editing capabilities restored (structure + content)',
                'Must pass validation checks to re-publish'
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={18} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Use Cases */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-bold text-gray-800 mb-2">Common use cases for unpublishing:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>Major content updates or restructuring needed</li>
              <li>Discovered errors that need fixing before new enrollments</li>
              <li>Temporary removal while maintaining student access</li>
              <li>Course review or quality assurance process</li>
            </ul>
          </div>

          {/* Reason for Unpublishing */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Reason for Unpublishing (Optional):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Major content revision needed - removing until updates complete"
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 resize-none"
            />
            <p className="text-sm text-gray-500 mt-1">
              {reason.length}/500 characters
            </p>
          </div>

          {/* Notify Coaches Checkbox */}
          <div className="border-2 border-gray-300 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyCoaches}
                onChange={(e) => setNotifyCoaches(e.target.checked)}
                className="mt-1 w-4 h-4 text-yellow-600 focus:ring-yellow-500"
              />
              <span className="text-gray-700">
                Notify coaches that this course has been unpublished
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 flex flex-shrink-0 justify-between items-center border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:text-gray-900 font-semibold transition-colors"
            disabled={unpublishing}
          >
            Cancel
          </button>

          <button
            onClick={handleUnpublish}
            disabled={unpublishing}
            className="px-8 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors shadow-md"
          >
            {unpublishing ? 'Unpublishing...' : 'Unpublish Course'}
          </button>
        </div>
      </div>
    </div>
  );
}
