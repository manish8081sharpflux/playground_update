// Sprint5-Story-11: Top Products Table Component
// AC3 & AC4: Display top products by volume and revenue

import React, { useState } from 'react';
import { TrendingUp, Package } from 'lucide-react';

const TopProductsTable = ({ data }) => {
  const [activeTab, setActiveTab] = useState('volume'); // 'volume' or 'revenue'

  const topByVolume = data?.topProducts?.byVolume || [];
  const topByRevenue = data?.topProducts?.byRevenue || [];

  const currentData = activeTab === 'volume' ? topByVolume : topByRevenue;

  const tabs = [
    { id: 'volume', label: 'Top by Sales Volume', icon: Package },
    { id: 'revenue', label: 'Top by Revenue', icon: TrendingUp }
  ];

  if (!data || (!topByVolume.length && !topByRevenue.length)) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          <p>No product data available for the selected date range</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header with Tabs */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Rank
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Product Name
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                SKU
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Units Sold
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Revenue
              </th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-gray-500">
                  No products found
                </td>
              </tr>
            ) : (
              currentData.map((product, index) => (
                <tr
                  key={product._id || index}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                      {index + 1}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-gray-900">
                      {product.name}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-gray-600 font-mono">
                      {product.sku}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {product.unitsSold}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="text-sm font-semibold text-green-600">
                      {product.revenue} coins
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      {currentData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Showing top {currentData.length} products
            </span>
            <div className="text-gray-900 font-semibold">
              Total:{' '}
              <span className="text-green-600">
                {currentData.reduce((sum, p) => sum + p.revenue, 0)} coins
              </span>
              {' • '}
              <span className="text-blue-600">
                {currentData.reduce((sum, p) => sum + p.unitsSold, 0)} units
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopProductsTable;
