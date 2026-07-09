import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import ViewRequestModal from '../../../components/purchaseManagement/modals/ViewRequestModal';
import { updatePurchaseRequestStatus } from '../../../api';

jest.mock('../../../api', () => ({
  cancelPurchaseRequest: jest.fn(),
  updatePurchaseRequestStatus: jest.fn()
}));

jest.mock('../../../utils/toast', () => jest.fn());

describe('ViewRequestModal', () => {
  const baseRequest = {
    _id: 'r1',
    requestId: 'PR-1',
    status: 'pending',
    items: [],
    reason: 'Test',
    createdAt: '2025-12-24T10:00:00.000Z',
    updatedAt: '2025-12-24T10:00:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows Purchase Manager to mark pending -> ordered', async () => {
    updatePurchaseRequestStatus.mockResolvedValue({ success: true });

    const onClose = jest.fn();
    const onRefresh = jest.fn();

    render(
      <ViewRequestModal
        request={{ ...baseRequest, status: 'pending' }}
        userRole="purchase-manager"
        onClose={onClose}
        onRefresh={onRefresh}
      />
    );

    const button = screen.getByRole('button', { name: /mark ordered/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(updatePurchaseRequestStatus).toHaveBeenCalledWith('r1', {
        status: 'ordered',
        notes: 'Marked Ordered via Purchase Management'
      });
    });

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('allows Purchase Manager to mark ordered -> delivered_store', async () => {
    updatePurchaseRequestStatus.mockResolvedValue({ success: true });

    const onClose = jest.fn();
    const onRefresh = jest.fn();

    render(
      <ViewRequestModal
        request={{ ...baseRequest, status: 'ordered' }}
        userRole="purchase-manager"
        onClose={onClose}
        onRefresh={onRefresh}
      />
    );

    const button = screen.getByRole('button', { name: /mark received at store/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(updatePurchaseRequestStatus).toHaveBeenCalledWith('r1', {
        status: 'delivered_store',
        notes: 'Marked Received at Store via Purchase Management'
      });
    });

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
