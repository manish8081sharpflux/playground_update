import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import CoachRequestsDashboard from '../../pages/CoachRequestsDashboard';
import { getCoachDeliveries, getMyPurchaseRequests, updatePurchaseRequestStatus } from '../../api';

jest.mock('../../utils/toast', () => jest.fn());

jest.mock('../../components/shop/ShopNavigation', () => () => <div data-testid="shop-nav" />);
jest.mock('../../components/shop/Breadcrumbs', () => () => <div data-testid="breadcrumbs" />);

jest.mock('../../api', () => ({
  getCoachDeliveries: jest.fn(),
  getMyPurchaseRequests: jest.fn(),
  updatePurchaseRequestStatus: jest.fn()
}));

describe('CoachRequestsDashboard (Story 3.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders both sections and calls both APIs', async () => {
    getMyPurchaseRequests.mockResolvedValue({
      success: true,
      data: {
        requests: [
          {
            _id: 'r1',
            requestId: 'PR-1',
            status: 'pending',
            balagruhaId: 'STOCK',
            items: [{ productName: 'Item', requestedQuantity: 1 }],
            createdAt: '2025-12-24T10:00:00.000Z',
            deadline: '2025-12-25'
          }
        ]
      }
    });

    getCoachDeliveries.mockResolvedValue({
      success: true,
      orders: [
        {
          _id: 'o1',
          orderNumber: 'ORD-1',
          deliveryStatus: 'pending_delivery',
          placedAt: '2025-12-24T10:00:00.000Z',
          userId: { name: 'Student 1' },
          balagruhaNames: 'BG-1'
        }
      ]
    });

    render(<CoachRequestsDashboard />);

    expect(screen.getByText('My Purchase Requests')).toBeInTheDocument();
    expect(screen.getByText('Digital Orders')).toBeInTheDocument();

    await waitFor(() => expect(getMyPurchaseRequests).toHaveBeenCalled());
    await waitFor(() =>
      expect(getCoachDeliveries).toHaveBeenCalledWith({ status: 'pending_delivery', limit: 50 })
    );

    expect(await screen.findByText('PR-1')).toBeInTheDocument();
    expect(await screen.findByText('ORD-1')).toBeInTheDocument();
    expect(screen.getByText('Deadline')).toBeInTheDocument();
  });

  it('filters Digital Orders by “Pending Delivery” via API status param', async () => {
    getMyPurchaseRequests.mockResolvedValue({ success: true, data: { requests: [] } });

    const pendingOrders = [
      {
        _id: 'o1',
        orderNumber: 'ORD-PENDING',
        deliveryStatus: 'pending_delivery',
        placedAt: '2025-12-24T10:00:00.000Z',
        userId: { name: 'Student 1' },
        balagruhaNames: 'BG-1'
      }
    ];
    const deliveredOrders = [
      {
        _id: 'o2',
        orderNumber: 'ORD-DELIVERED',
        deliveryStatus: 'delivered',
        placedAt: '2025-12-24T10:00:00.000Z',
        userId: { name: 'Student 2' },
        balagruhaNames: 'BG-1'
      }
    ];

    getCoachDeliveries.mockImplementation(({ status }) => {
      if (status === 'pending_delivery') {
        return Promise.resolve({ success: true, orders: pendingOrders });
      }
      if (status === 'delivered_today') {
        return Promise.resolve({ success: true, orders: deliveredOrders });
      }
      return Promise.resolve({ success: true, orders: [] });
    });

    render(<CoachRequestsDashboard />);

    await waitFor(() =>
      expect(getCoachDeliveries).toHaveBeenCalledWith({ status: 'pending_delivery', limit: 50 })
    );
    expect(await screen.findByText('ORD-PENDING')).toBeInTheDocument();

    const digitalOrdersSection = screen.getByText('Digital Orders').closest('section');
    const statusSelect = within(digitalOrdersSection).getByRole('combobox');

    fireEvent.change(statusSelect, { target: { value: 'delivered_today' } });

    await waitFor(() =>
      expect(getCoachDeliveries).toHaveBeenCalledWith({ status: 'delivered_today', limit: 50 })
    );

    expect(await screen.findByText('ORD-DELIVERED')).toBeInTheDocument();
    expect(screen.queryByText('ORD-PENDING')).not.toBeInTheDocument();

    fireEvent.change(statusSelect, { target: { value: 'pending_delivery' } });

    await waitFor(() =>
      expect(getCoachDeliveries).toHaveBeenCalledWith({ status: 'pending_delivery', limit: 50 })
    );
    expect(await screen.findByText('ORD-PENDING')).toBeInTheDocument();
  });

  it('allows requester to mark delivered_store -> delivered_balagruha', async () => {
    getMyPurchaseRequests.mockResolvedValue({
      success: true,
      data: {
        requests: [
          {
            _id: 'r1',
            requestId: 'PR-1',
            status: 'delivered_store',
            balagruhaId: 'STOCK',
            items: [{ productName: 'Item', requestedQuantity: 1 }],
            createdAt: '2025-12-24T10:00:00.000Z',
            deadline: '2025-12-25'
          }
        ]
      }
    });

    getCoachDeliveries.mockResolvedValue({ success: true, orders: [] });
    updatePurchaseRequestStatus.mockResolvedValue({ success: true });

    render(<CoachRequestsDashboard />);

    expect(await screen.findByText('PR-1')).toBeInTheDocument();

    const markBtn = await screen.findByRole('button', { name: /mark delivered/i });
    fireEvent.click(markBtn);

    await waitFor(() =>
      expect(updatePurchaseRequestStatus).toHaveBeenCalledWith('r1', {
        status: 'delivered_balagruha',
        notes: 'Marked Delivered to Balagruha by requester'
      })
    );

    await waitFor(() => expect(getMyPurchaseRequests).toHaveBeenCalledTimes(2));
  });
});
