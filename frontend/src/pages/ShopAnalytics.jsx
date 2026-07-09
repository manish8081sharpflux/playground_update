// Sprint5-Story-11: Shop Analytics Dashboard
// Main page component that integrates all analytics components

import React, { useState, useEffect } from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';
import DateRangeSelector from '../components/shop/DateRangeSelector';
import AnalyticsOverview from '../components/shop/AnalyticsOverview';
import RevenueChart from '../components/shop/RevenueChart';
import CategoryPieChart from '../components/shop/CategoryPieChart';
import TopProductsTable from '../components/shop/TopProductsTable';
import { getShopAnalytics } from '../api';
import Breadcrumbs from '../components/shop/Breadcrumbs';
import LoadingState from '../components/common/LoadingState';
import ShopAdminControls from '../components/shop/ShopAdminControls';

const ShopAnalytics = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Date range state - default to last 30 days
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  });

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getShopAnalytics(dateRange.startDate, dateRange.endDate);

      if (response.success) {
        setAnalyticsData(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch analytics data');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when date range changes
  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Handle date range change
  const handleDateRangeChange = (startDate, endDate) => {
    setDateRange({ startDate, endDate });
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Admin Floating Controls */}
      <ShopAdminControls />

      {/* Breadcrumbs */}
      <Breadcrumbs />

      <div className="w-full px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Shop Analytics</h1>
          </div>
          <p className="text-gray-600">
            Comprehensive insights into shop performance and student participation
          </p>
        </div>

        {/* Date Range Selector */}
        <DateRangeSelector
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onDateRangeChange={handleDateRangeChange}
        />

        {/* Loading State */}
        {loading && (
          <LoadingState message="Loading analytics data..." />
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-900 mb-1">
                  Error Loading Analytics
                </h3>
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={fetchAnalytics}
                  className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Dashboard */}
        {!loading && !error && analyticsData && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <AnalyticsOverview data={analyticsData.overview} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueChart data={analyticsData} />
              <CategoryPieChart data={analyticsData} />
            </div>

            {/* Top Products Table */}
            <TopProductsTable data={analyticsData} />

            {/* Stock Turnover Card */}
            {analyticsData.stockTurnover && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Stock Turnover Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fast Moving Products */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Fast Moving Products
                    </h4>
                    {analyticsData.stockTurnover.fastMoving.length === 0 ? (
                      <p className="text-sm text-gray-500">No data available</p>
                    ) : (
                      <ul className="space-y-2">
                        {analyticsData.stockTurnover.fastMoving.map((product) => (
                          <li
                            key={product.productId}
                            className="flex items-center justify-between p-2 bg-green-50 rounded"
                          >
                            <span className="text-sm text-gray-900">{product.name}</span>
                            <span className="text-sm font-semibold text-green-600">
                              {product.velocity} units/order
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Slow Moving Products */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Slow Moving Products
                    </h4>
                    {analyticsData.stockTurnover.slowMoving.length === 0 ? (
                      <p className="text-sm text-gray-500">No data available</p>
                    ) : (
                      <ul className="space-y-2">
                        {analyticsData.stockTurnover.slowMoving.map((product) => (
                          <li
                            key={product.productId}
                            className="flex items-center justify-between p-2 bg-orange-50 rounded"
                          >
                            <span className="text-sm text-gray-900">{product.name}</span>
                            <span className="text-sm font-semibold text-orange-600">
                              {product.velocity} units/order
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Turnover Metrics */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Avg Velocity</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {analyticsData.stockTurnover.avgVelocity} units/order
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Days to Sell Out</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {analyticsData.stockTurnover.avgDaysToSellOut} days
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopAnalytics;
