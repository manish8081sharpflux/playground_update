import React, { useState, useEffect } from 'react';
import { api } from '../../../api';
import TransactionItem from './TransactionItem';
import toast from 'react-hot-toast';

/**
 * TransactionHistoryModal Component - Epic 01 Story 06
 * Modal displaying user's coin transaction history with filtering
 * Opened by clicking coin balance in Title Bar
 */
export default function TransactionHistoryModal({ isOpen, onClose, currentBalance }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const getDateRange = (selectedDateFilter) => {
    const now = new Date();
    const start = new Date(now);
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (selectedDateFilter === 'this_week') {
      start.setDate(now.getDate() - now.getDay());
    } else if (selectedDateFilter === 'this_month') {
      start.setDate(1);
    } else if (selectedDateFilter === 'last_3_months') {
      start.setMonth(now.getMonth() - 3);
    } else {
      return null;
    }

    start.setHours(0, 0, 0, 0);
    return {
      startDate: formatDate(start),
      endDate: formatDate(now)
    };
  };

  const getFilterParams = (selectedFilter) => {
    if (selectedFilter === 'earned') {
      return { type: 'earned' };
    }
    if (selectedFilter === 'spent') {
      return { type: 'spent' };
    }
    if (selectedFilter === 'quiz_bonus') {
      return { source: 'quiz_pass' };
    }
    if (selectedFilter === 'coach_award') {
      return { source: 'manual_award' };
    }
    if (selectedFilter === 'milestone') {
      return { source: 'task' };
    }
    return {};
  };

  const sortTransactions = (items, selectedSortBy) => {
    return [...items].sort((a, b) => {
      if (selectedSortBy === 'oldest') {
        return new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp);
      }
      if (selectedSortBy === 'highest') {
        return Math.abs(b.amount) - Math.abs(a.amount);
      }
      return new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp);
    });
  };

  // Fetch transactions from API
  const fetchTransactions = async (pageToFetch = page) => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      params.append('limit', '20');
      params.append('page', pageToFetch.toString());

      const filterParams = getFilterParams(filter);
      Object.entries(filterParams).forEach(([key, value]) => {
        params.append(key, value);
      });

      const dateRange = getDateRange(dateFilter);
      if (dateRange) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }

      if (sortBy === 'oldest') {
        params.append('sortBy', 'oldest_first');
      } else if (sortBy === 'highest') {
        params.append('sortBy', 'highest_amount');
      } else {
        params.append('sortBy', 'newest_first');
      }

      const response = await api.get(`/api/v1/coin/transactions?${params.toString()}`);

      if (response.data.success) {
        const newTransactions = sortTransactions(response.data.data.transactions || [], sortBy);

        if (pageToFetch === 1) {
          setTransactions(newTransactions);
        } else {
          setTransactions(prev => sortTransactions([...prev, ...newTransactions], sortBy));
        }

        const pagination = response.data.data.pagination;
        setHasMore(pagination ? pagination.page < pagination.pages : false);
      } else {
        toast.error('Failed to load transaction history');
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions when modal opens or filters change
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setTransactions([]);
      fetchTransactions(1);
    }
  }, [isOpen, filter, dateFilter, sortBy]);

  // Fetch more transactions when page changes
  useEffect(() => {
    if (page > 1) {
      fetchTransactions(page);
    }
  }, [page]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle load more
  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                💰 Your ISF Coin History
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Current Balance: <span className="font-bold text-gray-900">{currentBalance.toLocaleString()} coins</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap gap-4">
          {/* Type Filter */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Type:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="earned">Earned</option>
              <option value="spent">Spent</option>
              <option value="quiz_bonus">Quiz Bonus</option>
              <option value="coach_award">Coach Award</option>
              <option value="milestone">Milestone</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Time Period:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_3_months">Last 3 Months</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Sort By:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
            </select>
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && transactions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-600">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="text-6xl mb-4">💰</span>
              <p className="text-gray-600 text-center">
                No transactions found.<br />
                <span className="text-sm">Start earning coins by completing tasks!</span>
              </p>
            </div>
          ) : (
            <>
              {transactions.map((transaction, index) => (
                <TransactionItem key={transaction._id || index} transaction={transaction} />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 rounded-b-xl">
          {hasMore ? (
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          ) : transactions.length > 0 ? (
            <p className="text-center text-sm text-gray-600">
              Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
