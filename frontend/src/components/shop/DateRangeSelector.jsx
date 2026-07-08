// Sprint5-Story-11: Date Range Selector Component
// AC2: Date range selector with presets (7/30/90 days) and custom date picker

import React from 'react';
import { Calendar } from 'lucide-react';

const DateRangeSelector = ({ startDate, endDate, onDateRangeChange }) => {
  const presets = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 }
  ];

  const today = new Date().toISOString().split('T')[0];

  const handlePresetClick = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    onDateRangeChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
  };

  const handleCustomDateChange = (type, value) => {
    // Validate date format and range
    if (!value) return;

    // Check if date is valid
    const dateObj = new Date(value);
    if (isNaN(dateObj.getTime())) return;

    // Restrict to reasonable year range (2000-2100)
    const year = dateObj.getFullYear();
    if (year < 2000 || year > 2100) return;

    // Check logical date ordering
    if (type === 'start') {
      if (endDate && value > endDate) return;
      onDateRangeChange(value, endDate);
    } else {
      if (startDate && value < startDate) return;
      onDateRangeChange(startDate, value);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.days}
              onClick={() => handlePresetClick(preset.days)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
              min="2000-01-01"
              max={endDate || today}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
              min={startDate || "2000-01-01"}
              max={today}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelector;
