import React, { useState } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import useShopStore from '../../store/shopStore';

/**
 * CartItem Component - Sprint5-Story-02 AC4, AC5
 * Individual cart item with quantity controls and remove button
 *
 * Features:
 * - Product image, name, price display
 * - Quantity controls (+ / -)
 * - Remove button with confirmation modal
 * - Real-time subtotal calculation
 * - Stock availability validation
 */
const CartItem = ({ item }) => {
  const { updateQuantity, removeFromCart } = useShopStore();
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const product = item.shopItemId;
  const quantity = item.quantity;

  // Calculate prices
  const price = product.discountPrice || product.price;
  const subtotal = price * quantity;

  // Check stock status
  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
  const isOutOfStock = product.stock === 0;
  const exceedsStock = quantity > product.stock;

  // Handle quantity increase
  const handleIncrease = async () => {
    if (quantity >= 99) return;
    if (quantity >= product.stock) return;

    setIsUpdating(true);
    await updateQuantity(product._id, quantity + 1);
    setIsUpdating(false);
  };

  // Handle quantity decrease
  const handleDecrease = async () => {
    if (quantity <= 1) return;

    setIsUpdating(true);
    await updateQuantity(product._id, quantity - 1);
    setIsUpdating(false);
  };

  // Handle remove item
  const handleRemove = async () => {
    await removeFromCart(product._id);
    setShowRemoveModal(false);
  };

  return (
    <>
      <div className="flex gap-4 p-4 border-b border-slate-200 hover:bg-slate-50 transition-colors">
        {/* Product Image */}
        <div className="flex-shrink-0 w-20 h-20 bg-slate-100 rounded-md overflow-hidden">
          <img
            src={
              product.imageUrl ||
              product.images?.find(img => img.isPrimary)?.url ||
              product.images?.[0]?.url ||
              product.primaryImageUrl ||
              'https://via.placeholder.com/150'
            }
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Details */}
        <div className="flex-1">
          {/* Name and Price */}
          <h4 className="font-semibold text-slate-900 mb-1">{product.name}</h4>

          <div className="flex items-center gap-2 mb-2">
            {product.discountPrice ? (
              <>
                <span className="text-lg font-bold text-emerald-600">
                  {product.discountPrice} coins
                </span>
                <span className="text-sm text-slate-400 line-through">
                  {product.price} coins
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-slate-900">{product.price} coins</span>
            )}
          </div>

          {/* Stock Warnings */}
          {isOutOfStock && (
            <p className="text-xs text-red-600 font-medium mb-2">⚠️ Out of stock</p>
          )}
          {exceedsStock && !isOutOfStock && (
            <p className="text-xs text-orange-600 font-medium mb-2">
              ⚠️ Only {product.stock} available
            </p>
          )}
          {isLowStock && !exceedsStock && !isOutOfStock && (
            <p className="text-xs text-orange-600 font-medium mb-2">
              ⚠️ Only {product.stock} left in stock
            </p>
          )}

          {/* Quantity Controls and Subtotal */}
          <div className="flex items-center justify-between">
            {/* Quantity Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDecrease}
                disabled={quantity <= 1 || isUpdating}
                className="w-8 h-8 rounded-md bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4 text-slate-700" />
              </button>

              <span className="w-12 text-center font-semibold text-slate-900">{quantity}</span>

              <button
                onClick={handleIncrease}
                disabled={quantity >= 99 || quantity >= product.stock || isUpdating}
                className="w-8 h-8 rounded-md bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            {/* Subtotal */}
            <div className="text-right">
              <p className="text-sm text-slate-500">Subtotal</p>
              <p className="text-lg font-bold text-slate-900">{subtotal} coins</p>
            </div>
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={() => setShowRemoveModal(true)}
          className="flex-shrink-0 w-10 h-10 rounded-md hover:bg-red-50 flex items-center justify-center transition-colors"
          aria-label="Remove item"
        >
          <Trash2 className="w-5 h-5 text-red-500" />
        </button>
      </div>

      {/* Remove Confirmation Modal */}
      <Dialog.Root open={showRemoveModal} onOpenChange={setShowRemoveModal}>
        <Dialog.Portal>
          {/* Overlay */}
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />

          {/* Content */}
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-full max-w-md shadow-xl z-50">
            <Dialog.Title className="text-xl font-semibold text-slate-900 mb-4">
              Remove Item?
            </Dialog.Title>

            <p className="text-slate-600 mb-6">
              Are you sure you want to remove <strong>{product.name}</strong> from your cart?
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleRemove}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors font-medium"
              >
                Yes, Remove
              </button>
              <Dialog.Close asChild>
                <button className="flex-1 bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300 transition-colors font-medium">
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default CartItem;
