import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import StockAdjustmentModal from '../../../components/shop/StockAdjustmentModal';
import { api } from '../../../api';

jest.mock('../../../api', () => ({
  api: {
    patch: jest.fn()
  }
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

describe('StockAdjustmentModal (Story 4.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cannot submit without a reason code', async () => {
    api.patch.mockResolvedValue({ data: {} });

    const onClose = jest.fn();
    const onSuccess = jest.fn();

    render(
      <StockAdjustmentModal
        product={{
          _id: 'p1',
          sku: 'SKU-1',
          name: 'Test Product',
          stock: 10,
          images: []
        }}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Adjust Stock' });
    expect(submitButton).toBeDisabled();

    const physicalCountInput = screen.getByLabelText(/Physical Count/i);
    fireEvent.change(physicalCountInput, { target: { value: '12' } });
    expect(submitButton).toBeDisabled();

    const reasonSelect = screen.getByLabelText(/Reason/i);
    fireEvent.change(reasonSelect, { target: { value: 'Inventory Adjustment' } });

    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/api/v2/shop/admin/inventory/p1/adjust', {
        newStock: 12,
        reason: 'Inventory Adjustment',
        notes: undefined
      })
    );
  });
});
