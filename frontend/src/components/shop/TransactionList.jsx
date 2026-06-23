import React from 'react';
import TransactionItem from './TransactionItem';

const TransactionList = ({ transactions, loading, pagination, onPageChange, onTransactionClick }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-slate-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-600 text-lg">No transactions found</p>
          <p className="text-slate-400 text-sm mt-1">Transactions will appear here once you start earning or spending coins</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Transaction List */}
      <div className="space-y-2">
        {transactions.map((transaction, index) => (
          <TransactionItem
            key={transaction._id || index}
            transaction={transaction}
            onClick={() => onTransactionClick(transaction)}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <button
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              disabled={pagination.page === 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              ← Previous
            </button>

            <div className="flex items-center gap-2">
              <span className="text-slate-700 font-medium">
                Page {pagination.page} of {pagination.pages}
              </span>
              <span className="text-slate-500 text-sm">
                ({pagination.total} transactions)
              </span>
            </div>

            <button
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              disabled={pagination.page === pagination.pages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
