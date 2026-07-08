import React, { useState, useEffect, useCallback } from 'react';
import { Package, TrendingUp, TrendingDown, AlertTriangle, Search, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, getBalagruha } from '../api';
import { useAuth } from '../contexts/AuthContext';
import CreatePurchaseRequestModal from '../components/purchaseManagement/modals/CreatePurchaseRequestModal';
import showToast from '../utils/toast';

/**
 * PMLowStock Page
 * Purchase Manager view for low stock items in their assigned Balagruhas.
 */

const PRODUCT_CATEGORIES = [
    'ISF Shop',
    'Medicines',
    'Consumables',
    'Repairs',
    'Infra',
    'Others',
];

export default function PMLowStock() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    // Default to showing filtering by Low Stock, but user can toggle
    const [stockFilter, setStockFilter] = useState('low');

    // Modal State
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [selectedReorderItem, setSelectedReorderItem] = useState(null);
    const [balagruhas, setBalagruhas] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);

    // Stats (calc from fetched data or just show what we have)
    const [stats, setStats] = useState({
        filteredCount: 0
    });

    // Fetch balagruhas for the modal
    useEffect(() => {
        const loadBalagruhas = async () => {
            try {
                const response = await getBalagruha();
                if (response.success) {
                    // Fix: response.data contains { balagruhas: [...] } or just the array depending on endpoint version.
                    // Safely extract the array.
                    const balagruhasData = response.data.balagruhas || response.data || [];
                    setBalagruhas(Array.isArray(balagruhasData) ? balagruhasData : []);
                }
            } catch (err) {
                console.error('Failed to load balagruhas', err);
            }
        };
        loadBalagruhas();
    }, []);

    // Fetch the full set of categories present across all products for this PM's
    // Balagruhas, independent of the current category/stock filters, so the
    // dropdown always reflects real data rather than a hardcoded guess.
    const fetchCategories = useCallback(async () => {
        try {
            const balagruhaIds = user?.balagruhaIds || [];
            const response = await api.get('/api/v2/shop/products', {
                params: {
                    limit: 1000,
                    balagruhaIds: balagruhaIds.join(','),
                }
            });
            const products = response.data.products || response.data || [];
            const categories = [...new Set([
                ...PRODUCT_CATEGORIES,
                ...products
                    .map((p) => p.purchaseCategory || p.category)
                    .filter(Boolean)
            ])].sort((a, b) => a.localeCompare(b));
            setAvailableCategories(categories);
        } catch (err) {
            console.error('Failed to load categories', err);
        }
    }, [user]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const fetchInventory = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // We use the public products endpoint but scoped to PM's balagruhas and low stock
            // We pass balagruhaIds from the authenticated user context
            const balagruhaIds = user?.balagruhaIds || [];

            const params = {
                limit: 100, // Fetch reasonable amount
                balagruhaIds: balagruhaIds.join(','), // Pass as comma-separated string
                stockStatus: stockFilter === 'all' ? undefined : stockFilter // 'low', 'out', or undefined for all
            };

            if (searchTerm) params.search = searchTerm;
            if (categoryFilter !== 'all') params.purchaseCategory = categoryFilter;

            const response = await api.get('/api/v2/shop/products', { params });

            const products = response.data.products || response.data || [];
            setInventory(products);
            setStats({ filteredCount: products.length });

        } catch (err) {
            console.error('Error fetching inventory:', err);
            setError(err.response?.data?.message || 'Failed to load inventory');
        } finally {
            setLoading(false);
        }
    }, [user, searchTerm, categoryFilter, stockFilter]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const handleReorder = (item) => {
        // Determine the balagruhaId for this item to pre-fill context
        // If item has specific balagruhaId, use it.
        // If item is shop-wide (null id), try to use user's first assigned balagruha or force user selection

        const targetBalagruhaId = item.balagruhaId || (user?.balagruhaIds?.length > 0 ? user.balagruhaIds[0] : '');

        setSelectedReorderItem({
            product: item,
            balagruhaId: targetBalagruhaId
        });
        setShowPurchaseModal(true);
    };

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

    return (
        <div className="w-full min-h-screen bg-slate-50">
            {/* Page Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="w-full px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Low Stock Items</h1>
                            <p className="text-slate-600 mt-1">Items requiring restock in your assigned Balagruhas</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full px-4 py-6">
                {/* Filter & Search Bar */}
                <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 min-w-[300px] lg:min-w-[400px]">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by SKU or product name..."
                                    style={{ paddingLeft: '3.25rem' }}
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
                            {availableCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                            ))}
                        </select>

                        {/* Stock Status Filter - Simplified for this view */}
                        <select
                            value={stockFilter}
                            onChange={(e) => setStockFilter(e.target.value)}
                            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="low">Low Stock</option>
                            <option value="out">Out of Stock Only</option>
                            <option value="all">Show All Items</option>
                        </select>
                    </div>

                    <div className="mt-3 text-sm text-slate-600">
                        Showing {inventory.length} items
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

                {!loading && !error && inventory.length === 0 && (
                    <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-slate-900 text-lg font-medium">Everything looks good!</p>
                        <p className="text-slate-500 mt-2">No low stock items found for your assigned Balagruhas.</p>
                        {stockFilter !== 'all' && (
                            <button
                                onClick={() => setStockFilter('all')}
                                className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                            >
                                View all items
                            </button>
                        )}
                    </div>
                )}

                {!loading && !error && inventory.length > 0 && (
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
                                    {inventory.map((item) => {
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
                                                        <span className={`text-lg font-bold ${stockStatus === 'out' ? 'text-red-600' :
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
                                                        {item.purchaseCategory || item.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleReorder(item)}
                                                        className="text-purple-600 hover:text-purple-900 bg-white border border-purple-200 hover:bg-purple-50 px-3 py-1 rounded shadow-sm inline-flex items-center gap-1"
                                                    >
                                                        <ShoppingCart className="w-4 h-4" />
                                                        Reorder
                                                    </button>
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

            {/* Create Purchase Request Modal */}
            {showPurchaseModal && (
                <CreatePurchaseRequestModal
                    onClose={() => {
                        setShowPurchaseModal(false);
                        setSelectedReorderItem(null);
                    }}
                    onSuccess={() => {
                        setShowPurchaseModal(false);
                        setSelectedReorderItem(null);
                        showToast('Purchase request sent!', 'success');
                    }}
                    userBalagruhas={user?.balagruhaIds || []}
                    balagruhas={balagruhas}
                    userRole={user?.role}
                    initialProduct={selectedReorderItem}
                />
            )}
        </div>
    );
}
