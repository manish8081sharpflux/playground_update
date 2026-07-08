import React from 'react';
import '../../styles/shop/OrderSummary.css';

/**
 * OrderSummary Component - Sprint5-Story-03
 * Displays order summary in checkout page
 *
 * Features:
 * - Cart items with pricing
 * - Item count and subtotal
 * - Total cost display
 * - Compact, read-only view
 */

const OrderSummary = ({ cart }) => {
  // Calculate totals
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const subtotal = cart.reduce((total, item) => {
    const product = item.shopItemId;
    if (product) {
      const price =
        product.discountPrice && product.discountPrice > 0
          ? product.discountPrice
          : product.sellingPrice || 0;
      return total + price * item.quantity;
    }
    return total;
  }, 0);

  const totalAmount = subtotal; // Can add shipping/taxes later

  return (
    <div className="order-summary">
      <h2 className="order-summary-title">Order Summary</h2>

      <div className="order-summary-items">
        {cart.map((item) => {
          const product = item.shopItemId;
          if (!product) return null;

          const price =
            product.discountPrice && product.discountPrice > 0
              ? product.discountPrice
              : product.sellingPrice || 0;
          const itemSubtotal = price * item.quantity;

          return (
            <div key={item._id} className="order-summary-item">
              <div className="order-summary-item-image">
                {(product.imageUrl || product.images?.length > 0 || product.primaryImageUrl) ? (
                  <img
                    src={
                      product.imageUrl ||
                      product.images?.find(img => img.isPrimary)?.url ||
                      product.images?.[0]?.url ||
                      product.primaryImageUrl
                    }
                    alt={product.name}
                  />
                ) : (
                  <div className="order-summary-item-placeholder">
                    {product.name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="order-summary-item-details">
                <h3 className="order-summary-item-name">{product.name}</h3>
                {product.sku && <p className="order-summary-item-sku">SKU: {product.sku}</p>}
                <div className="order-summary-item-pricing">
                  <span className="order-summary-item-quantity">Qty: {item.quantity}</span>
                  <span className="order-summary-item-price">{price} coins each</span>
                </div>
              </div>

              <div className="order-summary-item-subtotal">
                {itemSubtotal} coins
              </div>
            </div>
          );
        })}
      </div>

      <div className="order-summary-totals">
        <div className="order-summary-row">
          <span>Items ({itemCount})</span>
          <span>{subtotal} coins</span>
        </div>

        <div className="order-summary-row order-summary-total">
          <span>Total</span>
          <span className="order-summary-total-amount">{totalAmount} coins</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;