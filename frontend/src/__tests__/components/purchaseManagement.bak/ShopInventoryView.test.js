import React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import ShopInventoryView, {
  getCompletedTasksCount
} from '../../../components/purchaseManagement/views/ShopInventoryView';
import {
  getAllPurchaseRequests,
  getMyPurchaseRequests,
  getUserBalagruhas,
  updatePurchaseRequestStatus
} from '../../../api';

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    text: jest.fn(),
    save: jest.fn()
  }));
});
jest.mock('jspdf-autotable', () => jest.fn());

jest.mock('../../../api', () => ({
  getAllPurchaseRequests: jest.fn(),
  getMyPurchaseRequests: jest.fn(),
  cancelPurchaseRequest: jest.fn(),
  updatePurchaseRequestStatus: jest.fn(),
  getUserBalagruhas: jest.fn()
}));

jest.mock('../../../utils/toast', () => jest.fn());

describe('ShopInventoryView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserBalagruhas.mockResolvedValue({ success: true, data: [] });
  });

  it('sorts High Priority requests above Normal and shows a visual marker', async () => {
    getAllPurchaseRequests.mockResolvedValue({
      success: true,
      data: {
        requests: [
          {
            _id: 'normal1',
            requestId: 'PR-NORMAL',
            status: 'pending',
            reason: 'Normal request',
            justification: 'Requested via Shop Catalog. Priority: Normal',
            items: [],
            totalEstimatedCost: 0,
            createdAt: '2025-12-24T10:00:00.000Z',
            deadline: '2025-12-25'
          },
          {
            _id: 'high1',
            requestId: 'PR-HIGH',
            status: 'pending',
            reason: '[HIGH PRIORITY] Needs restock now',
            justification: 'Requested via Shop Catalog. Priority: High',
            items: [],
            totalEstimatedCost: 0,
            createdAt: '2025-12-24T09:00:00.000Z',
            deadline: '2025-12-25'
          }
        ]
      }
    });

    render(
      <ShopInventoryView
        userRole="purchase-manager"
        userId="pm-1"
        userBalagruhas={[]}
      />
    );

    await screen.findByText('PR-HIGH');
    await screen.findByText('PR-NORMAL');

    const table = screen.getByRole('table', { name: /shop inventory purchase requests table/i });
    const rows = within(table).getAllByRole('row');

    expect(within(rows[1]).getByText('PR-HIGH')).toBeInTheDocument();

    const highRow = screen.getByText('PR-HIGH').closest('tr');
    expect(highRow).toHaveClass('priority-high');
    expect(within(highRow).getByLabelText('High Priority')).toBeInTheDocument();
  });

  it('defaults Purchase Manager to "Purchase Requests" (pending) tab and allows switching via status tabs', async () => {
    getAllPurchaseRequests.mockResolvedValue({
      success: true,
      data: {
        requests: [
          {
            _id: 'pending1',
            requestId: 'PR-PENDING',
            status: 'pending',
            category: 'ISF Shop',
            reason: 'Pending',
            items: [],
            totalEstimatedCost: 0,
            createdAt: '2025-12-24T10:00:00.000Z'
          },
          {
            _id: 'ordered1',
            requestId: 'PR-ORDERED',
            status: 'ordered',
            category: 'ISF Shop',
            reason: 'Ordered',
            items: [],
            totalEstimatedCost: 0,
            createdAt: '2025-12-24T09:00:00.000Z'
          },
          {
            _id: 'delivered1',
            requestId: 'PR-DELIVERED',
            status: 'delivered_store',
            category: 'ISF Shop',
            reason: 'Delivered',
            items: [],
            totalEstimatedCost: 0,
            createdAt: '2025-12-24T08:00:00.000Z'
          }
        ]
      }
    });

    render(
      <ShopInventoryView
        userRole="purchase-manager"
        userId="pm-1"
        userBalagruhas={[]}
      />
    );

    // Story 3.4: PM defaults to "Purchase Requests" (pending) tab
    await screen.findByText('PR-PENDING');

    // "Purchase Requests" tab should be active by default
    const purchaseRequestsTab = screen.getByRole('button', { name: 'Purchase Requests' });
    expect(purchaseRequestsTab).toHaveClass('active-tab');

    // Only pending requests visible initially
    expect(screen.queryByText('PR-ORDERED')).not.toBeInTheDocument();
    expect(screen.queryByText('PR-DELIVERED')).not.toBeInTheDocument();

    // Click "On Going Order" tab to see ordered requests
    const orderedTab = screen.getByRole('button', { name: 'On Going Order' });
    fireEvent.click(orderedTab);

    await waitFor(() => {
      expect(screen.getByText('PR-ORDERED')).toBeInTheDocument();
    });
  });

  it('allows Purchase Manager to mark pending -> ordered from list actions', async () => {
    const requestId = 'pending1';

    getAllPurchaseRequests
      .mockResolvedValueOnce({
        success: true,
        data: {
          requests: [
            {
              _id: requestId,
              requestId: 'PR-PENDING',
              status: 'pending',
              reason: 'Pending',
              items: [],
              totalEstimatedCost: 0,
              createdAt: '2025-12-24T10:00:00.000Z'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          requests: [
            {
              _id: requestId,
              requestId: 'PR-PENDING',
              status: 'ordered',
              reason: 'Pending',
              items: [],
              totalEstimatedCost: 0,
              createdAt: '2025-12-24T10:00:00.000Z'
            }
          ]
        }
      });

    let resolveUpdate;
    updatePurchaseRequestStatus.mockImplementation(
      () => new Promise((resolve) => {
        resolveUpdate = resolve;
      })
    );

    render(
      <ShopInventoryView
        userRole="purchase-manager"
        userId="pm-1"
        userBalagruhas={[]}
      />
    );

    await screen.findByText('PR-PENDING');

    const markOrderedButton = screen.getByRole('button', { name: /mark ordered/i });
    fireEvent.click(markOrderedButton);

    expect(updatePurchaseRequestStatus).toHaveBeenCalledWith(requestId, {
      status: 'ordered',
      notes: 'Marked Ordered via Purchase Management'
    });
    expect(markOrderedButton).toBeDisabled();

    resolveUpdate({ success: true });

    // Story 3.4: After marking as ordered, switch to "On Going Order" tab to see the updated request
    const orderedTab = screen.getByRole('button', { name: 'On Going Order' });
    fireEvent.click(orderedTab);

    await screen.findByRole('button', { name: /mark received at store/i });
  });

  it('allows Purchase Manager to mark ordered -> delivered_store from list actions', async () => {
    const requestId = 'ordered1';

    getAllPurchaseRequests
      .mockResolvedValueOnce({
        success: true,
        data: {
          requests: [
            {
              _id: requestId,
              requestId: 'PR-ORDERED',
              status: 'ordered',
              reason: 'Ordered',
              items: [],
              totalEstimatedCost: 0,
              createdAt: '2025-12-24T10:00:00.000Z'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          requests: [
            {
              _id: requestId,
              requestId: 'PR-ORDERED',
              status: 'delivered_store',
              reason: 'Ordered',
              items: [],
              totalEstimatedCost: 0,
              createdAt: '2025-12-24T10:00:00.000Z'
            }
          ]
        }
      });

    let resolveUpdate;
    updatePurchaseRequestStatus.mockImplementation(
      () => new Promise((resolve) => {
        resolveUpdate = resolve;
      })
    );

    render(
      <ShopInventoryView
        userRole="purchase-manager"
        userId="pm-1"
        userBalagruhas={[]}
      />
    );

    // Wait for component to load first
    await waitFor(() => {
      expect(screen.queryByText('Loading purchase requests...')).not.toBeInTheDocument();
    });

    // Story 3.4: Default tab is "Purchase Requests" (pending), need to switch to "On Going Order" first
    const orderedTab = screen.getByRole('button', { name: 'On Going Order' });
    fireEvent.click(orderedTab);

    await screen.findByText('PR-ORDERED');

    const markReceivedButton = screen.getByRole('button', { name: /mark received at store/i });
    fireEvent.click(markReceivedButton);

    expect(updatePurchaseRequestStatus).toHaveBeenCalledWith(requestId, {
      status: 'delivered_store',
      notes: 'Marked Received at Store via Purchase Management'
    });
    expect(markReceivedButton).toBeDisabled();

    resolveUpdate({ success: true });

    // After update, switch to "Reached ISF Store" tab to see the updated request
    const storeTab = screen.getByRole('button', { name: 'Reached ISF Store' });
    fireEvent.click(storeTab);

    await screen.findByText('PR-ORDERED');

    await waitFor(() => {
      const row = screen.getByText('PR-ORDERED').closest('tr');
      expect(row).toHaveClass('status-delivered_store');
    });
  });

  it('computes completed tasks count for a PM from statusHistory (delivered_store changedBy userId)', () => {
    const requests = [
      {
        _id: 'r1',
        statusHistory: [
          { status: 'pending', changedBy: 'other' },
          { status: 'delivered_store', changedBy: 'pm-1' }
        ]
      },
      {
        _id: 'r2',
        statusHistory: [
          { status: 'delivered_store', changedBy: { _id: 'pm-2' } }
        ]
      },
      {
        _id: 'r3',
        statusHistory: [
          { status: 'delivered_balagruha', changedBy: 'pm-1' }
        ]
      },
      {
        _id: 'r4'
      }
    ];

    expect(getCompletedTasksCount(requests, 'pm-1')).toBe(1);
  });

  describe('Story 3.4: Tabbed UX for Purchase Manager', () => {
    beforeEach(() => {
      getAllPurchaseRequests.mockResolvedValue({
        success: true,
        data: {
          requests: [
            {
              _id: 'shop1',
              requestId: 'PR-SHOP',
              status: 'pending',
              category: 'ISF Shop',
              reason: 'Shop item',
              items: [{ productName: 'Notebooks', requestedQuantity: 10 }],
              totalEstimatedCost: 500,
              createdAt: '2025-12-24T10:00:00.000Z'
            },
            {
              _id: 'med1',
              requestId: 'PR-MED',
              status: 'pending',
              category: 'Medicines',
              reason: 'Medicine item',
              items: [{ productName: 'Paracetamol', requestedQuantity: 50 }],
              totalEstimatedCost: 300,
              createdAt: '2025-12-24T09:00:00.000Z'
            },
            {
              _id: 'ordered1',
              requestId: 'PR-ORDERED',
              status: 'ordered',
              category: 'ISF Shop',
              reason: 'Ordered item',
              items: [{ productName: 'Pens', requestedQuantity: 20 }],
              totalEstimatedCost: 200,
              createdAt: '2025-12-24T08:00:00.000Z'
            },
            {
              _id: 'store1',
              requestId: 'PR-STORE',
              status: 'delivered_store',
              category: 'ISF Shop',
              reason: 'Delivered to store',
              items: [{ productName: 'Pencils', requestedQuantity: 15 }],
              totalEstimatedCost: 150,
              createdAt: '2025-12-24T07:00:00.000Z'
            },
            {
              _id: 'bal1',
              requestId: 'PR-BAL',
              status: 'delivered_balagruha',
              category: 'ISF Shop',
              reason: 'Delivered to balagruha',
              items: [{ productName: 'Eraser', requestedQuantity: 10 }],
              totalEstimatedCost: 100,
              createdAt: '2025-12-24T06:00:00.000Z'
            }
          ]
        }
      });
    });

    it('displays category tabs for Purchase Manager', async () => {
      render(
        <ShopInventoryView
          userRole="purchase-manager"
          userId="pm-1"
          userBalagruhas={[]}
        />
      );

      await screen.findByText('PR-SHOP');

      // Use getByRole to specifically find tab buttons, not table cell text
      expect(screen.getByRole('button', { name: 'All Categories' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ISF Shop' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Medicines' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Repairs' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Consumables' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Infra' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Others' })).toBeInTheDocument();
    });

    it('filters requests when category tab is clicked', async () => {
      render(
        <ShopInventoryView
          userRole="purchase-manager"
          userId="pm-1"
          userBalagruhas={[]}
        />
      );

      await screen.findByText('PR-SHOP');

      // Use getByRole to find the tab button specifically
      const medicinesTab = screen.getByRole('button', { name: 'Medicines' });
      fireEvent.click(medicinesTab);

      await waitFor(() => {
        expect(screen.getByText('PR-MED')).toBeInTheDocument();
      });

      expect(screen.queryByText('PR-SHOP')).not.toBeInTheDocument();
    });

    it('displays status bucket tabs for Purchase Manager', async () => {
      render(
        <ShopInventoryView
          userRole="purchase-manager"
          userId="pm-1"
          userBalagruhas={[]}
        />
      );

      await screen.findByText('PR-SHOP');

      expect(screen.getByText('Purchase Requests')).toBeInTheDocument();
      expect(screen.getByText('On Going Order')).toBeInTheDocument();
      expect(screen.getByText('Reached ISF Store')).toBeInTheDocument();
      expect(screen.getByText('Delivered')).toBeInTheDocument();
    });

    it('filters requests when status bucket tab is clicked', async () => {
      render(
        <ShopInventoryView
          userRole="purchase-manager"
          userId="pm-1"
          userBalagruhas={[]}
        />
      );

      await screen.findByText('PR-SHOP');

      const orderedTab = screen.getByText('On Going Order');
      fireEvent.click(orderedTab);

      await waitFor(() => {
        expect(screen.getByText('PR-ORDERED')).toBeInTheDocument();
      });

      expect(screen.queryByText('PR-SHOP')).not.toBeInTheDocument();
      expect(screen.queryByText('PR-MED')).not.toBeInTheDocument();
    });

    it('highlights active category tab with active-tab class', async () => {
      render(
        <ShopInventoryView
          userRole="purchase-manager"
          userId="pm-1"
          userBalagruhas={[]}
        />
      );

      await screen.findByText('PR-SHOP');

      const medicinesTab = screen.getByRole('button', { name: 'Medicines' });
      fireEvent.click(medicinesTab);

      await waitFor(() => {
        expect(medicinesTab).toHaveClass('active-tab');
      });
    });

    it('highlights active status bucket tab with active-tab class', async () => {
      render(
        <ShopInventoryView
          userRole="purchase-manager"
          userId="pm-1"
          userBalagruhas={[]}
        />
      );

      await screen.findByText('PR-SHOP');

      const orderedTab = screen.getByText('On Going Order');
      fireEvent.click(orderedTab);

      await waitFor(() => {
        expect(orderedTab).toHaveClass('active-tab');
      });
    });

    it('combines category and status bucket filtering', async () => {
      render(
        <ShopInventoryView
          userRole="purchase-manager"
          userId="pm-1"
          userBalagruhas={[]}
        />
      );

      await screen.findByText('PR-SHOP');

      // Use getByRole for both tabs
      const medicinesTab = screen.getByRole('button', { name: 'Medicines' });
      const orderedTab = screen.getByRole('button', { name: 'On Going Order' });

      fireEvent.click(medicinesTab);
      fireEvent.click(orderedTab);

      // Medicines + Ordered = no matching requests in test data (all Medicines are pending)
      await waitFor(() => {
        expect(screen.queryByText('PR-SHOP')).not.toBeInTheDocument();
        expect(screen.queryByText('PR-MED')).not.toBeInTheDocument();
        expect(screen.queryByText('PR-ORDERED')).not.toBeInTheDocument();
      });
    });

    it('does NOT show category tabs for non-PM roles', async () => {
      render(
        <ShopInventoryView
          userRole="admin"
          userId="admin-1"
          userBalagruhas={[]}
        />
      );

      await screen.findByText('PR-SHOP');

      // Check for tab BUTTONS specifically - "ISF Shop" text may appear in table data
      expect(screen.queryByRole('button', { name: 'All Categories' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'ISF Shop' })).not.toBeInTheDocument();
    });

    it('does NOT show status bucket tabs for non-PM roles', async () => {
      render(
        <ShopInventoryView
          userRole="admin"
          userId="admin-1"
          userBalagruhas={[]}
        />
      );

      await screen.findByText('PR-SHOP');

      // Check for tab BUTTONS specifically
      expect(screen.queryByRole('button', { name: 'Purchase Requests' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'On Going Order' })).not.toBeInTheDocument();
    });

    it('shows category dropdown for non-PM roles instead of tabs', async () => {
      render(
        <ShopInventoryView
          userRole="admin"
          userId="admin-1"
          userBalagruhas={[]}
        />
      );

      await screen.findByText('PR-SHOP');

      // Admin sees dropdown filter, not tabs
      // Find the Category dropdown by its default selected option
      expect(screen.getByDisplayValue('All Categories')).toBeInTheDocument();
      // And no tab buttons should exist
      expect(screen.queryByRole('button', { name: 'All Categories' })).not.toBeInTheDocument();
    });
  });
});
