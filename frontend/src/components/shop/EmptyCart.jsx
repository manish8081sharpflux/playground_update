import React from 'react';
import { ShoppingCart } from 'lucide-react';

/**
 * EmptyCart Component - Sprint5-Story-02 AC8
 * Empty state when cart has no items
 *
 * Features:
 * - Empty state illustration (cart icon)
 * - "Your cart is empty" message
 * - "Start Shopping" button to close drawer
 */
const EmptyCart = ({ onStartShopping }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <ShoppingCart className="w-12 h-12 text-slate-400" />
      </div>

      {/* Heading */}
      <h3 className="text-2xl font-semibold text-slate-900 mb-2">
        Your cart is empty
      </h3>

      {/* Description */}
      <p className="text-slate-600 mb-8 max-w-sm">
        Start adding products to your cart and they will appear here.
      </p>

      {/* CTA Button */}
      <button
        onClick={onStartShopping}
        className="bg-purple-600 text-white px-8 py-3 rounded-md hover:bg-purple-700 transition-colors font-medium"
      >
        Start Shopping
      </button>
    </div>
  );
};

export default EmptyCart;
