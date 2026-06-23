import React, { useCallback, useEffect, useState } from 'react';
import { Search, History, PencilLine, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '../../../api';
import StockAdjustmentModal from '../../shop/StockAdjustmentModal';
import AuditTrailModal from '../../shop/AuditTrailModal';

export default function StockReconciliationView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [auditProduct, setAuditProduct] = useState(null);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const term = searchTerm.trim();

      const response = await api.get('/api/v2/shop/admin/inventory', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          sortBy: 'sku',
          sortOrder: 'asc',
          search: term || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined
        }
      });

      setProducts(response.data.products || []);
      setPagination(prev => ({
        ...prev,
        ...(response.data.pagination || {})
      }));
    } catch (err) {
      console.error('Error fetching inventory:', err);
      const message = err.response?.data?.message || 'Failed to load inventory';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, pagination.limit, pagination.page, searchTerm]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchInventory();
    }, searchTerm ? 300 : 0);

    return () => clearTimeout(debounceTimer);
  }, [fetchInventory, searchTerm]);

  const setPage = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const openAdjust = (product) => {
    setSelectedProduct(product);
  };

  const openAudit = (product) => {
    setAuditProduct(product);
  };

  const closeAdjust = () => setSelectedProduct(null);
  const closeAudit = () => setAuditProduct(null);

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Stock Reconciliation</h2>
            <p className="text-sm text-slate-600 mt-1">Adjust system stock to match physical counts (audit logged)</p>
          </div>

          <button
            onClick={fetchInventory}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by SKU or name"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Categories</option>
              <option value="stationery">Stationery</option>
              <option value="sports">Sports</option>
              <option value="books">Books</option>
              <option value="uniforms">Uniforms</option>
              <option value="digital">Digital</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600">Loading inventory...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-slate-700">{product.sku}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">{product.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-slate-900">{product.stock ?? 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openAudit(product)}
                          className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <History className="w-4 h-4" />
                          History
                        </button>
                        <button
                          onClick={() => openAdjust(product)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <PencilLine className="w-4 h-4" />
                          Adjust
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {products.length === 0 && (
              <div className="p-10 text-center text-slate-600">No products found.</div>
            )}

            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  {pagination.total > 0 ? (
                    <span>
                      Showing {(pagination.page - 1) * pagination.limit + 1}-
                      {(pagination.page - 1) * pagination.limit + products.length} of {pagination.total}
                    </span>
                  ) : (
                    <span>Showing 0 of 0</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPage(pagination.page - 1)}
                    disabled={loading || pagination.page <= 1}
                    className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-slate-700">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(pagination.page + 1)}
                    disabled={loading || pagination.page >= pagination.pages}
                    className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedProduct && (
        <StockAdjustmentModal
          product={selectedProduct}
          onClose={closeAdjust}
          onSuccess={fetchInventory}
        />
      )}

      {auditProduct && (
        <AuditTrailModal
          productId={auditProduct._id}
          productName={`${auditProduct.name} (${auditProduct.sku})`}
          onClose={closeAudit}
        />
      )}
    </div>
  );
}
