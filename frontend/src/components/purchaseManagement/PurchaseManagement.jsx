import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import MachineRepairsView from './views/MachineRepairsView';
import ShopInventoryView from './views/ShopInventoryView';
import StockReconciliationView from './views/StockReconciliationView';
import './PurchaseManagement.css';

/**
 * Purchase Management - Sprint5-Story-17
 * Dropdown-based UI for Machine Repairs and Shop Inventory purchase requests
 */
export default function PurchaseManagement() {
  const { user } = useAuth();
  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.roleName;
  const roleLower = userRole?.toLowerCase();
  const [purchaseType, setPurchaseType] = useState('shop-inventory');

  return (
    <div className="purchase-management-container">
      {/* Header with Dropdown Selector */}
      <div className="purchase-header">
        <h1 className="page-title">Purchase Management</h1>

        <div className="purchase-type-selector">
          <label htmlFor="purchase-type" className="selector-label">
            Purchase Type:
          </label>
          <select
            id="purchase-type"
            value={purchaseType}
            onChange={(e) => setPurchaseType(e.target.value)}
            className="purchase-type-dropdown"
          >
            <option value="machine-repairs">📋 Machine Repairs</option>
            <option value="shop-inventory">🛒 Shop Inventory</option>
            {(roleLower === 'purchase-manager' || roleLower === 'admin') && (
              <option value="stock-reconciliation">🧾 Stock Reconciliation</option>
            )}
          </select>
        </div>
      </div>

      {/* Content View based on selected purchase type */}
      <div className="purchase-content" style={{ minHeight: '80vh' }}>
        {purchaseType === 'machine-repairs' && (
          <MachineRepairsView />
        )}

        {purchaseType === 'shop-inventory' && (
          <ShopInventoryView
            userRole={userRole}
            userId={user?._id || user?.id}
            userBalagruhas={user?.balagruhaIds || []}
          />
        )}

        {purchaseType === 'stock-reconciliation' && (
          <StockReconciliationView />
        )}
      </div>
    </div>
  );
}
