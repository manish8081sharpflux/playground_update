import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useShopStore from '../store/shopStore';
import OrderSummary from '../components/shop/OrderSummary';
import PaymentDetails from '../components/shop/PaymentDetails';
import OrderConfirmation from '../components/shop/OrderConfirmation';
import '../styles/shop/Checkout.css';

/**
 * Checkout Page - Sprint5-Story-03
 * Main checkout flow page
 *
 * Features:
 * - Multi-step checkout process
 * - Cart validation
 * - Payment processing
 * - Order confirmation
 */

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, fetchCart, createOrder, cartLoading } = useShopStore();

  const [checkoutStep, setCheckoutStep] = useState('review'); // review | processing | confirmation
  const [orderResult, setOrderResult] = useState(null);
  const [processingError, setProcessingError] = useState(null);
  const [balanceInfo, setBalanceInfo] = useState({ balance: 0, hasSufficientBalance: false });

  useEffect(() => {
    // Fetch cart on mount
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    // Redirect to shop if cart is empty
    if (cart.length === 0 && checkoutStep === 'review') {
      navigate('/shop');
    }
  }, [cart, checkoutStep, navigate]);

  // Calculate total amount
  const totalAmount = cart.reduce((total, item) => {
    const product = item.shopItemId;
    if (product) {
      const price = product.discountPrice !== null ? product.discountPrice : product.price;
      return total + price * item.quantity;
    }
    return total;
  }, 0);

  const handlePlaceOrder = async () => {
    setCheckoutStep('processing');
    setProcessingError(null);

    try {
      const result = await createOrder();

      setOrderResult(result);
      setCheckoutStep('confirmation');
    } catch (error) {
      console.error('Checkout error:', error);
      setProcessingError(error.response?.data?.message || error.message || 'Failed to place order');
      setCheckoutStep('review');
    }
  };

  const handleBackToCart = () => {
    navigate('/shop');
  };

  const handleBalanceLoaded = useCallback((info) => {
    setBalanceInfo(info);
  }, []); // Empty deps - setBalanceInfo is stable from useState

  const handleEarnMoreCoins = () => {
    navigate('/task'); // Navigate to tasks page to earn coins
  };

  // Show loading state
  if (cartLoading && checkoutStep === 'review') {
    return (
      <div className="checkout-container">
        <div className="checkout-loading">
          <div className="spinner-large"></div>
          <p>Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Show confirmation page
  if (checkoutStep === 'confirmation' && orderResult) {
    return (
      <div className="checkout-container">
        <OrderConfirmation
          order={orderResult.order}
          coinsSpent={orderResult.coinsSpent}
          remainingBalance={orderResult.remainingBalance}
        />
      </div>
    );
  }

  // Show processing state
  if (checkoutStep === 'processing') {
    return (
      <div className="checkout-container">
        <div className="checkout-processing">
          <div className="spinner-large"></div>
          <h2>Processing your order...</h2>
          <p>Please wait while we complete your purchase.</p>
        </div>
      </div>
    );
  }

  // Show checkout review page
  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <button onClick={handleBackToCart} className="checkout-back-button">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Shop
        </button>
        <h1 className="checkout-title">Checkout</h1>
      </div>

      {processingError && (
        <div className="checkout-error">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
              fill="#dc2626"
            />
          </svg>
          <span>{processingError}</span>
        </div>
      )}

      <div className="checkout-content">
        {/* Left Column: Payment Details */}
        <div className="checkout-left">
          <PaymentDetails totalAmount={totalAmount} onBalanceLoaded={handleBalanceLoaded} />

          <div className="checkout-actions">
            <button
              onClick={handlePlaceOrder}
              className="checkout-place-order-button"
              disabled={cartLoading || cart.length === 0 || !balanceInfo.hasSufficientBalance}
            >
              {cartLoading ? (
                <>
                  <div className="spinner-small"></div>
                  Processing...
                </>
              ) : (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 11l3 3L22 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Place Order ({totalAmount} coins)
                </>
              )}
            </button>

            {/* Earn More Coins button - shown when insufficient balance */}
            {!balanceInfo.hasSufficientBalance && cart.length > 0 && (
              <button onClick={handleEarnMoreCoins} className="checkout-earn-coins-button">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Earn More Coins
              </button>
            )}

            <button onClick={handleBackToCart} className="checkout-cancel-button">
              Cancel
            </button>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="checkout-right">
          <OrderSummary cart={cart} />
        </div>
      </div>
    </div>
  );
};

export default Checkout;
