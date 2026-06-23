import React, { useState, useEffect, useCallback } from "react";
import FilterPanel from "./FilterPanel";
import ProductGrid from "./ProductGrid";
import ShopNavigation from "./ShopNavigation";
import Breadcrumbs from "./Breadcrumbs";
import ShopAdminControls from "./ShopAdminControls";
import RequestItemModal from "./RequestItemModal";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../api";

/**
 * ShopHome Component - Story-01
 * Main shop page with product catalog, filtering, and search
 * Design System: WTF Module layout pattern
 */
const ShopHome = () => {
  const { user } = useAuth();
  const isStudent = user?.role?.toLowerCase() === "student";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Story 2.2: Request Item Modal State
  const [selectedProductForRequest, setSelectedProductForRequest] = useState(null);

  const [filters, setFilters] = useState({
    category: null,
    search: "",
    minPrice: null,
    maxPrice: 500,
    inStock: true,
    sort: "-createdAt"
  });

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: filters.sort
      };

      // FIX-043: Support multi-select categories (comma-separated)
      // Students are restricted to the "ISF Shop" category — no Medicines/
      // Consumables/Repairs/Infra/Others — regardless of any client-side filter.
      if (isStudent) {
        params.category = "ISF Shop";
      } else if (filters.category) {
        params.category = Array.isArray(filters.category)
          ? filters.category.join(',')
          : filters.category;
      }
      if (filters.search) params.search = filters.search;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice !== null && filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
      if (filters.inStock !== undefined) params.inStock = filters.inStock;

      const response = await api.get(`/api/v2/shop/products`, { params });

      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err.response?.data?.message || "Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, isStudent]);

  // Fetch products on mount and filter change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchProducts();
    }, filters.search ? 300 : 0); // Debounce search

    return () => clearTimeout(debounceTimer);
  }, [fetchProducts]);

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      category: null,
      search: "",
      minPrice: null,
      maxPrice: 500,
      inStock: true,
      sort: "-createdAt"
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle sort change
  const handleSortChange = (sortValue) => {
    setFilters(prev => ({ ...prev, sort: sortValue }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle request item (Story 2.2)
  const handleRequestItem = (product) => {
    setSelectedProductForRequest(product);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Controls - Draggable floating panel for admins only */}
      {user?.role?.toLowerCase() === "admin" && <ShopAdminControls />}

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-slate-900">ISF Shop</h1>
          <p className="text-slate-600 mt-1">
            Browse and purchase items with your earned ISF Coins
          </p>
        </div>
      </div>

      {/* Shop Navigation */}
      <ShopNavigation />

      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            hideCategoryFilter={isStudent}
          />

          {/* Product Grid */}
          <ProductGrid
            products={products}
            loading={loading}
            error={error}
            pagination={pagination}
            onRequestItem={handleRequestItem}
            onPageChange={handlePageChange}
            onSortChange={handleSortChange}
            sortBy={filters.sort}
          />
        </div>
      </div>

      {/* Request Item Modal (Story 2.2) */}
      {selectedProductForRequest && (
        <RequestItemModal
          product={selectedProductForRequest}
          onClose={() => setSelectedProductForRequest(null)}
        />
      )}
    </div>
  );
};

export default ShopHome;