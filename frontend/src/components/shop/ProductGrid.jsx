import React from 'react';
import ProductCard from './ProductCard';
import { AlertCircle, ShoppingBag } from 'lucide-react';

/**
 * ProductGrid Component - Story-01
 * Grid container for product cards with loading/error/empty states
 * Design System: WTF Module grid pattern
 */
const ProductGrid = ({
  products,
  loading,
  error,
  pagination,
  onRequestItem,
  onPageChange,
  onSortChange,
  sortBy
}) => {
  // Loading State
  if (loading) {
    return (
      <div className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-slate-200 aspect-square rounded-lg mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          Failed to load products
        </h3>
        <p className="text-slate-600 mb-6 text-center max-w-md">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty State
  if (!products || products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <ShoppingBag className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          No products found
        </h3>
        <p className="text-slate-600 mb-6 text-center max-w-md">
          Try adjusting your filters or search term to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* Header with count and sort */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-600">
          Showing {products.length} of {pagination?.total || 0} products
        </p>
        <select
          value={sortBy || '-createdAt'}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="-createdAt">Sort by: Newest</option>
          <option value="createdAt">Sort by: Oldest</option>
          <option value="price">Price: Low to High</option>
          <option value="-price">Price: High to Low</option>
          <option value="name">Name: A to Z</option>
          <option value="-name">Name: Z to A</option>
        </select>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {products.map(product => (
          <ProductCard
            key={product._id}
            product={product}
            onRequestItem={onRequestItem}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 border border-slate-300 rounded-md bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="flex items-center gap-1">
            {[...Array(Math.min(pagination.pages, 5))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-10 h-10 rounded-md text-sm font-medium transition-colors ${
                    pagination.page === pageNum
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {pagination.pages > 5 && (
              <>
                <span className="px-2 text-slate-500">...</span>
                <button
                  onClick={() => onPageChange(pagination.pages)}
                  className={`w-10 h-10 rounded-md text-sm font-medium transition-colors ${
                    pagination.page === pagination.pages
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pagination.pages}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 border border-slate-300 rounded-md bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Page Info */}
      {pagination && (
        <p className="text-center text-sm text-slate-500 mt-4">
          Page {pagination.page} of {pagination.pages}
        </p>
      )}
    </div>
  );
};

export default ProductGrid;
