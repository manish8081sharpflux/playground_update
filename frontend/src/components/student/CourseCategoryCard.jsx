import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function CourseCategoryCard({
  courseType,
  icon,
  color,
  totalTasks,
  completedTasks,
  onClick,
}) {
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isCompleted = totalTasks > 0 && completedTasks >= totalTasks;

  const colorClasses = {
    orange: {
      bg: 'bg-orange-100',
      bgHover: 'hover:bg-orange-200',
      border: 'border-orange-300',
      text: 'text-orange-600',
      progressBg: 'bg-orange-600',
    },
    pink: {
      bg: 'bg-pink-100',
      bgHover: 'hover:bg-pink-200',
      border: 'border-pink-300',
      text: 'text-pink-600',
      progressBg: 'bg-pink-600',
    },
    blue: {
      bg: 'bg-blue-100',
      bgHover: 'hover:bg-blue-200',
      border: 'border-blue-300',
      text: 'text-blue-600',
      progressBg: 'bg-blue-600',
    },
    green: {
      bg: 'bg-green-100',
      bgHover: 'hover:bg-green-200',
      border: 'border-green-300',
      text: 'text-green-600',
      progressBg: 'bg-green-600',
    },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div
      onClick={onClick}
      className={`${colors.bg} border-2 ${colors.border} rounded-xl p-6 cursor-pointer ${colors.bgHover} transition-colors shadow-sm flex min-h-[200px] flex-col items-center justify-center relative`}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      aria-label={`${courseType} - ${progress}% complete`}
    >
      {isCompleted && (
        <div className="absolute right-3 top-3 rounded-full bg-green-500 p-1 text-white shadow-sm" aria-hidden="true">
          <CheckCircle size={16} />
        </div>
      )}

      <div className={`mb-4 text-6xl ${colors.text}`}>
        {icon}
      </div>

      <h3 className="mb-3 text-center text-xl font-bold text-gray-900">
        {courseType}
      </h3>

      <div className="mb-2 h-3 w-full rounded-full border border-gray-300 bg-white">
        <div
          className={`${colors.progressBg} h-full rounded-full transition-all duration-300`}
          style={{ width: `${progress}%` }}
          aria-label={`Progress: ${progress}%`}
        />
      </div>

      <p className="text-center text-sm text-gray-700">
        {completedTasks} of {totalTasks} tasks completed
      </p>
      <p className="mt-1 text-xs text-gray-600">
        {progress}% complete
      </p>
    </div>
  );
}