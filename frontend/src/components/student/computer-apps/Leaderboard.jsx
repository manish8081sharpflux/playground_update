import React, { useState } from 'react';

/**
 * Leaderboard Component - Epic 01 Story 02
 * Displays leaderboard in Pane 3 (Task Details)
 * Shows top students in Balagruha with expandable view
 */
export default function Leaderboard({ leaderboard }) {
  const [expanded, setExpanded] = useState(false);

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Leaderboard</h3>
        <p className="text-gray-600">No leaderboard data available yet.</p>
      </div>
    );
  }

  // Show top 5 by default, all when expanded
  const displayedLeaderboard = expanded ? leaderboard : leaderboard.slice(0, 5);

  // Get medal emoji for top 3
  const getMedal = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Leaderboard - Your Balagruha
      </h3>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-yellow-300">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Rank</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Name</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Coins</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700 hidden sm:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {displayedLeaderboard.map((entry) => (
              <tr
                key={entry.rank}
                className={`border-b border-yellow-200 ${
                  entry.isCurrentUser
                    ? 'bg-yellow-200 font-semibold'
                    : 'hover:bg-yellow-100'
                }`}
              >
                {/* Rank with Medal */}
                <td className="py-2 px-2 text-gray-900">
                  <span className="inline-flex items-center">
                    {getMedal(entry.rank)} {entry.rank}
                  </span>
                </td>

                {/* Name */}
                <td className="py-2 px-2 text-gray-900">
                  {entry.name}
                  {entry.isCurrentUser && (
                    <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      YOU
                    </span>
                  )}
                </td>

                {/* Coins */}
                <td className="py-2 px-2 text-right text-yellow-600 font-semibold">
                  {entry.coins.toLocaleString()} coins
                </td>

                {/* Time (hidden on mobile) */}
                <td className="py-2 px-2 text-right text-gray-600 hidden sm:table-cell">
                  {entry.time} mins
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expand/Collapse Button */}
      {leaderboard.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 w-full py-2 px-4 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors"
        >
          {expanded
            ? 'Show Less'
            : `View Full Leaderboard (Top ${leaderboard.length})`}
        </button>
      )}
    </div>
  );
}
