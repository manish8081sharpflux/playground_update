// Sprint5-Story-11: Category Performance Pie Chart Component
// AC5: Pie chart showing category performance breakdown using Recharts

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

const CategoryPieChart = ({ data }) => {
  // Format data for Recharts
  const chartData = data?.categoryPerformance || [];

  // Color palette for categories
  const COLORS = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316'  // orange
  ];

  // Custom label for pie slices
  const renderCustomLabel = (entry) => {
    return `${entry.percentage}%`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-900 mb-2">{data.category}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Revenue: <span className="font-semibold text-gray-900">{data.revenue} coins</span>
            </p>
            <p className="text-sm text-gray-600">
              Units Sold: <span className="font-semibold text-gray-900">{data.unitsSold}</span>
            </p>
            <p className="text-sm text-gray-600">
              Orders: <span className="font-semibold text-gray-900">{data.orders}</span>
            </p>
            <p className="text-sm text-gray-600">
              Avg Order: <span className="font-semibold text-gray-900">{Math.round(data.avgOrderValue * 100) / 100} coins</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Category Performance</h3>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No category data available for the selected date range</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <PieChartIcon className="w-5 h-5 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-900">Category Performance</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="revenue"
            nameKey="category"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ fontSize: '14px' }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Category Details Table */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <div className="grid grid-cols-1 gap-2">
          {chartData.map((category, index) => (
            <div
              key={category.category}
              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm font-medium text-gray-900">
                  {category.category}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {category.revenue} coins ({category.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryPieChart;
