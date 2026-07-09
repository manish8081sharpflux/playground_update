import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import '../../styles/shop/PaymentDetails.css';

/**
 * PaymentDetails Component - Sprint5-Story-03
 * Displays user's coin balance and payment method
 *
 * Features:
 * - Current coin balance display
 * - Balance sufficiency check
 * - Payment method information
 * - Loading states
 */

const PaymentDetails = ({ totalAmount, onBalanceLoaded }) => {
  const [coinBalance, setCoinBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCoinBalance();
  }, []);

  const fetchCoinBalance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/coin/balance');
      // API response structure: { success, data: { balance }, message }
      setCoinBalance(response.data.data.balance);
      setError(null);
    } catch (err) {
      console.error('Error fetching coin balance:', err);
      setError('Failed to load coin balance');
    } finally {
      setLoading(false);
    }
  };

  // Ensure coinBalance is a number (default to 0 if null/undefined)
  const balance = coinBalance !== null && coinBalance !== undefined ? coinBalance : 0;
  const hasSufficientBalance = balance >= totalAmount;
  const remainingBalance = Math.max(0, balance - totalAmount);

  // Notify parent component when balance is loaded
  useEffect(() => {
    if (onBalanceLoaded && !loading && coinBalance !== null) {
      onBalanceLoaded({ balance, hasSufficientBalance });
    }
  }, [balance, hasSufficientBalance, loading, coinBalance, onBalanceLoaded]);

  return (
    <div className="payment-details">
      <h2 className="payment-details-title">Payment Details</h2>

      {/* Payment Method */}
      <div className="payment-method">
        <div className="payment-method-icon">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
              fill="#9333ea"
            />
            <path
              d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"
              fill="#9333ea"
            />
          </svg>
        </div>
        <div className="payment-method-info">
          <h3>ISF Coins</h3>
          <p>Pay using your coin balance</p>
        </div>
      </div>

      {/* Balance Info */}
      <div className="payment-balance-info">
        {loading ? (
          <div className="payment-balance-loading">
            <div className="spinner"></div>
            <span>Loading balance...</span>
          </div>
        ) : error ? (
          <div className="payment-balance-error">
            <span>⚠️ {error}</span>
            <button onClick={fetchCoinBalance} className="retry-button">
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="payment-balance-row">
              <span className="payment-balance-label">Current Balance</span>
              <span className="payment-balance-value">{balance} coins</span>
            </div>

            <div className="payment-balance-row">
              <span className="payment-balance-label">Order Total</span>
              <span className="payment-balance-value payment-balance-total">
                {totalAmount} coins
              </span>
            </div>

            <div className="payment-balance-divider"></div>

            <div className="payment-balance-row payment-balance-remaining">
              <span className="payment-balance-label">Balance After Purchase</span>
              <span
                className={`payment-balance-value ${
                  hasSufficientBalance
                    ? 'payment-balance-sufficient'
                    : 'payment-balance-insufficient'
                }`}
              >
                {remainingBalance} coins
              </span>
            </div>

            {!hasSufficientBalance && (
              <div className="payment-insufficient-warning">
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
                <span>Insufficient balance to complete this order</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentDetails;
