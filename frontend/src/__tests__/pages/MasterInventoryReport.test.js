import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import MasterInventoryReport from '../../pages/MasterInventoryReport';
import { api } from '../../api';

jest.mock('../../api', () => ({
  api: {
    get: jest.fn()
  }
}));

jest.mock('../../contexts/RBACContext', () => ({
  useRBAC: () => ({
    hasPermission: () => true,
    isLoading: false,
    permissions: { 'Shop Management': ['Manage'] }
  })
}));

jest.mock('../../components/shop/Breadcrumbs', () => () => <div data-testid="breadcrumbs" />);
jest.mock('../../components/shop/ShopAdminControls', () => () => <div data-testid="admin-controls" />);

describe('MasterInventoryReport (Story 3.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders rows from API response', async () => {
    api.get.mockResolvedValue({
      data: {
        products: [
          {
            _id: '1',
            sku: 'SKU-1',
            name: 'Notebook',
            category: 'stationery',
            stock: 5,
            deployed: 2
          },
          {
            _id: '2',
            sku: 'SKU-2',
            name: 'Football',
            category: 'sports',
            stock: 0,
            deployed: 0
          }
        ]
      }
    });

    render(
      <MemoryRouter>
        <MasterInventoryReport />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/api/v2/shop/admin/inventory/master-report')
    );

    expect(await screen.findByText('SKU-1')).toBeInTheDocument();
    expect(await screen.findByText('Notebook')).toBeInTheDocument();
    expect(await screen.findByText('SKU-2')).toBeInTheDocument();
    expect(await screen.findByText('Football')).toBeInTheDocument();
  });
});
