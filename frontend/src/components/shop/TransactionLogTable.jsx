// Sprint5-Story-12: Transaction Log Table Component
// Displays complete transaction log with filters and pagination

import React, { useState } from 'react';
import { Search, Calendar, Filter, ChevronLeft, ChevronRight, FileText, Download } from 'lucide-react';
import StatusBadge from './StatusBadge';

const TransactionLogTable = ({ transactions, pagination, filters, balagruhas = [], students = [], onFilterChange, onPageChange, onViewOrder, onExport }) => {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [showFilters, setShowFilters] = useState(false);

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      onFilterChange({ ...filters, searchTerm: e.target.value });
    }, 500);
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    // Validate date inputs
    if ((key === 'startDate' || key === 'endDate') && value) {
      // Check if value matches YYYY-MM-DD format
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(value)) {
        console.warn('Invalid date format. Expected YYYY-MM-DD');
        return;
      }

      const dateObj = new Date(value);
      if (isNaN(dateObj.getTime())) return; // Invalid date

      const year = dateObj.getFullYear();
      if (year < 2000 || year > 2100) return; // Out of reasonable range

      // Check logical ordering
      if (key === 'startDate' && filters.endDate && value > filters.endDate) return;
      if (key === 'endDate' && filters.startDate && value < filters.startDate) return;
    }

    onFilterChange({ ...filters, [key]: value });
  };

  // Handle page change
  const handlePrevPage = () => {
    if (pagination.page > 1) {
      onPageChange(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.pages) {
      onPageChange(pagination.page + 1);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Transaction Log</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search by order number or student name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md space-y-4">
            {/* First Row: Balagruha, Student, Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {/* Student Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Student</label>
                <select
                  value={filters.studentId || 'all'}
                  onChange={(e) => handleFilterChange('studentId', e.target.value === 'all' ? '' : e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Students</option>
                  {students.map(student => (
                    <option key={student._id} value={student._id}>{student.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status || 'all'}
                  onChange={(e) => handleFilterChange('status', e.target.value === 'all' ? null : e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>

            {/* Second Row: Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  min="2000-01-01"
                  max="2100-12-31"
                  pattern="\d{4}-\d{2}-\d{2}"
                  placeholder="yyyy-mm-dd"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  min="2000-01-01"
                  max="2100-12-31"
                  pattern="\d{4}-\d{2}-\d{2}"
                  placeholder="yyyy-mm-dd"
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
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date/Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Coins
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-lg font-medium">No transactions found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr
                  key={transaction.orderId}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onViewOrder(transaction.orderNumber)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.orderNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{transaction.studentName}</div>
                      <div className="text-sm text-gray-500">{transaction.studentEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                    {transaction.totalAmount} coins
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.itemCount} {transaction.itemCount === 1 ? 'item' : 'items'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={transaction.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewOrder(transaction.orderNumber);
                      }}
                      className="text-purple-600 hover:text-purple-800 font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-medium">{pagination.total}</span> transactions
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={pagination.page === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={pagination.page === pagination.pages}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionLogTable;
