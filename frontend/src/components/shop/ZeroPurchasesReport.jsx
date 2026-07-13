// Sprint5-Story-12: Zero Purchases Report Component
// Displays students who have never made a purchase with pagination and filters

import React, { useState } from 'react';
import { AlertTriangle, UserX, DollarSign, Calendar, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import toast from 'react-hot-toast';

const ZeroPurchasesReport = ({
  students = [],
  pagination = {},
  filters = {},
  balagruhas = [],
  onFilterChange,
  onPageChange,
  onPageSizeChange,
  onExport
}) => {
  const navigate = useNavigate();
  const [sendingReminder, setSendingReminder] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // Provide default pagination values
  const paginationData = {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    ...pagination
  };

  // Highlight students with high balances
  const isHighBalance = (balance) => balance > 100;

  // Send reminder to student
  const handleSendReminder = async (student) => {
    try {
      setSendingReminder(prev => ({ ...prev, [student.userId]: true }));

      const response = await api.post('/api/v2/shop/admin/reports/send-zero-purchase-reminder', {
        userId: student.userId,
        studentName: student.name
      });

      if (response.data.success) {
        toast.success(`Reminder sent to ${student.name}!`);
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error(error.response?.data?.message || 'Failed to send reminder');
    } finally {
      setSendingReminder(prev => ({ ...prev, [student.userId]: false }));
    }
  };

  // View student profile
  const handleViewProfile = (student) => {
    // Navigate to student profile page
    navigate(`/admin/students/${student.userId}`);
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  // Handle page change
  const handlePrevPage = () => {
    if (paginationData.page > 1) {
      onPageChange(paginationData.page - 1);
    }
  };

  const handleNextPage = () => {
    if (paginationData.page < paginationData.pages) {
      onPageChange(paginationData.page + 1);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Warning Banner */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-t-lg">
        <div className="flex items-start">
          <AlertTriangle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800">
              {paginationData.total} students have never made a purchase
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Engage these students to increase shop participation and coin economy health
            </p>
          </div>
          <button
            onClick={onExport}
            className="ml-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Header with Filters Button */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserX className="w-6 h-6 text-red-500" />
              Zero Purchases Report
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Students who have earned coins but haven't made any shop purchases yet
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md space-y-4">
            {/* First Row: Balagruha, Min Balance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Balagruha Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Balagruha</label>
                <select
                  value={filters.balagruhaId || 'all'}
                  onChange={(e) => handleFilterChange('balagruhaId', e.target.value === 'all' ? '' : e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Balagruhas</option>
                  {balagruhas.map(bal => (
                    <option key={bal._id} value={bal._id}>{bal.name}</option>
                  ))}
                </select>
              </div>

              {/* Min Balance Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Balance</label>
                <input
                  type="number"
                  value={filters.minBalance || ''}
                  onChange={(e) => handleFilterChange('minBalance', e.target.value)}
                  placeholder="Enter minimum balance"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Second Row: Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Activity - Start Date</label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Activity - End Date</label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-y border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balagruha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coach
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  <UserX className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-lg font-medium">No students found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr
                  key={student.userId}
                  className={`hover:bg-gray-50 transition-colors ${
                    isHighBalance(student.balance) ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {student.name}
                        {isHighBalance(student.balance) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <DollarSign className="w-3 h-3" />
                            High Balance
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{student.email || "—"}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${
                      isHighBalance(student.balance) ? 'text-yellow-600' : 'text-purple-600'
                    }`}>
                      {student.balance} coins
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(student.lastActivity)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.balagruha || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.coach || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleSendReminder(student)}
                      disabled={sendingReminder[student.userId]}
                      className="text-purple-600 hover:text-purple-800 font-medium mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingReminder[student.userId] ? 'Sending...' : 'Send Reminder'}
                    </button>
                    <button
                      onClick={() => handleViewProfile(student)}
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination and Page Size Selector */}
      {paginationData.total > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Show:</label>
              <select
                value={paginationData.limit}
                onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">per page</span>
            </div>

            {/* Pagination Info */}
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(paginationData.page - 1) * paginationData.limit + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(paginationData.page * paginationData.limit, paginationData.total)}
              </span>{' '}
              of <span className="font-medium">{paginationData.total}</span> students
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={paginationData.page === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="px-4 py-2 text-sm font-medium text-gray-700">
                Page {paginationData.page} of {paginationData.pages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={paginationData.page === paginationData.pages}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Summary Footer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Never Purchased</p>
                <p className="text-lg font-bold text-gray-900">{paginationData.total} students</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Balance (Current Page)</p>
                <p className="text-lg font-bold text-purple-600">
                  {students.reduce((sum, s) => sum + s.balance, 0)} coins
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">High Balance (Current Page)</p>
                <p className="text-lg font-bold text-yellow-600">
                  {students.filter(s => isHighBalance(s.balance)).length} students
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZeroPurchasesReport;
