import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

/**
 * ArchiveConfirmationModal - Epic 02 Story 05
 * Confirmation modal with impact analysis before archiving a course
 *
 * Acceptance Criteria:
 * ARCH-01: "Archive" button opens confirmation modal with impact analysis
 * ARCH-02: Impact analysis shows enrolled student count, coaches using course
 * ARCH-03: Optional "Reason for Archiving" textarea saves to audit trail
 * ARCH-04: "Notify coaches" checkbox triggers notifications
 */
export default function ArchiveConfirmationModal({
  isOpen,
  onClose,
  course,
  onArchiveSuccess
}) {
  const [loading, setLoading] = useState(false);
  const [impactData, setImpactData] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [reason, setReason] = useState('');
  const [notifyCoaches, setNotifyCoaches] = useState(true);

  // Fetch impact analysis when modal opens
  useEffect(() => {
    if (isOpen && course) {
      fetchImpactAnalysis();
    }
  }, [isOpen, course]);

  const fetchImpactAnalysis = async () => {
    try {
      setLoading(true);
      // Mock impact data for now - in real implementation, this would fetch from backend
      // Backend impact analysis endpoint not yet implemented (Sprint 2 backlog)
      setImpactData({
        enrolledStudents: 0,
        completedStudents: 0,
        inProgressStudents: 0,
        justStartedStudents: 0,
        coachesUsingCourse: 0,
        coaches: []
      });
    } catch (error) {
      console.error('Error fetching impact analysis:', error);
      toast.error('Failed to load impact analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      setArchiving(true);
      const response = await api.put(`/api/v2/lms/admin/courses/${course._id}/archive`, {
        reason: reason.trim(),
        notifyCoaches
      });

      if (response.data.success) {
        toast.success('Course archived successfully!');
        onArchiveSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error archiving course:', error);
      toast.error('Failed to archive course');
    } finally {
      setArchiving(false);
    }
  };

  if (!isOpen) return null;

  const totalStudents = impactData?.enrolledStudents || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 text-white py-4 px-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Archive Course</h2>
            <p className="text-red-100 text-sm mt-1">{course?.title}</p>
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-600"></div>
              <span className="ml-3 text-gray-600">Loading impact analysis...</span>
            </div>
          ) : impactData ? (
            <>
              {/* Warning Message */}
              <div className="flex items-start gap-3 mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <AlertTriangle className="text-yellow-600 mt-1" size={24} />
                <div>
                  <p className="font-semibold text-yellow-800">
                    Warning: This action will hide the course from students and coaches
                  </p>
                </div>
              </div>

              {/* Impact Analysis */}
              {totalStudents > 0 ? (
                <div className="border-2 border-blue-200 rounded-xl p-6 mb-6 bg-blue-50">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Impact Analysis:</h3>

                  <div className="space-y-3 text-gray-700">
                    <div>
                      <p className="font-semibold">Students Currently Enrolled: {totalStudents} students</p>
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                        {impactData.completedStudents > 0 && (
                          <li>{impactData.completedStudents} students have completed the course (100%)</li>
                        )}
                        {impactData.inProgressStudents > 0 && (
                          <li>{impactData.inProgressStudents} students have in-progress work (40-99% complete)</li>
                        )}
                        {impactData.justStartedStudents > 0 && (
                          <li>{impactData.justStartedStudents} students have just started (&lt;40% complete)</li>
                        )}
                      </ul>
                    </div>

                    {impactData.coachesUsingCourse > 0 && (
                      <div>
                        <p className="font-semibold mt-4">Coaches Using This Course: {impactData.coachesUsingCourse} coaches</p>
                        {impactData.coaches.length > 0 && (
                          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                            {impactData.coaches.map((coach, index) => (
                              <li key={index}>
                                {coach.name} ({coach.assignedStudents} students assigned)
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-2 border-gray-200 rounded-xl p-6 mb-6 bg-gray-50">
                  <p className="text-gray-600">
                    <strong>No enrollments yet.</strong> This course has not been assigned to any students.
                  </p>
                </div>
              )}

              {/* What Happens When You Archive */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">What happens when you archive:</h3>
                <ul className="space-y-2">
                  {[
                    'Course hidden from new student enrollments',
                    'Coaches cannot assign this course to new students',
                    'Existing student progress and data retained (not deleted)',
                    'Students with in-progress work can still complete their work',
                    'Course visible only to admins in "Archived Courses" tab',
                    'Can be restored later if needed'
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={18} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Reason for Archiving */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Reason for Archiving (Optional):
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Outdated content - replaced by newer version"
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500 resize-none"
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
                    className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700">
                    Notify coaches that this course has been archived
                  </span>
                </label>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 flex justify-between items-center border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:text-gray-900 font-semibold transition-colors"
            disabled={archiving}
          >
            Cancel
          </button>

          <button
            onClick={handleArchive}
            disabled={archiving}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors shadow-md"
          >
            {archiving ? 'Archiving...' : 'Archive Course'}
          </button>
        </div>
      </div>
    </div>
  );
}
