import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { api } from "../../api";
import CourseAssignmentModal from "./CourseAssignmentModal";
import AssignmentProgressModal from "./AssignmentProgressModal";
import CoachAssignmentEditModal from "./CoachAssignmentEditModal";
import { useAuth } from "../../contexts/AuthContext";
import LoadingState from "../common/LoadingState";

export default function CoachAssignmentsView({
  coachId,
  coachName,
  balagruhaName,
}) {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [progressAssignmentId, setProgressAssignmentId] = useState(null); // null = closed
  const [openMenuAssignmentId, setOpenMenuAssignmentId] = useState(null);
  const [editAssignment, setEditAssignment] = useState(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'completed', 'expired'
  const [savingEdit, setSavingEdit] = useState(false);
  const menuRef = useRef(null);

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
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentCreated = () => {
    // Refresh the assignments list
    fetchAssignments();
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this assignment?",
      )
    ) {
      return;
    }

    try {
      const url = isAdmin
        ? `/api/v2/lms/admin/courses/assignments/${assignmentId}`
        : `/api/v2/lms/coach/assignments/${assignmentId}`;

      await api.delete(url);
      toast.success("Assignment deleted successfully");
      setOpenMenuAssignmentId(null);
      fetchAssignments();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast.error(error.response?.data?.error || "Failed to delete assignment");
    }
  };

  const handleToggleAssignmentStatus = async (assignment) => {
    if (!assignment) return;

    const nextStatus =
      assignment.status === "cancelled" ? "active" : "cancelled";
    const confirmMessage =
      assignment.status === "cancelled"
        ? "Are you sure you want to reassign this course?"
        : "Are you sure you want to unassign this course?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const url = isAdmin
        ? `/api/v2/lms/admin/courses/assignments/${assignment._id}`
        : `/api/v2/lms/coach/assignments/${assignment._id}`;

      await api.put(url, { status: nextStatus });
      toast.success(
        nextStatus === "active"
          ? "Assignment reassigned successfully"
          : "Assignment unassigned successfully",
      );
      setEditAssignment(null);
      fetchAssignments();
    } catch (error) {
      console.error("Error updating assignment status:", error);
      toast.error(
        error.response?.data?.error || "Failed to update assignment status",
      );
    }
  };

  const handleMenuToggle = (assignmentId) => {
    setOpenMenuAssignmentId((prev) =>
      prev === assignmentId ? null : assignmentId,
    );
  };

  const handleEditAssignment = (assignment) => {
    setEditAssignment(assignment);
    setEditDueDate(assignment.dueDate ? assignment.dueDate.slice(0, 10) : "");
    setEditStatus(assignment.status || "active");
    setOpenMenuAssignmentId(null);
  };

  const handleSaveAssignmentEdit = async (e) => {
    e?.preventDefault();
    if (!editAssignment) return;

    if (editDueDate) {
      const dueDateObj = new Date(editDueDate);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (dueDateObj < todayStart) {
        toast.error("Due date must be today or in the future");
        return;
      }
    }

    setSavingEdit(true);

    try {
      const payload = {
        dueDate: editDueDate || null,
        status: editStatus,
      };

      const url = isAdmin
        ? `/api/v2/lms/admin/courses/assignments/${editAssignment._id}`
        : `/api/v2/lms/coach/assignments/${editAssignment._id}`;

      await api.put(url, payload);
      toast.success("Assignment updated successfully");
      setEditAssignment(null);
      fetchAssignments();
    } catch (error) {
      console.error("Error updating assignment:", error);
      toast.error("Failed to update assignment");
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuAssignmentId(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "expired":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment) => {
    // Status filter
    if (statusFilter !== "all" && assignment.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const courseTitle = assignment.courseId?.title?.toLowerCase() || "";
      const balagruhaName =
        assignment.assignedTo?.balagruhaId?.name?.toLowerCase() || "";
      return courseTitle.includes(query) || balagruhaName.includes(query);
    }

    return true;
  });

  if (loading) {
    return <LoadingState message="Loading assignments..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-100 w-full">
      {/* Header */}
      <div
        className={`text-white px-6 py-4 border-b ${isAdmin ? "bg-purple-600 border-purple-700" : "bg-blue-600 border-blue-700"}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isAdmin
                ? "All Course Assignments (Admin)"
                : "My Course Assignments"}
            </h1>
            <div className="text-sm mt-1">
              {balagruhaName && <span>Balagruha: {balagruhaName} - </span>}
              {isAdmin ? "Admin" : "Coach"}: {coachName}
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className={`px-6 py-2 rounded-lg font-medium transition ${isAdmin ? "bg-white text-purple-600 hover:bg-purple-50" : "bg-white text-blue-600 hover:bg-blue-50"}`}
          >
            + Assign New Course
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm border-b w-full">
        <div className="w-full px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4 w-full">
            {/* Search */}
            <div className="w-1/2">
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="w-1/2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-64 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className="text-6xl mb-4">Courses</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchQuery || statusFilter !== "all"
                ? "No assignments found"
                : "No assignments yet"}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by assigning a course to your students"}
            </p>
            {!searchQuery && statusFilter === "all" && (
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
                        {assignment.courseId?.title || "Unknown Course"}
                      </h3>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(
                          assignment.status,
                        )}`}
                      >
                        {assignment.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Assignment Details */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      <span>
                        Category: {assignment.courseId?.category || "N/A"}
                      </span>
                      <span>
                        Assigned to:{" "}
                        {assignment.assignedTo.type === "balagruha"
                          ? `Entire Balagruha (${assignment.progress.totalStudents} students)`
                          : `${assignment.progress.totalStudents} specific students`}
                      </span>
                      <span>Due: {formatDate(assignment.dueDate)}</span>
                      <span>
                        Assigned:{" "}
                        {formatDate(
                          assignment.assignedAt || assignment.createdAt,
                        )}
                      </span>
                    </div>

                    {/* Progress bar with friendly empty state when no students have started */}
                    <div className="mb-3">
                      {assignment.progress.studentsStarted === 0 ? (
                        <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                          <span className="text-base leading-5"></span>
                          <span>
                            No students have started yet - progress will update
                            as students view course content.
                            {assignment.progress.totalStudents > 0 && (
                              <span className="text-gray-500">
                                {" "}
                                ({assignment.progress.totalStudents}{" "}
                                {assignment.progress.totalStudents === 1
                                  ? "student"
                                  : "students"}{" "}
                                assigned)
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
                                  100,
                              ) || 0}
                              %)
                            </span>
                            <span>
                              Avg Completion:{" "}
                              {assignment.progress
                                .averageCompletionPercentage || 0}
                              %
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${
                                  assignment.progress
                                    .averageCompletionPercentage || 0
                                }%`,
                              }}
                            ></div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <div
                    className="ml-4 relative"
                    ref={
                      openMenuAssignmentId === assignment._id ? menuRef : null
                    }
                  >
                    <button
                      type="button"
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuToggle(assignment._id);
                      }}
                    >
                      ...
                    </button>
                    {openMenuAssignmentId === assignment._id && (
                      <div className="absolute right-0 top-10 z-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
                        <button
                          type="button"
                          onClick={() => handleEditAssignment(assignment)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Edit Assignment
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAssignment(assignment._id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Delete Assignment
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setProgressAssignmentId(assignment._id)}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                  >
                    View Progress Report
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAssignmentStatus(assignment)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                  >
                    {assignment.status === "cancelled"
                      ? "Assign Assignment"
                      : "Unassign Assignment"}
                  </button>
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

      <CoachAssignmentEditModal
        isOpen={!!editAssignment}
        onClose={() => setEditAssignment(null)}
        assignment={editAssignment}
        onSaved={() => fetchAssignments()}
        coachId={coachId}
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
