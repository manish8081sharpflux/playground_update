import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreVertical, Trash2, Edit2, GripVertical } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import ChapterCard from './ChapterCard';
import AddChapterModal from './AddChapterModal';
import EditModuleModal from './EditModuleModal';

/**
 * ModuleCard - Sprint 2 Epic 02 Story 01
 * Displays a module with expandable chapters
 */

export default function ModuleCard({
  module,
  moduleIndex,
  courseId,
  isExpanded,
  onToggleExpansion,
  expandedChapters,
  onToggleChapterExpansion,
  onModuleUpdated,
  readOnly = false
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isAddChapterModalOpen, setIsAddChapterModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localChapters, setLocalChapters] = useState(module.chapters || []);

  // Drag-and-drop for module. The hook MUST be called unconditionally to
  // respect React hook rules — we simply don't apply its `attributes` /
  // `listeners` / drag handle UI when `readOnly` is true.
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Sensors for chapter drag-and-drop
  const chapterSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Update local chapters when module.chapters changes
  React.useEffect(() => {
    setLocalChapters(module.chapters || []);
  }, [module.chapters]);

  const handleAddChapter = async (chapterData) => {
    try {
      const response = await api.post(
        `/api/v2/lms/admin/courses/${courseId}/modules/${module._id}/chapters`,
        chapterData
      );

      if (response.data.success) {
        toast.success('Chapter added successfully!');
        onModuleUpdated();
        setIsAddChapterModalOpen(false);
      }
    } catch (error) {
      console.error('Error adding chapter:', error);
      toast.error('Failed to add chapter');
    }
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${module.title}"? This will delete all chapters and content items within this module.`)) {
      setShowMenu(false);
      return;
    }

    try {
      setDeleting(true);
      const response = await api.delete(`/api/v2/lms/admin/courses/${courseId}/modules/${module._id}`);

      if (response.data.success) {
        toast.success('Module deleted successfully');
        onModuleUpdated();
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Failed to delete module');
    } finally {
      setDeleting(false);
      setShowMenu(false);
    }
  };

  const handleChapterDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localChapters.findIndex((c) => c._id === active.id);
    const newIndex = localChapters.findIndex((c) => c._id === over.id);

    // Optimistically update UI
    const reorderedChapters = arrayMove(localChapters, oldIndex, newIndex);
    setLocalChapters(reorderedChapters);

    try {
      // Call backend API to persist order
      const orderedIds = reorderedChapters.map((c) => c._id);
      await api.put(`/api/v2/lms/admin/courses/${courseId}/reorder`, {
        level: 'chapter',
        parentId: module._id,
        orderedIds
      });

      toast.success('Chapter order updated');
      onModuleUpdated();
    } catch (error) {
      console.error('Error reordering chapters:', error);
      toast.error('Failed to reorder chapters');
      // Revert optimistic update
      setLocalChapters(module.chapters || []);
    }
  };

  const chapterCount = module.chapters?.length || 0;
  const contentItemCount = module.chapters?.reduce(
    (total, ch) => total + (ch.contentItems?.length || 0),
    0
  ) || 0;

  return (
    <div
      ref={readOnly ? undefined : setNodeRef}
      style={readOnly ? undefined : style}
      className={`bg-purple-50 border-2 border-purple-200 rounded-lg ${!readOnly && isDragging ? 'shadow-2xl ring-4 ring-purple-400' : ''}`}
    >
      {/* Module Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 flex items-start gap-3">
            {/* Drag Handle — hidden in read-only mode */}
            {!readOnly && (
              <button
                {...attributes}
                {...listeners}
                className="p-1 hover:bg-purple-100 rounded transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical size={20} className="text-purple-400" />
              </button>
            )}

            {/* Expand/Collapse Button */}
            <button
              onClick={onToggleExpansion}
              className="p-1 hover:bg-purple-100 rounded transition-colors flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown size={20} className="text-purple-600" />
              ) : (
                <ChevronRight size={20} className="text-purple-600" />
              )}
            </button>

            {/* Module Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📦</span>
                <h3 className="text-lg font-bold text-purple-900">
                  Module {moduleIndex + 1}: {module.title}
                </h3>
              </div>
              {module.description && (
                <p className="text-purple-700 text-sm mt-1 ml-8">
                  {module.description}
                </p>
              )}
              {!isExpanded && (
                <p className="text-purple-600 text-sm mt-2 ml-8">
                  {chapterCount} Chapters • {contentItemCount} Content Items
                </p>
              )}
            </div>
          </div>

          {/* Module Menu — hidden in read-only mode */}
          {!readOnly && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-purple-100 rounded transition-colors"
                disabled={deleting}
              >
                <MoreVertical size={20} className="text-purple-600" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-48 z-20">
                    <button
                      onClick={handleEdit}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit2 size={16} />
                      Edit Module
                    </button>
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      Delete Module
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Add Chapter Button — hidden in read-only mode */}
        {!readOnly && isExpanded && (
          <div className="ml-8 mt-3">
            <button
              onClick={() => setIsAddChapterModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              <Plus size={16} />
              Add Chapter
            </button>
          </div>
        )}
      </div>

      {/* Chapters List (when expanded) */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {(!localChapters || localChapters.length === 0) ? (
            <div className="ml-8 bg-white rounded-lg border border-purple-200 p-6 text-center">
              <p className="text-gray-500 text-sm">No chapters yet</p>
              {!readOnly && (
                <p className="text-gray-400 text-xs mt-1">
                  Click "Add Chapter" to add content to this module
                </p>
              )}
            </div>
          ) : readOnly ? (
            <>
              {localChapters
                .sort((a, b) => a.order - b.order)
                .map((chapter, chapterIndex) => (
                  <ChapterCard
                    key={chapter._id}
                    chapter={chapter}
                    chapterIndex={chapterIndex}
                    moduleId={module._id}
                    courseId={courseId}
                    isExpanded={expandedChapters.has(chapter._id)}
                    onToggleExpansion={() => onToggleChapterExpansion(chapter._id)}
                    onChapterUpdated={onModuleUpdated}
                    readOnly
                  />
                ))}
            </>
          ) : (
            <DndContext
              sensors={chapterSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleChapterDragEnd}
            >
              <SortableContext
                items={localChapters.map((c) => c._id)}
                strategy={verticalListSortingStrategy}
              >
                {localChapters
                  .sort((a, b) => a.order - b.order)
                  .map((chapter, chapterIndex) => (
                    <ChapterCard
                      key={chapter._id}
                      chapter={chapter}
                      chapterIndex={chapterIndex}
                      moduleId={module._id}
                      courseId={courseId}
                      isExpanded={expandedChapters.has(chapter._id)}
                      onToggleExpansion={() => onToggleChapterExpansion(chapter._id)}
                      onChapterUpdated={onModuleUpdated}
                    />
                  ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* Add Chapter Modal — never mounted in read-only mode */}
      {!readOnly && isAddChapterModalOpen && (
        <AddChapterModal
          isOpen={isAddChapterModalOpen}
          onClose={() => setIsAddChapterModalOpen(false)}
          onAdd={handleAddChapter}
        />
      )}

      {/* Edit Module Modal — never mounted in read-only mode */}
      {!readOnly && isEditModalOpen && (
        <EditModuleModal
          isOpen={isEditModalOpen}
          module={module}
          courseId={courseId}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={onModuleUpdated}
        />
      )}
    </div>
  );
}
