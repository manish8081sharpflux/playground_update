import React from 'react';

/**
 * CartSummary Component - Sprint5-Story-02 AC3
 * Total cost display at bottom of cart drawer
 *
 * Features:
 * - Displays total cost in coins
 * - Shows item count
 * - "Continue Shopping" and "Checkout" buttons
 */
const CartSummary = ({ totalCost, itemCount, onContinueShopping, onCheckout }) => {
  return (
    <div className="border-t border-slate-200 p-4 bg-white">
      {/* Total Cost */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-semibold text-slate-900">Total</span>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">{totalCost} coins</p>
          <p className="text-xs text-slate-500">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={onCheckout}
          className="w-full bg-purple-600 text-white px-4 py-3 rounded-md hover:bg-purple-700 transition-colors font-semibold"
        >
          Proceed to Checkout
        </button>

        <button
          onClick={onContinueShopping}
          className="w-full bg-slate-200 text-slate-800 px-4 py-3 rounded-md hover:bg-slate-300 transition-colors font-medium"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
};

export default CartSummary;
