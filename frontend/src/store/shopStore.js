import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '../api';
import toast from 'react-hot-toast';

/**
 * Shop Store - Sprint5-Story-02
 * Zustand state management for shopping cart
 *
 * Features:
 * - Local state for cart items
 * - Persistence via localStorage
 * - API sync for cart operations (using centralized api instance)
 * - Computed values (itemCount, totalCost)
 * - Toast notifications for user feedback
 */

const useShopStore = create(
  persist(
    (set, get) => ({
      // ========== State ==========
      cart: [],
      cartLoading: false,
      cartError: null,
      isCartOpen: false,

      // ========== Actions ==========

      /**
       * Set cart drawer open/closed
       */
      setCartOpen: (isOpen) => set({ isCartOpen: isOpen }),

      /**
       * Toggle cart drawer
       */
      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

      /**
       * Fetch cart from API
       */
      fetchCart: async () => {
        set({ cartLoading: true, cartError: null });

        try {
          const response = await api.get('/api/v2/shop/cart');

          set({
            cart: response.data.cart.items || [],
            cartLoading: false
          });
        } catch (error) {
          console.error('Error fetching cart:', error);
          set({
            cartError: error.response?.data?.message || 'Failed to fetch cart',
            cartLoading: false
          });
        }
      },

      /**
       * Add item to cart (with API sync)
       */
      addToCart: async (product, quantity = 1) => {
        set({ cartLoading: true, cartError: null });

        try {
          const response = await api.post('/api/v2/shop/cart', {
            productId: product._id,
            quantity
          });

          // Update local state with server response
          set({
            cart: response.data.cart.items || [],
            cartLoading: false
          });

          // Show success toast
          toast.success('Product added to cart', {
            duration: 2000,
            position: 'top-right',
            icon: '🛒'
          });

          return response.data;
        } catch (error) {
          console.error('Error adding to cart:', error);
          const errorMessage = error.response?.data?.message || 'Failed to add to cart';

          set({
            cartError: errorMessage,
            cartLoading: false
          });

          // Show error toast
          toast.error(errorMessage, {
            duration: 3000,
            position: 'top-right'
          });

          throw error;
        }
      },

      /**
       * Update item quantity (with API sync)
       */
      updateQuantity: async (shopItemId, quantity) => {
        if (quantity < 1 || quantity > 99) {
          toast.error('Quantity must be between 1 and 99');
          return;
        }

        set({ cartLoading: true, cartError: null });

        try {
          const response = await api.put(`/api/v2/shop/cart/${shopItemId}`, {
            quantity
          });

          set({
            cart: response.data.cart.items || [],
            cartLoading: false
          });

          toast.success('Quantity updated', {
            duration: 1500,
            position: 'top-right'
          });
        } catch (error) {
          console.error('Error updating quantity:', error);
          const errorMessage = error.response?.data?.message || 'Failed to update quantity';

          set({
            cartError: errorMessage,
            cartLoading: false
          });

          toast.error(errorMessage, {
            duration: 3000,
            position: 'top-right'
          });
        }
      },

      /**
       * Remove item from cart (with API sync)
       */
      removeFromCart: async (shopItemId) => {
        set({ cartLoading: true, cartError: null });

        try {
          const response = await api.delete(`/api/v2/shop/cart/${shopItemId}`);

          set({
            cart: response.data.cart.items || [],
            cartLoading: false
          });

          toast.success('Item removed from cart', {
            duration: 2000,
            position: 'top-right'
          });
        } catch (error) {
          console.error('Error removing from cart:', error);
          const errorMessage = error.response?.data?.message || 'Failed to remove item';

          set({
            cartError: errorMessage,
            cartLoading: false
          });

          toast.error(errorMessage, {
            duration: 3000,
            position: 'top-right'
          });
        }
      },

      /**
       * Clear entire cart (with API sync)
       */
      clearCart: async () => {
        set({ cartLoading: true, cartError: null });

        try {
          await api.delete('/api/v2/shop/cart');

          set({
            cart: [],
            cartLoading: false
          });

          toast.success('Cart cleared', {
            duration: 2000,
            position: 'top-right'
          });
        } catch (error) {
          console.error('Error clearing cart:', error);
          const errorMessage = error.response?.data?.message || 'Failed to clear cart';

          set({
            cartError: errorMessage,
            cartLoading: false
          });

          toast.error(errorMessage, {
            duration: 3000,
            position: 'top-right'
          });
        }
      },

      /**
       * Validate cart stock availability
       */
      validateStock: async () => {
        try {
          const response = await api.get('/api/v2/shop/cart/validate');

          if (!response.data.valid && response.data.issues.length > 0) {
            // Show warnings for stock issues
            response.data.issues.forEach((issue) => {
              if (issue.issue === 'out_of_stock') {
                toast.error(`${issue.productName} is out of stock`, {
                  duration: 4000
                });
              } else if (issue.issue === 'insufficient_stock') {
                toast.error(
                  `${issue.productName}: Only ${issue.availableQuantity} available`,
                  { duration: 4000 }
                );
              }
            });
          }

          return response.data;
        } catch (error) {
          console.error('Error validating stock:', error);
          return { valid: false, issues: [] };
        }
      },

      // ========== Purchase Requests (Story 2.2) ==========

      /**
       * Create a purchase request from catalog item selection
       */
      createPurchaseRequest: async (data) => {
        try {
          const response = await api.post('/api/v2/shop/admin/purchase-requests', data);
          return response.data;
        } catch (error) {
          console.error('Error creating purchase request:', error);
          throw error;
        }
      },

      /**
       * Shortcut: assign request from stock immediately (PM/Admin only)
       */
      assignFromStock: async (requestId, notes) => {
        try {
          const response = await api.post(
            `/api/v2/shop/admin/purchase-requests/${requestId}/assign-stock`,
            { notes }
          );
          return response.data;
        } catch (error) {
          console.error('Error assigning from stock:', error);
          throw error;
        }
      },

      // ========== Computed Values ==========

      /**
       * Get total item count in cart
       */
      cartItemCount: () => {
        const cart = get().cart;
        return cart.reduce((count, item) => count + item.quantity, 0);
      },

      /**
       * Get total cost of cart
       */
      cartTotalCost: () => {
        const cart = get().cart;
        return cart.reduce((total, item) => {
          const product = item.shopItemId;
          if (product) {
            const price = product.discountPrice || product.price;
            return total + price * item.quantity;
          }
          return total;
        }, 0);
      },

      /**
       * Check if cart is empty
       */
      isCartEmpty: () => {
        return get().cart.length === 0;
      },

      // ========== Checkout Actions (Sprint5-Story-03) ==========

      /**
       * Create order from cart (checkout)
       */
      createOrder: async () => {
        set({ cartLoading: true, cartError: null });

        try {
          // Validate stock before checkout
          const stockValidation = await get().validateStock();

          if (!stockValidation.valid) {
            throw new Error('Some items are out of stock. Please review your cart.');
          }

          // Create order
          const response = await api.post('/api/v2/shop/orders');

          // Clear cart on success
          set({
            cart: [],
            cartLoading: false,
            isCartOpen: false
          });

          // Show success toast
          toast.success(`Order ${response.data.order.orderNumber} placed successfully!`, {
            duration: 4000,
            position: 'top-right',
            icon: '✅'
          });

          return response.data;
        } catch (error) {
          console.error('Error creating order:', error);
          const errorMessage = error.response?.data?.message || error.message || 'Failed to create order';

          set({
            cartError: errorMessage,
            cartLoading: false
          });

          // Show error toast
          toast.error(errorMessage, {
            duration: 4000,
            position: 'top-right'
          });

          throw error;
        }
      },

      /**
       * Get user's order history
       */
      getUserOrders: async (page = 1, limit = 10, status = null) => {
        try {
          const params = { page, limit };
          if (status) params.status = status;

          const response = await api.get('/api/v2/shop/orders', { params });

          return response.data;
        } catch (error) {
          console.error('Error fetching orders:', error);
          const errorMessage = error.response?.data?.message || 'Failed to fetch orders';

          toast.error(errorMessage, {
            duration: 3000,
            position: 'top-right'
          });

          throw error;
        }
      },

      /**
       * Get order by order number
       */
      getOrder: async (orderNumber) => {
        try {
          const response = await api.get(`/api/v2/shop/orders/${orderNumber}`);

          return response.data.order;
        } catch (error) {
          console.error('Error fetching order:', error);
          const errorMessage = error.response?.data?.message || 'Failed to fetch order';

          toast.error(errorMessage, {
            duration: 3000,
            position: 'top-right'
          });

          throw error;
        }
      },

      /**
       * Cancel order (within 5 minutes)
       */
      cancelOrder: async (orderNumber) => {
        try {
          const response = await api.post(`/api/v2/shop/orders/${orderNumber}/cancel`);

          toast.success(response.data.message, {
            duration: 4000,
            position: 'top-right',
            icon: '✅'
          });

          return response.data;
        } catch (error) {
          console.error('Error cancelling order:', error);
          const errorMessage = error.response?.data?.message || 'Failed to cancel order';

          toast.error(errorMessage, {
            duration: 4000,
            position: 'top-right'
          });

          throw error;
        }
      }
    }),
    {
      name: 'shop-cart-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ cart: state.cart }) // Only persist cart array
    }
  )
);

export default useShopStore;
