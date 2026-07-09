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

  const isEarned = transaction.type === 'earned';

  const DetailRow = ({ label, value, mono }) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #f1f5f9',
        gap: '16px',
      }}
    >
      <span
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '14px',
          fontWeight: mono ? 500 : 600,
          color: '#1e293b',
          textAlign: 'right',
          fontFamily: mono ? 'monospace' : 'inherit',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="modal-content transaction-detail-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            background: isEarned
              ? 'linear-gradient(135deg, #ede9fe 0%, #f5f3ff 100%)'
              : 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              color: '#1e293b',
              userSelect: 'none',
            }}
          >
            Transaction Details
          </h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.7)',
              color: '#475569',
              fontSize: '18px',
              lineHeight: 1,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)')
            }
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {/* Amount highlight card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 18px',
              borderRadius: '12px',
              backgroundColor: isEarned ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${isEarned ? '#bbf7d0' : '#fecaca'}`,
              marginBottom: '16px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: isEarned ? '#16a34a' : '#dc2626',
                  marginBottom: '4px',
                }}
              >
                {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                {transaction.description}
              </div>
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: isEarned ? '#16a34a' : '#dc2626',
                whiteSpace: 'nowrap',
              }}
            >
              {isEarned ? '+' : '-'}
              {transaction.amount} coins
            </div>
          </div>

          {/* Detail rows card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '4px 18px',
            }}
          >
            <DetailRow
              label="Source"
              value={
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: '999px',
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                  }}
                >
                  {transaction.source.toUpperCase()}
                </span>
              }
            />
            <DetailRow label="Date & Time" value={formatDate(transaction.createdAt)} />

            {transaction.metadata?.orderId && (
              <DetailRow label="Order ID" value={transaction.metadata.orderId} mono />
            )}

            {transaction.metadata?.orderNumber && (
              <DetailRow
                label="Order Number"
                value={transaction.metadata.orderNumber}
                mono
              />
            )}

            {transaction.metadata?.itemCount !== undefined && (
              <DetailRow label="Items Purchased" value={transaction.metadata.itemCount} />
            )}

            {transaction.metadata?.refundReason && (
              <div style={{ padding: '12px 0' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Refund Reason
                </span>
                <span style={{ fontSize: '14px', color: '#1e293b', lineHeight: 1.5 }}>
                  {transaction.metadata.refundReason}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}
        >
          {isShopTransaction && (
            <button
              className="btn-primary"
              onClick={handleViewOrder}
              style={{
                padding: '9px 18px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6d28d9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
            >
              View Order
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;
