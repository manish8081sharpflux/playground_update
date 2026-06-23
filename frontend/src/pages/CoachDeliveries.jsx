import React, { useState, useEffect, useCallback } from 'react';
import { getCoachDeliveryStats, getCoachDeliveries, markOrderDelivered, getUserBalagruhas, fetchUsers } from '../api';
import ShopNavigation from '../components/shop/ShopNavigation';
import Breadcrumbs from '../components/shop/Breadcrumbs';
import { useAuth } from '../contexts/AuthContext';

/**
 * CoachDeliveries Page - Sprint5-Story-13
 * Coach/Admin interface for managing order deliveries
 *
 * Features:
 * - Stats cards (pending, delivered today/week/all-time)
 * - Delivery list with pagination
 * - On-demand confirmation (auto-triggered when page loads)
 * - Mark as delivered with optional notes
 * - Admin filters: Balagruha and Coach
 */

export default function CoachDeliveries() {
  const { user } = useAuth();
  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.roleName;
  const isAdmin = userRole?.toLowerCase() === 'admin';

  const [stats, setStats] = useState({
    pendingCount: 0,
    deliveredToday: 0,
    deliveredThisWeek: 0,
    totalDelivered: 0
  });
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [delivering, setDelivering] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Filters (for both admin and coach)
  const [balagruhas, setBalagruhas] = useState([]);
  const [allCoaches, setAllCoaches] = useState([]); // Unfiltered coaches list
  const [coaches, setCoaches] = useState([]); // Filtered coaches list (by balagruha)
  const [balagruhaFilter, setBalagruhaFilter] = useState('all');
  const [coachFilter, setCoachFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending_delivery');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filtersLoading, setFiltersLoading] = useState(false);

  // Fetch filter options (for both admin and coach)
  const fetchFilterOptions = useCallback(async () => {
    try {
      setFiltersLoading(true);

      // Fetch balagruhas - use getUserBalagruhas for all roles (returns assigned balagruhas)
      const balagruhasResponse = await getUserBalagruhas();
      // getUserBalagruhas returns { success: true, data: [balagruhas] }
      const allBalagruhas = balagruhasResponse?.data || [];
      
      // Filter out STOCK option if present
      const filteredBalagruhas = allBalagruhas.filter(b => b._id !== 'STOCK');

      setBalagruhas(filteredBalagruhas);

      // Fetch coaches (admin only)
      if (isAdmin) {
        const usersResponse = await fetchUsers();
        // fetchUsers returns response.data, which could be { users: [...] } or [...]
        const allUsers = usersResponse?.users || usersResponse || [];
        const coachesData = allUsers.filter(u => u.role?.toLowerCase() === 'coach');

        setAllCoaches(coachesData);
        // Initial coaches list is all coaches (will be filtered by useEffect when balagruha is selected)
        setCoaches(coachesData);
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
      setBalagruhas([]);
      setAllCoaches([]);
      setCoaches([]);
    } finally {
      setFiltersLoading(false);
    }
  }, [isAdmin, user]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);

      // Build params based on filters (admin only - coaches always see their own stats)
      const params = {};

      if (isAdmin) {
        // Add balagruha filter
        if (balagruhaFilter !== 'all') {
          params.balagruhaId = balagruhaFilter;
        }

        // Add coach filter
        if (coachFilter !== 'all') {
          params.coachId = coachFilter;
        }
      }

      const response = await getCoachDeliveryStats(params);
      if (response.success) {
        setStats({
          pendingCount: response.pendingCount || 0,
          deliveredToday: response.deliveredToday || 0,
          deliveredThisWeek: response.deliveredThisWeek || 0,
          totalDelivered: response.totalDelivered || 0
        });
      }
    } catch (err) {
      console.error('Error fetching delivery stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [isAdmin, balagruhaFilter, coachFilter]);

  // Fetch deliveries
  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build params based on filters
      const params = {
        status: statusFilter,
        limit: 50
      };

      // Add balagruha filter (for both admin and coach)
      if (balagruhaFilter !== 'all') {
        params.balagruhaId = balagruhaFilter;
      }

      // Add coach filter (admin only)
      if (isAdmin && coachFilter !== 'all') {
        params.coachId = coachFilter;
      }

      // Add date range filters
      if (startDate) {
        params.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
      }

      // On-demand confirmation happens in backend when this endpoint is called
      const response = await getCoachDeliveries(params);

      if (response.success) {
        setDeliveries(response.orders || []);
      }
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      setError(err.response?.data?.error || 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, balagruhaFilter, coachFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    // Fetch filter options for both admin and coach
    fetchFilterOptions();
    fetchStats();
    fetchDeliveries();

    // Refresh every 30 seconds (in case other coaches deliver orders)
    const interval = setInterval(() => {
      fetchStats();
      fetchDeliveries();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStats, fetchDeliveries, fetchFilterOptions]);

  // Filter coaches when balagruha changes (admin only)
  useEffect(() => {
    if (!isAdmin || allCoaches.length === 0) return;

    if (balagruhaFilter === 'all') {
      // Show all coaches when no balagruha is selected
      setCoaches(allCoaches);
    } else {
      // Filter coaches by selected balagruha
      const filteredCoaches = allCoaches.filter(coach => {
        const coachBalagruhaIds = (coach.balagruhaIds || []).map(id =>
          typeof id === 'object' ? id._id : id
        );
        return coachBalagruhaIds.includes(balagruhaFilter);
      });

      setCoaches(filteredCoaches);

      // Reset coach filter if currently selected coach is not in the filtered list
      if (coachFilter !== 'all' && !filteredCoaches.find(c => c._id === coachFilter)) {
        setCoachFilter('all');
      }
    }
  }, [isAdmin, balagruhaFilter, allCoaches, coachFilter]);

  const handleMarkDelivered = async (order, withNotes = false) => {
    if (withNotes) {
      // Show notes modal
      setSelectedOrder(order);
      setShowNotesModal(true);
      return;
    }

    // Deliver without notes
    await confirmDelivery(order._id, '');
  };

  const confirmDelivery = async (orderId, notes) => {
    try {
      setDelivering(orderId);
      const response = await markOrderDelivered(orderId, notes);

      if (response.success) {
        // Refresh both stats and deliveries
        await fetchStats();
        await fetchDeliveries();

        // Show success message briefly
        alert(`Order ${response.order.orderNumber} marked as delivered!`);
      }
    } catch (err) {
      console.error('Error marking order as delivered:', err);
      alert(err.response?.data?.error || 'Failed to mark order as delivered');
    } finally {
      setDelivering(null);
      setShowNotesModal(false);
      setSelectedOrder(null);
      setDeliveryNotes('');
    }
  };

  const handleConfirmWithNotes = () => {
    if (selectedOrder && deliveryNotes.trim().length > 500) {
      alert('Delivery notes must be 500 characters or less');
      return;
    }
    confirmDelivery(selectedOrder._id, deliveryNotes.trim());
  };

  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-slate-900">Delivery Management</h1>
          <p className="text-slate-600 mt-1">Manage student orders waiting for delivery</p>
        </div>
      </div>

      {/* Shop Navigation */}
      <ShopNavigation />

      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Admin Filters */}
        {isAdmin && (
          <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Filter Deliveries</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Balagruha Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Balagruha
                </label>
                <select
                  value={balagruhaFilter}
                  onChange={(e) => setBalagruhaFilter(e.target.value)}
                  disabled={filtersLoading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-slate-100"
                >
                  <option value="all">All Balagruhas</option>
                  {balagruhas.map((balagruha) => (
                    <option key={balagruha._id} value={balagruha._id}>
                      {balagruha.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coach Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Filter by Coach
                </label>
                <select
                  value={coachFilter}
                  onChange={(e) => setCoachFilter(e.target.value)}
                  disabled={filtersLoading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-slate-100"
                >
                  <option value="all">All Coaches</option>
                  {coaches.map((coach) => (
                    <option key={coach._id} value={coach._id}>
                      {coach.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Delivery Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="pending_delivery">Pending Delivery</option>
                  <option value="delivered_today">Delivered Today</option>
                  <option value="delivered_last_7_days">Delivered Last 7 Days</option>
                  <option value="all_delivered">Total Delivered</option>
                </select>
              </div>

              {/* Start Date Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* End Date Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Coach Filters */}
        {!isAdmin && (
          <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Filter Deliveries</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Balagruha Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Balagruha
                </label>
                <select
                  value={balagruhaFilter}
                  onChange={(e) => setBalagruhaFilter(e.target.value)}
                  disabled={filtersLoading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-slate-100"
                >
                  <option value="all">All Balagruhas</option>
                  {balagruhas.map((balagruha) => (
                    <option key={balagruha._id} value={balagruha._id}>
                      {balagruha.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Delivery Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="pending_delivery">Pending Delivery</option>
                  <option value="delivered_today">Delivered Today</option>
                  <option value="delivered_last_7_days">Delivered Last 7 Days</option>
                  <option value="all_delivered">Total Delivered</option>
                </select>
              </div>

              {/* Start Date Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* End Date Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {(balagruhaFilter !== 'all' || statusFilter !== 'pending_delivery' || startDate || endDate) && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    setBalagruhaFilter('all');
                    setStatusFilter('pending_delivery');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-4 py-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Pending Deliveries */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Pending Deliveries</p>
                {statsLoading ? (
                  <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-purple-600">{stats.pendingCount}</p>
                )}
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Delivered Today */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Delivered Today</p>
                {statsLoading ? (
                  <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-green-600">{stats.deliveredToday}</p>
                )}
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Delivered Last 7 Days */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Delivered Last 7 Days</p>
                {statsLoading ? (
                  <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-blue-600">{stats.deliveredThisWeek}</p>
                )}
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Delivered */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Delivered</p>
                {statsLoading ? (
                  <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-slate-900">{stats.totalDelivered}</p>
                )}
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner (5-minute window explanation) */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-blue-900 font-medium">Smart Confirmation Window</p>
            <p className="text-sm text-blue-700 mt-1">Orders appear here 5 minutes after placement, allowing students time to cancel if needed.</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-lg p-6 border border-slate-200">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="h-5 bg-slate-200 rounded w-1/3 mb-3"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-10 w-32 bg-slate-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Failed to load deliveries</h3>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={fetchDeliveries}
              className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Delivery List */}
        {!loading && !error && deliveries.length > 0 && (
          <div className="space-y-4">
            {deliveries.map((order) => (
              <div key={order._id} className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{order.orderNumber}</h3>
                      {order.deliveryStatus === 'delivered' ? (
                        <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Delivered
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                          Pending Delivery
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {order.userId?.name || 'Unknown Student'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        {order.balagruhaNames || 'N/A'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(order.placedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t border-slate-200 pt-4 mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Items ({order.items?.length || 0}):</p>
                  <div className="space-y-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        {(item.shopItemId?.imageUrl || item.shopItemId?.images?.length > 0) && (
                          <img
                            src={
                              item.shopItemId?.imageUrl ||
                              item.shopItemId?.images?.find(img => img.isPrimary)?.url ||
                              item.shopItemId?.images?.[0]?.url ||
                              'https://via.placeholder.com/48'
                            }
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded border border-slate-200"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-slate-600">Qty: {item.quantity} × {item.price} coins</p>
                        </div>
                        <p className="font-semibold text-slate-900">{item.subtotal} coins</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-3 border-t border-slate-200 mt-3">
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Total Amount:</p>
                      <p className="text-2xl font-bold text-purple-600">{order.totalAmount} coins</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons or Delivery Info */}
                {order.deliveryStatus === 'pending_delivery' ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleMarkDelivered(order, false)}
                      disabled={delivering === order._id}
                      className="flex-1 bg-purple-600 text-white px-4 py-2.5 rounded-md hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {delivering === order._id ? 'Delivering...' : 'Mark as Delivered'}
                    </button>
                    <button
                      onClick={() => handleMarkDelivered(order, true)}
                      disabled={delivering === order._id}
                      className="px-4 py-2.5 border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50 disabled:border-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Add Notes & Deliver
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900 mb-1">Delivered Successfully</p>
                        <div className="text-sm text-green-700 space-y-1">
                          {order.deliveredAt && (
                            <p>
                              <span className="font-medium">Delivered on:</span>{' '}
                              {new Date(order.deliveredAt).toLocaleString()}
                            </p>
                          )}
                          {order.deliveredBy && (
                            <p>
                              <span className="font-medium">Delivered by:</span>{' '}
                              {typeof order.deliveredBy === 'object' ? order.deliveredBy.name : order.deliveredBy}
                            </p>
                          )}
                          {order.deliveryNotes && (
                            <p>
                              <span className="font-medium">Notes:</span>{' '}
                              {order.deliveryNotes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && deliveries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">All caught up!</h3>
            <p className="text-slate-600">No pending deliveries at the moment.</p>
          </div>
        )}
      </div>

      {/* Delivery Notes Modal */}
      {showNotesModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Add Delivery Notes</h3>
            <p className="text-sm text-slate-600 mb-4">Order: {selectedOrder.orderNumber}</p>
            <textarea
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Optional delivery notes (e.g., 'Delivered to coach office', 'Student picked up item')"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-slate-500 mt-1">{deliveryNotes.length}/500 characters</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setSelectedOrder(null);
                  setDeliveryNotes('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmWithNotes}
                disabled={delivering === selectedOrder._id}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {delivering === selectedOrder._id ? 'Delivering...' : 'Confirm Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
