import React from 'react';

/**
 * TransactionItem Component - Epic 01 Story 06
 * Displays a single transaction in the transaction history modal
 * Color-coded by transaction type with formatted timestamp
 */
export default function TransactionItem({ transaction }) {
  // Format timestamp (e.g., "Oct 24, 2025 • 2:45 PM")
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleDateString('en-US', options).replace(',', ' •');
  };

  // Get color scheme based on transaction type
  const getColorScheme = (type) => {
    switch (type) {
      case 'earn':
      case 'task_completion':
      case 'reward':
        return {
          bg: 'bg-green-50',
          border: 'border-green-500',
          text: 'text-green-600'
        };
      case 'quiz_bonus':
      case 'quiz_pass':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-500',
          text: 'text-blue-600'
        };
      case 'coach_award':
      case 'manual_award':
        return {
          bg: 'bg-pink-50',
          border: 'border-pink-500',
          text: 'text-pink-600'
        };
      case 'milestone':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-500',
          text: 'text-purple-600'
        };
      case 'spent':
      case 'spend':
      case 'purchase':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          text: 'text-red-600'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-500',
          text: 'text-gray-600'
        };
    }
  };

  const colors = getColorScheme(transaction.type);
  const isSpent = transaction.type === 'spent' || transaction.type === 'spend';
  const isPositive = !isSpent && transaction.amount > 0;
  const displayAmount = Math.abs(transaction.amount);

  return (
    <div
      className={`${colors.bg} border-l-4 ${colors.border} rounded-lg p-4 mb-3 hover:shadow-sm transition-shadow`}
    >
      <div className="flex items-start justify-between">
        {/* Left: Timestamp and Description */}
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">
            {formatTimestamp(transaction.createdAt || transaction.timestamp)}
          </p>
          <p className="font-medium text-gray-900 mb-1">
            {transaction.description || transaction.reason}
          </p>
          {transaction.source && (
            <p className="text-xs text-gray-500">
              {transaction.source}
            </p>
          )}
        </div>

        {/* Right: Amount */}
        <div className="ml-4 flex-shrink-0">
          <span
            className={`font-bold text-xl ${isPositive ? 'text-green-600' : 'text-red-600'}`}
          >
            {isSpent ? '-' : isPositive ? '+' : ''}{displayAmount} 💰
          </span>
        </div>
      </div>
    </div>
  );
}
