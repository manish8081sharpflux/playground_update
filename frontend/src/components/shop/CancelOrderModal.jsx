import React, { useState } from 'react';

/**
 * CancelOrderModal Component - Sprint5-Story-10
 * Confirmation modal for order cancellation with reason tracking
 *
 * @param {boolean} isOpen - Modal open state
 * @param {function} onClose - Close modal callback
 * @param {function} onConfirm - Confirm cancellation callback (receives reason)
 * @param {Object} order - Order object
 */

export default function CancelOrderModal({ isOpen, onClose, onConfirm, order }) {
  const [reason, setReason] = useState('changed_mind');
  const [cancelling, setCancelling] = useState(false);

  const handleConfirm = async () => {
    if (!reason) {
      return;
    }

    try {
      setCancelling(true);
      await onConfirm(reason);
      onClose();
    } catch (error) {
      console.error('Cancel order error:', error);
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg p-6 w-full max-w-md shadow-xl z-10">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Cancel Order?
        </h2>

        <div className="mb-6">
          <p className="text-slate-700 mb-4">
            Are you sure you want to cancel this order?
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800">
              <span className="font-bold">✓ Refund Amount:</span> {order?.totalAmount || 0} coins
            </p>
            <p className="text-xs text-green-700 mt-1">
              Coins will be refunded to your account immediately
            </p>
          </div>

          <label className="block text-sm font-medium text-slate-700 mb-2">
            Reason for cancellation <span className="text-red-500">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="changed_mind">Changed my mind</option>
            <option value="ordered_wrong_item">Ordered wrong item</option>
            <option value="found_better_price">Found better price</option>
            <option value="no_longer_needed">No longer needed</option>
            <option value="duplicate_order">Duplicate order</option>
            <option value="other">Other reason</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={cancelling}
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {cancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
          </button>
          <button
            onClick={onClose}
            disabled={cancelling}
            className="flex-1 bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
