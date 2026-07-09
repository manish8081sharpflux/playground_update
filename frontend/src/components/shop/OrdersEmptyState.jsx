import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * OrdersEmptyState Component - Sprint5-Story-04
 * Empty state when user has no orders
 */

export default function OrdersEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      </div>

      {/* Heading */}
      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        No Orders Yet
      </h3>

      {/* Description */}
      <p className="text-slate-600 max-w-md mb-6">
        You haven't placed any orders yet. Browse our shop to find amazing products you can purchase with your ISF coins!
      </p>

      {/* CTA Button */}
      <button
        onClick={() => navigate('/shop')}
        className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
        Browse Shop
      </button>
    </div>
  );
}
