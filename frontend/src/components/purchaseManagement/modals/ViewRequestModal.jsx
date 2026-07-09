import React from 'react';
import { useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { cancelPurchaseRequest, updatePurchaseRequestStatus, approvePurchaseRequest, rejectPurchaseRequest } from '../../../api';
import showToast from '../../../utils/toast';
import { formatDateTime } from '../../../utils/dateFormatter';  // Sprint5-Story-23
import { UserTypes, normalizeUserRole } from '../../../constants/userTypes';
import { confirmDialog, promptDialog } from '../../../utils/dialogs';
import {
  PurchaseRequestStatuses,
  getPurchaseRequestStatusMeta
} from '../../../constants/purchaseRequestStatuses';
import '../PurchaseManagement.css';

dayjs.extend(relativeTime);

/**
 * View Request Modal - Sprint5-Story-17
 * Displays full details of a purchase request
 */
export default function ViewRequestModal({ request, onClose, userRole, onRefresh }) {
  const normalizedRole = normalizeUserRole(userRole);
  const [statusUpdating, setStatusUpdating] = useState(false);
  // Story 2.6: State for repair technician name prompt
  const [showTechnicianPrompt, setShowTechnicianPrompt] = useState(false);
  const [repairTechnicianName, setRepairTechnicianName] = useState('');

  const getStatusBadge = (status) => {
    const badge = getPurchaseRequestStatusMeta(status);
    return (
      <span
        className={`status-badge large ${badge.className}`}
        title={badge.tooltip}
      >
        {badge.icon} {badge.label}
      </span>
    );
  };

  const handleCancel = async () => {
    if (!(await confirmDialog('Are you sure you want to cancel this request?', { danger: true, confirmText: 'Cancel request' }))) {
      return;
    }

    try {
      const response = await cancelPurchaseRequest(request._id);
      if (response.success) {
        showToast('Request cancelled successfully', 'success');
        onRefresh();
        onClose();
      } else {
        showToast(response.message || 'Error cancelling request', 'error');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      showToast(error.response?.data?.message || 'Error cancelling request', 'error');
    }
  };

  const handleApprove = async () => {
    if (!(await confirmDialog('Approve this purchase request?', { confirmText: 'Approve' }))) return;
    setStatusUpdating(true);
    try {
      const response = await approvePurchaseRequest(request._id, {});
      if (response.success) {
        showToast('Request approved successfully', 'success');
        onRefresh();
        onClose();
      } else {
        showToast(response.message || 'Error approving request', 'error');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Error approving request', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleReject = async () => {
    const reason = await promptDialog('Reason for rejection (optional):', {
      title: 'Reject purchase request',
      confirmText: 'Reject',
    });
    if (reason === null) return; // user cancelled
    setStatusUpdating(true);
    try {
      const response = await rejectPurchaseRequest(request._id, { reviewNotes: reason });
      if (response.success) {
        showToast('Request rejected', 'success');
        onRefresh();
        onClose();
      } else {
        showToast(response.message || 'Error rejecting request', 'error');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Error rejecting request', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleUpdateStatus = async (nextStatus, notes, successMessage, additionalData = {}) => {
    setStatusUpdating(true);
    try {
      const response = await updatePurchaseRequestStatus(request._id, {
        status: nextStatus,
        notes,
        ...additionalData  // Story 2.6: Include additional data like repairTechnicianName
      });

      if (response.success) {
        showToast(successMessage, 'success');
        onRefresh();
        onClose();
      } else {
        showToast(response.message || 'Error updating request status', 'error');
      }
    } catch (error) {
      console.error('Error updating purchase request status:', error);
      showToast(error.response?.data?.message || 'Error updating request status', 'error');
    } finally {
      setStatusUpdating(false);
      setShowTechnicianPrompt(false);
      setRepairTechnicianName('');
    }
  };

  // Story 2.6: Handle marking as delivered to store (with technician prompt for Repairs)
  const handleMarkDeliveredStore = () => {
    if (request.category === 'Repairs') {
      setShowTechnicianPrompt(true);
    } else {
      handleUpdateStatus(
        PurchaseRequestStatuses.DELIVERED_STORE,
        'Marked Received at Store via Purchase Management',
        'Request marked as received at store'
      );
    }
  };

  // Story 2.6: Submit with technician name
  const handleSubmitWithTechnician = () => {
    if (!repairTechnicianName.trim()) {
      showToast('Please enter the repair technician name', 'error');
      return;
    }
    handleUpdateStatus(
      PurchaseRequestStatuses.DELIVERED_STORE,
      'Marked Received at Store via Purchase Management',
      'Request marked as received at store',
      { repairTechnicianName: repairTechnicianName.trim() }
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3>📋 Purchase Request Details</h3>
            <span className="request-id-badge">{request.requestId}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Status Section */}
          <div className="detail-section">
            <h4 className="section-title">Status</h4>
            <div className="status-display">
              {getStatusBadge(request.status)}
            </div>
          </div>

          {/* Product Information - Multi-Product */}
          <div className="detail-section">
            <h4 className="section-title">Product Information</h4>

            {/* Balagruha Info - Sprint5-Story-21: STOCK support */}
            {request.balagruhaId && (
              <div className="detail-item" style={{ marginBottom: '16px' }}>
                <span className="detail-label">Balagruha:</span>
                {request.balagruhaId === 'STOCK' ? (
                  <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      📦 STOCK
                    </span>
                    <span style={{ fontSize: '13px', color: '#666' }} title="This purchase is for general inventory and can be allocated to Balagruhas later">
                      ℹ️ (General Inventory)
                    </span>
                  </span>
                ) : (
                  <span className="detail-value">📍 {request.balagruhaId.name}</span>
                )}
              </div>
            )}

            {/* Products Table */}
            <div style={{ overflowX: 'auto', marginTop: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Product</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>SKU</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Vendor(s)</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Requested Qty</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Current Stock</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {request.items && request.items.length > 0 ? (
                    request.items.map((item, idx) => {
                      const vendors = Array.isArray(item.productId?.approvedVendors)
                        ? item.productId.approvedVendors
                            .slice()
                            .sort((a, b) => (a.rank || 99) - (b.rank || 99))
                            .map((v) => v.vendorId?.name)
                            .filter(Boolean)
                        : [];
                      return (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{item.productName}</td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#666' }}>{item.productSKU}</td>
                        <td style={{ padding: '10px', color: vendors.length ? '#333' : '#999' }}>
                          {vendors.length ? vendors.join(', ') : '—'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{item.requestedQuantity}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span className={item.currentStock === 0 ? 'text-danger' : item.currentStock <= item.lowStockThreshold ? 'text-warning' : ''}>
                            {item.currentStock}
                          </span>
                          {item.currentStock === 0 && (
                            <span className="stock-badge out-of-stock ml-1">Out</span>
                          )}
                          {item.currentStock > 0 && item.currentStock <= item.lowStockThreshold && (
                            <span className="stock-badge low-stock ml-1">Low</span>
                          )}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#999' }}>{item.lowStockThreshold}</td>
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No items found</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #ddd', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                    <td colSpan="3" style={{ padding: '10px' }}>Total Units Requested</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#0066cc' }}>
                      {request.items ? request.items.reduce((sum, item) => sum + item.requestedQuantity, 0) : 0} units
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Request Details */}
          <div className="detail-section">
            <h4 className="section-title">Request Details</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Requested By:</span>
                <span className="detail-value">
                  {request.requestedBy?.name || 'Unknown'}
                  <span className="user-email">({request.requestedBy?.email})</span>
                </span>
              </div>
              {/* Sprint5-Story-23: Updated to use date formatter */}
              <div className="detail-item">
                <span className="detail-label">Created On:</span>
                <span className="detail-value">
                  {formatDateTime(request.createdAt)}
                  <span className="time-ago">({dayjs(request.createdAt).fromNow()})</span>
                </span>
              </div>
              {/* Category - Sprint5-Story-20 */}
              <div className="detail-item">
                <span className="detail-label">Category:</span>
                <span className="detail-value">{request.category || 'Not Categorized'}</span>
              </div>
            </div>

            {request.reason && (
              <div className="detail-item full-width">
                <span className="detail-label">Reason:</span>
                <p className="detail-text">{request.reason}</p>
              </div>
            )}

            {request.justification && (
              <div className="detail-item full-width">
                <span className="detail-label">Justification:</span>
                <p className="detail-text">{request.justification}</p>
              </div>
            )}
          </div>

          {/* Sprint5-Story-24: Threshold Analysis Section */}
          {request.thresholdAnalysis && (
            <div className="detail-section" style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '4px' }}>
              <h4 className="section-title">Approval Threshold Analysis</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Max Item Cost:</span>
                  <span className="detail-value">
                    ₹{request.thresholdAnalysis.maxItemCost?.toLocaleString() || 0}
                    {' '}
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      (Threshold: ₹{request.thresholdAnalysis.itemThreshold?.toLocaleString() || 1000})
                    </span>
                    {' '}
                    {request.thresholdAnalysis.maxItemCost > (request.thresholdAnalysis.itemThreshold || 1000) ? (
                      <span style={{ color: '#f44336' }}>❌ Exceeds</span>
                    ) : (
                      <span style={{ color: '#4caf50' }}>✅ Within</span>
                    )}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Order Cost:</span>
                  <span className="detail-value">
                    ₹{request.thresholdAnalysis.totalOrderCost?.toLocaleString() || 0}
                    {' '}
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      (Threshold: ₹{request.thresholdAnalysis.orderThreshold?.toLocaleString() || 25000})
                    </span>
                    {' '}
                    {request.thresholdAnalysis.totalOrderCost > (request.thresholdAnalysis.orderThreshold || 25000) ? (
                      <span style={{ color: '#f44336' }}>❌ Exceeds</span>
                    ) : (
                      <span style={{ color: '#4caf50' }}>✅ Within</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="detail-item full-width" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #dee2e6' }}>
                <span className="detail-label">Result:</span>
                <span className="detail-value">
                  {request.thresholdAnalysis.requiresApproval ? (
                    <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
                      🔴 Admin approval required (exceeds threshold)
                    </span>
                  ) : (
                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>
                      ✅ Direct to fulfillment (within threshold)
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Approval/Rejection Details */}
          {(request.status === PurchaseRequestStatuses.APPROVED || request.status === PurchaseRequestStatuses.REJECTED) && (
            <div className="detail-section">
              <h4 className="section-title">
                {request.status === PurchaseRequestStatuses.APPROVED ? 'Approval Details' : 'Rejection Details'}
              </h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Reviewed By:</span>
                  <span className="detail-value">
                    {request.reviewedBy?.name || 'Unknown'}
                    <span className="user-email">({request.reviewedBy?.email})</span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Review Date:</span>
                  <span className="detail-value">
                    {dayjs(request.reviewedAt).format('DD-MM-YYYY HH:mm')}
                  </span>
                </div>
              </div>

              {request.reviewNotes && (
                <div className="detail-item full-width">
                  <span className="detail-label">
                    {request.status === PurchaseRequestStatuses.APPROVED ? 'Approval Notes:' : 'Rejection Reason:'}
                  </span>
                  <p className="detail-text">{request.reviewNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Completion Details - Story 19 (Multi-Product) */}
          {request.status === PurchaseRequestStatuses.COMPLETED && (
            <div className="detail-section">
              <h4 className="section-title">📦 Purchase & Stock Update Details</h4>
              <div className="detail-grid">
                {request.supplierName && (
                  <div className="detail-item">
                    <span className="detail-label">Supplier:</span>
                    <span className="detail-value">{request.supplierName}</span>
                  </div>
                )}
                {request.invoiceNumber && (
                  <div className="detail-item">
                    <span className="detail-label">Invoice Number:</span>
                    <span className="detail-value">{request.invoiceNumber}</span>
                  </div>
                )}
                {request.purchaseDate && (
                  <div className="detail-item">
                    <span className="detail-label">Purchase Date:</span>
                    <span className="detail-value">
                      {dayjs(request.purchaseDate).format('DD-MM-YYYY')}
                    </span>
                  </div>
                )}
                {request.completedBy && (
                  <div className="detail-item">
                    <span className="detail-label">Completed By:</span>
                    <span className="detail-value">
                      {request.completedBy.name}
                      <span className="user-email">({request.completedBy.email})</span>
                    </span>
                  </div>
                )}
                {request.completedAt && (
                  <div className="detail-item">
                    <span className="detail-label">Completion Date:</span>
                    <span className="detail-value">
                      {dayjs(request.completedAt).format('DD-MM-YYYY HH:mm')}
                    </span>
                  </div>
                )}
              </div>

              {/* Per-Product Completion Details */}
              <div style={{ marginTop: '20px' }}>
                <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#495057' }}>
                  Stock Update Summary (Per Product)
                </h5>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Product</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Requested</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Received</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.items && request.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '10px' }}>{item.productName}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{item.requestedQuantity}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#28a745' }}>
                          {item.receivedQuantity !== undefined ? item.receivedQuantity : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #dee2e6', fontWeight: 'bold' }}>
                      <td colSpan="2" style={{ padding: '12px', textAlign: 'right' }}>TOTAL RECEIVED:</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#6366f1' }}>
                        {request.items?.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Audit Trail */}
              {request.inventoryTransactionIds && request.inventoryTransactionIds.length > 0 && (
                <div className="detail-item full-width" style={{ marginTop: '20px' }}>
                  <span className="detail-label">Audit Trail:</span>
                  <span className="detail-value">
                    ✅ {request.inventoryTransactionIds.length} Inventory Transaction(s) Created
                    <span className="transaction-id" style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#6c757d' }}>
                      Complete audit trail available in inventory system
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Story 2.6: Delivery Tracking Section */}
          {(request.status === PurchaseRequestStatuses.DELIVERED_BALAGRUHA ||
            request.repairTechnicianName ||
            request.deliveredByCoachId) && (
              <div className="detail-section" style={{ backgroundColor: '#e8f5e9', padding: '16px', borderRadius: '8px' }}>
                <h4 className="section-title">🚚 Delivery Tracking</h4>
                <div className="detail-grid">
                  {/* Repair Technician (for Repairs category) */}
                  {request.repairTechnicianName && (
                    <div className="detail-item">
                      <span className="detail-label">Repair Technician:</span>
                      <span className="detail-value" style={{ fontWeight: 600 }}>
                        🔧 {request.repairTechnicianName}
                      </span>
                    </div>
                  )}

                  {/* Delivered By Coach */}
                  {request.deliveredByCoachId && (
                    <div className="detail-item">
                      <span className="detail-label">Delivered to Balagruha By:</span>
                      <span className="detail-value">
                        👤 {request.deliveredByCoachId?.name || 'Unknown Coach'}
                        {request.deliveredByCoachId?.email && (
                          <span className="user-email"> ({request.deliveredByCoachId.email})</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Delivery Timestamp */}
                  {request.deliveredToBalagruhaAt && (
                    <div className="detail-item">
                      <span className="detail-label">Delivered At:</span>
                      <span className="detail-value">
                        📅 {formatDateTime(request.deliveredToBalagruhaAt)}
                        <span className="time-ago"> ({dayjs(request.deliveredToBalagruhaAt).fromNow()})</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Metadata */}
          <div className="detail-section metadata">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Created:</span>
                <span className="detail-value">{dayjs(request.createdAt).format('DD-MM-YYYY HH:mm:ss')}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Last Updated:</span>
                <span className="detail-value">{dayjs(request.updatedAt).format('DD-MM-YYYY HH:mm:ss')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {normalizedRole === UserTypes.PURCHASE_MANAGER && request.status === PurchaseRequestStatuses.PENDING && (
            <button
              className="btn btn-primary"
              onClick={() =>
                handleUpdateStatus(
                  PurchaseRequestStatuses.ORDERED,
                  'Marked Ordered via Purchase Management',
                  'Request marked as ordered'
                )
              }
              disabled={statusUpdating}
            >
              🛒 Mark Ordered
            </button>
          )}

          {normalizedRole === UserTypes.PURCHASE_MANAGER && request.status === PurchaseRequestStatuses.ORDERED && (
            <button
              className="btn btn-primary"
              onClick={handleMarkDeliveredStore}
              disabled={statusUpdating}
            >
              📦 Mark Received at Store
            </button>
          )}

          {/* Story 2.6: Repair Technician Name Prompt */}
          {showTechnicianPrompt && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              backgroundColor: '#fff3e0',
              borderRadius: '8px',
              marginRight: 'auto'
            }}>
              <span style={{ fontWeight: 500, color: '#e65100' }}>🔧 Technician Name:</span>
              <input
                type="text"
                value={repairTechnicianName}
                onChange={(e) => setRepairTechnicianName(e.target.value)}
                placeholder="Enter technician name"
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ffcc80',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
                autoFocus
              />
              <button
                className="btn btn-success"
                onClick={handleSubmitWithTechnician}
                disabled={statusUpdating || !repairTechnicianName.trim()}
                style={{ padding: '8px 16px' }}
              >
                ✓ Submit
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowTechnicianPrompt(false);
                  setRepairTechnicianName('');
                }}
                disabled={statusUpdating}
                style={{ padding: '8px 12px' }}
              >
                ✕
              </button>
            </div>
          )}

          {request.status === PurchaseRequestStatuses.PENDING_APPROVAL && normalizedRole === UserTypes.ADMIN && (
            <>
              <button
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={statusUpdating}
              >
                ✅ Approve
              </button>
              <button
                className="btn btn-danger"
                onClick={handleReject}
                disabled={statusUpdating}
              >
                ❌ Reject
              </button>
            </>
          )}

          {request.status === PurchaseRequestStatuses.PENDING_APPROVAL && normalizedRole === UserTypes.PURCHASE_MANAGER && (
            <>
              <button
                className="btn btn-success"
                onClick={handleApprove}
                disabled={statusUpdating}
              >
                ✅ Approve
              </button>
              <button
                className="btn btn-warning"
                onClick={handleReject}
                disabled={statusUpdating}
              >
                ❌ Reject
              </button>
              <button
                className="btn btn-danger"
                onClick={handleCancel}
                disabled={statusUpdating}
              >
                ✖️ Cancel Request
              </button>
            </>
          )}
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={statusUpdating}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
