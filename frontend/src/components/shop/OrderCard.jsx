import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

/**
 * OrderCard Component - Sprint5-Story-04
 * Individual order card in order history list
 * Uses WTF pin card pattern for consistency
 *
 * @param {Object} order - Order object with all details
 */

export default function OrderCard({ order }) {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
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
    <div
      className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => navigate(`/shop/orders/${order.orderNumber}`)}
    >
      <div className="flex items-center justify-between gap-6">
        {/* Left Section: Order Details First */}
        <div className="flex items-center gap-6 flex-1">
          {/* Order Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-xl font-bold text-slate-900">
                Order #{order.orderNumber}
              </h3>
              <StatusBadge status={order.status} />
              {/* Delivery status pill — tells the student where their order is in the fulfillment pipeline */}
              {order.status === 'completed' && order.deliveryStatus === 'pending_confirmation' && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">⏳ Awaiting confirmation</span>
              )}
              {order.status === 'completed' && order.deliveryStatus === 'pending_delivery' && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">🚚 Pending delivery</span>
              )}
              {order.status === 'completed' && order.deliveryStatus === 'delivered' && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">✅ Delivered</span>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-1">
              {formatDate(order.placedAt)}
            </p>
            <p className="text-sm text-slate-500">
              {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
            </p>
            {order.deliveryStatus === 'delivered' && order.deliveredBy && (
              <p className="text-xs text-slate-500 mt-1">
                Delivered by <span className="font-medium text-slate-700">
                  {typeof order.deliveredBy === 'object' ? order.deliveredBy.name : 'Coach'}
                </span>
              </p>
            )}
          </div>

          {/* Items Preview - After Order Details */}
          <div className="flex items-center gap-2 shrink-0">
            {order.items?.slice(0, 3).map((item, index) => (
              <img
                key={item._id || index}
                src={
                  item.shopItemId?.imageUrl ||
                  item.shopItemId?.images?.find(img => img.isPrimary)?.url ||
                  item.shopItemId?.images?.[0]?.url ||
                  item.product?.imageUrl ||
                  item.imageUrl ||
                  'https://via.placeholder.com/64'
                }
                alt={item.shopItemId?.name || item.product?.name || item.name || 'Product'}
                className="w-16 h-16 rounded-lg border border-slate-200 object-cover"
              />
            ))}
            {(order.items?.length || 0) > 3 && (
              <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-sm text-slate-600 font-semibold">
                +{order.items.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Price & Action */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-sm text-slate-600 mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-purple-600">
              {order.totalAmount} coins
            </p>
          </div>

          <button
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/shop/orders/${order.orderNumber}`);
            }}
          >
            <span>View Details</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
