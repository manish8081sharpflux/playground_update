import React from 'react';
import { X, Upload, Archive, Trash2 } from 'lucide-react';

/**
 * BulkActionsBar - Epic 02 Story 05
 * Floating action bar for bulk operations on selected courses
 *
 * Acceptance Criteria:
 * BULK-01: Checkbox selection for multiple courses
 * BULK-02: Bulk actions bar appears when courses selected
 * BULK-03: "Bulk Publish" validates all selected courses
 * BULK-04: "Bulk Archive" processes multiple courses
 * BULK-05: Progress indicator during bulk operations
 * BULK-06: Summary report after bulk operation completion
 */
export default function BulkActionsBar({
  selectedCourseIds,
  courses,
  onClearSelection,
  onBulkPublish,
  onBulkArchive,
  onBulkDelete
}) {
  if (selectedCourseIds.length === 0) return null;

  const selectedCourses = courses.filter(c => selectedCourseIds.includes(c._id));

  // Count by status
  const draftCount = selectedCourses.filter(c => c.status === 'draft').length;
  const publishedCount = selectedCourses.filter(c => c.status === 'published').length;
  const archivedCount = selectedCourses.filter(c => c.status === 'archived').length;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-purple-600 text-white rounded-full shadow-2xl px-8 py-4 flex items-center gap-6 border-4 border-purple-700">
        {/* Selection count */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{selectedCourseIds.length}</span>
          <span className="text-purple-100">
            {selectedCourseIds.length === 1 ? 'course' : 'courses'} selected
          </span>
        </div>

        {/* Status breakdown */}
        {(draftCount > 0 || publishedCount > 0 || archivedCount > 0) && (
          <>
            <div className="w-px h-8 bg-purple-400"></div>
            <div className="flex items-center gap-3 text-sm">
              {draftCount > 0 && (
                <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full font-semibold">
                  {draftCount} Draft
                </span>
              )}
              {publishedCount > 0 && (
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                  {publishedCount} Published
                </span>
              )}
              {archivedCount > 0 && (
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">
                  {archivedCount} Archived
                </span>
              )}
            </div>
          </>
        )}

        {/* Divider */}
        <div className="w-px h-8 bg-purple-400"></div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Bulk Publish */}
          {draftCount > 0 && (
            <button
              onClick={onBulkPublish}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg font-semibold transition-colors"
              title={`Publish ${draftCount} draft course${draftCount !== 1 ? 's' : ''}`}
            >
              <Upload size={18} />
              <span>Publish ({draftCount})</span>
            </button>
          )}

          {/* Bulk Archive */}
          {publishedCount > 0 && (
            <button
              onClick={onBulkArchive}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg font-semibold transition-colors"
              title={`Archive ${publishedCount} published course${publishedCount !== 1 ? 's' : ''}`}
            >
              <Archive size={18} />
              <span>Archive ({publishedCount})</span>
            </button>
          )}

          {/* Bulk Delete */}
          <button
            onClick={onBulkDelete}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold transition-colors"
            title={`Delete ${selectedCourseIds.length} course${selectedCourseIds.length !== 1 ? 's' : ''}`}
          >
            <Trash2 size={18} />
            <span>Delete ({selectedCourseIds.length})</span>
          </button>
        </div>

        {/* Clear selection */}
        <button
          onClick={onClearSelection}
          className="ml-2 p-2 hover:bg-purple-500 rounded-full transition-colors"
          title="Clear selection"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
