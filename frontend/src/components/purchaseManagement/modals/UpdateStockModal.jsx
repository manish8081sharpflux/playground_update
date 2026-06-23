import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { completePurchaseRequest } from '../../../api';
import showToast from '../../../utils/toast';
import '../PurchaseManagement.css';

/**
 * Update Stock Modal - Sprint5-Story-19
 * Complete approved purchase request with multi-product stock update
 *
 * Features:
 * - Three sections: Request Summary, Purchase Details, Stock Update Table
 * - Per-product received quantities and actual costs
 * - Automatic total calculation
 * - Form validation
 */
export default function UpdateStockModal({ request, onClose, onRefresh }) {
  const [formData, setFormData] = useState({
    supplierName: '',
    invoiceNumber: '',
    purchaseDate: dayjs().format('YYYY-MM-DD')
  });

  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize items with request data
  useEffect(() => {
    if (request?.items) {
      const initializedItems = request.items.map(item => ({
        productId: item.productId._id || item.productId,
        productName: item.productName,
        productSKU: item.productSKU,
        requestedQuantity: item.requestedQuantity,
        currentStock: item.currentStock,
        estimatedUnitCost: item.estimatedUnitCost,
        receivedQuantity: item.requestedQuantity, // Default to requested quantity
        actualUnitCost: item.estimatedUnitCost, // Default to estimated cost
        actualTotalCost: item.requestedQuantity * item.estimatedUnitCost
      }));
      setItems(initializedItems);
    }
  }, [request]);

  // Update item field
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = parseFloat(value) || 0;

    // Auto-calculate actualTotalCost when receivedQuantity or actualUnitCost changes
    if (field === 'receivedQuantity' || field === 'actualUnitCost') {
      updatedItems[index].actualTotalCost =
        updatedItems[index].receivedQuantity * updatedItems[index].actualUnitCost;
    }

    setItems(updatedItems);
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalReceived = items.reduce((sum, item) => sum + item.receivedQuantity, 0);
    const totalCost = items.reduce((sum, item) => sum + item.actualTotalCost, 0);
    return { totalReceived, totalCost };
  };

  // Validate form
  const validateForm = () => {
    if (!formData.purchaseDate) {
      showToast('Purchase date is required', 'error');
      return false;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!Number.isInteger(item.receivedQuantity) || item.receivedQuantity < 0) {
        showToast(`Item ${i + 1}: Received quantity must be a non-negative whole number`, 'error');
        return false;
      }

      if (item.actualUnitCost < 0) {
        showToast(`Item ${i + 1}: Unit cost cannot be negative`, 'error');
        return false;
      }

      if (item.actualTotalCost < 0) {
        showToast(`Item ${i + 1}: Total cost cannot be negative`, 'error');
        return false;
      }
    }

    return true;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!window.confirm(`Complete this purchase request and update stock for ${items.length} product(s)?`)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        supplierName: formData.supplierName.trim(),
        invoiceNumber: formData.invoiceNumber.trim(),
        purchaseDate: formData.purchaseDate,
        items: items.map(item => ({
          productId: item.productId,
          receivedQuantity: item.receivedQuantity,
          actualUnitCost: item.actualUnitCost,
          actualTotalCost: item.actualTotalCost
        }))
      };

      const response = await completePurchaseRequest(request._id, payload);

      if (response.success) {
        showToast(response.message || 'Stock updated successfully', 'success');
        onRefresh();
        onClose();
      } else {
        showToast(response.message || 'Error updating stock', 'error');
      }
    } catch (error) {
      console.error('Error completing purchase request:', error);
      showToast(error.response?.data?.message || 'Error updating stock', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container extra-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3>📦 Update Stock & Complete Request</h3>
            <span className="request-id-badge">{request.requestId}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* SECTION 1: REQUEST SUMMARY */}
          <div className="detail-section">
            <h4 className="section-title">📋 Request Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="detail-item">
                <span className="detail-label">Requested By:</span>
                <span className="detail-value">{request.requestedBy?.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Request Date:</span>
                <span className="detail-value">{dayjs(request.createdAt).format('MMM D, YYYY')}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Total Products:</span>
                <span className="detail-value">{request.items?.length || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Estimated Total:</span>
                <span className="detail-value">₹{request.totalEstimatedCost?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: PURCHASE DETAILS */}
          <div className="detail-section">
            <h4 className="section-title">💼 Purchase Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Supplier Name (Optional)</label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="Enter supplier name"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Invoice Number (Optional)</label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="Enter invoice number"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Purchase Date <span className="required">*</span></label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  max={dayjs().format('YYYY-MM-DD')}
                  className="form-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: STOCK UPDATE TABLE */}
          <div className="detail-section">
            <h4 className="section-title">📊 Stock Update (Per Product)</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="stock-update-table">
                <thead>
                  <tr>
                    <th style={{ width: '200px' }}>Product</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>SKU</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Requested</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Current Stock</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Received Qty <span className="required">*</span></th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Unit Cost (₹) <span className="required">*</span></th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Total Cost (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.productName}</td>
                      <td style={{ textAlign: 'center', color: '#666' }}>{item.productSKU}</td>
                      <td style={{ textAlign: 'center' }}>{item.requestedQuantity}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          color: item.currentStock <= 0 ? '#dc3545' : '#666',
                          fontWeight: item.currentStock <= 0 ? 'bold' : 'normal'
                        }}>
                          {item.currentStock}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.receivedQuantity}
                          onChange={(e) => handleItemChange(index, 'receivedQuantity', e.target.value)}
                          className="table-input"
                          style={{ width: '80px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.actualUnitCost}
                          onChange={(e) => handleItemChange(index, 'actualUnitCost', e.target.value)}
                          className="table-input"
                          style={{ width: '100px', textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        ₹{item.actualTotalCost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold', borderTop: '2px solid #ddd' }}>
                    <td colSpan="4" style={{ textAlign: 'right', padding: '12px' }}>TOTALS:</td>
                    <td style={{ textAlign: 'center', color: '#6366f1' }}>{totals.totalReceived}</td>
                    <td></td>
                    <td style={{ textAlign: 'right', color: '#6366f1', fontSize: '16px' }}>
                      ₹{totals.totalCost.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Warning Notice */}
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            padding: '12px',
            marginTop: '16px',
            display: 'flex',
            alignItems: 'start',
            gap: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div style={{ fontSize: '14px', color: '#856404' }}>
              <strong>Important:</strong> This action will permanently update the stock for all products listed above.
              This operation cannot be undone. Please verify all quantities and costs before proceeding.
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-small"></span>
                Updating Stock...
              </>
            ) : (
              <>
                ✅ Complete & Update Stock
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
