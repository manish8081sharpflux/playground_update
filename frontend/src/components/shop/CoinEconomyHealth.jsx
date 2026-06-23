// Sprint5-Story-12: Coin Economy Health Component
// Displays coin economy metrics and health indicators

import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Users, AlertCircle, CheckCircle, XCircle, LineChart } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CoinEconomyHealth = ({ economyData }) => {
  if (!economyData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500">Loading coin economy data...</p>
      </div>
    );
  }

  const {
    totalInCirculation,
    totalEarned,
    totalSpent,
    earnedVsSpentRatio,
    avgBalance,
    totalAccounts,
    warnings,
    circulationTrend
  } = economyData;

  // Determine health status based on ratio
  const getHealthStatus = () => {
    if (earnedVsSpentRatio >= 1.0 && earnedVsSpentRatio <= 1.5) {
      return { status: 'healthy', color: 'green', icon: CheckCircle, message: 'Coin economy is healthy' };
    }
    if (earnedVsSpentRatio > 1.5) {
      return { status: 'warning', color: 'orange', icon: AlertCircle, message: 'Too many coins in circulation' };
    }
    return { status: 'critical', color: 'red', icon: XCircle, message: 'Coins are being spent too quickly' };
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <LineChart className="w-6 h-6 text-purple-600" />
          Coin Economy Health
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Monitor coin circulation and economic balance
        </p>
      </div>

      {/* Health Status Banner */}
      <div className={`mx-6 mt-6 p-4 rounded-lg border-l-4 ${
        healthStatus.color === 'green' ? 'bg-green-50 border-green-500' :
        healthStatus.color === 'orange' ? 'bg-orange-50 border-orange-500' :
        'bg-red-50 border-red-500'
      }`}>
        <div className="flex items-center gap-3">
          <HealthIcon className={`w-6 h-6 ${
            healthStatus.color === 'green' ? 'text-green-600' :
            healthStatus.color === 'orange' ? 'text-orange-600' :
            'text-red-600'
          }`} />
          <div className="flex-1">
            <h3 className={`font-semibold ${
              healthStatus.color === 'green' ? 'text-green-800' :
              healthStatus.color === 'orange' ? 'text-orange-800' :
              'text-red-800'
            }`}>
              {healthStatus.message}
            </h3>
            <p className={`text-sm ${
              healthStatus.color === 'green' ? 'text-green-700' :
              healthStatus.color === 'orange' ? 'text-orange-700' :
              'text-red-700'
            }`}>
              Earned/Spent Ratio: {earnedVsSpentRatio} (Ideal: 1.0-1.5)
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
        {/* Total in Circulation */}
        <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Total in Circulation</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{totalInCirculation}</p>
              <p className="text-xs text-purple-600 mt-1">coins</p>
            </div>
            <div className="bg-purple-200 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-700" />
            </div>
          </div>
        </div>

        {/* Earned vs Spent Ratio */}
        <div className={`border-2 rounded-lg p-4 ${
          healthStatus.color === 'green' ? 'bg-green-50 border-green-300' :
          healthStatus.color === 'orange' ? 'bg-orange-50 border-orange-300' :
          'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-sm font-medium ${
                healthStatus.color === 'green' ? 'text-green-700' :
                healthStatus.color === 'orange' ? 'text-orange-700' :
                'text-red-700'
              }`}>
                Earned/Spent Ratio
              </p>
              <p className={`text-3xl font-bold mt-1 ${
                healthStatus.color === 'green' ? 'text-green-900' :
                healthStatus.color === 'orange' ? 'text-orange-900' :
                'text-red-900'
              }`}>
                {earnedVsSpentRatio}
              </p>
              <p className={`text-xs mt-1 ${
                healthStatus.color === 'green' ? 'text-green-600' :
                healthStatus.color === 'orange' ? 'text-orange-600' :
                'text-red-600'
              }`}>
                ratio
              </p>
            </div>
            <div className={`p-3 rounded-lg ${
              healthStatus.color === 'green' ? 'bg-green-200' :
              healthStatus.color === 'orange' ? 'bg-orange-200' :
              'bg-red-200'
            }`}>
              {earnedVsSpentRatio > 1.5 ? (
                <TrendingUp className={`w-6 h-6 ${
                  healthStatus.color === 'green' ? 'text-green-700' :
                  healthStatus.color === 'orange' ? 'text-orange-700' :
                  'text-red-700'
                }`} />
              ) : (
                <TrendingDown className={`w-6 h-6 ${
                  healthStatus.color === 'green' ? 'text-green-700' :
                  healthStatus.color === 'orange' ? 'text-orange-700' :
                  'text-red-700'
                }`} />
              )}
            </div>
          </div>
        </div>

        {/* Average Balance */}
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Average Balance</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{avgBalance}</p>
              <p className="text-xs text-blue-600 mt-1">coins per student</p>
            </div>
            <div className="bg-blue-200 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="px-6 pb-6">
        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wider">Total Earned</p>
            <p className="text-xl font-bold text-green-600">{totalEarned} coins</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wider">Total Spent</p>
            <p className="text-xl font-bold text-red-600">{totalSpent} coins</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wider">Active Accounts</p>
            <p className="text-xl font-bold text-gray-900">{totalAccounts} students</p>
          </div>
        </div>
      </div>

      {/* Circulation Trend Chart */}
      {circulationTrend && circulationTrend.length > 0 && (
        <div className="px-6 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">30-Day Circulation Trend</h3>
          <div className="bg-gray-50 rounded-lg p-4" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={circulationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Legend />
                <Line type="monotone" dataKey="earned" stroke="#10b981" name="Earned" strokeWidth={2} />
                <Line type="monotone" dataKey="spent" stroke="#ef4444" name="Spent" strokeWidth={2} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Warnings/Recommendations */}
      {warnings && warnings.length > 0 && (
        <div className="px-6 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h3>
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">{warning}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoinEconomyHealth;
