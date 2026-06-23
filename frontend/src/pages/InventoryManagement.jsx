import React, { useState, useEffect, useCallback } from 'react';
import { Package, TrendingUp, TrendingDown, AlertTriangle, Search, Download, Upload, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import toast from 'react-hot-toast';
import { useRBAC } from '../contexts/RBACContext';
import StockAdjustmentModal from '../components/shop/StockAdjustmentModal';
import BulkStockUploadModal from '../components/shop/BulkStockUploadModal';
import AuditTrailModal from '../components/shop/AuditTrailModal';
import Breadcrumbs from '../components/shop/Breadcrumbs';
import ShopAdminControls from '../components/shop/ShopAdminControls';

/**
 * InventoryManagement Page - Sprint5-Story-06
 * Admin page for managing shop inventory with stock tracking
 * SECURITY: Requires 'Shop Management' module 'Manage' permission
 */

export default function InventoryManagement() {
  const navigate = useNavigate();
  const { hasPermission, isLoading: rbacLoading, permissions } = useRBAC();

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  // Stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0
  });

  // Modal states
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // SECURITY CHECK: Redirect unauthorized users
  useEffect(() => {
    if (rbacLoading) {

      return;
    }

    const permissionsLoaded = Object.keys(permissions).length > 0;
    if (!permissionsLoaded) {

      return;
    }


    const hasPerm = hasPermission('Shop Management', 'Manage');


    if (!hasPerm) {
      console.warn('Unauthorized access attempt to Inventory Management');
      navigate('/access-denied');
    } else {

    }
  }, [hasPermission, navigate, rbacLoading, permissions]);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/api/v2/shop/admin/inventory');
      const inventoryData = response.data.products || [];

      setInventory(inventoryData);

      // Use stats from backend if available, otherwise calculate
      if (response.data.statistics) {
        setStats({
          totalProducts: response.data.statistics.totalProducts || 0,
          lowStock: response.data.statistics.lowStock || 0,
          outOfStock: response.data.statistics.outOfStock || 0
        });
      } else {
        // Fallback calculation
        const totalProducts = inventoryData.length;
        const lowStock = inventoryData.filter(item =>
          item.stock > 0 && item.stock <= item.lowStockThreshold
        ).length;
        const outOfStock = inventoryData.filter(item => item.stock === 0).length;

        setStats({ totalProducts, lowStock, outOfStock });
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const getStockStatus = (stock, threshold) => {
    if (stock === 0) return 'out';
    if (stock <= threshold) return 'low';
    return 'high';
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'high':
        return 'bg-green-50 border-green-200';
      case 'low':
        return 'bg-orange-50 border-orange-200';
      case 'out':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-slate-200';
    }
  };

  const filteredInventory = inventory.filter(item => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());

    // Category filter
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    // Stock filter
    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = item.stock > 0 && item.stock <= item.lowStockThreshold;
    } else if (stockFilter === 'out') {
      matchesStock = item.stock === 0;
    } else if (stockFilter === 'high') {
      matchesStock = item.stock > item.lowStockThreshold;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleAdjustStock = (product) => {
    setSelectedProduct(product);
    setIsAdjustmentModalOpen(true);
  };

  const handleViewHistory = (product) => {
    setSelectedProduct(product);
    setIsAuditModalOpen(true);
  };

  const handleExportCSV = () => {
    try {
      // Create CSV content
      const headers = ['SKU', 'Product Name', 'Category', 'Current Stock', 'Threshold', 'Status'];
      const rows = filteredInventory.map(item => [
        item.sku,
        item.name,
        item.category,
        item.stock,
        item.lowStockThreshold,
        getStockStatus(item.stock, item.lowStockThreshold)
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Inventory exported successfully');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      toast.error('Failed to export inventory');
    }
  };

  // Show loading state while RBAC context is loading
  if (rbacLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* Admin Floating Controls */}
      <ShopAdminControls />

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="w-full px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
              <p className="text-slate-600 mt-1">Track and manage product stock levels</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
              <button
                onClick={() => setIsBulkUploadModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Bulk Upload
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <Breadcrumbs />

      <div className="w-full px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Products */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Products</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalProducts}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Low Stock */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Low Stock Items</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.lowStock}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Out of Stock */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Out of Stock</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.outOfStock}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Alert Banners - Story-07 */}
        {(stats.lowStock > 0 || stats.outOfStock > 0) && (
          <div className="space-y-3 mb-6">
            {/* Low Stock Alert */}
            {stats.lowStock > 0 && (
              <div
                onClick={() => navigate('/shop/admin/inventory/low-stock')}
                className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-semibold text-orange-900">
                        {stats.lowStock} {stats.lowStock === 1 ? 'product' : 'products'} low on stock
                      </p>
                      <p className="text-sm text-orange-700 mt-0.5">
                        Click to view low stock products and restock
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                    View Report
                  </button>
                </div>
              </div>
            )}

            {/* Out of Stock Alert */}
            {stats.outOfStock > 0 && (
              <div
                onClick={() => navigate('/shop/admin/inventory/out-of-stock')}
                className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-900">
                        {stats.outOfStock} {stats.outOfStock === 1 ? 'product is' : 'products are'} out of stock
                      </p>
                      <p className="text-sm text-red-700 mt-0.5">
                        Click to view out of stock products and restock immediately
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                    View Report
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px] lg:min-w-[400px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by SKU or product name..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="stationery">Stationery</option>
              <option value="sports">Sports</option>
              <option value="books">Books</option>
              <option value="uniforms">Uniforms</option>
              <option value="digital">Digital</option>
              <option value="other">Other</option>
            </select>

            {/* Stock Status Filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Stock Levels</option>
              <option value="high">High Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="mt-3 text-sm text-slate-600">
            Showing {filteredInventory.length} of {inventory.length} products
          </div>
        </div>

        {/* Inventory Table */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchInventory}
              className="mt-2 text-red-600 hover:text-red-700 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600">Loading inventory...</p>
          </div>
        )}

        {!loading && !error && filteredInventory.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-600 text-lg">No inventory items found</p>
            <p className="text-slate-500 mt-2">Try adjusting your filters</p>
          </div>
        )}

        {!loading && !error && filteredInventory.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
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
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Threshold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredInventory.map((item) => {
                    const stockStatus = getStockStatus(item.stock, item.lowStockThreshold);
                    const rowColor = getStockStatusColor(stockStatus);

                    return (
                      <tr key={item._id} className={`${rowColor} transition-colors`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                item.images?.find(img => img.isPrimary)?.url ||
                                item.images?.[0]?.url ||
                                item.primaryImageUrl ||
                                item.imageUrl ||
                                '/placeholder-product.png'
                              }
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded border border-slate-200"
                              onError={(e) => {
                                e.target.src = '/placeholder-product.png';
                              }}
                            />
                            <div>
                              <p className="font-medium text-slate-900">{item.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-slate-600">{item.sku}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${
                              stockStatus === 'out' ? 'text-red-600' :
                              stockStatus === 'low' ? 'text-orange-600' :
                              'text-green-600'
                            }`}>
                              {item.stock}
                            </span>
                            {stockStatus === 'low' && (
                              <TrendingDown className="w-4 h-4 text-orange-600" />
                            )}
                            {stockStatus === 'out' && (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-slate-600">{item.lowStockThreshold}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAdjustStock(item)}
                              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                            >
                              Adjust Stock
                            </button>
                            <button
                              onClick={() => handleViewHistory(item)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                              title="View History"
                            >
                              <History className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {isAdjustmentModalOpen && (
        <StockAdjustmentModal
          product={selectedProduct}
          onClose={() => {
            setIsAdjustmentModalOpen(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            setIsAdjustmentModalOpen(false);
            setSelectedProduct(null);
            fetchInventory();
          }}
        />
      )}

      {/* Bulk Upload Modal */}
      {isBulkUploadModalOpen && (
        <BulkStockUploadModal
          onClose={() => setIsBulkUploadModalOpen(false)}
          onSuccess={() => {
            setIsBulkUploadModalOpen(false);
            fetchInventory();
          }}
        />
      )}

      {/* Audit Trail Modal */}
      {isAuditModalOpen && (
        <AuditTrailModal
          productId={selectedProduct?._id}
          productName={selectedProduct?.name}
          onClose={() => {
            setIsAuditModalOpen(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}
