import React from 'react';

/**
 * ResumeActivityCard Component - Epic 01 Story 01
 * Displays the last incomplete task with Continue button
 * Only renders if lastActivity exists
 */
export default function ResumeActivityCard({
  courseType,
  taskTitle,
  progress,
  taskId,
  onContinue
}) {
  // Don't render if no data provided
  if (!courseType || !taskTitle) {
    return null;
  }

  return (
    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {/* Label */}
          <p className="text-sm font-medium text-blue-600 mb-1">
            Continue where you left off
          </p>

          {/* Task Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {courseType} - {taskTitle}
          </h3>

          {/* Progress Bar */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 bg-white rounded-full h-3 border border-gray-300">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
                aria-label={`Progress: ${progress}%`}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {progress}%
            </span>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="ml-6 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md flex items-center gap-2"
          aria-label="Continue task"
        >
          <span>Continue</span>
          <span className="text-xl">▶️</span>
        </button>
      </div>
    </div>
  );
}
