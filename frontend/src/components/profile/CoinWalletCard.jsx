// Sprint5-Story-16: Coin Wallet Dashboard Card
// Displays student coin balance and statistics

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';

export default function CoinWalletCard({ coins }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Coins className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Coin Wallet</h2>
            <p className="text-sm text-slate-600">Your coin balance and statistics</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/shop/transactions')}
          className="text-purple-600 hover:text-purple-700 font-medium text-sm"
        >
          View History →
        </button>
      </div>

      {/* Current Balance */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 mb-6">
        <p className="text-purple-200 text-sm mb-1">Current Balance</p>
        <p className="text-4xl font-bold text-white">{coins.balance || 0} coins</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Earned */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-xs text-green-700 font-medium">Total Earned</p>
          </div>
          <p className="text-2xl font-bold text-green-900">{coins.totalEarned || 0}</p>
        </div>

        {/* Total Spent */}
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <p className="text-xs text-red-700 font-medium">Total Spent</p>
          </div>
          <p className="text-2xl font-bold text-red-900">{coins.totalSpent || 0}</p>
        </div>

        {/* Weekly Earned */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-blue-700 font-medium">This Week</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {coins.weeklyStats?.coinsEarned || 0}
          </p>
        </div>

        {/* Monthly Earned */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-purple-700 font-medium">This Month</p>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {coins.monthlyStats?.coinsEarned || 0}
          </p>
        </div>
      </div>

      {/* WTF Stats */}
      {coins.wtfStats && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">WTF Earnings Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-slate-600">Pins Created</p>
              <p className="text-lg font-bold text-slate-900">{coins.wtfStats.pinsCreated || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Approved</p>
              <p className="text-lg font-bold text-slate-900">{coins.wtfStats.submissionsApproved || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Interactions</p>
              <p className="text-lg font-bold text-slate-900">{coins.wtfStats.interactionsMade || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">WTF Coins</p>
              <p className="text-lg font-bold text-purple-600">{coins.wtfStats.totalWtfCoinsEarned || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
