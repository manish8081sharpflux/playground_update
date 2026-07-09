import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * CourseCategoryCard Component - Epic 01 Story 01
 * Displays a course category card with:
 * - Course icon
 * - Course title
 * - Progress bar
 * - Task completion stats
 *
 * Color variations:
 * - Computer Apps: orange
 * - Art: pink
 * - Spoken English: blue
 * - Life Skills: green
 */
export default function CourseCategoryCard({
  courseType,
  icon,
  color,
  totalTasks,
  completedTasks,
  onClick
}) {
  // Calculate progress percentage
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isCompleted = totalTasks > 0 && completedTasks >= totalTasks;

  // Color class mappings (Tailwind doesn't support dynamic classes)
  const colorClasses = {
    orange: {
      bg: 'bg-orange-100',
      bgHover: 'hover:bg-orange-200',
      border: 'border-orange-300',
      text: 'text-orange-600',
      progressBg: 'bg-orange-600'
    },
    pink: {
      bg: 'bg-pink-100',
      bgHover: 'hover:bg-pink-200',
      border: 'border-pink-300',
      text: 'text-pink-600',
      progressBg: 'bg-pink-600'
    },
    blue: {
      bg: 'bg-blue-100',
      bgHover: 'hover:bg-blue-200',
      border: 'border-blue-300',
      text: 'text-blue-600',
      progressBg: 'bg-blue-600'
    },
    green: {
      bg: 'bg-green-100',
      bgHover: 'hover:bg-green-200',
      border: 'border-green-300',
      text: 'text-green-600',
      progressBg: 'bg-green-600'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div
      onClick={onClick}
      className={`
        ${colors.bg} border-2 ${colors.border} rounded-xl p-6
        cursor-pointer ${colors.bgHover} transition-colors shadow-sm
        flex flex-col items-center justify-center min-h-[200px] relative
      `}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      aria-label={`${courseType} - ${progress}% complete`}
    >
      {isCompleted && (
        <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-full shadow-sm" aria-hidden="true">
          <CheckCircle size={16} />
        </div>
      )}

      {/* Icon */}
      <div className={`text-6xl mb-4 ${colors.text}`}>
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-center font-bold text-xl text-gray-900 mb-3">
        {courseType}
      </h3>

      {/* Progress Bar */}
      <div className="w-full bg-white rounded-full h-3 mb-2 border border-gray-300">
        <div
          className={`${colors.progressBg} h-full rounded-full transition-all duration-300`}
          style={{ width: `${progress}%` }}
          aria-label={`Progress: ${progress}%`}
        />
      </div>

      {/* Progress Text */}
      <p className="text-sm text-gray-700 text-center">
        {completedTasks} of {totalTasks} tasks completed
      </p>
      <p className="text-xs text-gray-600 mt-1">
        {progress}% complete
      </p>
    </div>
  );
}
