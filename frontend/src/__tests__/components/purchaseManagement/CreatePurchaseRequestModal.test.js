import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import CreatePurchaseRequestModal from '../../../components/purchaseManagement/modals/CreatePurchaseRequestModal';
import { getAllShopItems } from '../../../api';

jest.mock('../../../api', () => ({
  createPurchaseRequest: jest.fn(),
  getLowStockProducts: jest.fn(),
  getAllShopItems: jest.fn(),
  createPendingProduct: jest.fn()
}));

jest.mock('../../../utils/toast', () => jest.fn());

describe('CreatePurchaseRequestModal - PRD alignment (admin-only New Item)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAllShopItems.mockResolvedValue({ success: true, data: [] });
  });

  const baseProps = {
    onClose: jest.fn(),
    onSuccess: jest.fn(),
    userBalagruhas: [],
    balagruhas: [{ _id: 'STOCK', name: 'STOCK' }]
  };

  const selectBalagruha = async () => {
    const balagruhaSelect = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.change(balagruhaSelect, { target: { value: 'STOCK' } });
    });
    await waitFor(() => expect(getAllShopItems).toHaveBeenCalled());
  };

  const selectCategory = async () => {
    const categorySelect = screen.getAllByRole('combobox')[1];
    await act(async () => {
      fireEvent.change(categorySelect, { target: { value: 'ISF Shop' } });
    });
  };

  it('hides "+ Add New Product" for non-admin roles and shows helper message', async () => {
    await act(async () => {
      render(
        <CreatePurchaseRequestModal
          {...baseProps}
          userRole="purchase-manager"
        />
      );
    });

    await selectBalagruha();
    await selectCategory();

    expect(
      screen.queryByRole('button', { name: /add new product/i })
    ).not.toBeInTheDocument();

    expect(
      screen.getByText(/Need a new item\? Contact an Admin to add it to the Master Catalog\./i)
    ).toBeInTheDocument();
  });

  it('shows "+ Add New Product" for admin', async () => {
    await act(async () => {
      render(
        <CreatePurchaseRequestModal
          {...baseProps}
          userRole="admin"
        />
      );
    });

    await selectBalagruha();
    await selectCategory();

    expect(
      screen.getByRole('button', { name: /add new product/i })
    ).toBeInTheDocument();
  });
});
