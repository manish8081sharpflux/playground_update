import React, { useState } from 'react';
import { rejectPurchaseRequest } from '../../../api';
import toast from 'react-hot-toast';

/**
 * RejectRequestModal - Sprint5-Story-18
 * Modal for Admin to reject purchase requests with required reason
 */
export default function RejectRequestModal({ request, onClose, onSuccess }) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setLoading(true);
      const response = await rejectPurchaseRequest(request._id, {
        reviewNotes: reviewNotes.trim()
      });

      if (response.success) {
        toast.success('Purchase request rejected');
        onSuccess();
      } else {
        toast.error(response.message || 'Error rejecting request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error.message || 'Error rejecting request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container rejection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>❌ Reject Purchase Request</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Request Summary */}
          <div className="request-summary">
            <div className="summary-row">
              <label>Request ID:</label>
              <strong>{request.requestId}</strong>
            </div>

            {/* Multi-Product Display */}
            <div className="summary-row">
              <label>Products:</label>
              <div style={{ marginTop: '8px', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Product</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>SKU</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.items && request.items.length > 0 ? (
                      request.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '8px' }}>{item.productName}</td>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#666' }}>{item.productSKU}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{item.requestedQuantity}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ padding: '8px', textAlign: 'center', color: '#999' }}>No items</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #ddd', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                      <td colSpan="2" style={{ padding: '8px' }}>Total Units</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {request.items ? request.items.reduce((sum, item) => sum + item.requestedQuantity, 0) : 0}
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="summary-row">
              <label>Requested By:</label>
              <span>{request.requestedBy?.name} (📍 {request.balagruhaId?.name || 'Shop-wide'})</span>
            </div>
            <div className="summary-row">
              <label>Reason:</label>
              <p>{request.reason}</p>
            </div>
          </div>

          <hr />

          {/* Rejection Reason (Required) */}
          <div className="form-group">
            <label>Rejection Reason * <span className="text-danger">(Required)</span></label>
            <textarea
              rows="4"
              maxLength="500"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Why is this request being rejected? (This will be visible to the Purchase Manager)"
              required
              className={!reviewNotes.trim() ? 'input-error' : ''}
            />
            <small className="char-count">{reviewNotes.length}/500</small>
            {!reviewNotes.trim() && (
              <small className="text-danger">⚠️ Rejection reason is required</small>
            )}
          </div>

          {/* Confirmation */}
          <div className="confirmation-box warning">
            <p>⚠️ Are you sure you want to <strong>reject</strong> this purchase request?</p>
            <p>The Purchase Manager will be notified of the rejection and the reason.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="reject-button"
            onClick={handleReject}
            disabled={loading || !reviewNotes.trim()}
          >
            {loading ? 'Rejecting...' : '❌ Reject Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
