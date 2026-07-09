import React from 'react';
import { ShoppingCart } from 'lucide-react';
import useShopStore from '../../store/shopStore';

/**
 * CartIcon Component - Sprint5-Story-02 AC2
 * Header cart icon with item count badge
 *
 * Features:
 * - Shopping cart icon
 * - Badge showing total item count
 * - Opens cart drawer on click
 * - Animates when items added
 */
const CartIcon = () => {
  const { cartItemCount, toggleCart } = useShopStore();
  const itemCount = cartItemCount();

  return (
    <button
      onClick={toggleCart}
      className="relative p-2 rounded-md hover:bg-slate-100 transition-colors"
      aria-label="Shopping cart"
    >
      <ShoppingCart className="w-6 h-6 text-slate-700" />

      {/* Badge - only show if items in cart */}
      {itemCount > 0 && (
        <span
          className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse"
          aria-label={`${itemCount} items in cart`}
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  );
};

export default CartIcon;
