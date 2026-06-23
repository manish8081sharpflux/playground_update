import React from 'react';

/**
 * PerformanceMetrics Component - Epic 01 Story 02
 * Displays performance metrics in Pane 3 (Task Details)
 * Shows time taken, coins earned, and ranking
 */
export default function PerformanceMetrics({ metrics }) {
  const { timeTaken, coinsEarned, ranking, completed } = metrics || {};

  if (!completed) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="text-center text-gray-500">
          <span className="text-2xl">🎯</span>
          <p className="mt-2">Complete this task to see your performance!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Performance Metrics:</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Time Taken */}
        <div className="bg-white rounded-lg p-4 text-center border border-blue-100">
          <div className="text-3xl mb-2">⏱️</div>
          <div className="text-2xl font-bold text-gray-900">{timeTaken} mins</div>
          <div className="text-sm text-gray-600">Time Taken</div>
        </div>

        {/* Coins Earned */}
        <div className="bg-white rounded-lg p-4 text-center border border-blue-100">
          <div className="text-3xl mb-2">💰</div>
          <div className="text-2xl font-bold text-yellow-600">{coinsEarned} coins</div>
          <div className="text-sm text-gray-600">Earned</div>
        </div>

        {/* Ranking */}
        <div className="bg-white rounded-lg p-4 text-center border border-blue-100">
          <div className="text-3xl mb-2">🏆</div>
          <div className="text-2xl font-bold text-purple-600">Rank #{ranking}</div>
          <div className="text-sm text-gray-600">in Balagruha</div>
        </div>
      </div>
    </div>
  );
}
