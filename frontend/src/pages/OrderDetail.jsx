import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/shop/StatusBadge';
import OrderTimeline from '../components/shop/OrderTimeline';
import CancellationTimer from '../components/shop/CancellationTimer';
import CancelOrderModal from '../components/shop/CancelOrderModal';
import ShopNavigation from '../components/shop/ShopNavigation';
import Breadcrumbs from '../components/shop/Breadcrumbs';
import toast from 'react-hot-toast';
import LoadingState from '../components/common/LoadingState';

/**
 * OrderDetail Page - Sprint5-Story-04, Sprint5-Story-10
 * Displays full order details with cancellation option (5-minute window)
 */

export default function OrderDetail() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchOrderDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/v2/shop/orders/${orderNumber}`);
      setOrder(response.data.order);
    } catch (err) {
      console.error('Error fetching order detail:', err);
      setError(err.response?.data?.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const canCancelOrder = (order) => {
    if (!order || order.status !== 'completed') return false;

    const orderTime = new Date(order.placedAt).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    const now = Date.now();

    return (now - orderTime) < fiveMinutes;
  };

  const handleCancelOrder = async (reason) => {
    try {
      await api.post(`/api/v2/shop/orders/${orderNumber}/cancel`, {
        reason: reason || undefined
      });

      toast.success('Order cancelled successfully! Coins have been refunded.');

      // Refresh order details
      await fetchOrderDetail();
    } catch (err) {
      console.error('Error cancelling order:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel order');
      throw err;
    }
  };

  const handleViewReceipt = () => {
    navigate(`/shop/orders/${orderNumber}/receipt`);
  };

  const handleBackNavigation = () => {
    // Check if we came from transaction reports
    if (location.state?.from === 'transaction-reports') {
      navigate('/shop/admin/reports');
    } else {
      navigate('/shop/orders');
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingState message="Loading order details..." fullScreen />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="w-full px-4 py-16">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Not Found</h2>
            <p className="text-slate-600 mb-6">{error || 'The order you are looking for does not exist.'}</p>
            <button
              onClick={handleBackNavigation}
              className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              {location.state?.from === 'transaction-reports' ? 'Back to Reports' : 'Back to Orders'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="w-full px-4 py-6">
          <button
            onClick={handleBackNavigation}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {location.state?.from === 'transaction-reports' ? 'Back to Reports' : 'Back to Orders'}
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Order Details</h1>
        </div>
      </div>

      {/* Shop Navigation */}
      <ShopNavigation />

      {/* Breadcrumbs */}
      <Breadcrumbs />

      <div className="w-full px-4 py-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          {/* Order Info Section */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Order Number</p>
                <p className="font-semibold text-slate-900">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Placed On</p>
                <p className="font-semibold text-slate-900">{formatDateTime(order.placedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Status</p>
                <StatusBadge status={order.status} />
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Amount</p>
                <p className="text-lg font-bold text-slate-900">{order.totalAmount} coins</p>
              </div>
            </div>
          </div>

          {/* Delivery Section — shows who's handling/handled the order */}
          {order.status === 'completed' && order.deliveryStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                📦 Delivery
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Delivery Status</p>
                  {order.deliveryStatus === 'pending_confirmation' && (
                    <p className="font-semibold text-amber-700">⏳ Awaiting confirmation (cancellable)</p>
                  )}
                  {order.deliveryStatus === 'pending_delivery' && (
                    <p className="font-semibold text-blue-700">🚚 Pending delivery — your coach has been notified</p>
                  )}
                  {order.deliveryStatus === 'delivered' && (
                    <p className="font-semibold text-green-700">✅ Delivered</p>
                  )}
                  {order.deliveryStatus === 'cancelled' && (
                    <p className="font-semibold text-slate-500">Cancelled</p>
                  )}
                </div>
                {order.deliveryStatus === 'delivered' && order.deliveredBy && (
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Delivered By</p>
                    <p className="font-semibold text-slate-900">
                      👤 {typeof order.deliveredBy === 'object' ? order.deliveredBy.name : 'Coach'}
                    </p>
                    {order.deliveredAt && (
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDateTime(order.deliveredAt)}
                      </p>
                    )}
                  </div>
                )}
                {(order.deliveryStatus === 'pending_confirmation' || order.deliveryStatus === 'pending_delivery') && (
                  <div className="sm:col-span-2 text-xs text-slate-600 bg-white rounded p-2 border border-blue-100">
                    💡 Your order will be handed to you by a coach from your Balagruha.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Items</h3>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item._id} className="flex items-center gap-4 bg-slate-50 rounded-lg p-4">
                  <img
                    src={
                      item.shopItemId?.imageUrl ||
                      item.shopItemId?.images?.find(img => img.isPrimary)?.url ||
                      item.shopItemId?.images?.[0]?.url ||
                      item.product?.imageUrl ||
                      item.imageUrl ||
                      'https://via.placeholder.com/80'
                    }
                    alt={item.shopItemId?.name || item.product?.name || item.name}
                    className="w-16 h-16 rounded border border-slate-200 object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{item.shopItemId?.name || item.product?.name || item.name}</h4>
                    <p className="text-sm text-slate-600">
                      Qty: {item.quantity} × {item.price} coins
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{item.subtotal} coins</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Timeline */}
          <OrderTimeline order={order} />

          {/* Total */}
          <div className="bg-slate-100 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-slate-900">Total</span>
              <span className="text-2xl font-bold text-slate-900">{order.totalAmount} coins</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {canCancelOrder(order) && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex-1 bg-red-500 text-white px-6 py-3 rounded-md hover:bg-red-600 transition-colors font-medium"
              >
                Cancel Order
              </button>
            )}
            <button
              onClick={handleViewReceipt}
              className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Receipt
            </button>
          </div>

          {/* Cancellation Timer */}
          {canCancelOrder(order) && <CancellationTimer order={order} />}

          {/* Cancellation Expired Message */}
          {!canCancelOrder(order) && order.status === 'completed' && (
            <p className="text-sm text-slate-500 mt-4 text-center">
              ⚠ Cancellation period has expired (orders can be cancelled within 5 minutes)
            </p>
          )}
        </div>
      </div>

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelOrder}
        order={order}
      />
    </div>
  );
}
