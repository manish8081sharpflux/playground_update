// Sprint5-Story-16: Shopping Summary Card
// Displays student shop order history and statistics

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Package, Clock, TrendingUp } from 'lucide-react';

export default function ShoppingCard({ shop }) {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <ShoppingBag className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Shopping Summary</h2>
            <p className="text-sm text-slate-600">Your shop order history</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/shop/orders')}
          className="text-purple-600 hover:text-purple-700 font-medium text-sm"
        >
          View All Orders →
        </button>
      </div>

      {/* Shop Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="flex justify-center mb-2">
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">{shop.totalOrders || 0}</p>
          <p className="text-xs text-purple-700 mt-1">Total Orders</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="flex justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{shop.totalSpent || 0}</p>
          <p className="text-xs text-blue-700 mt-1">Coins Spent</p>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="flex justify-center mb-2">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-900">{shop.pendingDeliveries || 0}</p>
          <p className="text-xs text-yellow-700 mt-1">Pending</p>
        </div>
      </div>

      {/* Recent Orders */}
      {shop.recentOrders && shop.recentOrders.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Orders</h3>
          <div className="space-y-2">
            {shop.recentOrders.map((order) => (
              <div
                key={order.orderNumber}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => navigate(`/shop/orders/${order.orderNumber}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">Order #{order.orderNumber}</p>
                  <p className="text-xs text-slate-600">
                    {formatDate(order.placedAt)} • {order.itemCount} item
                    {order.itemCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <p className="font-bold text-purple-600 whitespace-nowrap">
                    {order.totalAmount} coins
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-600">No orders yet</p>
          <p className="text-sm text-slate-500 mb-4">Start shopping to see your order history!</p>
          <button
            onClick={() => navigate('/shop')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            Browse Shop
          </button>
        </div>
      )}
    </div>
  );
}
