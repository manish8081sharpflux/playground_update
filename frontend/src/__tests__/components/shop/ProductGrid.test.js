import React from 'react';
import { render } from '@testing-library/react';

describe('ProductGrid', () => {
  it('passes onRequestItem to ProductCard', () => {
    jest.resetModules();

    const productCardProps = [];

    jest.doMock('../../../components/shop/ProductCard', () => ({
      __esModule: true,
      default: (props) => {
        productCardProps.push(props);
        return null;
      }
    }));

    const ProductGrid = require('../../../components/shop/ProductGrid').default;

    const onRequestItem = jest.fn();

    render(
      <ProductGrid
        products={[{ _id: 'p1' }]}
        loading={false}
        error={null}
        pagination={{ page: 1, pages: 1, total: 1 }}
        onAddToCart={jest.fn()}
        onRequestItem={onRequestItem}
        onPageChange={jest.fn()}
        onSortChange={jest.fn()}
        sortBy="-createdAt"
      />
    );

    expect(productCardProps).toHaveLength(1);
    expect(productCardProps[0].onRequestItem).toBe(onRequestItem);
  });
});
