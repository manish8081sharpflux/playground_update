import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RequestItemModal from '../../../components/shop/RequestItemModal';
import useShopStore from '../../../store/shopStore';
import { useAuth } from '../../../contexts/AuthContext';

// Mocks
jest.mock('../../../store/shopStore');
jest.mock('../../../contexts/AuthContext');

describe('RequestItemModal', () => {
  const mockProduct = {
    _id: '123',
    name: 'Test Product',
    sku: 'TEST-001',
    stock: 10,
    price: 100,
    category: 'Stationery'
  };

  const mockCreatePurchaseRequest = jest.fn();
  const mockAssignFromStock = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useShopStore.mockReturnValue({
      createPurchaseRequest: mockCreatePurchaseRequest,
      assignFromStock: mockAssignFromStock
    });
  });

  it('renders correctly for Coach', () => {
    useAuth.mockReturnValue({ 
      user: { role: 'coach', balagruhaIds: ['bg1'] } 
    });

    render(<RequestItemModal product={mockProduct} onClose={mockOnClose} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Request Item')).toBeInTheDocument();
    expect(screen.queryByText('Assign from Stock Immediately')).not.toBeInTheDocument();
  });

  it('renders correctly for Purchase Manager (shows shortcut)', () => {
    useAuth.mockReturnValue({ 
      user: { role: 'purchase-manager', balagruhaIds: ['bg1'] } 
    });

    render(<RequestItemModal product={mockProduct} onClose={mockOnClose} />);
    
    expect(screen.getByText('Assign from Stock Immediately')).toBeInTheDocument();
  });

  it('validates form submission', async () => {
    useAuth.mockReturnValue({ 
      user: { role: 'coach', balagruhaIds: [] } 
    });

    render(<RequestItemModal product={mockProduct} onClose={mockOnClose} />);

    // Submit without selecting a Balagruha
    fireEvent.click(screen.getByText('Submit Request'));

    expect(screen.getByText('Please select a Balagruha (or STOCK)')).toBeInTheDocument();
    expect(mockCreatePurchaseRequest).not.toHaveBeenCalled();
  });

  it('submits valid request', async () => {
    useAuth.mockReturnValue({ 
      user: { role: 'coach', balagruhaIds: ['bg1'] } 
    });
    mockCreatePurchaseRequest.mockResolvedValue({ data: { purchaseRequest: { _id: 'pr1' } } });

    render(<RequestItemModal product={mockProduct} onClose={mockOnClose} />);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Why is this needed/), { target: { value: 'Need for class' } });
    
    // Submit
    fireEvent.click(screen.getByText('Submit Request'));

    await waitFor(() => {
      expect(mockCreatePurchaseRequest).toHaveBeenCalledWith(expect.objectContaining({
        balagruhaId: 'bg1',
        reason: 'Need for class',
        items: expect.stringContaining('123')
      }));
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles PM shortcut assignment', async () => {
    useAuth.mockReturnValue({ 
      user: { role: 'purchase-manager', balagruhaIds: ['bg1'] } 
    });
    mockCreatePurchaseRequest.mockResolvedValue({ data: { purchaseRequest: { _id: 'pr1' } } });
    mockAssignFromStock.mockResolvedValue({});

    render(<RequestItemModal product={mockProduct} onClose={mockOnClose} />);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Why is this needed/), { target: { value: 'Urgent' } });
    
    // Check shortcut
    fireEvent.click(screen.getByLabelText(/Assign from Stock Immediately/));

    // Submit
    fireEvent.click(screen.getByText('Submit Request'));

    await waitFor(() => {
      expect(mockCreatePurchaseRequest).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockAssignFromStock).toHaveBeenCalledWith('pr1', expect.stringContaining('Auto-assigned'));
    });
  });
});