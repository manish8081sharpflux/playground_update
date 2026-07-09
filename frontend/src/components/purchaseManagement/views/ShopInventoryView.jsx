import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  getMyPurchaseRequests,
  getAllPurchaseRequests,
  cancelPurchaseRequest,
  deletePurchaseRequest, // Sprint5-Story-EditDelete
  updatePurchaseRequest, // Sprint5-Story-EditDelete
  updatePurchaseRequestStatus,
  getUserBalagruhas, // Sprint5-Story-24: Get user's assigned Balagruhas
  getStockLevels, // Story 3.6: Present Stock tab
  getMostConsumed, // Story 3.6: Most Consumed tab
  getVendorsWithProductCount, // Story 3.6: Supplier List tab
  getPurchaseRequestRequesters, // FIX-037: Server-side coach filter
  batchOrderPurchaseRequests, // FIX-038: Batch order endpoint
} from "../../../api";
import showToast from "../../../utils/toast";
import {
  formatDate,
  formatDateOnly,
  formatDateTime,
  getReadableDate,
} from "../../../utils/dateFormatter"; // Sprint5-Story-23: Date formatting utilities
import CreatePurchaseRequestModal from "../modals/CreatePurchaseRequestModal";
import ViewRequestModal from "../modals/ViewRequestModal";
import ApproveRequestModal from "../modals/ApproveRequestModal";
import RejectRequestModal from "../modals/RejectRequestModal";
import UpdateStockModal from "../modals/UpdateStockModal";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../PurchaseManagement.css";
import { UserTypes, normalizeUserRole } from "../../../constants/userTypes";
import { useRBAC } from "../../../contexts/RBACContext";
import {
  PurchaseRequestStatuses,
  PurchaseRequestStatusFilterOptions,
  getPurchaseRequestStatusMeta,
} from "../../../constants/purchaseRequestStatuses";

const CATEGORY_OPTIONS = [
  "ISF Shop",
  "Medicines",
  "Consumables",
  "Repairs",
  "Infra",
  "Others",
];

// Story 3.6: Updated to include 8 tabs as per client feedback
const STATUS_BUCKET_OPTIONS = [
  // Workflow status tabs (existing)
  { label: "All Requests", value: "all", type: "workflow" },
  { label: "Purchase Requests", value: "pending", type: "workflow" },
  { label: "Pending Approval", value: "pending_approval", type: "workflow" },
  { label: "On Going Order", value: "ordered", type: "workflow" },
  { label: "Reached ISF Store", value: "delivered_store", type: "workflow" },
  { label: "Delivered", value: "delivered_balagruha", type: "workflow" },
  // Story 3.6: New inventory insight tabs
  { label: "Present Stock", value: "present_stock", type: "inventory" },
  { label: "Supplier List", value: "supplier_list", type: "inventory" },
  { label: "Most Consumed", value: "most_consumed", type: "analytics" },
];

const PURCHASE_REQUEST_PAGE_SIZE = 100;

const fetchAllPurchaseRequestPages = async (requestFetcher, params) => {
  const allRequests = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await requestFetcher({
      ...params,
      page,
      limit: PURCHASE_REQUEST_PAGE_SIZE,
    });

    if (!response.success) {
      return response;
    }

    allRequests.push(...(response.data?.requests || []));
    totalPages = response.data?.pagination?.pages || 1;
    page += 1;
  } while (page <= totalPages);

  return {
    success: true,
    data: {
      requests: allRequests,
    },
  };
};

dayjs.extend(relativeTime);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// FIX-036: Priority detection uses model's priority field ONLY — no text parsing of description/title
export const getPriority = (request) => {
  const explicit = (request?.priority || "").toString().toLowerCase();
  if (explicit === "high") {
    return "High";
  }
  if (explicit === "low") {
    return "Low";
  }
  // Default to Medium for any unrecognized or missing priority
  return "Medium";
};

// Story 3.1: PM scorecard (client-side MVP)
export const getCompletedTasksCount = (requests, userId) => {
  if (!userId || !Array.isArray(requests)) {
    return 0;
  }

  return requests.reduce((count, request) => {
    const history = request?.statusHistory;
    if (!Array.isArray(history)) {
      return count;
    }

    const completedByUser = history.some((entry) => {
      if (entry?.status !== PurchaseRequestStatuses.DELIVERED_STORE) {
        return false;
      }

      const changedBy = entry?.changedBy;
      const changedById =
        typeof changedBy === "string" || typeof changedBy === "number"
          ? changedBy
          : (changedBy?._id ?? changedBy?.id);

      return changedById != null && String(changedById) === String(userId);
    });

    return completedByUser ? count + 1 : count;
  }, 0);
};

/**
 * Sprint5-Story-22: Calculate date range for filter options
 * @param {string} filterValue - Filter option ('today', 'thisWeek', etc.)
 * @returns {Object} Object with startDate and endDate in YYYY-MM-DD format
 */
const getDateRangeFromFilter = (filterValue) => {
  const now = new Date();
  let startDate, endDate;

  switch (filterValue) {
    case "today":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "thisWeek":
      // Week starts on Monday (ISO standard)
      startDate = new Date(now);
      const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, ...
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday
      startDate.setDate(startDate.getDate() + daysToMonday);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6); // Add 6 days to get Sunday
      endDate.setHours(23, 59, 59, 999);
      break;

    case "thisMonth":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
      endDate.setHours(23, 59, 59, 999);
      break;

    case "thisYear":
      startDate = new Date(now.getFullYear(), 0, 1); // January 1st
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(now.getFullYear(), 11, 31); // December 31st
      endDate.setHours(23, 59, 59, 999);
      break;

    case "all":
    default:
      return { startDate: null, endDate: null };
  }

  // Format as YYYY-MM-DD for backend
  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
};

const ConfirmDialog = ({ message, onYes, onNo }) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    }}
  >
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "32px",
        maxWidth: "400px",
        width: "90%",
        textAlign: "center",
        boxShadow: "0 20px 25px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ fontSize: "40px", marginBottom: "16px" }}>🗑️</div>
      <h3 style={{ margin: "0 0 8px", color: "#1f2937", fontSize: "18px" }}>
        Are you sure?
      </h3>
      <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: "14px" }}>
        {message}
      </p>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        <button
          onClick={onNo}
          style={{
            padding: "10px 24px",
            backgroundColor: "#f3f4f6",
            color: "#374151",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onYes}
          style={{
            padding: "10px 24px",
            backgroundColor: "#e53e3e",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          Yes, Delete
        </button>
      </div>
    </div>
  </div>
);

const OrderAllConfirmDialog = ({ itemName, requestCount, onConfirm, onCancel }) => (
  <div
    className="modal-overlay"
    onClick={onCancel}
    role="presentation"
  >
    <div
      className="modal-container confirmation-modal order-all-confirm-modal"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-all-confirm-title"
    >
      <div className="modal-header">
        <h3 id="order-all-confirm-title">Confirm Order All</h3>
        <button className="modal-close" onClick={onCancel}>
          ×
        </button>
      </div>
      <div className="modal-body">
        <p>
          Mark all {requestCount} request(s) for "{itemName}" as ordered?
        </p>
      </div>
      <div className="modal-footer order-all-confirm-actions">
        <button
          className="btn btn-secondary order-all-cancel-btn"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary order-all-confirm-btn"
          onClick={onConfirm}
        >
          Mark as Ordered
        </button>
      </div>
    </div>
  </div>
);

/**
 * Shop Inventory View - Sprint5-Story-17
 * Displays purchase requests for shop inventory with frontend filtering
 */

export default function ShopInventoryView({
  userRole,
  userId,
  userBalagruhas,
}) {
  const normalizedRole = normalizeUserRole(userRole);
  const { hasPermission } = useRBAC();

  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [balagruhas, setBalagruhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState({});
  const [deleteConfirmRequest, setDeleteConfirmRequest] = useState(null);
  const [orderAllConfirm, setOrderAllConfirm] = useState(null);

  // FIX-037: Server-side requester list for filter dropdown
  const [availableRequesters, setAvailableRequesters] = useState([]);

  // Story 3.6: State for new tab views
  const [stockLevels, setStockLevels] = useState([]);
  const [stockSummary, setStockSummary] = useState({
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  });
  const [vendors, setVendors] = useState([]);
  const [mostConsumed, setMostConsumed] = useState([]);
  const [consumptionPeriod, setConsumptionPeriod] = useState("all");
  const [tabLoading, setTabLoading] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showUpdateStockModal, setShowUpdateStockModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    dateRange: null,
    fromDate: "",
    toDate: "",
    priority: "all",
    balagruha: "all",
    purchaseManager: "all",
    requester: "all", // Story 3.8: Coach/Requester filter for PM
    category: "All Categories", // Sprint5-Story-20
    // Story 3.1: Default to 'all' - will be updated via useEffect when role is determined
    status: "all",
    search: "",
  });

  // Story 3.4: Tab states for PM
  const [activeCategoryTab, setActiveCategoryTab] = useState("All Categories");
  // Default to 'all' - will be updated via useEffect when role is determined
  const [activeStatusTab, setActiveStatusTab] = useState("all");

  // Story 3.5: View mode toggle (list vs bunched) and expanded rows
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'bunched'
  const [expandedBunchedItems, setExpandedBunchedItems] = useState(new Set());

  // Sprint5-Story-23: Sorting state for date column
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc", // Default: most recent first
  });

  const completedTasksCount = useMemo(
    () => getCompletedTasksCount(requests, userId),
    [requests, userId],
  );

  // FIX-037: Fetch requesters from backend
  const fetchRequesters = async (balagruhaId) => {
    try {
      const params = {};
      if (balagruhaId && balagruhaId !== "all") {
        params.balagruhaId = balagruhaId;
      }
      const response = await getPurchaseRequestRequesters(params);
      if (response.success) {
        setAvailableRequesters(response.data || []);
      }
    } catch (error) {
      // Silently fail - filter will just show no options
      setAvailableRequesters([]);
    }
  };

  useEffect(() => {
    fetchBalagruhas();
    fetchPurchaseRequests();
    fetchRequesters(filters.balagruha);
  }, []);

  // Fix: Update status filter when normalizedRole is determined
  // Story 3.4: PM defaults to "Purchase Requests" (pending) tab
  useEffect(() => {
    if (normalizedRole === UserTypes.PURCHASE_MANAGER) {
      setFilters((prev) => ({
        ...prev,
        status: "pending",
      }));
      setActiveStatusTab("pending");
    }
  }, [normalizedRole]);

  // Sprint5-Story-22: Refetch data when date filter changes
  useEffect(() => {
    // Skip if dateRange is null (initial state)
    if (filters.dateRange === null) {
      return;
    }

    // For custom range, only fetch when at least one date is provided
    if (filters.dateRange === "custom") {
      if (!filters.fromDate && !filters.toDate) {
        // User selected "Custom Range" but hasn't entered dates yet - don't fetch
        return;
      }
    }

    // All other cases: fetch with the current filter values
    fetchPurchaseRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateRange, filters.fromDate, filters.toDate]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, filters, sortConfig, normalizedRole, userId, userBalagruhas]);

  const fetchBalagruhas = async () => {
    try {
      // Sprint5-Story-24: Fetch user's assigned Balagruhas (includes STOCK option)
      const response = await getUserBalagruhas();
      if (response.success) {
        setBalagruhas(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching balagruhas:", error);
      showToast("Failed to load Balagruhas", "error");
    }
  };

  const fetchPurchaseRequests = async () => {
    try {
      setLoading(true);

      // Sprint5-Story-22: Calculate date range params based on filter
      const params = {};
      if (filters.dateRange && filters.dateRange !== "all") {
        if (filters.dateRange === "custom") {
          // Custom date range
          if (filters.fromDate) params.startDate = filters.fromDate;
          if (filters.toDate) params.endDate = filters.toDate;
        } else {
          // Preset date range (today, thisWeek, thisMonth, thisYear)
          const { startDate, endDate } = getDateRangeFromFilter(
            filters.dateRange,
          );
          if (startDate) params.startDate = startDate;
          if (endDate) params.endDate = endDate;
        }
      }

      // Admin and Purchase Manager use getAllPurchaseRequests
      // (backend scopes results to the assigned balagruha for PM)
      // Medical In-Charge and other roles (e.g. Coach) use getMyPurchaseRequests
      // — only requests they personally created, not everyone's
      const requestFetcher =
        normalizedRole === UserTypes.ADMIN ||
        normalizedRole === UserTypes.PURCHASE_MANAGER
          ? getAllPurchaseRequests
          : getMyPurchaseRequests;

      const response = await fetchAllPurchaseRequestPages(
        requestFetcher,
        params,
      );

      if (response.success) {
        setRequests(response.data.requests || []);
      } else {
        showToast("Error fetching purchase requests", "error");
      }
    } catch (error) {
      console.error("Error fetching purchase requests:", error);
      showToast("Error fetching purchase requests", "error");
    } finally {
      setLoading(false);
    }
  };

  // Story 3.6: Fetch stock levels for "Present Stock" tab
  const fetchStockLevels = async () => {
    try {
      setTabLoading(true);
      const response = await getStockLevels({
        category:
          filters.category === "All Categories" ? "all" : filters.category,
      });
      if (response.success) {
        setStockLevels(response.data || []);
        setStockSummary(
          response.summary || {
            total: 0,
            inStock: 0,
            lowStock: 0,
            outOfStock: 0,
          },
        );
      }
    } catch (error) {
      console.error("Error fetching stock levels:", error);
      showToast("Failed to load stock levels", "error");
    } finally {
      setTabLoading(false);
    }
  };

  // Story 3.6: Fetch vendors for "Supplier List" tab
  const fetchVendors = async () => {
    try {
      setTabLoading(true);
      const response = await getVendorsWithProductCount({ limit: 100 });
      if (response.success) {
        setVendors(response.vendors || []);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
      showToast("Failed to load supplier list", "error");
    } finally {
      setTabLoading(false);
    }
  };

  // Story 3.6: Fetch most consumed products for "Most Consumed" tab
  const fetchMostConsumed = async (period = "all") => {
    try {
      setTabLoading(true);
      const response = await getMostConsumed({ period, limit: 50 });
      if (response.success) {
        setMostConsumed(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching consumption data:", error);
      showToast("Failed to load consumption data", "error");
    } finally {
      setTabLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...requests];

    // Backend already handles role-based filtering:
    // - Admin sees ALL requests
    // - Purchase Manager sees requests from assigned balagruhas + STOCK
    // - Other roles see ONLY their own requests
    // Frontend only applies UI filter selections below

    // Sprint5-Story-22: Date filtering now handled by backend API
    // Removed client-side date filtering - backend handles date range queries with proper timezone support

    // Balagruha filter
    if (filters.balagruha !== "all") {
      filtered = filtered.filter((request) => {
        const balagruhaId = request.balagruhaId;
        const requestBalagruhaId =
          balagruhaId === "STOCK" ? "STOCK" : (balagruhaId?._id ?? balagruhaId);

        return String(requestBalagruhaId) === String(filters.balagruha);
      });
    }

    // Purchase Manager filter (Admin only)
    if (filters.purchaseManager !== "all") {
      filtered = filtered.filter(
        (request) => request.requestedBy?._id === filters.purchaseManager,
      );
    }

    // Story 3.8: Coach/Requester filter (PM view)
    if (filters.requester !== "all") {
      filtered = filtered.filter(
        (request) =>
          String(request.requestedBy?._id) === String(filters.requester),
      );
    }

    // Category filter (Sprint5-Story-20)
    if (filters.category !== "All Categories") {
      filtered = filtered.filter(
        (request) => request.category === filters.category,
      );
    }

    // Status filter
    if (filters.status === "active") {
      // Active work includes requests still in-progress, including those awaiting approval and coach confirmation.
      filtered = filtered.filter((request) =>
        [
          PurchaseRequestStatuses.PENDING,
          PurchaseRequestStatuses.PENDING_APPROVAL,
          PurchaseRequestStatuses.ORDERED,
          PurchaseRequestStatuses.DELIVERED_STORE,
        ].includes(request.status),
      );
    } else if (filters.status === PurchaseRequestStatuses.COMPLETED) {
      // Delivered to Balagruha is the strict workflow's completed end state.
      filtered = filtered.filter((request) =>
        [
          PurchaseRequestStatuses.COMPLETED,
          PurchaseRequestStatuses.DELIVERED_BALAGRUHA,
        ].includes(request.status),
      );
    } else if (filters.status !== "all") {
      filtered = filtered.filter(
        (request) => request.status === filters.status,
      );
    }

    // Priority filter
    if (filters.priority && filters.priority !== "all") {
      filtered = filtered.filter((request) => {
        const p = (request?.priority || "").toString().toLowerCase();
        return p === filters.priority;
      });
    }

    // Search filter (product name, SKU, reason, requestId)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((request) => {
        // Search in items array for multi-product requests
        const matchesProduct = request.items?.some(
          (item) =>
            item.productName?.toLowerCase().includes(searchLower) ||
            item.productSKU?.toLowerCase().includes(searchLower),
        );
        const matchesReason = request.reason
          ?.toLowerCase()
          .includes(searchLower);
        const matchesRequestId = request.requestId
          ?.toLowerCase()
          .includes(searchLower);
        return matchesProduct || matchesReason || matchesRequestId;
      });
    }

    // Sprint5-Story-23-FIX: When Date/Deadline sorting is active, sort the
    // whole list purely by that field, ignoring priority entirely. Priority
    // grouping (Story 3.1) is only used as a fallback when no explicit
    // sort direction is active.
    filtered.sort((a, b) => {
      if (!sortConfig.direction) {
        const aPriority = getPriority(a);
        const bPriority = getPriority(b);
        const order = { High: 0, Medium: 1, Low: 2 };
        return (order[aPriority] ?? 9) - (order[bPriority] ?? 9);
      }

      const isDateField =
        sortConfig.key === "createdAt" || sortConfig.key === "deadline";

      if (!isDateField) {
        return 0;
      }

      const aRaw = a[sortConfig.key];
      const bRaw = b[sortConfig.key];

      // Rows with no date/deadline always sort to the end, regardless of direction
      if (!aRaw && !bRaw) {
        return 0;
      }
      if (!aRaw) {
        return 1;
      }
      if (!bRaw) {
        return -1;
      }

      const aValue = new Date(aRaw).getTime();
      const bValue = new Date(bRaw).getTime();

      if (aValue === bValue) {
        return 0;
      }

      if (sortConfig.direction === "asc") {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

    setFilteredRequests(filtered);
  };

  const getBalagruhaDisplayName = useCallback((balagruhaValue) => {
    if (!balagruhaValue) {
      return "";
    }

    if (balagruhaValue === "STOCK") {
      return "STOCK";
    }

    if (typeof balagruhaValue === "object") {
      return balagruhaValue.name || balagruhaValue._id || "";
    }

    const matchedBalagruha = balagruhas.find(
      (bg) => String(bg._id) === String(balagruhaValue),
    );

    return matchedBalagruha?.name || String(balagruhaValue);
  }, [balagruhas]);

  // C3 + Story 3.5: PM needs grouping by item, per status bucket with expandable details
  const groupedByStatus = useMemo(() => {
    const buckets = new Map();

    for (const request of filteredRequests) {
      const status = request?.status || "unknown";
      if (!buckets.has(status)) {
        buckets.set(status, new Map());
      }

      const byItem = buckets.get(status);
      const items = Array.isArray(request?.items) ? request.items : [];

      for (const item of items) {
        const key = String(
          item?.productId?._id ??
            item?.productId ??
            item?.productSKU ??
            item?.productName ??
            "unknown",
        );
        const prev = byItem.get(key);
        const requestPriority = getPriority(request);

        // Story 3.5: Track individual requests for expandable view
        const requestDetail = {
          requestId: request._id,
          requestDisplayId: request.requestId,
          requesterName: request.requestedBy?.name || "Unknown",
          balagruhaName:
            request.balagruhaId === "STOCK"
              ? "STOCK"
              : getBalagruhaDisplayName(request.balagruhaId) || "Unknown",
          quantity: Number(item?.requestedQuantity || 0),
          priority: requestPriority,
          deadline: request.deadline,
          createdAt: request.createdAt,
        };

        if (prev) {
          prev.totalRequestedQuantity += Number(item?.requestedQuantity || 0);
          prev.requestCount += 1;
          prev.requests.push(requestDetail);
          // Story 3.5: Priority aggregation - keep highest
          const priorityOrder = { High: 0, Medium: 1, Low: 2 };
          if (
            (priorityOrder[requestPriority] ?? 9) <
            (priorityOrder[prev.highestPriority] ?? 9)
          ) {
            prev.highestPriority = requestPriority;
          }
        } else {
          byItem.set(key, {
            key,
            productId: item?.productId?._id ?? item?.productId,
            productName:
              item?.productName || item?.productId?.name || "Unknown item",
            productSKU: item?.productSKU || item?.productId?.sku || "",
            totalRequestedQuantity: Number(item?.requestedQuantity || 0),
            requestCount: 1,
            highestPriority: requestPriority,
            requests: [requestDetail],
          });
        }
      }
    }

    const result = [];
    for (const [status, byItem] of buckets.entries()) {
      const rows = Array.from(byItem.values()).sort(
        (a, b) => b.totalRequestedQuantity - a.totalRequestedQuantity,
      );
      result.push({ status, rows });
    }

    // Put active statuses first
    const statusOrder = [
      PurchaseRequestStatuses.PENDING,
      PurchaseRequestStatuses.ORDERED,
      PurchaseRequestStatuses.DELIVERED_STORE,
      PurchaseRequestStatuses.DELIVERED_BALAGRUHA,
      PurchaseRequestStatuses.PENDING_APPROVAL,
      PurchaseRequestStatuses.APPROVED,
      PurchaseRequestStatuses.COMPLETED,
      PurchaseRequestStatuses.CANCELLED,
      PurchaseRequestStatuses.REJECTED,
      PurchaseRequestStatuses.ON_HOLD,
    ];
    result.sort(
      (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
    );
    return result;
  }, [filteredRequests, getBalagruhaDisplayName]);

  // Sprint5-Story-23: Handle sorting for date column
  const handleSort = (key) => {
    let direction = "asc";

    if (sortConfig.key === key) {
      // Cycle through: desc → asc → null (remove sort)
      if (sortConfig.direction === "desc") {
        direction = "asc";
      } else if (sortConfig.direction === "asc") {
        direction = null; // Remove sort
      } else {
        direction = "desc";
      }
    } else {
      direction = "desc"; // Default for new column
    }

    setSortConfig({ key, direction });
  };

  const getSortLabel = (key) => {
    if (sortConfig.key !== key || !sortConfig.direction) {
      return "Sort";
    }

    if (key === "deadline") {
      return sortConfig.direction === "desc"
        ? "Latest first"
        : "Earliest first";
    }

    return sortConfig.direction === "desc" ? "Newest first" : "Oldest first";
  };

  const getStatusBadge = (status) => {
    const badge = getPurchaseRequestStatusMeta(status);
    return (
      <span className={`status-badge ${badge.className}`} title={badge.tooltip}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  const handleUpdateStatus = async (
    requestId,
    nextStatus,
    notes,
    successMessage,
    additionalData = {},
  ) => {
    setStatusUpdating((prev) => ({ ...prev, [requestId]: true }));

    try {
      const response = await updatePurchaseRequestStatus(requestId, {
        status: nextStatus,
        notes,
        ...additionalData, // Story 2.6: Support additional data like repairTechnicianName
      });

      if (response.success) {
        showToast(successMessage, "success");
        fetchPurchaseRequests();
      } else {
        showToast(response.message || "Error updating request status", "error");
      }
    } catch (error) {
      console.error("Error updating purchase request status:", error);
      showToast(
        error.response?.data?.message || "Error updating request status",
        "error",
      );
    } finally {
      setStatusUpdating((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  // Story 2.6: Handle marking as delivered to store with technician name prompt for Repairs
  const handleMarkDeliveredStore = (request) => {
    if (request.category === "Repairs") {
      const technicianName = window.prompt(
        "Enter Repair Technician Name (required):",
      );
      if (!technicianName || !technicianName.trim()) {
        showToast("Technician name is required for repair items", "error");
        return;
      }
      handleUpdateStatus(
        request._id,
        PurchaseRequestStatuses.DELIVERED_STORE,
        "Marked Received at Store via Purchase Management",
        "Request marked as received at store",
        { repairTechnicianName: technicianName.trim() },
      );
    } else {
      handleUpdateStatus(
        request._id,
        PurchaseRequestStatuses.DELIVERED_STORE,
        "Marked Received at Store via Purchase Management",
        "Request marked as received at store",
      );
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm("Are you sure you want to cancel this request?")) {
      return;
    }

    try {
      const response = await cancelPurchaseRequest(requestId);
      if (response.success) {
        showToast("Request cancelled successfully", "success");
        fetchPurchaseRequests();
      } else {
        showToast(response.message || "Error cancelling request", "error");
      }
    } catch (error) {
      console.error("Error cancelling request:", error);
      showToast(
        error.response?.data?.message || "Error cancelling request",
        "error",
      );
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowViewModal(true);
  };

  // Sprint5-Story-EditDelete: Handle editing a pending request
  const handleEditRequest = (request) => {
    setSelectedRequest(request);
    setShowCreateModal(true);
  };

  // Sprint5-Story-EditDelete: Handle hard deleting a request
  const handleDeleteRequest = async (request) => {
    try {
      const response = await deletePurchaseRequest(request._id);
      if (response.success) {
        showToast("Purchase request deleted successfully", "success");
        fetchPurchaseRequests();
      } else {
        showToast(response.message || "Error deleting request", "error");
      }
    } catch (error) {
      console.error("Error deleting request:", error);
      showToast(
        error.response?.data?.message || "Error deleting request",
        "error",
      );
    }
  };

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const handleUpdateStock = (request) => {
    setSelectedRequest(request);
    setShowUpdateStockModal(true);
  };

  // Story 3.5: Toggle expanded state for bunched item
  const toggleBunchedItemExpand = (key) => {
    setExpandedBunchedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // FIX-038: Order All - Uses batch API endpoint instead of sequential calls
  const handleOrderAll = (bunchedItem, status) => {
    // Only allow "Order All" for pending items
    if (status !== PurchaseRequestStatuses.PENDING) {
      showToast("Order All is only available for pending requests", "warning");
      return;
    }

    setOrderAllConfirm(bunchedItem);
  };

  const confirmOrderAll = async () => {
    if (!orderAllConfirm) {
      return;
    }

    const bunchedItem = orderAllConfirm;
    const requestIds = bunchedItem.requests.map((r) => r.requestId);
    setOrderAllConfirm(null);

    try {
      const response = await batchOrderPurchaseRequests(
        requestIds,
        `Bulk ordered via "Order All" for ${bunchedItem.productName}`,
      );

      if (response.success) {
        const { totalUpdated, skipped } = response.data;
        if (skipped > 0) {
          showToast(
            `${totalUpdated} request(s) marked as ordered (${skipped} skipped - not pending)`,
            "warning",
          );
        } else {
          showToast(
            `All ${totalUpdated} requests marked as ordered`,
            "success",
          );
        }
      } else {
        showToast(response.message || "Error processing batch order", "error");
      }
      fetchPurchaseRequests();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error updating requests",
        "error",
      );
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("Shop Purchase Requests", 14, 15);

    // Metadata
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Generated: ${dayjs().format("DD-MM-YYYY HH:mm")}`, 14, 22);
    doc.text(`Total Requests: ${filteredRequests.length}`, 14, 28);
    doc.text(
      `Pending: ${filteredRequests.filter((r) => r.status === PurchaseRequestStatuses.PENDING_APPROVAL).length}`,
      14,
      34,
    );

    // Table
    const tableColumn = [
      "Request ID",
      "Product",
      "Qty",
      "Reason",
      "Status",
      "Date",
    ];

    const tableRows = filteredRequests.map((req) => {
      // Build a product summary from the items array (multi-product requests)
      const items = Array.isArray(req.items) ? req.items : [];
      const productSummary =
        items.length === 0
          ? "No items"
          : items.length === 1
            ? items[0]?.productName || "Unknown"
            : `${items[0]?.productName || "Unknown"} +${items.length - 1} more`;

      const totalQty = items.reduce(
        (sum, item) => sum + Number(item?.requestedQuantity || 0),
        0,
      );

      // Reason may be undefined/null on some requests — guard before substring
      const reasonText = req.reason ? String(req.reason) : "-";
      const truncatedReason =
        reasonText.length > 30
          ? `${reasonText.substring(0, 30)}...`
          : reasonText;

      const statusText = (req.status || "unknown")
        .replace(/_/g, " ")
        .toUpperCase();

      return [
        req.requestId || "-",
        productSummary,
        totalQty,
        truncatedReason,
        statusText,
        req.createdAt ? dayjs(req.createdAt).format("DD-MM-YYYY") : "-",
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Purchase_Requests_${dayjs().format("YYYY-MM-DD")}.pdf`);
    showToast("PDF exported successfully", "success");
  };

  // Get balagruha options based on role
  // FIX: getUserBalagruhas() (called in fetchBalagruhas) is already scoped
  // server-side to this user's currently-assigned Balagruhas + STOCK, so
  // `balagruhas` is already correct. Re-filtering it against the separate
  // `userBalagruhas` prop was dropping newly-assigned Balagruhas whenever
  // that prop was stale (e.g. not refreshed after an admin added a second
  // Balagruha assignment).
  const getFilteredBalagruhas = () => {
    return balagruhas;
  };

  // Get unique purchase managers from requests, optionally filtered by balagruha
  const getAvailablePurchaseManagers = () => {
    let relevantRequests = requests;

    // If a balagruha is selected, only show purchase managers who have requests for that balagruha
    if (filters.balagruha !== "all") {
      relevantRequests = requests.filter(
        (req) => req.balagruhaId?._id === filters.balagruha,
      );
    }

    // Extract unique purchase managers
    const uniqueManagers = new Map();
    relevantRequests.forEach((req) => {
      if (req.requestedBy) {
        uniqueManagers.set(req.requestedBy._id, {
          _id: req.requestedBy._id,
          name: req.requestedBy.name,
          email: req.requestedBy.email,
        });
      }
    });

    return Array.from(uniqueManagers.values());
  };

  // FIX-037: getAvailableRequesters now returns server-side data
  const getAvailableRequesters = () => availableRequesters;

  // Reset filters when balagruha changes
  const handleBalagruhaChange = (balagruhaId) => {
    setFilters({
      ...filters,
      balagruha: balagruhaId,
      purchaseManager: "all", // Reset purchase manager when balagruha changes
      requester: "all", // Story 3.8: Reset requester when balagruha changes
    });
    // FIX-037: Refetch requesters from backend when balagruha changes
    fetchRequesters(balagruhaId);
  };

  // Story 3.4: Handle category tab click
  const handleCategoryTabClick = (category) => {
    setActiveCategoryTab(category);
    setFilters({ ...filters, category });
  };

  // Story 3.4 + 3.6: Handle status bucket tab click (including new inventory/analytics tabs)
  const handleStatusTabClick = (status) => {
    setActiveStatusTab(status);

    // Story 3.6: Fetch data for inventory/analytics tabs
    const tabConfig = STATUS_BUCKET_OPTIONS.find((t) => t.value === status);
    if (tabConfig?.type === "inventory" || tabConfig?.type === "analytics") {
      // Don't update status filter for non-workflow tabs
      if (status === "present_stock") {
        fetchStockLevels();
      } else if (status === "supplier_list") {
        fetchVendors();
      } else if (status === "most_consumed") {
        fetchMostConsumed(consumptionPeriod);
      }
    } else {
      // Workflow tabs - update status filter
      setFilters({ ...filters, status });
    }
  };

  // Story 3.6: Handle consumption period change for Most Consumed tab
  const handleConsumptionPeriodChange = (period) => {
    setConsumptionPeriod(period);
    fetchMostConsumed(period);
  };

  // Story 3.6: Helper to check if current tab is a workflow tab
  const isWorkflowTab = () => {
    const tabConfig = STATUS_BUCKET_OPTIONS.find(
      (t) => t.value === activeStatusTab,
    );
    return tabConfig?.type === "workflow";
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading purchase requests...</p>
      </div>
    );
  }

  return (
    <div className="shop-inventory-view">
      {/* Header with Action Buttons */}
      <div className="view-header">
        <h2 className="view-title">📋 Purchase Requests</h2>
        <div className="header-actions">
          {/* Sprint5-Story-24: Multi-role access to purchase request creation */}
          {[
            UserTypes.PURCHASE_MANAGER,
            UserTypes.COACH,
            UserTypes.MEDICAL_IN_CHARGE,
            UserTypes.ADMIN,
          ].includes(normalizedRole) &&
            hasPermission("Purchase Management", "Create") && (
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                + New Purchase Request
              </button>
            )}
          {hasPermission("Purchase Management", "Read") && (
            <button
              className="btn btn-secondary"
              onClick={exportToPDF}
              disabled={filteredRequests.length === 0}
            >
              📄 Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Story 3.1: PM Scorecard (Story 3.10: Renamed from "Completed Tasks") */}
      {normalizedRole === UserTypes.PURCHASE_MANAGER && (
        <div className="pm-scorecard-row" aria-label="PM Scorecard">
          <div className="pm-scorecard-card">
            <div className="pm-scorecard-label">Delivered to Store</div>
            <div
              className="pm-scorecard-value"
              data-testid="pm-completed-tasks-count"
            >
              {completedTasksCount}
            </div>
          </div>
        </div>
      )}

      {/* Story 3.4: Category Tabs (PM only) */}
      {normalizedRole === UserTypes.PURCHASE_MANAGER && (
        <div className="filter-group" style={{ marginBottom: "12px" }}>
          <label>Category:</label>
          <select
            value={activeCategoryTab}
            onChange={(e) => handleCategoryTabClick(e.target.value)}
            className="filter-select"
          >
            <option value="All Categories">All Categories</option>
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Story 3.4: Status Bucket Tabs (PM only) */}
      {normalizedRole === UserTypes.PURCHASE_MANAGER && (
        <div className="filter-group" style={{ marginBottom: "12px" }}>
          <label>View:</label>
          <select
            value={activeStatusTab}
            onChange={(e) => handleStatusTabClick(e.target.value)}
            className="filter-select"
          >
            {STATUS_BUCKET_OPTIONS.map((bucket) => (
              <option key={bucket.value} value={bucket.value}>
                {bucket.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* Filters */}
      <div className="filters-container">
        <div className="filter-row">
          {/* Date Range Filter */}
          <div className="filter-group">
            <label>Date Range:</label>
            <select
              value={filters.dateRange || "all"}
              onChange={(e) =>
                setFilters({ ...filters, dateRange: e.target.value })
              }
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="filter-group">
            <label>Priority:</label>
            <select
              value={filters.priority || "all"}
              onChange={(e) =>
                setFilters({ ...filters, priority: e.target.value })
              }
              className="filter-select"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === "custom" && (
            <>
              <div className="filter-group">
                <label>From:</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) =>
                    setFilters({ ...filters, fromDate: e.target.value })
                  }
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label>To:</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) =>
                    setFilters({ ...filters, toDate: e.target.value })
                  }
                  className="filter-input"
                />
              </div>
            </>
          )}

          {/* Balagruha Filter */}
          <div className="filter-group">
            <label>Balagruha:</label>
            <select
              value={filters.balagruha}
              onChange={(e) => handleBalagruhaChange(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Balagruhas</option>

              {/* Sprint5-Story-21: STOCK filter option */}
              <option value="STOCK" style={{ fontWeight: "bold" }}>
                📦 STOCK (General Inventory)
              </option>

              {getFilteredBalagruhas()
                .filter((bg) => bg._id !== "STOCK")
                .map((bg) => (
                  <option key={bg._id} value={bg._id}>
                    {bg.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Story 3.8: Coach/Requester Filter (PM view) */}
          {normalizedRole === UserTypes.PURCHASE_MANAGER && (
            <div className="filter-group">
              <label>Requested By:</label>
              <select
                value={filters.requester}
                onChange={(e) =>
                  setFilters({ ...filters, requester: e.target.value })
                }
                className="filter-select"
              >
                <option value="all">All Requesters</option>
                {getAvailableRequesters().map((requester) => (
                  <option key={requester._id} value={requester._id}>
                    {requester.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Purchase Manager Filter (Admin only) */}
          {normalizedRole === UserTypes.ADMIN && (
            <div className="filter-group" style={{ minWidth: "300px" }}>
              <label>Purchase Manager:</label>
              <select
                value={filters.purchaseManager}
                onChange={(e) =>
                  setFilters({ ...filters, purchaseManager: e.target.value })
                }
                className="filter-select"
                style={{ width: "100%", minWidth: "240px" }}
              >
                <option value="all">All Purchase Managers</option>
                {getAvailablePurchaseManagers().map((pm) => (
                  <option key={pm._id} value={pm._id}>
                    {pm.name} ({pm.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Filter - Sprint5-Story-20 - Hidden for PM (uses tabs) */}
          {normalizedRole !== UserTypes.PURCHASE_MANAGER && (
            <div className="filter-group">
              <label>Category:</label>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters({ ...filters, category: e.target.value })
                }
                className="filter-select"
              >
                <option value="All Categories">All Categories</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter - Hidden for PM (uses tabs) */}
          {normalizedRole !== UserTypes.PURCHASE_MANAGER && (
            <div className="filter-group">
              <label>Status:</label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="filter-select"
              >
                <option value="all">All Status</option>
                {PurchaseRequestStatusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Filter */}
          <div
            className="filter-group search-group"
            style={{ flexShrink: 0, minWidth: "220px" }}
          >
            <label>Search:</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              placeholder="Product, SKU, Reason..."
              className="filter-input search-input"
              style={{
                width: "100%",
                minWidth: "220px",
                boxSizing: "border-box",
                flexShrink: 0,
              }}
            />
          </div>
        </div>
      </div>

      {/* Story 3.5: View Mode Toggle + Enhanced Bunched View - Only show for PM workflow tabs */}
      {normalizedRole === UserTypes.PURCHASE_MANAGER && isWorkflowTab() && (
        <div className="requests-table-container" style={{ marginTop: "16px" }}>
          {/* Story 3.5: View Toggle Button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h3 style={{ margin: 0 }}>
              {viewMode === "bunched"
                ? "📦 Bunched View (by Item)"
                : "📋 List View"}
            </h3>
            <div
              style={{
                display: "flex",
                gap: "4px",
                backgroundColor: "#f3f4f6",
                borderRadius: "8px",
                padding: "4px",
              }}
            >
              <button
                onClick={() => setViewMode("list")}
                style={{
                  padding: "6px 16px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "13px",
                  backgroundColor:
                    viewMode === "list" ? "#4f46e5" : "transparent",
                  color: viewMode === "list" ? "#fff" : "#374151",
                  transition: "all 0.2s",
                }}
              >
                📋 List
              </button>
              <button
                onClick={() => setViewMode("bunched")}
                style={{
                  padding: "6px 16px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "13px",
                  backgroundColor:
                    viewMode === "bunched" ? "#4f46e5" : "transparent",
                  color: viewMode === "bunched" ? "#fff" : "#374151",
                  transition: "all 0.2s",
                }}
              >
                📦 Bunched
              </button>
            </div>
          </div>

          {/* Story 3.5: Bunched View Content */}
          {viewMode === "bunched" &&
            groupedByStatus.map((bucket) => (
              <div key={bucket.status} style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "8px",
                  }}
                >
                  <div>{getStatusBadge(bucket.status)}</div>
                  <div style={{ color: "#555", fontSize: "14px" }}>
                    {bucket.rows.length} unique item(s)
                  </div>
                </div>

                {/* Bunched Items Cards */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {bucket.rows.slice(0, 25).map((row) => {
                    const isExpanded = expandedBunchedItems.has(
                      `${bucket.status}-${row.key}`,
                    );
                    const itemKey = `${bucket.status}-${row.key}`;

                    return (
                      <div
                        key={row.key}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          backgroundColor:
                            row.highestPriority === "High" ? "#fef2f2" : "#fff",
                          overflow: "hidden",
                        }}
                      >
                        {/* Bunched Item Header */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 16px",
                            cursor: "pointer",
                            backgroundColor: isExpanded
                              ? "#f9fafb"
                              : "transparent",
                          }}
                          onClick={() => toggleBunchedItemExpand(itemKey)}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: "15px",
                                marginBottom: "4px",
                              }}
                            >
                              {row.productName}
                              {row.highestPriority === "High" && (
                                <span
                                  style={{
                                    marginLeft: "8px",
                                    backgroundColor: "#dc2626",
                                    color: "#fff",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                  }}
                                >
                                  HIGH PRIORITY
                                </span>
                              )}
                            </div>
                            {row.productSKU && (
                              <div style={{ fontSize: "12px", color: "#666" }}>
                                {row.productSKU}
                              </div>
                            )}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "20px",
                            }}
                          >
                            <div style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  fontSize: "20px",
                                  fontWeight: 700,
                                  color: "#4f46e5",
                                }}
                              >
                                {row.totalRequestedQuantity}
                              </div>
                              <div style={{ fontSize: "11px", color: "#666" }}>
                                Total Qty
                              </div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  fontSize: "16px",
                                  fontWeight: 600,
                                  color: "#374151",
                                }}
                              >
                                {row.requestCount}
                              </div>
                              <div style={{ fontSize: "11px", color: "#666" }}>
                                Requests
                              </div>
                            </div>

                            {/* Story 3.5: Order All Button - Only for pending status */}
                            {bucket.status ===
                              PurchaseRequestStatuses.PENDING && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOrderAll(row, bucket.status);
                                }}
                                style={{
                                  padding: "8px 16px",
                                  backgroundColor: "#16a34a",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  fontSize: "13px",
                                  whiteSpace: "nowrap",
                                }}
                                title={`Mark all ${row.requestCount} requests as Ordered`}
                              >
                                🛒 Order All
                              </button>
                            )}

                            <div
                              style={{
                                transform: isExpanded
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                                transition: "transform 0.2s",
                                color: "#6b7280",
                              }}
                            >
                              ▼
                            </div>
                          </div>
                        </div>

                        {/* Story 3.5: Expanded Details - Individual Requests */}
                        {isExpanded && (
                          <div
                            style={{
                              borderTop: "1px solid #e5e7eb",
                              backgroundColor: "#f9fafb",
                              padding: "12px 16px",
                            }}
                          >
                            <table
                              style={{
                                width: "100%",
                                fontSize: "13px",
                                borderCollapse: "collapse",
                              }}
                            >
                              <thead>
                                <tr
                                  style={{
                                    color: "#6b7280",
                                    textAlign: "left",
                                  }}
                                >
                                  <th
                                    style={{
                                      padding: "6px 8px",
                                      fontWeight: 500,
                                    }}
                                  >
                                    Request ID
                                  </th>
                                  <th
                                    style={{
                                      padding: "6px 8px",
                                      fontWeight: 500,
                                    }}
                                  >
                                    Requester
                                  </th>
                                  <th
                                    style={{
                                      padding: "6px 8px",
                                      fontWeight: 500,
                                    }}
                                  >
                                    Balagruha
                                  </th>
                                  <th
                                    style={{
                                      padding: "6px 8px",
                                      fontWeight: 500,
                                    }}
                                  >
                                    Qty
                                  </th>
                                  <th
                                    style={{
                                      padding: "6px 8px",
                                      fontWeight: 500,
                                    }}
                                  >
                                    Priority
                                  </th>
                                  <th
                                    style={{
                                      padding: "6px 8px",
                                      fontWeight: 500,
                                    }}
                                  >
                                    Date
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.requests.map((req, idx) => (
                                  <tr
                                    key={req.requestId || idx}
                                    style={{
                                      backgroundColor:
                                        idx % 2 === 0 ? "#fff" : "#f3f4f6",
                                      borderBottom: "1px solid #e5e7eb",
                                    }}
                                  >
                                    <td
                                      style={{
                                        padding: "8px",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {req.requestDisplayId}
                                    </td>
                                    <td style={{ padding: "8px" }}>
                                      {req.requesterName}
                                    </td>
                                    <td style={{ padding: "8px" }}>
                                      {req.balagruhaName === "STOCK" ? (
                                        <span
                                          style={{
                                            color: "#1976d2",
                                            fontWeight: 600,
                                          }}
                                        >
                                          📦 STOCK
                                        </span>
                                      ) : (
                                        <span>📍 {req.balagruhaName}</span>
                                      )}
                                    </td>
                                    <td
                                      style={{
                                        padding: "8px",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {req.quantity}
                                    </td>
                                    <td style={{ padding: "8px" }}>
                                      <span
                                        style={{
                                          padding: "2px 8px",
                                          borderRadius: "4px",
                                          fontSize: "11px",
                                          fontWeight: 600,
                                          backgroundColor:
                                            req.priority === "High"
                                              ? "#fee2e2"
                                              : req.priority === "Low"
                                                ? "#f3f4f6"
                                                : "#fef3c7",
                                          color:
                                            req.priority === "High"
                                              ? "#dc2626"
                                              : req.priority === "Low"
                                                ? "#6b7280"
                                                : "#d97706",
                                        }}
                                      >
                                        {req.priority}
                                      </span>
                                    </td>
                                    <td
                                      style={{ padding: "8px", color: "#666" }}
                                    >
                                      {formatDate(req.createdAt, "dd/mm/yy")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {bucket.rows.length === 0 && (
                    <div
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "#6b7280",
                        backgroundColor: "#f9fafb",
                        borderRadius: "8px",
                      }}
                    >
                      No items in this status
                    </div>
                  )}

                  {bucket.rows.length > 25 && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginTop: "6px",
                        fontStyle: "italic",
                      }}
                    >
                      Showing top 25 items by quantity.
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Story 3.6: Present Stock View */}
      {normalizedRole === UserTypes.PURCHASE_MANAGER &&
        activeStatusTab === "present_stock" && (
          <div
            className="requests-table-container"
            style={{ marginTop: "16px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: 0 }}>📦 Present Stock</h3>
              <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
                <span style={{ color: "#16a34a" }}>
                  ✓ In Stock: {stockSummary.inStock}
                </span>
                <span style={{ color: "#f59e0b" }}>
                  ⚠ Low Stock: {stockSummary.lowStock}
                </span>
                <span style={{ color: "#dc2626" }}>
                  ✗ Out of Stock: {stockSummary.outOfStock}
                </span>
              </div>
            </div>

            {tabLoading ? (
              <div
                style={{ textAlign: "center", padding: "40px", color: "#666" }}
              >
                <div
                  className="loading-spinner"
                  style={{ margin: "0 auto 10px" }}
                ></div>
                Loading stock levels...
              </div>
            ) : (
              <table
                className="requests-table"
                aria-label="Present Stock Table"
              >
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Min Stock Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stockLevels.map((item) => (
                    <tr key={item._id}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td style={{ color: "#666", fontSize: "13px" }}>
                        {item.sku || "-"}
                      </td>
                      <td>{item.category || "-"}</td>
                      <td style={{ fontWeight: 600 }}>{item.stockQuantity}</td>
                      <td>{item.minStockLevel || 5}</td>
                      <td>
                        {item.stockStatus === "out_of_stock" && (
                          <span
                            className="status-badge status-cancelled"
                            style={{
                              backgroundColor: "#fee2e2",
                              color: "#dc2626",
                            }}
                          >
                            Out of Stock
                          </span>
                        )}
                        {item.stockStatus === "low_stock" && (
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: "#fef3c7",
                              color: "#d97706",
                            }}
                          >
                            Low Stock
                          </span>
                        )}
                        {item.stockStatus === "in_stock" && (
                          <span
                            className="status-badge status-approved"
                            style={{
                              backgroundColor: "#dcfce7",
                              color: "#16a34a",
                            }}
                          >
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {stockLevels.length === 0 && (
                    <tr>
                      <td colSpan={6} className="no-data">
                        No products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

      {/* Story 3.6: Supplier List View */}
      {normalizedRole === UserTypes.PURCHASE_MANAGER &&
        activeStatusTab === "supplier_list" && (
          <div
            className="requests-table-container"
            style={{ marginTop: "16px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: 0 }}>🏪 Supplier List</h3>
              <span style={{ color: "#666" }}>
                Total Vendors: {vendors.length}
              </span>
            </div>

            {tabLoading ? (
              <div
                style={{ textAlign: "center", padding: "40px", color: "#666" }}
              >
                <div
                  className="loading-spinner"
                  style={{ margin: "0 auto 10px" }}
                ></div>
                Loading suppliers...
              </div>
            ) : (
              <table
                className="requests-table"
                aria-label="Supplier List Table"
              >
                <thead>
                  <tr>
                    <th>Vendor Name</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Products Supplied</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor._id}>
                      <td style={{ fontWeight: 600 }}>{vendor.name}</td>
                      <td>{vendor.contactPerson || "-"}</td>
                      <td>{vendor.phone || "-"}</td>
                      <td style={{ fontSize: "13px", color: "#666" }}>
                        {vendor.email || "-"}
                      </td>
                      <td>
                        <span
                          style={{
                            backgroundColor: "#e0e7ff",
                            color: "#4338ca",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontWeight: 600,
                            fontSize: "13px",
                          }}
                        >
                          {vendor.productCount || 0} products
                        </span>
                      </td>
                      <td>
                        {vendor.isActive !== false ? (
                          <span
                            className="status-badge status-approved"
                            style={{
                              backgroundColor: "#dcfce7",
                              color: "#16a34a",
                            }}
                          >
                            Active
                          </span>
                        ) : (
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: "#f3f4f6",
                              color: "#6b7280",
                            }}
                          >
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {vendors.length === 0 && (
                    <tr>
                      <td colSpan={6} className="no-data">
                        No vendors found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

      {/* Story 3.6: Most Consumed View */}
      {normalizedRole === UserTypes.PURCHASE_MANAGER &&
        activeStatusTab === "most_consumed" && (
          <div
            className="requests-table-container"
            style={{ marginTop: "16px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: 0 }}>📊 Most Consumed Products</h3>
              <div className="filter-group" style={{ marginBottom: 0 }}>
                <label style={{ marginRight: "8px" }}>Period:</label>
                <select
                  value={consumptionPeriod}
                  onChange={(e) =>
                    handleConsumptionPeriodChange(e.target.value)
                  }
                  className="filter-select"
                  style={{ minWidth: "150px" }}
                >
                  <option value="all">All Time</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                </select>
              </div>
            </div>

            {tabLoading ? (
              <div
                style={{ textAlign: "center", padding: "40px", color: "#666" }}
              >
                <div
                  className="loading-spinner"
                  style={{ margin: "0 auto 10px" }}
                ></div>
                Loading consumption data...
              </div>
            ) : (
              <table
                className="requests-table"
                aria-label="Most Consumed Products Table"
              >
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>Rank</th>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Total Quantity Requested</th>
                    <th>Number of Requests</th>
                    <th>Avg Qty per Request</th>
                  </tr>
                </thead>
                <tbody>
                  {mostConsumed.map((item, index) => (
                    <tr key={item.productId || index}>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            backgroundColor:
                              index < 3
                                ? index === 0
                                  ? "#fbbf24"
                                  : index === 1
                                    ? "#9ca3af"
                                    : "#cd7f32"
                                : "#e5e7eb",
                            color: index < 3 ? "#fff" : "#374151",
                            fontWeight: 600,
                            fontSize: "13px",
                          }}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.productName}</td>
                      <td style={{ color: "#666", fontSize: "13px" }}>
                        {item.productSKU || "-"}
                      </td>
                      <td style={{ fontWeight: 600, color: "#4f46e5" }}>
                        {item.totalQuantity}
                      </td>
                      <td>{item.requestCount}</td>
                      <td>
                        {(item.totalQuantity / item.requestCount).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                  {mostConsumed.length === 0 && (
                    <tr>
                      <td colSpan={6} className="no-data">
                        No consumption data found for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

      {/* Requests Table - Only show for workflow tabs (list view) or non-PM users */}
      {(normalizedRole !== UserTypes.PURCHASE_MANAGER ||
        (isWorkflowTab() && viewMode === "list")) && (
        <div className="requests-table-container purchase-requests-list-container">
          <table
            className="requests-table purchase-requests-list-table"
            aria-label="Shop Inventory Purchase Requests Table"
          >
            <colgroup>
              <col style={{ width: "8%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              {normalizedRole === UserTypes.ADMIN && (
                <col style={{ width: "13%" }} />
              )}
              <col
                style={{
                  width: normalizedRole === UserTypes.ADMIN ? "13%" : "20%",
                }}
              />
              <col
                style={{
                  width: normalizedRole === UserTypes.ADMIN ? "11%" : "17%",
                }}
              />
            </colgroup>
            <thead>
              <tr>
                <th>Request ID</th>
                {/* Story 3.10: Date moved to position 2 (after ID) per client feedback */}
                <th
                  className={`sortable-header sort-created ${sortConfig.key === "createdAt" && sortConfig.direction ? `active ${sortConfig.direction}` : ""}`}
                  onClick={() => handleSort("createdAt")}
                  title={`Click to sort by date (${getSortLabel("createdAt")})`}
                >
                  Date
                </th>
                <th>Products</th>
                <th>Qty</th>
                <th>Priority</th>
                <th
                  className={`sortable-header sort-deadline ${sortConfig.key === "deadline" && sortConfig.direction ? `active ${sortConfig.direction}` : ""}`}
                  onClick={() => handleSort("deadline")}
                  title={`Click to sort by deadline (${getSortLabel("deadline")})`}
                >
                  Deadline
                </th>
                <th>Balagruha</th>
                {normalizedRole === UserTypes.ADMIN && <th>Requester</th>}
                <th>Status</th>
                <th className="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr
                  key={request._id}
                  className={`request-row status-${request.status} ${getPriority(request) === "High" ? "priority-high" : ""}`}
                >
                  {/* Column 1: Request ID */}
                  <td className="request-id-cell">
                    <strong>{request.requestId}</strong>
                    {getPriority(request) === "High" && (
                      <span
                        className="priority-badge"
                        aria-label="High Priority"
                        title="High Priority"
                      >
                        HIGH
                      </span>
                    )}
                  </td>
                  {/* Column 2: Date (Story 3.10 - moved to position 2) */}
                  <td
                    className="date-cell"
                    title={`Created on: ${formatDateTime(request.createdAt)}`}
                    aria-label={`Created on ${getReadableDate(request.createdAt)}`}
                  >
                    <div>{formatDate(request.createdAt, "dd/mm/yy")}</div>
                    <div className="time-ago">
                      {dayjs(request.createdAt).fromNow()}
                    </div>
                  </td>
                  {/* Column 3: Products */}
                  <td>
                    <div className="product-info">
                      {request.items && request.items.length > 0 ? (
                        <>
                          <div className="product-name">
                            {request.items.length} product
                            {request.items.length > 1 ? "s" : ""}
                          </div>
                          <div className="product-sku">
                            {request.items.slice(0, 2).map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  marginBottom: "2px",
                                }}
                              >
                                <span>{item.productName}</span>
                                {item.currentStock === 0 ? (
                                  <span className="stock-badge out-of-stock">
                                    Out
                                  </span>
                                ) : item.currentStock <=
                                  (item.lowStockThreshold || 0) ? (
                                  <span className="stock-badge low-stock">
                                    Low
                                  </span>
                                ) : null}
                                {idx < 1 &&
                                  idx < request.items.length - 1 &&
                                  request.items.length === 2 && (
                                    <span style={{ color: "#9ca3af" }}>, </span>
                                  )}
                              </div>
                            ))}
                            {request.items.length > 2 && (
                              <div
                                className="more-items"
                                style={{
                                  fontSize: "12px",
                                  color: "#6b7280",
                                  marginTop: "4px",
                                }}
                              >
                                +{request.items.length - 2} more
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="product-name">No items</div>
                      )}
                    </div>
                  </td>
                  {/* Column 4: Qty */}
                  <td className="quantity-cell">
                    {request.items
                      ? request.items.reduce(
                          (sum, item) => sum + item.requestedQuantity,
                          0,
                        )
                      : 0}
                  </td>
                  {/* Column 5: Priority */}
                  <td className="priority-cell">
                    {(request.priority || "").toLowerCase() === "high"
                      ? "High"
                      : (request.priority || "").toLowerCase() === "low"
                        ? "Low"
                        : "Medium"}
                  </td>
                  {/* Column 6: Deadline */}
                  <td className="deadline-cell">
                    {request.deadline ? (
                      <div
                        title={`Deadline: ${formatDate(request.deadline, "dd/mm/yy")}`}
                      >
                        {formatDate(request.deadline, "dd/mm/yy")}
                      </div>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>—</span>
                    )}
                  </td>
                  {/* Column 7: Balagruha */}
                  <td>
                    {request.balagruhaId === "STOCK" ? (
                      <span
                        className="balagruha-tag stock-tag"
                        style={{
                          backgroundColor: "#e3f2fd",
                          color: "#1976d2",
                          fontWeight: "bold",
                          padding: "4px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        📦 STOCK
                      </span>
                    ) : request.balagruhaId ? (
                      <span className="balagruha-tag">
                        📍 {getBalagruhaDisplayName(request.balagruhaId)}
                      </span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>—</span>
                    )}
                  </td>
                  {/* Column 7: Requester (Admin only) */}
                  {normalizedRole === UserTypes.ADMIN && (
                    <td className="requester-cell">
                      <div className="requester-name">
                        {request.requestedBy?.name || "Unknown"}
                      </div>
                      <div className="requester-email">
                        {request.requestedBy?.email || ""}
                      </div>
                    </td>
                  )}
                  {/* Column 8: Status */}
                  <td>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div>{getStatusBadge(request.status)}</div>
                      {request.status ===
                        PurchaseRequestStatuses.DELIVERED_STORE &&
                        (normalizedRole === UserTypes.ADMIN ||
                          normalizedRole === UserTypes.COACH ||
                          String(
                            request.requestedBy?._id || request.requestedBy,
                          ) === String(userId)) && (
                          <button
                            className="btn btn-success btn-action"
                            style={{
                              padding: "6px 10px",
                              fontSize: "12px",
                              alignSelf: "flex-start",
                            }}
                            onClick={() =>
                              handleUpdateStatus(
                                request._id,
                                PurchaseRequestStatuses.DELIVERED_BALAGRUHA,
                                "Marked Delivered to Balagruha via Purchase Management",
                                "Request marked as delivered to balagruha",
                              )
                            }
                            disabled={statusUpdating[request._id]}
                            title="Mark Delivered to Balagruha"
                          >
                            🏠 Mark Delivered
                          </button>
                        )}
                    </div>
                  </td>
                  {/* Column 9: Actions */}
                  {/* Column 9: Actions */}
                  <td className="actions-cell">
                    {/* Sprint5-Story-EditDelete: Context-aware actions */}
                    {request.status === PurchaseRequestStatuses.PENDING &&
                    (normalizedRole === UserTypes.ADMIN ||
                      String(
                        request.requestedBy?._id || request.requestedBy,
                      ) === String(userId)) ? (
                      <>
                        {hasPermission("Purchase Management", "Update") && (
                          <button
                            className="btn-icon"
                            onClick={() => handleEditRequest(request)}
                            title="Edit Request"
                          >
                            ✏️
                          </button>
                        )}
                        {deleteConfirmRequest === request._id ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: "#fff5f5",
                              border: "1px solid #fed7d7",
                              borderRadius: "6px",
                              padding: "6px 8px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#c53030",
                                fontWeight: "600",
                              }}
                            >
                              Delete?
                            </span>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button
                                onClick={() => {
                                  handleDeleteRequest(request);
                                  setDeleteConfirmRequest(null);
                                }}
                                style={{
                                  fontSize: "11px",
                                  backgroundColor: "#e53e3e",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "2px 8px",
                                  cursor: "pointer",
                                  fontWeight: "600",
                                }}
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmRequest(null)}
                                style={{
                                  fontSize: "11px",
                                  backgroundColor: "#e2e8f0",
                                  color: "#4a5568",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "2px 8px",
                                  cursor: "pointer",
                                }}
                              >
                                No
                              </button>
                            </div>
                          </div>
                        ) : (
                          hasPermission("Purchase Management", "Delete") && (
                            <button
                              className="btn-icon btn-reject"
                              onClick={() => setDeleteConfirmRequest(request)}
                              title="Delete Request"
                            >
                              🗑️
                            </button>
                          )
                        )}
                      </>
                    ) : (
                      hasPermission("Purchase Management", "Read") && (
                        <button
                          className="btn-icon"
                          onClick={() => handleViewRequest(request)}
                          title="View Details"
                        >
                          👁️
                        </button>
                      )
                    )}

                    {/* Admin Actions - Story 18 */}
                    {request.status ===
                      PurchaseRequestStatuses.PENDING_APPROVAL &&
                      normalizedRole === UserTypes.ADMIN && (
                        <>
                          <button
                            className="btn-icon btn-approve"
                            onClick={() => handleApprove(request)}
                            title="Approve Request"
                          >
                            ✅
                          </button>
                          <button
                            className="btn-icon btn-reject"
                            onClick={() => handleReject(request)}
                            title="Reject Request"
                          >
                            ❌
                          </button>
                        </>
                      )}

                    {/* Purchase Manager Actions */}
                    {request.status ===
                      PurchaseRequestStatuses.PENDING_APPROVAL &&
                      normalizedRole === UserTypes.PURCHASE_MANAGER && (
                        <button
                          className="btn-icon btn-cancel"
                          onClick={() => handleCancelRequest(request._id)}
                          title="Cancel Request"
                        >
                          ✖️
                        </button>
                      )}

                    {/* Story 2.3: Purchase Manager + Admin Fulfillment Actions */}
                    {(normalizedRole === UserTypes.PURCHASE_MANAGER ||
                      normalizedRole === UserTypes.ADMIN) &&
                      hasPermission("Purchase Management", "Update") &&
                      request.status === PurchaseRequestStatuses.PENDING && (
                        <button
                          className="btn btn-primary btn-action"
                          onClick={() =>
                            handleUpdateStatus(
                              request._id,
                              PurchaseRequestStatuses.ORDERED,
                              "Marked Ordered via Purchase Management",
                              "Request marked as ordered",
                            )
                          }
                          disabled={statusUpdating[request._id]}
                          title="Mark Ordered"
                        >
                          🛒 Mark Ordered
                        </button>
                      )}

                    {(normalizedRole === UserTypes.PURCHASE_MANAGER ||
                      normalizedRole === UserTypes.ADMIN) &&
                      hasPermission("Purchase Management", "Update") &&
                      request.status === PurchaseRequestStatuses.ORDERED && (
                        <button
                          className="btn btn-primary btn-action"
                          onClick={() => handleMarkDeliveredStore(request)}
                          disabled={statusUpdating[request._id]}
                          title="Mark Received at Store"
                        >
                          📦 Mark Received at Store
                        </button>
                      )}
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td
                    colSpan={normalizedRole === UserTypes.ADMIN ? "10" : "9"}
                    className="no-data"
                  >
                    {normalizedRole === UserTypes.PURCHASE_MANAGER
                      ? "No purchase requests found. Click '+ New Purchase Request' to create one."
                      : "No purchase requests found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats Footer - Only show for workflow tabs (list view) or non-PM users */}
      {(normalizedRole !== UserTypes.PURCHASE_MANAGER ||
        (isWorkflowTab() && viewMode === "list")) && (
        <div className="stats-footer">
          <div className="stats-item">
            <span className="stats-label">Total Requests:</span>
            <span className="stats-value">{filteredRequests.length}</span>
          </div>
          <div className="stats-item">
            <span className="stats-label">Pending:</span>
            <span className="stats-value pending">
              {
                filteredRequests.filter(
                  (r) => r.status === PurchaseRequestStatuses.PENDING,
                ).length
              }
            </span>
          </div>
          <div className="stats-item">
            <span className="stats-label">Approved:</span>
            <span className="stats-value approved">
              {
                filteredRequests.filter(
                  (r) => r.status === PurchaseRequestStatuses.APPROVED,
                ).length
              }
            </span>
          </div>
          <div className="stats-item">
            <span className="stats-label">Completed:</span>
            <span className="stats-value completed">
              {
                filteredRequests.filter(
                  (r) =>
                    [
                      PurchaseRequestStatuses.COMPLETED,
                      PurchaseRequestStatuses.DELIVERED_BALAGRUHA,
                    ].includes(r.status),
                ).length
              }
            </span>
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Modal for Creating/Editing Purchase Request */}
      {showCreateModal && (
        <CreatePurchaseRequestModal
          key={selectedRequest?._id || "create"} // Force remount when editing different requests
          onClose={() => {
            setShowCreateModal(false);
            setSelectedRequest(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedRequest(null);
            fetchPurchaseRequests();
          }}
          userBalagruhas={userBalagruhas}
          balagruhas={balagruhas}
          userRole={userRole}
          requestToEdit={selectedRequest} // Sprint5-Story-EditDelete
        />
      )}

      {showViewModal && selectedRequest && (
        <ViewRequestModal
          request={selectedRequest}
          onClose={() => {
            setShowViewModal(false);
            setSelectedRequest(null);
          }}
          userRole={userRole}
          onRefresh={fetchPurchaseRequests}
        />
      )}

      {/* Admin Approval Modals - Story 18 */}
      {showApproveModal && selectedRequest && (
        <ApproveRequestModal
          request={selectedRequest}
          onClose={() => {
            setShowApproveModal(false);
            setSelectedRequest(null);
          }}
          onSuccess={() => {
            setShowApproveModal(false);
            setSelectedRequest(null);
            fetchPurchaseRequests();
          }}
        />
      )}

      {showRejectModal && selectedRequest && (
        <RejectRequestModal
          request={selectedRequest}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedRequest(null);
          }}
          onSuccess={() => {
            setShowRejectModal(false);
            setSelectedRequest(null);
            fetchPurchaseRequests();
          }}
        />
      )}

      {/* Update Stock Modal - Story 19 */}
      {showUpdateStockModal && selectedRequest && (
        <UpdateStockModal
          request={selectedRequest}
          onClose={() => {
            setShowUpdateStockModal(false);
            setSelectedRequest(null);
          }}
          onRefresh={() => {
            fetchPurchaseRequests();
          }}
        />
      )}
      {deleteConfirmRequest !== null && !showCreateModal && (
        <ConfirmDialog
          message="Are you sure you want to permanently delete this purchase request? This action cannot be undone."
          onYes={() => {
            handleDeleteRequest(deleteConfirmRequest);
            setDeleteConfirmRequest(null);
          }}
          onNo={() => setDeleteConfirmRequest(null)}
        />
      )}
      {orderAllConfirm !== null && !showCreateModal && (
        <OrderAllConfirmDialog
          itemName={orderAllConfirm.productName}
          requestCount={orderAllConfirm.requests.length}
          onConfirm={confirmOrderAll}
          onCancel={() => setOrderAllConfirm(null)}
        />
      )}
    </div>
  );
}
