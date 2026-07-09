import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Upload, ArrowLeft, Plus, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { useRBAC } from '../../contexts/RBACContext';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useAutoSave } from '../../hooks/useAutoSave';
import ModuleCard from '../../components/admin/ModuleCard';
import AddModuleModal from '../../components/admin/AddModuleModal';
import LoadingState from '../../components/common/LoadingState';

/**
 * CourseStructureBuilder - Sprint 2 Epic 02 Story 01
 * Page for building course structure: Module → Chapter → Content Item
 *
 * Sprint 2 Story 05 — when `readOnly` is true, the builder hides all mutation
 * controls (Add Module, Manage Quizzes, Publish, drag reorder), disables the
 * auto-save hook, and swaps the Back button to point at /coach/courses. Used
 * by CoachCourseDetailPage for read-only browsing. Admin callers omit the
 * prop and get unchanged behavior.
 */

export default function CourseStructureBuilder({ readOnly = false } = {}) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useRBAC();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to activate drag
      },
    })
  );

  // Auto-save function
  const autoSaveCourse = async (courseData) => {
    if (!courseData || !courseData._id) return;

    // Only auto-save course metadata, not the full structure
    // (structure updates happen via dedicated endpoints)
    await api.put(`/api/v2/lms/admin/courses/${courseData._id}`, {
      title: courseData.title,
      description: courseData.description,
      category: courseData.category,
      difficultyLevel: courseData.difficultyLevel,
      thumbnail: courseData.thumbnail,
      icon: courseData.icon,
    });
  };

  // Auto-save with debounce — disabled in read-only mode so coaches
  // browsing a course never trigger metadata PUT calls.
  const { status: saveStatus, error: saveError, retrySave } = useAutoSave(
    autoSaveCourse,
    course,
    {
      delay: 1000, // 1 second debounce
      maxRetries: 3,
      enabled: !!course && !readOnly
    }
  );

  // Fetch course data
  useEffect(() => {
    // Admin callers require Manage; coach read-only callers only need Read.
    const required = readOnly ? 'Read' : 'Manage';
    if (hasPermission('LMS Management', required)) {
      fetchCourse();
    }
  }, [courseId, readOnly]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v2/lms/admin/courses/${courseId}`);
      setCourse(response.data.data);

      // Auto-expand first module
      if (response.data.data.modules?.length > 0) {
        setExpandedModules(new Set([response.data.data.modules[0]._id]));
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      if (readOnly && error.response?.status === 403) {
        toast.error('Course not available');
      } else {
        toast.error('Failed to load course');
      }
      navigate(readOnly ? '/coach/courses' : '/admin/courses');
    } finally {
      setLoading(false);
    }
  };

  const toggleModuleExpansion = (moduleId) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const toggleChapterExpansion = (chapterId) => {
    setExpandedChapters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  const handleAddModule = async (moduleData) => {
    try {
      const response = await api.post(
        `/api/v2/lms/admin/courses/${courseId}/modules`,
        moduleData
      );

      if (response.data.success) {
        toast.success('Module added successfully!');
        fetchCourse(); // Refresh course data
        setIsAddModuleModalOpen(false);
      }
    } catch (error) {
      console.error('Error adding module:', error);
      toast.error('Failed to add module');
    }
  };

  const handleModuleUpdated = () => {
    fetchCourse();
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = course.modules.findIndex((m) => m._id === active.id);
    const newIndex = course.modules.findIndex((m) => m._id === over.id);

    // Optimistically update UI
    const reorderedModules = arrayMove(course.modules, oldIndex, newIndex);
    setCourse({ ...course, modules: reorderedModules });

    try {
      // Call backend API to persist order
      const orderedIds = reorderedModules.map((m) => m._id);
      await api.put(`/api/v2/lms/admin/courses/${courseId}/reorder`, {
        level: 'module',
        orderedIds
      });

      toast.success('Module order updated');
    } catch (error) {
      console.error('Error reordering modules:', error);
      toast.error('Failed to reorder modules');
      // Revert optimistic update
      fetchCourse();
    }
  };

  const handlePublish = async () => {
    try {
      setSaving(true);
      const response = await api.put(`/api/v2/lms/admin/courses/${courseId}/publish`);

      if (response.data.success) {
        toast.success('Course published successfully!');
        fetchCourse();
      }
    } catch (error) {
      console.error('Error publishing course:', error);

      if (error.response?.data?.errors) {
        const errorList = error.response.data.errors.join('\n• ');
        toast.error(`Cannot publish:\n• ${errorList}`, {
          duration: 6000,
          style: { whiteSpace: 'pre-line' }
        });
      } else {
        toast.error('Failed to publish course');
      }
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return <LoadingState message="Loading course structure..." fullScreen />;
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Course not found</p>
          <button
            onClick={() => navigate(readOnly ? '/coach/courses' : '/admin/courses')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Course Header - Purple Theme */}
      <div className="bg-purple-100 border-b border-purple-200">
        <div className="px-6 py-6">
          {/* Back Button */}
          <button
            onClick={() => navigate(readOnly ? '/coach/courses' : '/admin/courses')}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-800 mb-4"
          >
            <ArrowLeft size={20} />
            <span>{readOnly ? 'Back to Courses' : 'Back to Course List'}</span>
          </button>

          {/* Course Title & Actions */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-purple-900">
                  {course.title}
                </h1>
                {getStatusBadge(course.status)}
              </div>
              <p className="text-purple-700">{course.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-purple-600">
                <span>Category: <strong>{course.category}</strong></span>
                <span>•</span>
                <span>Difficulty: <strong>{course.difficultyLevel}</strong></span>
                <span>•</span>
                <span>
                  {course.modules?.length || 0} Modules • {course.chapterCount || 0} Chapters • {course.contentItemCount || 0} Items
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Auto-save Status Indicator — only admin mode runs auto-save */}
              {!readOnly && saveStatus === 'saving' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  <RefreshCw size={16} className="animate-spin" />
                  <span className="text-sm font-medium">Saving...</span>
                </div>
              )}
              {!readOnly && saveStatus === 'saved' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                  <Check size={16} />
                  <span className="text-sm font-medium">All changes saved</span>
                </div>
              )}
              {!readOnly && saveStatus === 'error' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg border border-red-200">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">Save failed</span>
                  <button
                    onClick={retrySave}
                    className="ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!readOnly && (
                <button
                  onClick={() => navigate(`/admin/courses/${courseId}/quizzes/create`)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50"
                >
                  <Plus size={18} />
                  Manage Quizzes
                </button>
              )}
              <button
                onClick={() => fetchCourse()}
                className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50"
              >
                <Save size={18} />
                Refresh
              </button>
              {!readOnly && course.status === 'draft' && (
                <button
                  onClick={handlePublish}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  <Upload size={18} />
                  {saving ? 'Publishing...' : 'Publish Course'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Structure Builder */}
      <div className="w-full px-6 py-6">
        {/* Add Module Button — hidden in read-only mode */}
        {!readOnly && (
          <div className="mb-6">
            <button
              onClick={() => setIsAddModuleModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-md hover:shadow-lg transition-all"
            >
              <Plus size={20} />
              Add Module
            </button>
          </div>
        )}

        {/* Modules List */}
        {(!course.modules || course.modules.length === 0) ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg mb-2">
              {readOnly ? 'This course has no content yet' : 'No modules yet'}
            </p>
            {!readOnly && (
              <p className="text-gray-400 text-sm">
                Click "Add Module" to start building your course structure
              </p>
            )}
          </div>
        ) : readOnly ? (
          <div className="space-y-4">
            {course.modules
              .sort((a, b) => a.order - b.order)
              .map((module, index) => (
                <ModuleCard
                  key={module._id}
                  module={module}
                  moduleIndex={index}
                  courseId={courseId}
                  isExpanded={expandedModules.has(module._id)}
                  onToggleExpansion={() => toggleModuleExpansion(module._id)}
                  expandedChapters={expandedChapters}
                  onToggleChapterExpansion={toggleChapterExpansion}
                  onModuleUpdated={handleModuleUpdated}
                  readOnly
                />
              ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={course.modules.map((m) => m._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {course.modules
                  .sort((a, b) => a.order - b.order)
                  .map((module, index) => (
                    <ModuleCard
                      key={module._id}
                      module={module}
                      moduleIndex={index}
                      courseId={courseId}
                      isExpanded={expandedModules.has(module._id)}
                      onToggleExpansion={() => toggleModuleExpansion(module._id)}
                      expandedChapters={expandedChapters}
                      onToggleChapterExpansion={toggleChapterExpansion}
                      onModuleUpdated={handleModuleUpdated}
                    />
                  ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add Module Modal — never mounted in read-only mode */}
      {!readOnly && isAddModuleModalOpen && (
        <AddModuleModal
          isOpen={isAddModuleModalOpen}
          onClose={() => setIsAddModuleModalOpen(false)}
          onAdd={handleAddModule}
        />
      )}
    </div>
  );
}
