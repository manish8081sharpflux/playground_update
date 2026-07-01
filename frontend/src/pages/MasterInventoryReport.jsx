import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
  ArrowUpDown,
} from "lucide-react";
import toast from "react-hot-toast";

import { api } from "../api";
import { useRBAC } from "../contexts/RBACContext";
import Breadcrumbs from "../components/shop/Breadcrumbs";
import ShopAdminControls from "../components/shop/ShopAdminControls";

export default function MasterInventoryReport() {
  const navigate = useNavigate();
  const { hasPermission, isLoading: rbacLoading } = useRBAC();

  const canManageShop = hasPermission("Shop Management", "Manage");

  const [rows, setRows] = useState([]);
  const [balagruhaBreakdown, setBalagruhaBreakdown] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("sku");
  const [sortOrder, setSortOrder] = useState("asc");

  // SECURITY CHECK: Redirect unauthorized users
  useEffect(() => {
    if (rbacLoading) return;

    if (!canManageShop) {
      navigate("/access-denied", { replace: true });
    }
  }, [canManageShop, navigate, rbacLoading]);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(
        "/api/v2/shop/admin/inventory/master-report",
      );
      setRows(response.data.products || []);
      setBalagruhaBreakdown(response.data.balagruhaBreakdown || []);
    } catch (err) {
      console.error("Error fetching master inventory report:", err);
      const message =
        err.response?.data?.message || "Failed to load master inventory report";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (rbacLoading || !canManageShop) return;
    fetchReport();
  }, [canManageShop, fetchReport, rbacLoading]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        row.sku?.toLowerCase().includes(term) ||
        row.name?.toLowerCase().includes(term);

      const matchesCategory =
        categoryFilter === "all" || row.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, rows, searchTerm]);

  const sortedRows = useMemo(() => {
    const compare = (a, b) => {
      const dir = sortOrder === "desc" ? -1 : 1;

      const aVal = a?.[sortBy];
      const bVal = b?.[sortBy];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * dir;
      }

      return (
        String(aVal ?? "").localeCompare(String(bVal ?? ""), undefined, {
          sensitivity: "base",
        }) * dir
      );
    };

    return [...filteredRows].sort(compare);
  }, [filteredRows, sortBy, sortOrder]);

  // Build per-product Balagruha breakdown: productId -> [{ balagruhaName, quantity }]
  const productBalagruhaMap = useMemo(() => {
    const map = new Map();
    for (const bg of balagruhaBreakdown) {
      for (const item of bg.items || []) {
        if (item.deployed > 0) {
          const key = item.shopItemId?.toString() || item.shopItemId;
          if (!map.has(key)) {
            map.set(key, []);
          }
          map.get(key).push({
            balagruhaName: bg.balagruhaName,
            quantity: item.deployed,
          });
        }
      }
    }
    return map;
  }, [balagruhaBreakdown]);

  const toggleExpanded = (rowId) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(key);
    setSortOrder("asc");
  };

  const exportCSV = () => {
    try {
      const headers = [
        "SKU",
        "Name",
        "Category",
        "In Store",
        "Deployed",
        "Balagruha",
        "Balagruha Qty",
      ];
      const csvRows = [];
      for (const row of sortedRows) {
        const bgEntries = productBalagruhaMap.get(row._id) || [];
        // Main product row
        csvRows.push([
          row.sku,
          row.name,
          row.category,
          row.stock ?? 0,
          row.deployed ?? 0,
          "",
          "",
        ]);
        // Sub-rows for each Balagruha with deployed stock
        for (const entry of bgEntries) {
          csvRows.push([
            "",
            "",
            "",
            "",
            "",
            entry.balagruhaName,
            entry.quantity,
          ]);
        }
      }

      const csvContent = [
        headers.join(","),
        ...csvRows.map((r) =>
          r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `master-inventory-report-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Report exported");
    } catch (err) {
      console.error("Error exporting master inventory report:", err);
      toast.error("Failed to export report");
    }
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

  if (!canManageShop) {
    return null;
  }

  return (
    <div className="w-full min-h-screen bg-slate-50">
      <ShopAdminControls />

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="w-full px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/shop/admin/inventory")}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Master Inventory Report
                </h1>
                <p className="text-slate-600 mt-1">
                  In-store stock vs deployed quantities
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
              <button
                onClick={fetchReport}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
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
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by SKU or name"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Categories</option>
                {[
                  ...new Set([
                    "ISF Shop",
                    "Medicines",
                    "Consumables",
                    "Repairs",
                    "Infra",
                    "Others",
                    ...rows.map((r) => r.category).filter(Boolean),
                  ]),
                ]
                  .sort()
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
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
                <p className="text-slate-600">Loading report...</p>
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
                    <th className="px-3 py-3 w-10"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleSort("sku")}
                        className="inline-flex items-center gap-2 hover:text-slate-700"
                      >
                        SKU
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleSort("name")}
                        className="inline-flex items-center gap-2 hover:text-slate-700"
                      >
                        Name
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleSort("category")}
                        className="inline-flex items-center gap-2 hover:text-slate-700"
                      >
                        Category
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleSort("stock")}
                        className="inline-flex items-center gap-2 hover:text-slate-700"
                      >
                        In Store
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleSort("deployed")}
                        className="inline-flex items-center gap-2 hover:text-slate-700"
                      >
                        Deployed
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedRows.map((row) => {
                    const bgEntries = productBalagruhaMap.get(row._id) || [];
                    const hasDeployed =
                      (row.deployed ?? 0) > 0 && bgEntries.length > 0;
                    const isExpanded = expandedRows.has(row._id);

                    return (
                      <React.Fragment key={row._id}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-4 w-10">
                            {hasDeployed ? (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(row._id)}
                                className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-700"
                                aria-label={
                                  isExpanded
                                    ? "Collapse Balagruha breakdown"
                                    : "Expand Balagruha breakdown"
                                }
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            ) : null}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm text-slate-700">
                              {row.sku}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-slate-900">
                              {row.name}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                              {row.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-semibold text-slate-900">
                              {row.stock ?? 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-semibold text-slate-900">
                              {row.deployed ?? 0}
                            </span>
                          </td>
                        </tr>
                        {isExpanded &&
                          bgEntries.map((entry, idx) => (
                            <tr
                              key={`${row._id}-bg-${idx}`}
                              className="bg-purple-50/50"
                            >
                              <td className="px-3 py-2"></td>
                              <td colSpan={3} className="px-6 py-2 pl-12">
                                <span className="text-sm text-purple-700 font-medium">
                                  {entry.balagruhaName}
                                </span>
                              </td>
                              <td className="px-6 py-2 text-right">
                                <span className="text-sm text-slate-400">
                                  &mdash;
                                </span>
                              </td>
                              <td className="px-6 py-2 text-right">
                                <span className="text-sm font-medium text-purple-700">
                                  {entry.quantity}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {sortedRows.length === 0 && (
                <div className="p-10 text-center text-slate-600">
                  No results.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
