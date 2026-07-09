import React from 'react';

/**
 * OrderTimeline Component - Sprint5-Story-04
 * Visual timeline showing order status progression
 *
 * @param {Object} order - Order object with timestamps
 */

export default function OrderTimeline({ order }) {
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Timeline</h3>
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200"></div>

        {/* Timeline Items */}
        <div className="space-y-4">
          {/* Order Placed */}
          <div className="relative flex items-start gap-4">
            <div className="w-6 h-6 rounded-full bg-green-500 border-4 border-white z-10 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1 pt-0.5">
              <p className="font-semibold text-slate-900">Order Placed</p>
              <p className="text-sm text-slate-600">
                {formatDateTime(order.placedAt)}
              </p>
            </div>
          </div>

          {/* Processing (if applicable) */}
          {order.processingAt && (
            <div className="relative flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-blue-500 border-4 border-white z-10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-white">●</span>
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold text-slate-900">Processing</p>
                <p className="text-sm text-slate-600">
                  {formatDateTime(order.processingAt)}
                </p>
              </div>
            </div>
          )}

          {/* Completed (transaction, not delivery) */}
          {order.status === 'completed' && order.completedAt && (
            <div className="relative flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-green-500 border-4 border-white z-10 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold text-slate-900">Payment Completed</p>
                <p className="text-sm text-slate-600">
                  {formatDateTime(order.completedAt)}
                </p>
              </div>
            </div>
          )}

          {/* Confirmed for Delivery */}
          {order.status === 'completed' && order.confirmedForDeliveryAt && (
            <div className="relative flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-blue-500 border-4 border-white z-10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-white">🚚</span>
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold text-slate-900">Confirmed for Delivery</p>
                <p className="text-sm text-slate-600">
                  {formatDateTime(order.confirmedForDeliveryAt)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Your Balagruha coaches have been notified
                </p>
              </div>
            </div>
          )}

          {/* Delivered */}
          {order.deliveryStatus === 'delivered' && order.deliveredAt && (
            <div className="relative flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-green-600 border-4 border-white z-10 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold text-slate-900">Delivered</p>
                <p className="text-sm text-slate-600">
                  {formatDateTime(order.deliveredAt)}
                </p>
                {order.deliveredBy && (
                  <p className="text-sm text-slate-700 mt-1">
                    By <span className="font-medium">
                      {typeof order.deliveredBy === 'object' ? order.deliveredBy.name : 'Coach'}
                    </span>
                  </p>
                )}
                {order.deliveryNotes && (
                  <p className="text-xs text-slate-500 mt-1">
                    Note: {order.deliveryNotes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cancelled */}
          {order.status === 'cancelled' && order.cancelledAt && (
            <div className="relative flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-red-500 border-4 border-white z-10 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold text-slate-900">Cancelled</p>
                <p className="text-sm text-slate-600">
                  {formatDateTime(order.cancelledAt)}
                </p>
                {order.cancellationReason && (
                  <p className="text-sm text-slate-500 mt-1">
                    Reason: {order.cancellationReason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Refunded */}
          {order.status === 'refunded' && order.refundedAt && (
            <div className="relative flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-purple-500 border-4 border-white z-10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-white">↩</span>
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold text-slate-900">Refunded</p>
                <p className="text-sm text-slate-600">
                  {formatDateTime(order.refundedAt)}
                </p>
                {order.refundAmount && (
                  <p className="text-sm text-slate-500 mt-1">
                    Amount: {order.refundAmount} coins
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
