import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Package, RefreshCw, ArrowLeft } from 'lucide-react';
import { api } from '../api';
import toast from 'react-hot-toast';
import StockAdjustmentModal from '../components/shop/StockAdjustmentModal';
import Breadcrumbs from '../components/shop/Breadcrumbs';

/**
 * LowStockReport Component - Sprint5-Story-07
 * Shows all products with stock <= lowStockThreshold
 */

export default function LowStockReport() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  useEffect(() => {
    fetchLowStockProducts();
  }, []);

  const fetchLowStockProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v2/shop/admin/inventory/low-stock');
      setProducts(response.data.products || []);
    } catch (err) {
      console.error('Error fetching low stock products:', err);
      toast.error(err.response?.data?.message || 'Failed to load low stock products');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = (product) => {
    setSelectedProduct(product);
    setShowAdjustModal(true);
  };

  const handleAdjustSuccess = () => {
    setShowAdjustModal(false);
    setSelectedProduct(null);
    fetchLowStockProducts();
  };

  const getStockColor = (stock, threshold) => {
    if (stock === 0) return 'text-red-600';
    if (stock <= threshold * 0.5) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getStockBgColor = (stock, threshold) => {
    if (stock === 0) return 'bg-red-50';
    if (stock <= threshold * 0.5) return 'bg-orange-50';
    return 'bg-yellow-50';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="w-full px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/shop/admin/inventory')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-7 h-7 text-orange-500" />
                  Low Stock Alert
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Products with stock at or below threshold
                </p>
              </div>
            </div>
            <button
              onClick={fetchLowStockProducts}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Content */}
      <div className="w-full px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600">Loading low stock products...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              All Stock Levels Healthy
            </h3>
            <p className="text-slate-600">
              No products are currently below their low stock threshold
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {/* Summary */}
            <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-orange-900">
                    {products.length} {products.length === 1 ? 'product' : 'products'} need attention
                  </span>
                </div>
                <span className="text-sm text-orange-700">
                  Stock levels at or below threshold
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Threshold
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {products.map((product) => (
                    <tr
                      key={product._id}
                      className={`${getStockBgColor(product.stock, product.lowStockThreshold)} hover:bg-opacity-75 transition-colors`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {(product.imageUrl || product.primaryImageUrl || product.images?.length > 0) ? (
                            <img
                              src={
                                product.imageUrl ||
                                product.primaryImageUrl ||
                                product.images?.find(img => img.isPrimary)?.url ||
                                product.images?.[0]?.url ||
                                'https://via.placeholder.com/40'
                              }
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{product.name}</p>
                            <p className="text-sm text-slate-600">
                              {product.price} coins
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-slate-700">
                          {product.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`text-lg font-bold ${getStockColor(product.stock, product.lowStockThreshold)}`}>
                            {product.stock}
                          </span>
                          {product.stock === 0 && (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-slate-700">
                          {product.lowStockThreshold}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleAdjustStock(product)}
                          className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustModal && selectedProduct && (
        <StockAdjustmentModal
          product={selectedProduct}
          onClose={() => {
            setShowAdjustModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={handleAdjustSuccess}
        />
      )}
    </div>
  );
}
