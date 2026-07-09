import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import PurchaseManagement from '../../../components/purchaseManagement/PurchaseManagement';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'purchase-manager', _id: 'pm-1', balagruhaIds: [] }
  })
}));

jest.mock('../../../components/purchaseManagement/views/MachineRepairsView', () => () => (
  <div>Machine Repairs View</div>
));

jest.mock('../../../components/purchaseManagement/views/ShopInventoryView', () => () => (
  <div>Shop Inventory View</div>
));

jest.mock('../../../components/purchaseManagement/views/StockReconciliationView', () => () => (
  <div>Stock Reconciliation View</div>
));

describe('PurchaseManagement (Story 4.1 entry point)', () => {
  it('shows Stock Reconciliation option for Purchase Manager and renders it when selected', () => {
    render(<PurchaseManagement />);

    const select = screen.getByLabelText('Purchase Type:');
    expect(select).toBeInTheDocument();

    expect(screen.getByRole('option', { name: /Stock Reconciliation/i })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'stock-reconciliation' } });
    expect(screen.getByText('Stock Reconciliation View')).toBeInTheDocument();
  });
});
