// Sprint5-Story-12: Student Leaderboard Component
// Displays top earners and top spenders with tabbed interface

import React, { useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Medal, Download, Filter } from 'lucide-react';

const StudentLeaderboard = ({ earnersData, spendersData, onExport, filters = {}, onFilterChange }) => {
  const [activeTab, setActiveTab] = useState('spenders'); // Default to spenders
  const [showFilters, setShowFilters] = useState(false);

  const currentData = activeTab === 'earners' ? earnersData : spendersData;

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    if (onFilterChange) {
      onFilterChange({ ...filters, [key]: value });
    }
  };

  // Get medal icon for rank
  const getMedalIcon = (rank) => {
    if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500" />; // Gold
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />; // Silver
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-600" />; // Bronze
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">#{rank}</span>;
  };

  // Get rank badge color
  const getRankBadgeColor = (rank) => {
    if (rank === 1) return 'bg-yellow-50 border-yellow-300 text-yellow-700';
    if (rank === 2 || rank === 3) return 'bg-gray-50 border-gray-300 text-gray-700';
    return 'bg-white border-gray-200 text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with Tabs */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Student Leaderboard
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={() => onExport(activeTab)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="px-6 pb-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('spenders')}
            className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'spenders'
                ? 'border-purple-600 text-purple-600 bg-purple-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Top Spenders
            </div>
          </button>
          <button
            onClick={() => setActiveTab('earners')}
            className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'earners'
                ? 'border-purple-600 text-purple-600 bg-purple-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Earners
            </div>
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              {activeTab === 'earners' ? (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Earned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                </>
              ) : (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Order Value
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                  <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-lg font-medium">No data available</p>
                  <p className="text-sm">Students need to earn or spend coins to appear on the leaderboard</p>
                </td>
              </tr>
            ) : (
              currentData.map((student) => (
                <tr
                  key={student.userId}
                  className={`hover:bg-gray-50 transition-colors ${
                    student.rank <= 3 ? 'border-l-4 ' + (
                      student.rank === 1 ? 'border-yellow-400' :
                      student.rank === 2 ? 'border-gray-400' :
                      'border-orange-400'
                    ) : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 ${getRankBadgeColor(student.rank)}`}>
                      {getMedalIcon(student.rank)}
                      <span className="font-bold">#{student.rank}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                      <div className="text-sm text-gray-500">{student.email || "—"}</div>
                    </div>
                  </td>
                  {activeTab === 'earners' ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        {student.totalEarned} coins
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                        {student.currentBalance} coins
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.lastActivity ? new Date(student.lastActivity).toLocaleDateString() : 'N/A'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                        {student.totalSpent} coins
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.purchaseCount} {student.purchaseCount === 1 ? 'order' : 'orders'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                        {student.avgOrderValue} coins
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      {currentData.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Showing top {currentData.length} {activeTab === 'earners' ? 'earners' : 'spenders'}
            </span>
            {activeTab === 'earners' ? (
              <span className="font-medium text-gray-900">
                Total Earned: <span className="text-green-600">{currentData.reduce((sum, s) => sum + s.totalEarned, 0)} coins</span>
              </span>
            ) : (
              <span className="font-medium text-gray-900">
                Total Spent: <span className="text-red-600">{currentData.reduce((sum, s) => sum + s.totalSpent, 0)} coins</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLeaderboard;
