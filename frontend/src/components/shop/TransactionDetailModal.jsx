import React from 'react';
import { useNavigate } from 'react-router-dom';

const TransactionDetailModal = ({ transaction, onClose }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleViewOrder = () => {
    if (transaction.metadata?.orderNumber) {
      navigate(`/shop/orders/${transaction.metadata.orderNumber}`);
      onClose();
    }
  };

  // Check if this is a shop transaction with order details
  const isShopTransaction = transaction.source === 'shop' && transaction.metadata?.orderNumber;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content transaction-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Transaction Details</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className={`transaction-detail-card ${transaction.type}`}>
            <div className="detail-row">
              <span className="detail-label">Type</span>
              <span className={`detail-value type-badge ${transaction.type}`}>
                {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Amount</span>
              <span className={`detail-value amount ${transaction.type}`}>
                {transaction.type === 'earned' ? '+' : '-'}{transaction.amount} coins
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Source</span>
              <span className="detail-value source-badge">
                {transaction.source.toUpperCase()}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Description</span>
              <span className="detail-value">{transaction.description}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Date & Time</span>
              <span className="detail-value">{formatDate(transaction.createdAt)}</span>
            </div>

            {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
              <>
                <div className="detail-section-divider"></div>
                <h3 className="detail-section-title">Additional Information</h3>

                {transaction.metadata.orderId && (
                  <div className="detail-row">
                    <span className="detail-label">Order ID</span>
                    <span className="detail-value monospace">{transaction.metadata.orderId}</span>
                  </div>
                )}

                {transaction.metadata.orderNumber && (
                  <div className="detail-row">
                    <span className="detail-label">Order Number</span>
                    <span className="detail-value monospace">{transaction.metadata.orderNumber}</span>
                  </div>
                )}

                {transaction.metadata.itemCount !== undefined && (
                  <div className="detail-row">
                    <span className="detail-label">Items Purchased</span>
                    <span className="detail-value">{transaction.metadata.itemCount}</span>
                  </div>
                )}

                {transaction.metadata.refundReason && (
                  <div className="detail-row">
                    <span className="detail-label">Refund Reason</span>
                    <span className="detail-value">{transaction.metadata.refundReason}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {isShopTransaction && (
            <button className="btn-primary" onClick={handleViewOrder}>
              View Order
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;
