import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ShoppingCart } from 'lucide-react';
import useShopStore from '../../store/shopStore';
import CartItem from './CartItem';
import EmptyCart from './EmptyCart';
import CartSummary from './CartSummary';

/**
 * Cart Component - Sprint5-Story-02 AC3
 * Main cart drawer (slide-in from right)
 *
 * Features:
 * - Slide-in drawer from right side
 * - List of all cart items
 * - Cart summary with total cost
 * - Empty state
 * - Stock validation on open
 */
const Cart = () => {
  const navigate = useNavigate();
  const {
    isCartOpen,
    setCartOpen,
    cart,
    cartLoading,
    cartItemCount,
    cartTotalCost,
    isCartEmpty,
    fetchCart,
    validateStock
  } = useShopStore();

  const itemCount = cartItemCount();
  const totalCost = cartTotalCost();
  const isEmpty = isCartEmpty();

  // Fetch cart when drawer opens
  useEffect(() => {
    if (isCartOpen) {
      fetchCart();
      validateStock(); // AC7: Validate stock on cart open
    }
  }, [isCartOpen, fetchCart, validateStock]);

  const handleClose = () => setCartOpen(false);

  const handleContinueShopping = () => {
    setCartOpen(false);
    navigate('/shop');
  };

  const handleCheckout = () => {
    // AC8: Navigate to checkout (Story-03)
    setCartOpen(false);
    navigate('/shop/checkout');
  };

  return (
    <Dialog.Root open={isCartOpen} onOpenChange={setCartOpen}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />

        {/* Cart Drawer */}
        <Dialog.Content
          className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right"
          aria-describedby="cart-description"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
              <Dialog.Title className="text-xl font-semibold text-slate-900">
                Shopping Cart
              </Dialog.Title>
            </div>

            <Dialog.Close asChild>
              <button
                className="w-10 h-10 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors"
                aria-label="Close cart"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </Dialog.Close>
          </div>

          {/* Hidden description for accessibility */}
          <p id="cart-description" className="sr-only">
            Your shopping cart with {itemCount} items
          </p>

          {/* Loading State */}
          {cartLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
            </div>
          )}

          {/* Empty Cart */}
          {!cartLoading && isEmpty && <EmptyCart onStartShopping={handleContinueShopping} />}

          {/* Cart Items */}
          {!cartLoading && !isEmpty && (
            <>
              {/* Items List */}
              <div className="flex-1 overflow-y-auto">
                {cart.map((item) => (
                  <CartItem key={item.shopItemId._id} item={item} />
                ))}
              </div>

              {/* Summary */}
              <CartSummary
                totalCost={totalCost}
                itemCount={itemCount}
                onContinueShopping={handleContinueShopping}
                onCheckout={handleCheckout}
              />
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default Cart;
