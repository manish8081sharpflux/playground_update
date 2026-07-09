import React, { useState, useEffect } from 'react';
import { getUserTransactionHistory } from '../api';
import config from '../config';
import TransactionFilters from '../components/shop/TransactionFilters';
import TransactionList from '../components/shop/TransactionList';
import TransactionDetailModal from '../components/shop/TransactionDetailModal';
import ShopNavigation from '../components/shop/ShopNavigation';
import Breadcrumbs from '../components/shop/Breadcrumbs';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [summary, setSummary] = useState({
    totalEarned: 0,
    totalSpent: 0,
    currentBalance: 0
  });
  const [filters, setFilters] = useState(() => {
    // Load saved filters from localStorage on component mount
    const savedFilters = localStorage.getItem('transactionFilters');
    if (savedFilters) {
      try {
        return JSON.parse(savedFilters);
      } catch (error) {
        console.error('Error parsing saved filters:', error);
      }
    }
    return {
      type: '',
      source: '',
      startDate: '',
      endDate: ''
    };
  });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [filters, pagination.page]);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('transactionFilters', JSON.stringify(filters));
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (filters.type) params.append('type', filters.type);
      if (filters.source) params.append('source', filters.source);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await getUserTransactionHistory(params);

      if (response.success) {
        setTransactions(response.data.transactions);
        setPagination(response.data.pagination);
        setSummary(response.data.summary);
      } else {
        setError(response.message || 'Failed to fetch transaction history');
      }
    } catch (err) {
      console.error('Error fetching transaction history:', err);
      setError('An error occurred while fetching transaction history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTransaction(null);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.source) params.append('source', filters.source);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${config.API_BASE_URL}/api/v1/coin/transactions/export?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transaction-history-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting transaction history:', err);
      setError('Failed to export transaction history');
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Transaction History</h1>
              <p className="text-slate-600 mt-1">View all your ISF Coin transactions</p>
            </div>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleExport}
              disabled={loading || transactions.length === 0}
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Shop Navigation */}
      <ShopNavigation />

      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Transaction Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-2">Current Balance</p>
            <p className="text-3xl font-bold text-blue-600">{summary.currentBalance} coins</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-2">Total Earned</p>
            <p className="text-3xl font-bold text-green-600">+{summary.totalEarned} coins</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-2">Total Spent</p>
            <p className="text-3xl font-bold text-red-600">-{summary.totalSpent} coins</p>
          </div>
        </div>

        {/* Filters */}
        <TransactionFilters
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Transaction List */}
        <TransactionList
          transactions={transactions}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onTransactionClick={handleTransactionClick}
        />

        {/* Detail Modal */}
        {showDetailModal && selectedTransaction && (
          <TransactionDetailModal
            transaction={selectedTransaction}
            onClose={handleCloseDetailModal}
          />
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
