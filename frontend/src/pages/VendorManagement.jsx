import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, Pencil, Power } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useRBAC } from '../contexts/RBACContext';
import { UserTypes, normalizeUserRole } from '../constants/userTypes';
import Breadcrumbs from '../components/shop/Breadcrumbs';
import ShopAdminControls from '../components/shop/ShopAdminControls';
import VendorFormModal from '../components/shop/VendorFormModal';

export default function VendorManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission, isLoading: rbacLoading, permissions } = useRBAC();

  const normalizedRole = normalizeUserRole(user?.role);
  const isAdmin = normalizedRole === UserTypes.ADMIN;

  const permissionsLoaded = Object.keys(permissions || {}).length > 0;
  const canManageShop = !rbacLoading && permissionsLoaded && hasPermission('Shop Management', 'Manage');

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // SECURITY CHECK: Admin-only and requires Shop Management: Manage
  useEffect(() => {
    if (rbacLoading) return;
    if (!permissionsLoaded) return;

    if (!canManageShop || !isAdmin) {
      navigate('/access-denied', { replace: true });
    }
  }, [canManageShop, isAdmin, navigate, permissionsLoaded, rbacLoading]);

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch) params.search = trimmedSearch;

      if (statusFilter === 'active') params.active = 'true';
      if (statusFilter === 'inactive') params.active = 'false';

      const response = await api.get('/api/v2/vendors', { params });
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to load vendors');
      }

      setVendors(response.data.vendors || []);
      setPagination((prev) => ({
        ...prev,
        ...(response.data.pagination || {}),
        total: response.data.total ?? prev.total
      }));
    } catch (err) {
      console.error('Error fetching vendors:', err);
      const message = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load vendors';
      setError(message);
      toast.error(message);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.page, searchTerm, statusFilter]);

  useEffect(() => {
    if (!canManageShop || !isAdmin) return;
    const debounceTimer = setTimeout(() => {
      fetchVendors();
    }, searchTerm ? 300 : 0);

    return () => clearTimeout(debounceTimer);
  }, [canManageShop, fetchVendors, isAdmin, searchTerm]);

  const visibleRows = useMemo(() => vendors, [vendors]);

  const openCreate = () => {
    setSelectedVendor(null);
    setIsFormOpen(true);
  };

  const openEdit = (vendor) => {
    setSelectedVendor(vendor);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedVendor(null);
  };

  const handleFormSubmit = async (payload) => {
    try {
      if (selectedVendor?._id) {
        await api.put(`/api/v2/vendors/${selectedVendor._id}`, payload);
        toast.success('Vendor updated');
      } else {
        await api.post('/api/v2/vendors', payload);
        toast.success('Vendor created');
      }

      closeForm();
      fetchVendors();
    } catch (err) {
      console.error('Error saving vendor:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save vendor');
    }
  };

  const toggleVendorStatus = async (vendor) => {
    const nextActive = !vendor.active;
    const actionLabel = nextActive ? 'activate' : 'deactivate';

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} vendor "${vendor.name}"?`
    );
    if (!confirmed) return;

    try {
      await api.put(`/api/v2/vendors/${vendor._id}`, { active: nextActive });
      toast.success(`Vendor ${nextActive ? 'activated' : 'deactivated'}`);
      fetchVendors();
    } catch (err) {
      console.error('Error toggling vendor status:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update vendor');
    }
  };

  const setPage = (page) => {
    setPagination((prev) => ({
      ...prev,
      page
    }));
  };

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

  if (!canManageShop || !isAdmin) {
    return null;
  }

  return (
    <div className="w-full min-h-screen bg-slate-50">
      <ShopAdminControls />

      <div className="bg-white border-b border-slate-200">
        <div className="w-full px-4 py-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Vendor Management</h1>
              <p className="text-slate-600 mt-1">Create and manage approved vendors for shop items</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchVendors}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Vendor
              </button>
            </div>
          </div>
        </div>
      </div>

      <Breadcrumbs />

      <div className="w-full px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Search by name, phone, or address"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-600">Loading vendors...</p>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleRows.map((vendor) => (
                    <tr key={vendor._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{vendor.name}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{vendor.phone}</td>
                      <td className="px-6 py-4 text-slate-700">
                        <span className="line-clamp-2">{vendor.address}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            vendor.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {vendor.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(vendor)}
                            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => toggleVendorStatus(vendor)}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                              vendor.active
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                            title={vendor.active ? 'Deactivate vendor' : 'Activate vendor'}
                          >
                            <Power className="w-4 h-4" />
                            {vendor.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-600">
                        No vendors found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {pagination.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                  <div className="text-sm text-slate-600">
                    {pagination.total > 0 ? (
                      <span>
                        Showing {(pagination.page - 1) * pagination.limit + 1}-
                        {(pagination.page - 1) * pagination.limit + visibleRows.length} of {pagination.total}
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
      </div>

      {isFormOpen && (
        <VendorFormModal
          vendor={selectedVendor}
          onClose={closeForm}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}
