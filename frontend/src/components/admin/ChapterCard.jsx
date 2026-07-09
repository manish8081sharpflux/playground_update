import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreVertical, Trash2, Edit2, GripVertical } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../utils/dialogs';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import ContentItemCard from './ContentItemCard';
import AddContentItemModal from './AddContentItemModal';
import EditChapterModal from './EditChapterModal';

/**
 * ChapterCard - Sprint 2 Epic 02 Story 01
 * Displays a chapter with expandable content items
 */

export default function ChapterCard({
  chapter,
  chapterIndex,
  moduleId,
  courseId,
  isExpanded,
  onToggleExpansion,
  onChapterUpdated,
  readOnly = false
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isAddContentModalOpen, setIsAddContentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [localContentItems, setLocalContentItems] = useState(chapter.contentItems || []);

  // Drag-and-drop for chapter. Hook called unconditionally; output gated below.
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Sensors for content item drag-and-drop
  const contentSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Update local content items when chapter.contentItems changes
  React.useEffect(() => {
    setLocalContentItems(chapter.contentItems || []);
  }, [chapter.contentItems]);

  const handleAddContentItem = async (contentData) => {
    try {
      const response = await api.post(
        `/api/v2/lms/admin/courses/${courseId}/modules/${moduleId}/chapters/${chapter._id}/content`,
        contentData
      );

      if (response.data.success) {
        toast.success('Content item added successfully!');
        onChapterUpdated();
        setIsAddContentModalOpen(false);
      }
    } catch (error) {
      console.error('❌ Error adding content item:', error);
      if (error.response) {
        console.error('Backend Error Response:', error.response.data);
      }
      toast.error('Failed to add content item');
    }
  };

  const handleDelete = async () => {
    if (!(await confirmDialog(`Are you sure you want to delete "${chapter.title}"?`, { danger: true, confirmText: 'Delete' }))) {
      setShowMenu(false);
      return;
    }

    try {
      const response = await api.delete(
        `/api/v2/lms/admin/courses/${courseId}/modules/${moduleId}/chapters/${chapter._id}`
      );

      if (response.data.success) {
        toast.success('Chapter deleted successfully');
        onChapterUpdated();
      }
    } catch (error) {
      console.error('Error deleting chapter:', error);
      toast.error('Failed to delete chapter');
    } finally {
      setShowMenu(false);
    }
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
    setShowMenu(false);
  };

  const handleContentDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localContentItems.findIndex((c) => c._id === active.id);
    const newIndex = localContentItems.findIndex((c) => c._id === over.id);

    // Optimistically update UI
    const reorderedContent = arrayMove(localContentItems, oldIndex, newIndex);
    setLocalContentItems(reorderedContent);

    try {
      // Call backend API to persist order
      const orderedIds = reorderedContent.map((c) => c._id);
      await api.put(`/api/v2/lms/admin/courses/${courseId}/reorder`, {
        level: 'content',
        parentId: chapter._id,
        orderedIds
      });

      toast.success('Content order updated');
      onChapterUpdated();
    } catch (error) {
      console.error('Error reordering content items:', error);
      toast.error('Failed to reorder content items');
      // Revert optimistic update
      setLocalContentItems(chapter.contentItems || []);
    }
  };

  const contentItemCount = chapter.contentItems?.length || 0;

  return (
    <div
      ref={readOnly ? undefined : setNodeRef}
      style={readOnly ? undefined : style}
      className={`ml-8 bg-white border border-gray-200 rounded-lg ${!readOnly && isDragging ? 'shadow-xl ring-2 ring-blue-300' : ''}`}
    >
      {/* Chapter Header */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 flex items-start gap-2">
            {/* Drag Handle — hidden in read-only mode */}
            {!readOnly && (
              <button
                {...attributes}
                {...listeners}
                className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical size={18} className="text-gray-300" />
              </button>
            )}

            {/* Expand/Collapse Button */}
            <button
              onClick={onToggleExpansion}
              className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown size={18} className="text-gray-600" />
              ) : (
                <ChevronRight size={18} className="text-gray-600" />
              )}
            </button>

            {/* Chapter Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <h4 className="text-md font-semibold text-gray-900">
                  Chapter {chapterIndex + 1}: {chapter.title}
                </h4>
              </div>
              {chapter.description && (
                <p className="text-gray-600 text-sm mt-1 ml-7">
                  {chapter.description}
                </p>
              )}
              {!isExpanded && contentItemCount > 0 && (
                <p className="text-gray-500 text-xs mt-1 ml-7">
                  {contentItemCount} Content Items
                </p>
              )}
            </div>
          </div>

          {/* Chapter Menu — hidden in read-only mode */}
          {!readOnly && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <MoreVertical size={18} className="text-gray-600" />
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
                      Edit Chapter
                    </button>
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      Delete Chapter
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Add Content Item Button — hidden in read-only mode */}
        {!readOnly && isExpanded && (
          <div className="ml-7 mt-3">
            <button
              onClick={() => setIsAddContentModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus size={14} />
              Add Content Item
            </button>
          </div>
        )}
      </div>

      {/* Content Items List (when expanded) */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {(!localContentItems || localContentItems.length === 0) ? (
            <div className="ml-7 bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-gray-500 text-xs">No content items yet</p>
              {!readOnly && (
                <p className="text-gray-400 text-xs mt-1">
                  Click "Add Content Item" to add videos, PDFs, quizzes, etc.
                </p>
              )}
            </div>
          ) : readOnly ? (
            <>
              {localContentItems
                .sort((a, b) => a.order - b.order)
                .map((contentItem) => (
                  <ContentItemCard
                    key={contentItem._id}
                    contentItem={contentItem}
                    chapterId={chapter._id}
                    moduleId={moduleId}
                    courseId={courseId}
                    onContentUpdated={onChapterUpdated}
                    readOnly
                  />
                ))}
            </>
          ) : (
            <DndContext
              sensors={contentSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleContentDragEnd}
            >
              <SortableContext
                items={localContentItems.map((c) => c._id)}
                strategy={verticalListSortingStrategy}
              >
                {localContentItems
                  .sort((a, b) => a.order - b.order)
                  .map((contentItem) => (
                    <ContentItemCard
                      key={contentItem._id}
                      contentItem={contentItem}
                      chapterId={chapter._id}
                      moduleId={moduleId}
                      courseId={courseId}
                      onContentUpdated={onChapterUpdated}
                    />
                  ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* Add Content Item Modal — never mounted in read-only mode */}
      {!readOnly && isAddContentModalOpen && (
        <AddContentItemModal
          isOpen={isAddContentModalOpen}
          onClose={() => setIsAddContentModalOpen(false)}
          onAdd={handleAddContentItem}
        />
      )}

      {/* Edit Chapter Modal — never mounted in read-only mode */}
      {!readOnly && isEditModalOpen && (
        <EditChapterModal
          isOpen={isEditModalOpen}
          chapter={chapter}
          moduleId={moduleId}
          courseId={courseId}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={onChapterUpdated}
        />
      )}
    </div>
  );
}
