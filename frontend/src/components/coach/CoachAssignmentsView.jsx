import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api';
import CourseAssignmentModal from './CourseAssignmentModal';
import AssignmentProgressModal from './AssignmentProgressModal';
import { useAuth } from '../../contexts/AuthContext';

export default function CoachAssignmentsView({ coachId, coachName, balagruhaName }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [progressAssignmentId, setProgressAssignmentId] = useState(null); // null = closed
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'completed', 'expired'

  useEffect(() => {
    fetchAssignments();
  }, [coachId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);

      // Admin fetches all assignments, coach fetches their own
      const url = isAdmin
        ? `/api/v2/lms/admin/courses/assignments`
        : `/api/v2/lms/coach/${coachId}/assignments`;

      const response = await api.get(url);
      setAssignments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentCreated = () => {
    // Refresh the assignments list
    fetchAssignments();
  };

  const handleUnassign = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to cancel this assignment?')) {
      return;
    }

    try {
      await api.delete(
        `/api/v2/lms/coach/assignments/${assignmentId}`
      );
      toast.success('Assignment cancelled successfully');
      fetchAssignments();
    } catch (error) {
      console.error('Error cancelling assignment:', error);
      toast.error('Failed to cancel assignment');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment) => {
    // Status filter
    if (statusFilter !== 'all' && assignment.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const courseTitle = assignment.courseId?.title?.toLowerCase() || '';
      const balagruhaName =
        assignment.assignedTo?.balagruhaId?.name?.toLowerCase() || '';
      return courseTitle.includes(query) || balagruhaName.includes(query);
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading assignments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 w-full">
      {/* Header */}
      <div className={`text-white px-6 py-4 border-b ${isAdmin ? 'bg-purple-600 border-purple-700' : 'bg-blue-600 border-blue-700'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isAdmin ? 'All Course Assignments (Admin)' : 'My Course Assignments'}
            </h1>
            <div className="text-sm mt-1">
              {balagruhaName && <span>Balagruha: {balagruhaName} • </span>}
              {isAdmin ? 'Admin' : 'Coach'}: {coachName}
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className={`px-6 py-2 rounded-lg font-medium transition ${isAdmin ? 'bg-white text-purple-600 hover:bg-purple-50' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
          >
            + Assign New Course
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm border-b w-full">
        <div className="w-full px-6 py-4">
          <div className="flex items-center gap-6 w-full">
            {/* Search */}
            <div className="w-1/2">
            <input
              type="text"
              placeholder="🔍 Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            </div>

            {/* Status Filter */}
            <div className="w-1/2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Cards */}
      <div className="w-full px-6 py-8">
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all'
                ? 'No assignments found'
                : 'No assignments yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by assigning a course to your students'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Assign Your First Course
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map((assignment) => (
              <div
                key={assignment._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Course Title */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {assignment.courseId?.title || 'Unknown Course'}
                      </h3>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(
                          assignment.status
                        )}`}
                      >
                        {assignment.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Assignment Details */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      <span>
                        📊 Category: {assignment.courseId?.category || 'N/A'}
                      </span>
                      <span>
                        👥 Assigned to:{' '}
                        {assignment.assignedTo.type === 'balagruha'
                          ? `Entire Balagruha (${assignment.progress.totalStudents} students)`
                          : `${assignment.progress.totalStudents} specific students`}
                      </span>
                      <span>📅 Due: {formatDate(assignment.dueDate)}</span>
                      <span>
                        📆 Assigned:{' '}
                        {formatDate(assignment.assignedAt || assignment.createdAt)}
                      </span>
                    </div>

                    {/* Progress Bar — with friendly empty state when no students have started */}
                    <div className="mb-3">
                      {assignment.progress.studentsStarted === 0 ? (
                        <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                          <span className="text-base leading-5">⏳</span>
                          <span>
                            No students have started yet — progress will update as students view course content.
                            {assignment.progress.totalStudents > 0 && (
                              <span className="text-gray-500">
                                {' '}({assignment.progress.totalStudents} {assignment.progress.totalStudents === 1 ? 'student' : 'students'} assigned)
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                            <span>
                              Progress: {assignment.progress.studentsStarted}/
                              {assignment.progress.totalStudents} started (
                              {Math.round(
                                (assignment.progress.studentsStarted /
                                  assignment.progress.totalStudents) *
                                100
                              ) || 0}
                              %)
                            </span>
                            <span>
                              Avg Completion:{' '}
                              {assignment.progress.averageCompletionPercentage || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${assignment.progress.averageCompletionPercentage || 0
                                  }%`,
                              }}
                            ></div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <div className="ml-4">
                    <button
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                      onClick={() => {
                        /* Context menu not yet implemented */
                      }}
                    >
                      ⋮
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4 pt-4 border-t">
                  <button
                    onClick={() => setProgressAssignmentId(assignment._id)}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                  >
                    View Progress Report
                  </button>
                  {assignment.status === 'active' && (
                    <button
                      onClick={() => handleUnassign(assignment._id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                    >
                      Unassign Course
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      <CourseAssignmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        coachId={coachId}
        onAssignmentCreated={handleAssignmentCreated}
      />

      {/* Progress Report Modal */}
      {progressAssignmentId && (
        <AssignmentProgressModal
          assignmentId={progressAssignmentId}
          onClose={() => setProgressAssignmentId(null)}
        />
      )}
    </div>
  );
}
