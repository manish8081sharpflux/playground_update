import React from 'react';

/**
 * AppCard Component - Epic 01 Story 02
 * Displays an application card in Pane 1 (Apps List)
 * Shows app name, icon, progress, and status indicator
 */
export default function AppCard({ app, isSelected, onClick }) {
  const { id, name, icon, totalTasks, completedTasks, status } = app;

  // Calculate progress
  const progressPercentage = totalTasks > 0
    ? Math.min(100, Math.max(0, Math.round((completedTasks / totalTasks) * 100)))
    : 0;

  // Determine status indicator
  const getStatusIndicator = () => {
    if (status === 'completed') {
      return { emoji: '✓', text: 'All done!', color: 'text-green-600' };
    } else if (status === 'in_progress') {
      return { emoji: '⏳', text: 'Keep going!', color: 'text-blue-600' };
    } else {
      return { emoji: '🔒', text: 'Start learning!', color: 'text-gray-500' };
    }
  };

  const statusIndicator = getStatusIndicator();

  // Card styling based on status and selection
  const getCardStyles = () => {
    const baseStyles = 'w-full p-3 mb-2 rounded-lg border cursor-pointer transition-colors';

    if (isSelected) {
      return `${baseStyles} bg-orange-50 border-l-4 border-orange-600 border-r border-t border-b border-gray-200`;
    }

    if (status === 'completed') {
      return `${baseStyles} bg-green-50 border-l-4 border-green-600 border-r border-t border-b border-gray-200 hover:bg-green-100`;
    } else if (status === 'in_progress') {
      return `${baseStyles} bg-white border border-gray-200 hover:bg-gray-50`;
    } else {
      return `${baseStyles} bg-gray-50 border border-gray-200 hover:bg-gray-100`;
    }
  };

  return (
    <div
      className={getCardStyles()}
      onClick={() => onClick(app)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(app);
        }
      }}
      aria-label={`${name} - ${completedTasks} of ${totalTasks} tasks completed`}
    >
      {/* App Icon and Name */}
      <div className="flex items-center mb-2">
        <span className="text-3xl mr-2">{icon}</span>
        <span className="text-base font-semibold text-gray-900">{name}</span>
      </div>

      {/* Progress Info */}
      <div className="text-sm text-gray-600 mb-1">
        {completedTasks} of {totalTasks} tasks
      </div>

      {/* Progress Bar */}
      {status === 'in_progress' && (
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      )}

      {/* Status Indicator */}
      <div className={`flex items-center text-sm ${statusIndicator.color}`}>
        <span className="mr-1">{statusIndicator.emoji}</span>
        <span>{statusIndicator.text}</span>
      </div>
    </div>
  );
}
