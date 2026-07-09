import React, { useState, useEffect, useCallback } from 'react';
import { getAllOrdersAdmin, getBalagruha, fetchUsers } from '../api';
import { api } from '../api';
import OrderCard from '../components/shop/OrderCard';
import OrdersEmptyState from '../components/shop/OrdersEmptyState';
import ShopNavigation from '../components/shop/ShopNavigation';
import Breadcrumbs from '../components/shop/Breadcrumbs';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from '../components/common/LoadingState';

/**
 * OrderHistory Page - Sprint5-Story-04
 * Displays user's order history with filtering and sorting
 * Admin Enhancement: Shows all student orders with balagruha and student filters
 */

export default function OrderHistory() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Admin-specific filters
  const [balagruhaFilter, setBalagruhaFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');
  const [balagruhas, setBalagruhas] = useState([]);
  const [students, setStudents] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(false);

  // Date filters (Admin only)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch balagruhas for admin filters
  useEffect(() => {
    if (isAdmin) {
      const fetchFilterOptions = async () => {
        try {
          setFiltersLoading(true);
          const balagruhasResponse = await getBalagruha();

          // Extract balagruhas from response: response.data.balagruhas
          const balagruhasData = balagruhasResponse?.data?.balagruhas || [];


          setBalagruhas(balagruhasData);
        } catch (err) {
          console.error('Error fetching filter options:', err);
          setBalagruhas([]);
        } finally {
          setFiltersLoading(false);
        }
      };
      fetchFilterOptions();
    }
  }, [isAdmin]);

  // Fetch students when balagruha changes (cascading filter)
  useEffect(() => {
    if (isAdmin && balagruhaFilter !== 'all') {
      const fetchStudents = async () => {
        try {
          setFiltersLoading(true);
          // Fetch all users and filter by role=student and balagruha
          const response = await fetchUsers();
          const allUsers = response?.data?.users || response?.data || [];

          // Filter for students in the selected balagruha
          const studentsInBalagruha = allUsers.filter(user => {
            const isStudent = user.role?.toLowerCase() === 'student';
            const userBalagruhaIds = (user.balagruhaIds || []).map(id =>
              typeof id === 'object' ? id._id : id
            );
            const inBalagruha = userBalagruhaIds.includes(balagruhaFilter);
            return isStudent && inBalagruha;
          });


          setStudents(studentsInBalagruha);
          setStudentFilter('all'); // Reset student filter when balagruha changes
        } catch (err) {
          console.error('Error fetching students:', err);
          setStudents([]);
        } finally {
          setFiltersLoading(false);
        }
      };
      fetchStudents();
    } else {
      // Reset students when "All Balagruhas" is selected
      setStudents([]);
      setStudentFilter('all');
    }
  }, [isAdmin, balagruhaFilter]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      // Admin-specific filters
      if (isAdmin) {
        if (balagruhaFilter !== 'all') {
          params.balagruhaId = balagruhaFilter;
        }
        if (studentFilter !== 'all') {
          params.studentId = studentFilter;
        }
        if (startDate) {
          params.startDate = startDate;
        }
        if (endDate) {
          params.endDate = endDate;
        }

        const response = await getAllOrdersAdmin(params);
        setOrders(response.orders || []);
      } else {
        const response = await api.get('/api/v2/shop/orders', { params });
        setOrders(response.data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isAdmin, balagruhaFilter, studentFilter, startDate, endDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getSortedOrders = () => {
    const sorted = [...orders];

    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt));
      case 'amount-high':
        return sorted.sort((a, b) => b.totalAmount - a.totalAmount);
      case 'amount-low':
        return sorted.sort((a, b) => a.totalAmount - b.totalAmount);
      default:
        return sorted;
    }
  };

  const sortedOrders = getSortedOrders();

  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-slate-900">
            {isAdmin ? 'All Student Orders' : 'My Orders'}
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? 'View and manage all student orders across balagruhas' : 'Track all your purchases'}
          </p>
        </div>
      </div>

      {/* Shop Navigation */}
      <ShopNavigation />

      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter & Sort Bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* First Row: Status and Sort */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="all">All Orders</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="amount-high">Amount (High to Low)</option>
                  <option value="amount-low">Amount (Low to High)</option>
                </select>
              </div>
            </div>

            {/* Second Row: Admin Filters (Balagruha and Date) */}
            {isAdmin && (
              <div className="flex flex-col gap-3 pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {/* Balagruha Filter */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700">Balagruha:</label>
                    <select
                      value={balagruhaFilter}
                      onChange={(e) => setBalagruhaFilter(e.target.value)}
                      className="px-4 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none min-w-[200px]"
                      disabled={filtersLoading}
                    >
                      <option value="all">All Balagruhas</option>
                      {balagruhas.map((balagruha) => (
                        <option key={balagruha._id} value={balagruha._id}>
                          {balagruha.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Date Filter */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700">From:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-4 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* End Date Filter */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700">To:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-4 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Student Filter - Only show when balagruha is selected */}
                {balagruhaFilter !== 'all' && students.length > 0 && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700">Student:</label>
                    <select
                      value={studentFilter}
                      onChange={(e) => setStudentFilter(e.target.value)}
                      className="px-4 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none min-w-[200px]"
                      disabled={filtersLoading}
                    >
                      <option value="all">All Students</option>
                      {students.map((student) => (
                        <option key={student._id} value={student._id}>
                          {student.name} ({student.userId || student.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <LoadingState message="Loading orders..." />
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Failed to load orders
            </h3>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={fetchOrders}
              className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Order List */}
        {!loading && !error && sortedOrders.length > 0 && (
          <div className="space-y-4">
            {sortedOrders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sortedOrders.length === 0 && <OrdersEmptyState />}
      </div>
    </div>
  );
}
