import React, { useState } from 'react';

const TransactionFilters = ({ filters, onFilterChange }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [dateError, setDateError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Validate date format for date inputs
    if ((name === 'startDate' || name === 'endDate') && value) {
      // Check if value matches YYYY-MM-DD format
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(value)) {
        setDateError('Please enter a valid date in YYYY-MM-DD format');
        return;
      }

      // Validate the date is actually valid
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        setDateError('Please enter a valid date');
        return;
      }
    }

    setLocalFilters(prev => ({ ...prev, [name]: value }));
    // Clear error when user modifies dates
    if (name === 'startDate' || name === 'endDate') {
      setDateError('');
    }
  };

  const handleApplyFilters = () => {
    // Validate date range
    if (localFilters.startDate && localFilters.endDate) {
      const startDate = new Date(localFilters.startDate);
      const endDate = new Date(localFilters.endDate);

      if (endDate < startDate) {
        setDateError('End date cannot be before start date');
        return;
      }
    }

    setDateError('');
    onFilterChange(localFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      type: '',
      source: '',
      startDate: '',
      endDate: ''
    };
    setLocalFilters(clearedFilters);
    setDateError('');
    onFilterChange(clearedFilters);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-2">
            Type
          </label>
          <select
            id="type"
            name="type"
            value={localFilters.type}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="earned">Earned</option>
            <option value="spent">Spent</option>
          </select>
        </div>

        <div>
          <label htmlFor="source" className="block text-sm font-medium text-slate-700 mb-2">
            Source
          </label>
          <select
            id="source"
            name="source"
            value={localFilters.source}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="">All Sources</option>
            <option value="shop">Shop</option>
            <option value="wtf">WTF</option>
            <option value="attendance">Attendance</option>
            <option value="task">Task</option>
            <option value="medical">Medical</option>
            <option value="sports">Sports</option>
            <option value="music">Music</option>
            <option value="general">General</option>
          </select>
        </div>

        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={localFilters.startDate}
            onChange={handleInputChange}
            pattern="\d{4}-\d{2}-\d{2}"
            placeholder="yyyy-mm-dd"
            className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 mb-2">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={localFilters.endDate}
            onChange={handleInputChange}
            pattern="\d{4}-\d{2}-\d{2}"
            placeholder="yyyy-mm-dd"
            className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {dateError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-800 text-sm">⚠️ {dateError}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleApplyFilters}
          className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
        >
          Apply Filters
        </button>
        <button
          onClick={handleClearFilters}
          className="px-6 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors font-medium"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default TransactionFilters;
