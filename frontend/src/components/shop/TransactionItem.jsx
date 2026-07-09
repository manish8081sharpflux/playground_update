import React from 'react';
import { useNavigate } from 'react-router-dom';

const TransactionItem = ({ transaction, onClick }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClick = () => {
    // If it's a shop transaction with orderId, navigate to order history
    if (transaction.source === 'shop' && transaction.metadata?.orderId) {
      navigate('/shop/orders');
    } else {
      // Otherwise show detail modal
      onClick();
    }
  };

  const isEarned = transaction.type === 'earned';

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center justify-between gap-6">
        {/* Left Section: Icon & Details */}
        <div className="flex items-center gap-4 flex-1">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
            isEarned
              ? 'bg-green-100 text-green-600'
              : 'bg-red-100 text-red-600'
          }`}>
            {isEarned ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            )}
          </div>

          {/* Transaction Details */}
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-slate-900 mb-1">
              {transaction.description}
            </h4>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium uppercase">
                {transaction.source}
              </span>
              <span>{formatDate(transaction.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Right Section: Amount & Action */}
        <div className="flex items-center gap-6 shrink-0">
          {/* Amount */}
          <div className="text-right">
            <p className={`text-2xl font-bold ${
              isEarned ? 'text-green-600' : 'text-red-600'
            }`}>
              {isEarned ? '+' : '-'}{transaction.amount}
            </p>
            <p className="text-xs text-slate-500 uppercase tracking-wide">coins</p>
          </div>

          {/* View Order Link (if applicable) */}
          {transaction.source === 'shop' && transaction.metadata?.orderId && (
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium text-sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/shop/orders');
              }}
            >
              View Order
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionItem;
