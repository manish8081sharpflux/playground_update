import React, { useEffect, useRef } from 'react';
import {
  Edit2,
  Copy,
  Upload,
  Archive,
  RefreshCw,
  Trash2,
  FolderTree,
  ArrowDown,
  Users
} from 'lucide-react';

/**
 * ContextMenu - Sprint 2 Epic 02 Story 01
 * Three-dot dropdown menu for course actions
 */

export default function ContextMenu({
  courseId,
  course,
  position,
  onClose,
  onEdit,
  onPublish,
  onUnpublish,
  onArchive,
  onRestore,
  onDelete,
  onDuplicate,
  onAssign
}) {
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const menuItems = [
    {
      label: 'Edit Metadata',
      icon: Edit2,
      action: () => onEdit(course),
      show: true,
      color: 'text-gray-700 hover:bg-gray-50'
    },
    {
      label: 'Edit Structure',
      icon: FolderTree,
      action: () => {
        // Navigate to structure builder
        window.location.href = `/admin/courses/${courseId}/structure`;
      },
      show: true,
      color: 'text-gray-700 hover:bg-gray-50'
    },
    {
      label: 'Assign Course',
      icon: Users,
      action: () => onAssign(course),
      show: course?.status === 'published',
      color: 'text-blue-700 hover:bg-blue-50'
    },
    {
      label: 'Duplicate Course',
      icon: Copy,
      action: () => onDuplicate(courseId),
      show: true,
      color: 'text-gray-700 hover:bg-gray-50'
    },
    {
      type: 'divider',
      show: true
    },
    {
      label: 'Publish',
      icon: Upload,
      action: () => onPublish(course),
      show: course?.status === 'draft',
      color: 'text-green-700 hover:bg-green-50'
    },
    {
      label: 'Unpublish',
      icon: ArrowDown,
      action: () => onUnpublish(course),
      show: course?.status === 'published',
      color: 'text-yellow-700 hover:bg-yellow-50'
    },
    {
      label: 'Archive',
      icon: Archive,
      action: () => onArchive(course),
      show: course?.status === 'published',
      color: 'text-orange-700 hover:bg-orange-50'
    },
    {
      label: 'Restore',
      icon: RefreshCw,
      action: () => onRestore(course),
      show: course?.status === 'archived',
      color: 'text-blue-700 hover:bg-blue-50'
    },
    {
      type: 'divider',
      show: course?.status === 'draft' || course?.status === 'archived'
    },
    {
      label: 'Delete Permanently',
      icon: Trash2,
      action: () => onDelete(courseId),
      show: true,
      color: 'text-red-700 hover:bg-red-50'
    }
  ];

  // Adjust menu position to stay within viewport
  const getMenuStyle = () => {
    const menuWidth = 220;
    const menuHeight = 300;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }

    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }

    return {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: 1000
    };
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <div
        ref={menuRef}
        style={getMenuStyle()}
        className="bg-white rounded-lg shadow-2xl border border-gray-200 py-2 w-56 z-50"
      >
        {menuItems
          .filter((item) => item.show)
          .map((item, index) => {
            if (item.type === 'divider') {
              return (
                <div
                  key={`divider-${index}`}
                  className="my-1 border-t border-gray-200"
                />
              );
            }

            const Icon = item.icon;

            return (
              <button
                key={item.label}
                onClick={item.action}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${item.color}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
      </div>
    </>
  );
}
