import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCoinBalance } from '../../contexts/CoinBalanceContext';
import '../../styles/shop/OrderConfirmation.css';

/**
 * OrderConfirmation Component - Sprint5-Story-03
 * Displays order confirmation after successful checkout
 *
 * Features:
 * - Order number display
 * - Order summary
 * - Success animation
 * - Navigation buttons
 */

const OrderConfirmation = ({ order, coinsSpent, remainingBalance }) => {
  const navigate = useNavigate();
  const { refreshBalance, updateBalanceOptimistic } = useCoinBalance();

  // Sprint5-Story-08: Refresh coin balance after successful purchase
  useEffect(() => {
    // Optimistic update with remaining balance from order result
    updateBalanceOptimistic(remainingBalance);

    // Then fetch fresh balance from server
    refreshBalance();
  }, [remainingBalance, refreshBalance, updateBalanceOptimistic]);

  const handleViewOrder = () => {
    navigate(`/shop/orders/${order.orderNumber}`);
  };

  const handleContinueShopping = () => {
    navigate('/shop');
  };

  return (
    <div className="order-confirmation">
      {/* Success Animation */}
      <div className="order-confirmation-icon">
        <svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="success-checkmark"
        >
          <circle cx="12" cy="12" r="10" stroke="#059669" strokeWidth="2" fill="none" />
          <path
            d="M8 12l3 3 5-6"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Success Message */}
      <h1 className="order-confirmation-title">Order Placed Successfully!</h1>
      <p className="order-confirmation-subtitle">
        Thank you for your purchase. Your order has been confirmed.
      </p>

      {/* Order Details */}
      <div className="order-confirmation-details">
        <div className="order-confirmation-detail-row">
          <span className="order-confirmation-label">Order Number</span>
          <span className="order-confirmation-value order-number">{order.orderNumber}</span>
        </div>

        <div className="order-confirmation-detail-row">
          <span className="order-confirmation-label">Items</span>
          <span className="order-confirmation-value">{order.items.length} item(s)</span>
        </div>

        <div className="order-confirmation-detail-row">
          <span className="order-confirmation-label">Total Amount</span>
          <span className="order-confirmation-value order-amount">{coinsSpent} coins</span>
        </div>

        <div className="order-confirmation-detail-row">
          <span className="order-confirmation-label">Remaining Balance</span>
          <span className="order-confirmation-value">{remainingBalance} coins</span>
        </div>

        <div className="order-confirmation-detail-row">
          <span className="order-confirmation-label">Order Date</span>
          <span className="order-confirmation-value">
            {new Date(order.placedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </div>

      {/* Order Items */}
      <div className="order-confirmation-items">
        <h3>Order Items</h3>
        {order.items.map((item, index) => (
          <div key={index} className="order-confirmation-item">
            <div className="order-confirmation-item-info">
              <span className="order-confirmation-item-name">{item.name}</span>
              <span className="order-confirmation-item-sku">SKU: {item.sku}</span>
            </div>
            <div className="order-confirmation-item-pricing">
              <span className="order-confirmation-item-quantity">Qty: {item.quantity}</span>
              <span className="order-confirmation-item-price">{item.subtotal} coins</span>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="order-confirmation-actions">
        <button onClick={handleViewOrder} className="btn-view-order">
          View Order Details
        </button>
        <button onClick={handleContinueShopping} className="btn-continue-shopping">
          Continue Shopping
        </button>
      </div>

      {/* Workflow Info Message */}
      <div className="order-confirmation-info">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
            fill="#3b82f6"
          />
        </svg>
        <span>
          Your order has been sent to the <strong>Purchase Manager</strong> for review and fulfillment. You will be notified once your order is approved and ready for pickup.
        </span>
      </div>

      {/* Additional Info */}
      <div className="order-confirmation-info" style={{ marginTop: '8px' }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
            fill="#3b82f6"
          />
        </svg>
        <span>
          You can view your order details and history from the Orders section in your account.
        </span>
      </div>
    </div>
  );
};

export default OrderConfirmation;
