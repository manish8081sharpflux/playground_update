import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Calendar, BarChart2, FolderOpen, Users } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../utils/dialogs';
import ContextMenu from './ContextMenu';
import CourseCreationModal from './CourseCreationModal';
import PublishValidationModal from './PublishValidationModal';
import ArchiveConfirmationModal from './ArchiveConfirmationModal';
import RestoreCourseModal from './RestoreCourseModal';
import UnpublishConfirmationModal from './UnpublishConfirmationModal';
import BulkActionsBar from './BulkActionsBar';
import BulkOperationModal from './BulkOperationModal';
import AdminCourseAssignmentModal from './AdminCourseAssignmentModal';

/**
 * CourseListView - Sprint 2 Epic 02 Story 01
 * Displays list of courses with context menu actions
 *
 * Sprint 2 Story 05 — when `readOnly` is true, the view hides all mutation
 * UI (context menu, bulk actions, select-all, create/edit/publish/archive/
 * delete modals) and swaps in a "View Content" primary CTA that navigates
 * to `/coach/courses/:id`. Used by CoachCoursesPage to browse balagruha-
 * assigned courses. Admin callers omit the prop and get unchanged behavior.
 */

export default function CourseListView({
  courses,
  loading,
  onCourseUpdated,
  onCourseDeleted,
  onRefresh,
  readOnly = false
}) {
  const navigate = useNavigate();
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  // Epic 02 Story 05: Publish validation modal
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [courseToPublish, setCourseToPublish] = useState(null);

  // Epic 02 Story 05: Archive confirmation modal
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [courseToArchive, setCourseToArchive] = useState(null);

  // Epic 02 Story 05: Restore course modal
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [courseToRestore, setCourseToRestore] = useState(null);

  // Epic 02 Story 05: Unpublish confirmation modal
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false);
  const [courseToUnpublish, setCourseToUnpublish] = useState(null);

  // Epic 02 Story 05: Bulk operations
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkOperation, setBulkOperation] = useState(null); // 'publish', 'archive', 'delete'

  // Admin Course Assignment
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [courseToAssign, setCourseToAssign] = useState(null);

  // Status badge styles
  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-200 text-gray-700',
      published: 'bg-green-100 text-green-700',
      archived: 'bg-red-100 text-red-700'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status] || styles.draft}`}>
        {status === 'draft' && 'Draft'}
        {status === 'published' && 'Published'}
        {status === 'archived' && 'Archived'}
      </span>
    );
  };

  const handleMenuClick = (e, courseId) => {
    e.preventDefault();
    setSelectedCourseId(courseId);
    setMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => {
    setSelectedCourseId(null);
  };

  const handleEdit = (course) => {
    setCourseToEdit(course);
    setIsEditModalOpen(true);
    closeMenu();
  };

  // Epic 02 Story 05: Open publish validation modal
  const handlePublish = (course) => {
    setCourseToPublish(course);
    setIsPublishModalOpen(true);
    closeMenu();
  };

  const handlePublishSuccess = () => {
    setIsPublishModalOpen(false);
    setCourseToPublish(null);
    onRefresh();
  };

  // Epic 02 Story 05: Open archive confirmation modal
  const handleArchive = (course) => {
    setCourseToArchive(course);
    setIsArchiveModalOpen(true);
    closeMenu();
  };

  const handleArchiveSuccess = () => {
    setIsArchiveModalOpen(false);
    setCourseToArchive(null);
    onRefresh();
  };

  // Epic 02 Story 05: Open restore course modal
  const handleRestore = (course) => {
    setCourseToRestore(course);
    setIsRestoreModalOpen(true);
    closeMenu();
  };

  const handleRestoreSuccess = () => {
    setIsRestoreModalOpen(false);
    setCourseToRestore(null);
    onRefresh();
  };

  // Epic 02 Story 05: Open unpublish confirmation modal
  const handleUnpublish = (course) => {
    setCourseToUnpublish(course);
    setIsUnpublishModalOpen(true);
    closeMenu();
  };

  const handleUnpublishSuccess = () => {
    setIsUnpublishModalOpen(false);
    setCourseToUnpublish(null);
    onRefresh();
  };

  const handleDelete = async (courseId) => {
    if (!(await confirmDialog('Are you sure you want to delete this course permanently? This action cannot be undone.', { danger: true, confirmText: 'Delete' }))) {
      closeMenu();
      return;
    }

    try {
      setActionLoading(true);
      const response = await api.delete(`/api/v2/lms/admin/courses/${courseId}`);

      if (response.data.success) {
        onCourseDeleted(courseId);
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    } finally {
      setActionLoading(false);
      closeMenu();
    }
  };

  const handleDuplicate = async (courseId) => {
    try {
      setActionLoading(true);
      const response = await api.post(`/api/v2/lms/admin/courses/${courseId}/duplicate`);

      if (response.data.success) {
        toast.success('Course duplicated successfully!');
        onRefresh();
      }
    } catch (error) {
      console.error('Error duplicating course:', error);
      toast.error('Failed to duplicate course');
    } finally {
      setActionLoading(false);
      closeMenu();
    }
  };

  // Admin Course Assignment
  const handleAssign = (course) => {
    setCourseToAssign(course);
    setIsAssignModalOpen(true);
    closeMenu();
  };

  const handleAssignSuccess = () => {
    setIsAssignModalOpen(false);
    setCourseToAssign(null);
    toast.success('Course assigned successfully!');
  };

  // Epic 02 Story 05: Bulk operations handlers
  const handleSelectCourse = (courseId) => {
    setSelectedCourseIds(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedCourseIds.length === courses.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(courses.map(c => c._id));
    }
  };

  const handleClearSelection = () => {
    setSelectedCourseIds([]);
  };

  const handleBulkPublish = () => {
    const draftCourses = courses.filter(
      c => selectedCourseIds.includes(c._id) && c.status === 'draft'
    );
    if (draftCourses.length === 0) {
      toast.error('No draft courses selected');
      return;
    }
    setBulkOperation('publish');
    setIsBulkModalOpen(true);
  };

  const handleBulkArchive = () => {
    const publishedCourses = courses.filter(
      c => selectedCourseIds.includes(c._id) && c.status === 'published'
    );
    if (publishedCourses.length === 0) {
      toast.error('No published courses selected');
      return;
    }
    setBulkOperation('archive');
    setIsBulkModalOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedCourseIds.length === 0) {
      toast.error('No courses selected');
      return;
    }
    setBulkOperation('delete');
    setIsBulkModalOpen(true);
  };

  const handleBulkOperationSuccess = () => {
    setIsBulkModalOpen(false);
    setBulkOperation(null);
    setSelectedCourseIds([]);
    onRefresh();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-lg mb-2">
          {readOnly ? 'No courses assigned to your Balagruhas yet' : 'No courses found'}
        </p>
        <p className="text-gray-400 text-sm">
          {readOnly ? (
            <>
              Use{' '}
              <button
                onClick={() => navigate('/coach/assignments')}
                className="text-purple-600 hover:underline"
              >
                Assignments
              </button>{' '}
              to assign one.
            </>
          ) : (
            'Click "Create New Course" to get started'
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Select All Checkbox - hidden in read-only mode */}
      {!readOnly && courses.length > 0 && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedCourseIds.length === courses.length}
            onChange={handleSelectAll}
            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
          />
          <span className="font-semibold text-purple-900">
            {selectedCourseIds.length === courses.length
              ? `All ${courses.length} courses selected`
              : `Select all ${courses.length} courses`}
          </span>
          {selectedCourseIds.length > 0 && selectedCourseIds.length < courses.length && (
            <span className="text-purple-700">
              ({selectedCourseIds.length} selected)
            </span>
          )}
        </div>
      )}

      {courses.map((course) => (
        <div
          key={course._id}
          className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-colors ${!readOnly && selectedCourseIds.includes(course._id)
              ? 'border-purple-400 bg-purple-50'
              : 'border-gray-200 hover:border-purple-300'
            }`}
        >
          <div className="flex items-start gap-4">
            {/* Checkbox - hidden in read-only mode */}
            {!readOnly && (
              <div className="flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={selectedCourseIds.includes(course._id)}
                  onChange={() => handleSelectCourse(course._id)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Thumbnail */}
            <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              {course.thumbnail && !imageErrors[course._id] ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover"
                  onError={() => setImageErrors(prev => ({ ...prev, [course._id]: true }))}
                />
              ) : (
                <div className="text-4xl">
                  {course.icon || '📚'}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900">
                      {course.title}
                    </h3>
                    {getStatusBadge(course.status)}
                  </div>
                  <p className="text-gray-600 mt-2 line-clamp-2">
                    {course.description}
                  </p>
                </div>

                {/* Context Menu Button — hidden in read-only mode */}
                {!readOnly && (
                  <button
                    onClick={(e) => handleMenuClick(e, course._id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={actionLoading}
                  >
                    <MoreVertical size={20} className="text-gray-600" />
                  </button>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                <span>Category: <span className="font-medium text-gray-700">{course.category}</span></span>
                <span>•</span>
                <span>Difficulty: <span className="font-medium text-gray-700">{course.difficultyLevel}</span></span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <BarChart2 size={16} />
                  <span>
                    {course.moduleCount || 0} Modules • {course.chapterCount || 0} Chapters • {course.contentItemCount || 0} Items
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>Created: {new Date(course.createdAt).toLocaleDateString()}</span>
                </div>
                <span>•</span>
                <span>Last Updated: {new Date(course.updatedAt).toLocaleDateString()}</span>
              </div>

              {/* Assignment info line — only shown in read-only (coach) mode */}
              {readOnly && course.assignmentInfo && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-2 text-sm text-gray-600">
                  <Users size={16} className="mt-0.5 text-purple-600 flex-shrink-0" />
                  <span>
                    Assigned to:{' '}
                    <span className="font-medium text-gray-800">
                      {(course.assignmentInfo.balagruhaNames || []).join(', ') || '—'}
                    </span>
                    {' '}({course.assignmentInfo.studentCount || 0} students,{' '}
                    {course.assignmentInfo.startedCount || 0} started,{' '}
                    {course.assignmentInfo.completedCount || 0} completed)
                  </span>
                </div>
              )}

              {/* Read-only primary CTA: View Content */}
              {readOnly && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => navigate(`/coach/courses/${course._id}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                  >
                    <FolderOpen size={18} />
                    View Content
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Context Menu — never rendered in read-only mode */}
      {!readOnly && selectedCourseId && (
        <ContextMenu
          courseId={selectedCourseId}
          course={courses.find(c => c._id === selectedCourseId)}
          position={menuPosition}
          onClose={closeMenu}
          onEdit={handleEdit}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onAssign={handleAssign}
        />
      )}

      {/* Edit Modal */}
      {!readOnly && isEditModalOpen && courseToEdit && (
        <CourseCreationModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setCourseToEdit(null);
          }}
          onCourseCreated={(updatedCourse) => {
            onCourseUpdated(updatedCourse);
            setIsEditModalOpen(false);
            setCourseToEdit(null);
          }}
          courseToEdit={courseToEdit}
        />
      )}

      {/* Publish Validation Modal - Epic 02 Story 05 */}
      {!readOnly && isPublishModalOpen && courseToPublish && (
        <PublishValidationModal
          isOpen={isPublishModalOpen}
          onClose={() => {
            setIsPublishModalOpen(false);
            setCourseToPublish(null);
          }}
          course={courseToPublish}
          onPublishSuccess={handlePublishSuccess}
        />
      )}

      {/* Archive Confirmation Modal - Epic 02 Story 05 */}
      {!readOnly && isArchiveModalOpen && courseToArchive && (
        <ArchiveConfirmationModal
          isOpen={isArchiveModalOpen}
          onClose={() => {
            setIsArchiveModalOpen(false);
            setCourseToArchive(null);
          }}
          course={courseToArchive}
          onArchiveSuccess={handleArchiveSuccess}
        />
      )}

      {/* Restore Course Modal - Epic 02 Story 05 */}
      {!readOnly && isRestoreModalOpen && courseToRestore && (
        <RestoreCourseModal
          isOpen={isRestoreModalOpen}
          onClose={() => {
            setIsRestoreModalOpen(false);
            setCourseToRestore(null);
          }}
          course={courseToRestore}
          onRestoreSuccess={handleRestoreSuccess}
        />
      )}

      {/* Unpublish Confirmation Modal - Epic 02 Story 05 */}
      {!readOnly && isUnpublishModalOpen && courseToUnpublish && (
        <UnpublishConfirmationModal
          isOpen={isUnpublishModalOpen}
          onClose={() => {
            setIsUnpublishModalOpen(false);
            setCourseToUnpublish(null);
          }}
          course={courseToUnpublish}
          onUnpublishSuccess={handleUnpublishSuccess}
        />
      )}

      {/* Bulk Actions Bar - Epic 02 Story 05 — hidden in read-only */}
      {!readOnly && (
        <BulkActionsBar
          selectedCourseIds={selectedCourseIds}
          courses={courses}
          onClearSelection={handleClearSelection}
          onBulkPublish={handleBulkPublish}
          onBulkArchive={handleBulkArchive}
          onBulkDelete={handleBulkDelete}
        />
      )}

      {/* Bulk Operation Modal - Epic 02 Story 05 */}
      {!readOnly && isBulkModalOpen && bulkOperation && (
        <BulkOperationModal
          isOpen={isBulkModalOpen}
          onClose={() => {
            setIsBulkModalOpen(false);
            setBulkOperation(null);
          }}
          operation={bulkOperation}
          selectedCourses={courses.filter(c => {
            // Filter based on operation type
            if (bulkOperation === 'publish') {
              return selectedCourseIds.includes(c._id) && c.status === 'draft';
            } else if (bulkOperation === 'archive') {
              return selectedCourseIds.includes(c._id) && c.status === 'published';
            } else if (bulkOperation === 'delete') {
              return selectedCourseIds.includes(c._id);
            }
            return false;
          })}
          onSuccess={handleBulkOperationSuccess}
        />
      )}

      {/* Admin Course Assignment Modal */}
      {!readOnly && isAssignModalOpen && courseToAssign && (
        <AdminCourseAssignmentModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setCourseToAssign(null);
          }}
          course={courseToAssign}
          onAssignmentSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
}
