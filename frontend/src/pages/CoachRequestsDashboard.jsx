import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getCoachDeliveries, getMyPurchaseRequests, updatePurchaseRequestStatus, getUserBalagruhas } from '../api';
import ShopNavigation from '../components/shop/ShopNavigation';
import Breadcrumbs from '../components/shop/Breadcrumbs';
import showToast from '../utils/toast';
import { PurchaseRequestStatuses, getPurchaseRequestStatusMeta } from '../constants/purchaseRequestStatuses';
import { formatDateOnly } from '../utils/dateFormatter';

const getDateRangeFromFilter = (filterValue) => {
  const formatDateParam = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();
  let startDate;
  let endDate;

  switch (filterValue) {
    case 'today': {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case 'thisWeek': {
      startDate = new Date(now);
      const dayOfWeek = startDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate.setDate(startDate.getDate() + daysToMonday);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case 'thisMonth': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case 'thisYear': {
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case 'all':
    default:
      return { startDate: null, endDate: null };
  }

  return {
    // Avoid timezone off-by-one from toISOString() when building YYYY-MM-DD params.
    startDate: formatDateParam(startDate),
    endDate: formatDateParam(endDate)
  };
};

const getPriority = (request) => {
  const reason = (request?.reason || '').trim();
  if (reason.toUpperCase().startsWith('[HIGH PRIORITY]')) {
    return 'High';
  }

  const justification = request?.justification || '';
  if (/\bpriority:\s*high\b/i.test(justification)) {
    return 'High';
  }

  return 'Normal';
};

const statusLabel = (status) => {
  const labels = {
    pending: 'Pending',
    ordered: 'Ordered',
    delivered_store: 'Delivered to Store',
    delivered_balagruha: 'Delivered to Balagruha',
    on_hold: 'On Hold',
    rejected: 'Rejected',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };

  return labels[status] || status || 'Unknown';
};

export default function CoachRequestsDashboard() {
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [purchaseLoading, setPurchaseLoading] = useState(true);
  const [purchaseError, setPurchaseError] = useState(null);
  const [markingDelivered, setMarkingDelivered] = useState(null);

  const [purchaseFilters, setPurchaseFilters] = useState({
    status: 'all',
    dateRange: 'all',
    fromDate: '',
    toDate: ''
  });

  const [digitalOrders, setDigitalOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);
  const [ordersStatus, setOrdersStatus] = useState('pending_delivery');

  // Lookup map of balagruhaId -> balagruha name, since purchase requests
  // may return balagruhaId as a raw ID string instead of a populated object.
  const [balagruhaMap, setBalagruhaMap] = useState({});

  const fetchBalagruhaMap = useCallback(async () => {
    try {
      const response = await getUserBalagruhas();
      if (response?.success) {
        const map = {};
        (response.data || []).forEach((bg) => {
          map[bg._id] = bg.name;
        });
        setBalagruhaMap(map);
      }
    } catch (err) {
      console.error('Error fetching balagruhas:', err);
    }
  }, []);

  const purchaseParams = useMemo(() => {
    const params = {};

    if (purchaseFilters.status && purchaseFilters.status !== 'all') {
      params.status = purchaseFilters.status;
    }

    if (purchaseFilters.dateRange && purchaseFilters.dateRange !== 'all') {
      if (purchaseFilters.dateRange === 'custom') {
        if (purchaseFilters.fromDate) params.startDate = purchaseFilters.fromDate;
        if (purchaseFilters.toDate) params.endDate = purchaseFilters.toDate;
      } else {
        const { startDate, endDate } = getDateRangeFromFilter(purchaseFilters.dateRange);
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
    }

    return params;
  }, [purchaseFilters]);

  const fetchPurchaseRequests = useCallback(async () => {
    try {
      setPurchaseLoading(true);
      setPurchaseError(null);

      const response = await getMyPurchaseRequests(purchaseParams);
      if (!response?.success) {
        setPurchaseError(response?.message || 'Failed to load purchase requests');
        setPurchaseRequests([]);
        return;
      }

      const requests = response?.data?.requests || response?.requests || [];
      setPurchaseRequests(requests);
    } catch (err) {
      console.error('Error fetching my purchase requests:', err);
      setPurchaseError(err?.response?.data?.message || 'Failed to load purchase requests');
      setPurchaseRequests([]);
    } finally {
      setPurchaseLoading(false);
    }
  }, [purchaseParams]);

  const handleMarkDeliveredToBalagruha = async (requestId) => {
    try {
      setMarkingDelivered(requestId);

      const response = await updatePurchaseRequestStatus(requestId, {
        status: PurchaseRequestStatuses.DELIVERED_BALAGRUHA,
        notes: 'Marked Delivered to Balagruha by requester'
      });

      if (!response?.success) {
        showToast(response?.message || 'Failed to mark Delivered to Balagruha', 'error');
        return;
      }

      showToast('Marked as Delivered to Balagruha', 'success');
      await fetchPurchaseRequests();
    } catch (err) {
      console.error('Error marking Delivered to Balagruha:', err);
      showToast(err?.response?.data?.message || 'Failed to mark Delivered to Balagruha', 'error');
    } finally {
      setMarkingDelivered(null);
    }
  };

  const fetchDigitalOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      setOrdersError(null);

      const response = await getCoachDeliveries({ status: ordersStatus, limit: 50 });
      if (!response?.success) {
        setOrdersError(response?.error || response?.message || 'Failed to load digital orders');
        setDigitalOrders([]);
        return;
      }

      setDigitalOrders(response?.orders || []);
    } catch (err) {
      console.error('Error fetching coach deliveries:', err);
      setOrdersError(err?.response?.data?.error || 'Failed to load digital orders');
      setDigitalOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [ordersStatus]);

  useEffect(() => {
    fetchPurchaseRequests();
  }, [fetchPurchaseRequests]);

  useEffect(() => {
    fetchBalagruhaMap();
  }, [fetchBalagruhaMap]);

  useEffect(() => {
    fetchDigitalOrders();
  }, [fetchDigitalOrders]);

  return (
    <div className="w-full min-h-screen bg-slate-50">
      

      <div className="bg-white border-b border-slate-200">
        <div className="w-full px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900">My Requests</h1>
          <p className="text-slate-600 mt-1">
            Track your purchase requests and see digital orders that need delivery.
          </p>
        </div>
      </div>
      <ShopNavigation />
      <Breadcrumbs />

      <div className="w-full px-4 py-6 space-y-8">
        {/* My Purchase Requests */}
        <section className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-slate-900">My Purchase Requests</h2>

            <div className="flex flex-col sm:flex-row gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={purchaseFilters.status}
                  onChange={(e) => setPurchaseFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="ordered">Ordered</option>
                  <option value="delivered_store">Delivered to Store</option>
                  <option value="delivered_balagruha">Delivered to Balagruha</option>
                  <option value="on_hold">On Hold</option>
                  <option value="rejected">Rejected</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date Range</label>
                <select
                  value={purchaseFilters.dateRange}
                  onChange={(e) =>
                    setPurchaseFilters((prev) => ({
                      ...prev,
                      dateRange: e.target.value,
                      ...(e.target.value === 'custom' ? {} : { fromDate: '', toDate: '' })
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="today">Today</option>
                  <option value="thisWeek">This Week</option>
                  <option value="thisMonth">This Month</option>
                  <option value="thisYear">This Year</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {purchaseFilters.dateRange === 'custom' && (
                <div className="flex gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                    <input
                      type="date"
                      value={purchaseFilters.fromDate}
                      onChange={(e) => setPurchaseFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                    <input
                      type="date"
                      value={purchaseFilters.toDate}
                      onChange={(e) => setPurchaseFilters((prev) => ({ ...prev, toDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {purchaseLoading && <p className="text-slate-600">Loading purchase requests...</p>}

          {purchaseError && !purchaseLoading && (
            <p className="text-red-600">{purchaseError}</p>
          )}

          {!purchaseLoading && !purchaseError && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 border-b border-slate-200">
                    <th className="py-2 pr-4">Request</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4">Balagruha</th>
                    <th className="py-2 pr-4">Items</th>
                    <th className="py-2 pr-4">Priority</th>
                    <th className="py-2 pr-4">Deadline</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseRequests.map((req) => {
                    const priority = getPriority(req);
                    const rawBalagruhaId =
                      req?.balagruhaId?._id || req?.balagruhaId;
                    const balagruhaName =
                      req?.balagruhaId === 'STOCK'
                        ? 'STOCK'
                        : req?.balagruhaId?.name ||
                          balagruhaMap[rawBalagruhaId] ||
                          'N/A';

                    const itemsCount = Array.isArray(req?.items) ? req.items.length : 0;

                    return (
                      <tr key={req._id || req.requestId} className="border-b border-slate-100">
                        <td className="py-3 pr-4">
                          <div className="font-medium text-slate-900">{req.requestId || '—'}</div>
                          {priority === 'High' && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              High Priority
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-slate-700">
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 pr-4 text-slate-700">{balagruhaName}</td>
                        <td className="py-3 pr-4 text-slate-700">{itemsCount}</td>
                        <td className="py-3 pr-4 text-slate-700">
                          {(req.priority || '').toLowerCase() === 'high'
                            ? 'High'
                            : (req.priority || '').toLowerCase() === 'low'
                              ? 'Low'
                              : 'Medium'}
                        </td>
                        <td className="py-3 pr-4 text-slate-700">
                          {req.deadline ? formatDateOnly(req.deadline, 'dd/mm/yy') : '—'}
                        </td>
                        <td className="py-3 pr-4 text-slate-700">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span>{getPurchaseRequestStatusMeta(req.status)?.label || statusLabel(req.status)}</span>
                            {req.status === PurchaseRequestStatuses.DELIVERED_STORE && (
                              <button
                                type="button"
                                onClick={() => handleMarkDeliveredToBalagruha(req._id)}
                                disabled={markingDelivered === req._id}
                                className="px-3 py-1.5 text-xs font-medium rounded-md border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                title="Confirm you have received and handed over the items"
                              >
                                {markingDelivered === req._id ? 'Marking…' : 'Mark Delivered'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {purchaseRequests.length === 0 && (
                    <tr>
                      <td className="py-6 text-slate-600" colSpan={7}>
                        No purchase requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Digital Orders */}
        <section className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Digital Orders</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Status</label>
              <select
                value={ordersStatus}
                onChange={(e) => setOrdersStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="pending_delivery">Pending Delivery</option>
                <option value="delivered_today">Delivered Today</option>
                <option value="delivered_last_7_days">Delivered Last 7 Days</option>
                <option value="all_delivered">Total Delivered</option>
              </select>
            </div>
          </div>

          {ordersLoading && <p className="text-slate-600">Loading digital orders...</p>}

          {ordersError && !ordersLoading && (
            <p className="text-red-600">{ordersError}</p>
          )}

          {!ordersLoading && !ordersError && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 border-b border-slate-200">
                    <th className="py-2 pr-4">Order</th>
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Balagruha</th>
                    <th className="py-2 pr-4">Placed</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {digitalOrders.map((order) => (
                    <tr key={order._id || order.orderNumber} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium text-slate-900">{order.orderNumber || '—'}</td>
                      <td className="py-3 pr-4 text-slate-700">{order.userId?.name || 'Unknown Student'}</td>
                      <td className="py-3 pr-4 text-slate-700">{order.balagruhaNames || 'N/A'}</td>
                      <td className="py-3 pr-4 text-slate-700">
                        {order.placedAt ? new Date(order.placedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {order.deliveryStatus === 'pending_delivery' ? 'Pending Delivery' : 'Delivered'}
                      </td>
                    </tr>
                  ))}

                  {digitalOrders.length === 0 && (
                    <tr>
                      <td className="py-6 text-slate-600" colSpan={5}>
                        No digital orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
