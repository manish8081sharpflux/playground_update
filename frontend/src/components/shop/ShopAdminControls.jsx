import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Package,
  Truck,
  BarChart3,
  FileText,
  AlertTriangle,
  X,
  ChevronUp,
  ChevronDown,
  Settings,
} from "lucide-react";
import { api } from "../../api";
import { useRBAC } from "../../contexts/RBACContext";

/**
 * ShopAdminControls Component - Sprint5-Story-15
 * Draggable admin-only floating panel for quick access and alerts
 * Similar to WTF page draggable controls
 *
 * Features:
 * - Draggable floating panel (can be moved anywhere on screen)
 * - Quick navigation to admin pages (Product Management, Inventory, Analytics, Reports)
 * - Live stock alerts (low stock, out of stock counts)
 * - Collapsible panel to save screen space
 * - Position persisted to localStorage
 */
const ShopAdminControls = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, isLoading: rbacLoading, permissions } = useRBAC();

  const permissionsLoaded = Object.keys(permissions || {}).length > 0;
  const canCreate = hasPermission("Shop Management", "Create");
  const canUpdate = hasPermission("Shop Management", "Update");
  const canDelete = hasPermission("Shop Management", "Delete");
  const canManage = hasPermission("Shop Management", "Manage");
  const canManageShop =
    !rbacLoading &&
    permissionsLoaded &&
    (canCreate || canUpdate || canDelete || canManage);
  // Panel state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState(() => {
    // Load saved position from localStorage or use default
    const saved = localStorage.getItem("shopAdminControlsPosition");
    return saved ? JSON.parse(saved) : { x: 20, y: 100 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Stock alerts state
  const [stockAlerts, setStockAlerts] = useState({
    lowStock: 0,
    outOfStock: 0,
    loading: true,
  });

  // Quick stats state
  const [quickStats, setQuickStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    loading: true,
  });

  // Fetch stock alerts
  useEffect(() => {
    if (!canManageShop) return;
    fetchStockAlerts();
    // Refresh every 60 seconds
    const interval = setInterval(fetchStockAlerts, 60000);
    return () => clearInterval(interval);
  }, [canManageShop]);

  // Fetch quick stats
  useEffect(() => {
    if (!canManageShop) return;
    fetchQuickStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchQuickStats, 300000);
    return () => clearInterval(interval);
  }, [canManageShop]);

  const fetchStockAlerts = async () => {
    try {
      const response = await api.get(
        "/api/v2/shop/admin/inventory/stock-alerts",
      );
      setStockAlerts({
        lowStock: response.data.lowStock || 0,
        outOfStock: response.data.outOfStock || 0,
        loading: false,
      });
    } catch (err) {
      console.error("Error fetching stock alerts:", err);
      setStockAlerts((prev) => ({ ...prev, loading: false }));
    }
  };

  const fetchQuickStats = async () => {
    try {
      const response = await api.get(
        "/api/v2/shop/admin/inventory/quick-stats",
      );
      setQuickStats({
        totalProducts: response.data.totalProducts || 0,
        totalOrders: response.data.totalOrders || 0,
        loading: false,
      });
    } catch (err) {
      console.error("Error fetching quick stats:", err);
      setQuickStats((prev) => ({ ...prev, loading: false }));
    }
  };

  // Handle mouse down on panel header (start drag)
  const handleMouseDown = (e) => {
    if (e.target.closest(".admin-control-button")) return; // Don't drag when clicking buttons

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // Handle mouse move (dragging)
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Constrain to viewport
      const maxX = window.innerWidth - 300; // Panel width ~300px
      const maxY = window.innerHeight - 100; // Minimum visible height

      const constrainedPosition = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      };

      setPosition(constrainedPosition);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Save position to localStorage
        localStorage.setItem(
          "shopAdminControlsPosition",
          JSON.stringify(position),
        );
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, position]);

  const isActivePage = (path) => {
    return location.pathname === path;
  };

  const adminLinks = [
    {
      label: "Products",
      icon: Package,
      path: "/shop/admin/products",
      color: "purple",
      show: canCreate || canUpdate || canManage,
    },
    {
      label: "Vendors",
      icon: Truck,
      path: "/shop/admin/vendors",
      color: "purple",
      show: canCreate || canUpdate || canManage,
    },
    {
      label: "Inventory",
      icon: AlertTriangle,
      path: "/shop/admin/inventory",
      color: "orange",
      badge:
        stockAlerts.lowStock + stockAlerts.outOfStock > 0
          ? stockAlerts.lowStock + stockAlerts.outOfStock
          : null,
      show: canUpdate || canManage,
    },
    {
      label: "Master Report",
      icon: FileText,
      path: "/shop/admin/inventory/master-report",
      color: "green",
      show: canManage,
    },
    {
      label: "Analytics",
      icon: BarChart3,
      path: "/shop/admin/analytics",
      color: "blue",
      show: canManage,
    },
    {
      label: "Reports",
      icon: FileText,
      path: "/shop/admin/reports",
      color: "green",
      show: canManage,
    },
  ].filter((link) => link.show);

  if (rbacLoading || !canManageShop) {
    return null;
  }

  return (
    <div
      className={`fixed z-50 bg-white rounded-lg shadow-2xl border-2 border-purple-300 ${
        isDragging ? "cursor-grabbing" : ""
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isCollapsed ? "180px" : "280px",
        transition: isDragging ? "none" : "width 0.2s ease",
      }}
    >
      {/* Header - Draggable */}
      <div
        className={`bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-2 rounded-t-lg flex items-center justify-between ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span className="font-semibold text-sm">Shop Admin</span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="admin-control-button p-1 hover:bg-purple-800 rounded transition-colors"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-3">
          {/* Stock Alerts Section */}
          {(stockAlerts.lowStock > 0 || stockAlerts.outOfStock > 0) && (
            <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-semibold text-orange-900">
                  Stock Alerts
                </span>
              </div>
              <div className="space-y-1 text-xs">
                {stockAlerts.lowStock > 0 && (
                  <div className="flex justify-between text-orange-700">
                    <span>Low Stock:</span>
                    <span className="font-bold">{stockAlerts.lowStock}</span>
                  </div>
                )}
                {stockAlerts.outOfStock > 0 && (
                  <div className="flex justify-between text-red-700">
                    <span>Out of Stock:</span>
                    <span className="font-bold">{stockAlerts.outOfStock}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="mb-3 p-2 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Quick Stats
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-slate-600">Products</div>
                <div className="font-bold text-slate-900">
                  {quickStats.totalProducts}
                </div>
              </div>
              <div>
                <div className="text-slate-600">Orders</div>
                <div className="font-bold text-slate-900">
                  {quickStats.totalOrders}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            {adminLinks.map((link) => {
              const Icon = link.icon;
              const isActive = isActivePage(link.path);

              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`admin-control-button w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-2 border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                      {link.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopAdminControls;
