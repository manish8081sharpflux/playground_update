// Sprint5-Story-16: Learning Progress Card
// Displays student learning statistics and machine assignments

import React from 'react';
import { BookOpen, Clock, Monitor, TrendingUp } from 'lucide-react';

export default function LearningCard({ learning }) {
  const formatTime = (minutes) => {
    if (!minutes || minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-100 rounded-lg">
          <BookOpen className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Learning Progress</h2>
          <p className="text-sm text-slate-600">Your educational activities</p>
        </div>
      </div>

      {/* Learning Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-green-600" />
            <p className="text-xs text-green-700 font-medium">Today</p>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {formatTime(learning.sessionTimeToday || 0)}
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-blue-700 font-medium">This Week</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {formatTime(learning.sessionTimeWeek || 0)}
          </p>
        </div>
      </div>

      {/* Machine Assignment */}
      <div className="bg-slate-50 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Monitor className="w-5 h-5 text-slate-600" />
          <p className="text-sm font-semibold text-slate-700">Assigned Machine</p>
        </div>
        <p className="text-lg font-bold text-slate-900">
          {learning.assignedMachine || 'Not assigned'}
        </p>
      </div>

      {/* Active Modules */}
      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
        <div>
          <p className="text-sm text-purple-700 font-medium">Active Modules</p>
          <p className="text-2xl font-bold text-purple-900">{learning.activeModules || 0}</p>
        </div>
        <BookOpen className="w-8 h-8 text-purple-600" />
      </div>
    </div>
  );
}
