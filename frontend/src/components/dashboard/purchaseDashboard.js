import React, { useState, useEffect } from "react";
import "./PurchaseDashboard.css";
import { useAuth } from "../../contexts/AuthContext";
import MachineManagement from "../machineManagement/machineManagement";
import {
  createPurchase,
  createRepair,
  deletePurchase,
  deleteRepair,
  getAllPurchases,
  getAllRepairs,
  getBalagruha,
  updatePurchaseOrder,
  updateRepairRequest,
  getAllPurchaseRequests,
} from "../../api";
import TaskManagement from "../TaskManagement/taskmanagement";
import showToast from "../../utils/toast";

import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const PurchaseDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { logout } = useAuth();

  // Modal states
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [repairRequests, setRepairRequests] = useState([]);
  const [selectedBalagruha, setSelectedBalagruha] = useState();
  const [balagruhas, setBalagruhas] = useState([]);
  const [selectDate, setSelectDate] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectDatePurchase, setSelectDatePurchase] = useState(null);
  const [fromDatePurchase, setFromDatePurchase] = useState("");
  const [toDatePurchase, setToDatePurchase] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState()
  const [filterBalagruha, setFilterBalagruha] = useState("all");
  const [repairSearch, setRepairSearch] = useState();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStatusPurchase, setFilterStatusPurchase] = useState('all');
  const [selectedPurchaseStatus, setSelectedPurchaseStatus] = useState();
  const [filterBalagruhaPurchase, setFilterBalagruhaPurchase] = useState("all");
  const [repairForm, setRepairForm] = useState({
    balagruhaId: "",
    issueName: "",
    description: "",
    dateReported: new Date().toISOString(),
    urgency: "medium",
    estimatedCost: "",
    attachments: [],
    existingAttachments: [],
    repairDetails: "",
    status: "pending",
  });

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [showDeletePurchaseConfirmation, setShowDeletePurchaseConfirmation] =
    useState(false);
  const [deletePurchaseId, setDeletePurchaseId] = useState(null);

  // Update purchaseForm state
  const [purchaseForm, setPurchaseForm] = useState({
    balagruhaId: "",
    status: "",
    machineDetails: "",
    vendorDetails: "",
    costEstimate: "",
    requiredParts: "",
    attachments: [],
    existingAttachments: [],
  });

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchRepairRequests = async () => {
    try {
      setLoading(true);
      const response = await getAllRepairs();
      setRepairRequests(response.data.repairRequests);
    } catch (error) {
      console.error("Error fetching repairs:", error);
    } finally {
      setLoading(false);
    }
  };

  const FilePreview = ({ file }) => {
    const [preview, setPreview] = useState("");

    useEffect(() => {
      if (file) {
        if (file instanceof File) {
          // For new files
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreview(reader.result);
          };
          reader.readAsDataURL(file);
        } else {
          // For existing files from server
          setPreview(file.fileUrl || file.url);
        }
      }
    }, [file]);

    const isImage = (file) => {
      const imageTypes = ["jpg", "jpeg", "png", "gif"];
      const extension = file.name
        ? file.name.split(".").pop().toLowerCase()
        : (file.fileUrl || file.url)?.split(".").pop().toLowerCase();
      return imageTypes.includes(extension);
    };

    return (
      <div className="file-preview">
        {isImage(file) ? (
          <img src={preview} alt="Purchase order attachment preview" className="preview-image" />
        ) : (
          <div className="preview-document">
            <i className="fas fa-file-pdf"></i>
            <span>{file.name || "Document"}</span>
          </div>
        )}
      </div>
    );
  };

  const handleDeleteRepair = (id) => {
    setDeleteId(id);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      setLoading(true);
      await deleteRepair(deleteId);
      await fetchRepairRequests(); // Refresh the list
      setShowDeleteConfirmation(false);
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting repair request:", error);
      // Optionally show error message to user
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const [dashboardData, setDashboardData] = useState({
    activeRepairs: 0,
    pendingOrders: 0,
    completedThisWeek: 0,
    budgetUsed: 0,
    repairStats: {
      pending: 0,
      inProgress: 0,
      completed: 0,
    },
    purchaseStats: {
      total: 0,
      totalCost: 0,
      recentPurchases: [],
    },
    recentActivities: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pmPurchaseRequests, setPmPurchaseRequests] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchRepairRequests();
    fetchPurchaseOrders();
    fetchBalagruha();
    fetchPurchaseRequests();
  }, []);

  const fetchPurchaseRequests = async () => {
    try {
      const response = await getAllPurchaseRequests({
        limit: 25,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (response?.success) {
        const requests = response.data?.requests || [];
        const sortedRequests = [...requests].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setPmPurchaseRequests(sortedRequests);
      }
    } catch (err) {
      console.error('Error fetching PM purchase requests:', err);
    }
  };

  const getPriorityLabel = (req) => {
    const p = (req?.priority || '').toString().toLowerCase();
    if (p === 'high') return 'High';
    if (p === 'low') return 'Low';
    return 'Medium';
  };

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await getAllPurchases();
      setPurchaseOrders(response.data.purchaseOrders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const openRepairModal = (repair = null) => {
    if (repair) {
      setRepairForm({
        balagruhaId: repair.balagruhaId,
        issueName: repair.issueName,
        description: repair.description,
        dateReported: repair.dateReported,
        urgency: repair.urgency,
        estimatedCost: repair.estimatedCost,
        attachments: [], // New attachments
        existingAttachments: repair.attachments || [],
        repairDetails: repair.repairDetails || "",
        status: repair.status,
      });
      setEditingItem(repair);
    } else {
      setRepairForm({
        balagruhaId: "",
        issueName: "",
        description: "",
        dateReported: new Date().toISOString(),
        urgency: "medium",
        estimatedCost: "",
        attachments: [], // New attachments
        existingAttachments: [],
        repairDetails: "",
        status: "pending",
      });
      setEditingItem(null);
    }
    setShowRepairModal(true);
  };

  const handleDeletePurchase = (id) => {
    setDeletePurchaseId(id);
    setShowDeletePurchaseConfirmation(true);
  };

  const confirmDeletePurchase = async () => {
    if (!deletePurchaseId) return;

    try {
      setLoading(true);
      await deletePurchase(deletePurchaseId);
      await fetchPurchaseOrders();
      setShowDeletePurchaseConfirmation(false);
      setDeletePurchaseId(null);
    } catch (error) {
      console.error("Error deleting purchase order:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setPurchaseForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
  };

  const removePurchaseFile = (index) => {
    setPurchaseForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const openPurchaseModal = (purchase = null) => {
    if (purchase) {
      setPurchaseForm({
        balagruhaId: purchase.balagruhaId,
        status: purchase.status,
        machineDetails: purchase.machineDetails,
        vendorDetails: purchase.vendorDetails,
        costEstimate: purchase.costEstimate,
        requiredParts: purchase.requiredParts,
        attachments: [],
        existingAttachments: purchase.attachments || [],
      });
      setEditingItem(purchase);
    } else {
      setPurchaseForm({
        balagruhaId: "",
        status: "",
        machineDetails: "",
        vendorDetails: "",
        costEstimate: "",
        requiredParts: "",
        attachments: [],
        existingAttachments: [],
      });
      setEditingItem(null);
    }
    setShowPurchaseModal(true);
  };

  const calculateDashboardStats = (repairs, purchases, purchaseRequests = []) => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Scope to balagruhas this user actually has access to - matches the
    // filtering already applied to the tables below, so cards match what's visible
    const canAccessBalagruha = (balagruhaId) => {
      const id = balagruhaId?.toString?.() || balagruhaId;
      return (
        balagruhaIdsFromStorage.length === 0 ||
        id === "STOCK" ||
        balagruhaIdsFromStorage.includes(id)
      );
    };

    const scopedRepairs = repairs.filter((r) => canAccessBalagruha(r.balagruhaId));
    const scopedPurchases = purchases.filter((p) => canAccessBalagruha(p.balagruhaId));
    // Purchase requests are already the exact set shown in the table (no balagruha
    // scoping there), so use them as-is to keep cards and table in sync.
    const scopedPurchaseRequests = purchaseRequests;

    const pendingPurchaseRequestStatuses = ["pending", "pending_approval", "approved"];
    const completedPurchaseRequestStatuses = [
      "completed",
      "delivered_store",
      "delivered_balagruha",
    ];

    const getPurchaseRequestSpend = (req) => {
      if (!completedPurchaseRequestStatuses.includes(req.status)) return 0;

      const itemSpend = Array.isArray(req.items)
        ? req.items.reduce((sum, item) => (
            sum +
            Number(
              item.actualTotalCost ||
              item.estimatedTotalCost ||
              (Number(item.requestedQuantity || 0) * Number(item.estimatedUnitCost || 0)) ||
              0
            )
          ), 0)
        : 0;

      return itemSpend || Number(req.actualTotalCost || req.totalEstimatedCost || 0);
    };

    const completedRequestSpend = scopedPurchaseRequests.reduce(
      (sum, req) => sum + getPurchaseRequestSpend(req),
      0
    );
    const tableLowStockItems = scopedPurchaseRequests.reduce((count, req) => {
      if (!Array.isArray(req.items)) return count;

      return count + req.items.filter((item) => (
        Number(item.currentStock || 0) === 0 ||
        Number(item.currentStock || 0) <= Number(item.lowStockThreshold || 0)
      )).length;
    }, 0);

    const stats = {
      activeRepairs: scopedRepairs.filter((r) => r.status !== "completed").length,
      pendingOrders: scopedPurchaseRequests.filter((req) =>
        pendingPurchaseRequestStatuses.includes(req.status)
      ).length,
      // Completed purchase request rows updated this week.
      completedThisWeek: scopedPurchaseRequests.filter(
        (req) =>
          completedPurchaseRequestStatuses.includes(req.status) &&
          new Date(req.updatedAt || req.createdAt) > weekAgo
      ).length,
      lowStockItems: tableLowStockItems,
      // Spend is based on completed/delivered purchase request rows.
      budgetUsed: completedRequestSpend,

      repairStats: {
        pending: scopedRepairs.filter((r) => r.status === "pending").length,
        inProgress: scopedRepairs.filter((r) => r.status === "in-progress").length,
        completed: scopedRepairs.filter((r) => r.status === "completed").length,
      },
      purchaseStats: {
        total: scopedPurchaseRequests.length,
        totalCost: completedRequestSpend,
        recentPurchases: scopedPurchases.slice(0, 5),
      },
      recentActivities: [
        ...scopedRepairs.map((r) => ({
          type: "repair",
          title: r.issueName,
          status: r.status,
          date: new Date(r.dateReported),
          cost: r.estimatedCost,
        })),
        ...scopedPurchases.map((p) => ({
          type: "purchase",
          title: p.machineDetails,
          status: p.status,
          date: new Date(p.createdAt),
          cost: p.costEstimate,
        })),
        ...scopedPurchaseRequests.map((req) => {
          const firstItem = Array.isArray(req.items) && req.items.length > 0 ? req.items[0] : null;
          return {
            type: "purchase",
            title: firstItem?.productName || req.requestId || "Purchase Request",
            status: req.status,
            date: new Date(req.createdAt),
            cost: req.totalEstimatedCost,
          };
        }),
      ]
        .sort((a, b) => b.date - a.date)
        .slice(0, 10),
    };

    return stats;
  };

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSelectedBalagruha();

    try {
      const formData = new FormData();
      formData.append("balagruhaId", purchaseForm.balagruhaId);
      formData.append("status", purchaseForm.status);
      formData.append("machineDetails", purchaseForm.machineDetails);
      formData.append("vendorDetails", purchaseForm.vendorDetails);
      formData.append("costEstimate", purchaseForm.costEstimate);
      formData.append("requiredParts", purchaseForm.requiredParts);

      purchaseForm.attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      if (editingItem) {
        await updatePurchaseOrder(editingItem._id, formData);
      } else {
        await createPurchase(formData);
      }

      setShowPurchaseModal(false);
      fetchPurchaseOrders();
    } catch (error) {
      console.error("Error submitting purchase:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setRepairForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
  };

  const removeFile = (index) => {
    setRepairForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [repairsResponse, purchasesResponse, purchaseRequestsResponse] = await Promise.all([
        getAllRepairs(),
        getAllPurchases(),
        getAllPurchaseRequests({
          limit: 25,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }),
      ]);

      const repairs = repairsResponse.data.repairRequests || [];
      const purchases = purchasesResponse.data.purchaseOrders || [];
      const purchaseRequests = purchaseRequestsResponse?.success
        ? [...(purchaseRequestsResponse.data?.requests || [])].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        : [];

      setPmPurchaseRequests(purchaseRequests);

      const dashboardStats = calculateDashboardStats(repairs, purchases, purchaseRequests);
      setDashboardData(dashboardStats);

      setError(null);
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error("Dashboard loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRepairSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("balagruhaId", repairForm.balagruhaId);
      formData.append("issueName", repairForm.issueName);
      formData.append("description", repairForm.description);
      formData.append("dateReported", repairForm.dateReported);
      formData.append("urgency", repairForm.urgency);
      formData.append("estimatedCost", repairForm.estimatedCost);
      formData.append("repairDetails", repairForm.repairDetails);

      if (editingItem) {
        formData.append("status", repairForm.status);
      }

      repairForm.attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      if (editingItem) {
        await updateRepairRequest(editingItem._id, formData);
      } else {
        await createRepair(formData);
      }

      setShowRepairModal(false);
      fetchRepairRequests(); // Refresh the list
    } catch (error) {
      console.error("Error submitting repair:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalagruha = async () => {
    const response = await getBalagruha();
    if (response.success) {
      const balagruhaIdsFromStorage = localStorage
        .getItem("balagruhaIds")
        ?.split(",");

      const filteredBalagruhas = response.data.balagruhas.filter((balagruha) =>
        balagruhaIdsFromStorage.includes(balagruha._id)
      );

      setBalagruhas(filteredBalagruhas);
    } else {
      showToast("Error fetching balagruha", "error");
    }
  };

  const balagruhaIdsFromStorage =
    localStorage.getItem("balagruhaIds")?.split(",") || [];

  const filteredRepairRequests = repairRequests.filter((bal) => {
    const reportedDate = dayjs(bal.dateReported);

    let passesDateFilter = true;

    if (selectDate === "today") {
      passesDateFilter = reportedDate.isSame(dayjs(), "day");
    } else if (selectDate === "thisWeek") {
      const startOfWeek = dayjs().startOf("week");
      const endOfWeek = dayjs().endOf("week");
      passesDateFilter =
        reportedDate.isSameOrAfter(startOfWeek) &&
        reportedDate.isSameOrBefore(endOfWeek);
    } else if (selectDate === "thisMonth") {
      passesDateFilter = reportedDate.isSame(dayjs(), "month");
    } else if (selectDate === "lastMonth") {
      const lastMonth = dayjs().subtract(1, "month");
      passesDateFilter = reportedDate.isSame(lastMonth, "month");
    } else if (selectDate === "custom" && fromDate && toDate) {
      passesDateFilter =
        reportedDate.isSameOrAfter(dayjs(fromDate)) &&
        reportedDate.isSameOrBefore(dayjs(toDate).endOf("day"));
    }

    let passesBalagruhaFilter =
      filterBalagruha === "all"
        ? balagruhaIdsFromStorage.includes(bal.balagruhaId)
        : bal.balagruhaId === filterBalagruha;


    const searchFilter = !repairSearch || repairSearch && bal?.issueName?.toLowerCase().includes(repairSearch?.toLowerCase())

    const statusFilter = filterStatus === "all" || bal.status === filterStatus;

    return passesDateFilter && passesBalagruhaFilter && searchFilter && statusFilter;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();

    // --- 1. Add Title & Date Filter Info ---
    doc.setFontSize(14);
    doc.text("Repair Requests Report", 14, 15);

    // Format filter info
    let filterInfo = "";
    const today = dayjs();

    if (selectDate === "custom" && fromDate && toDate) {
      filterInfo = `Date Range: ${dayjs(fromDate).format(
        "DD-MM-YYYY"
      )} to ${dayjs(toDate).format("DD-MM-YYYY")}`;
    } else if (selectDate === "today") {
      filterInfo = `Date: ${today.format("DD-MM-YYYY")}`;
    } else if (selectDate === "thisWeek") {
      const startOfWeek = today.startOf("week");
      // Adjust the end of the week: if today is before the week's Sunday, use today as the end date.
      const endOfWeek = today.isBefore(today.endOf("week"))
        ? today
        : today.endOf("week");
      filterInfo = `Date Range: ${startOfWeek.format(
        "DD-MM-YYYY"
      )} to ${endOfWeek.format("DD-MM-YYYY")}`;
    } else if (selectDate === "thisMonth") {
      const startOfMonth = today.startOf("month");
      const endOfMonth = today.endOf("month");
      filterInfo = `Date Range: ${startOfMonth.format(
        "DD-MM-YYYY"
      )} to ${endOfMonth.format("DD-MM-YYYY")}`;
    } else if (selectDate === "lastMonth") {
      const startOfLastMonth = today.subtract(1, "month").startOf("month");
      const endOfLastMonth = today.subtract(1, "month").endOf("month");
      filterInfo = `Date Range: ${startOfLastMonth.format(
        "DD-MM-YYYY"
      )} to ${endOfLastMonth.format("DD-MM-YYYY")}`;
    } else {
      filterInfo = "Date Filter: All";
    }

    doc.setFontSize(10);
    doc.text(filterInfo, 14, 25);

    // --- 2. Table Data ---
    const tableColumn = [
      "Issue Name",
      "Description",
      "Date Reported",
      "Urgency",
      "Balagruha",
      "Status",
      "Estimated Cost",
    ];

    const tableRows = filteredRepairRequests.map((req) => [
      req.issueName,
      req.description,
      dayjs(req.dateReported).format("DD-MM-YYYY"),
      req.urgency,
      req.balagruhaName,
      req.status,
      `₹${req.estimatedCost}`,
    ]);

    // Add table below date info
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [120, 153, 248] },
    });

    // --- 3. Total Cost Summary ---
    const totalCost = filteredRepairRequests.reduce(
      (acc, curr) => acc + (curr.estimatedCost || 0),
      0
    );
    const finalY = doc.lastAutoTable.finalY || 30;

    doc.setFontSize(11);
    doc.text(`Total Estimated Cost: ₹${totalCost}`, 14, finalY + 10);

    // --- 4. Save ---
    doc.save("RepairRequests.pdf");
  };

  // const filteredPurchaseOrders = purchaseOrders.filter((bal) => {
  //   
  //   if (filterBalagruhaPurchase !== "all") {
  //     return bal.balagruhaId === filterBalagruhaPurchase;
  //   } else {
  //     return balagruhaIdsFromStorage.includes(bal.balagruhaId);
  //   }
  // });

  const filteredPurchaseOrders = purchaseOrders.filter((bal) => {
    const createdDate = dayjs(bal.createdAt);

    let passesDateFilter = true;

    if (selectDatePurchase === 'today') {
      passesDateFilter = createdDate.isSame(dayjs(), 'day');
    } else if (selectDatePurchase === 'thisWeek') {
      const startOfWeek = dayjs().startOf('week');
      const endOfWeek = dayjs().endOf('week');
      passesDateFilter = createdDate.isSameOrAfter(startOfWeek) && createdDate.isSameOrBefore(endOfWeek);
    } else if (selectDatePurchase === 'thisMonth') {
      passesDateFilter = createdDate.isSame(dayjs(), 'month');
    } else if (selectDatePurchase === 'lastMonth') {
      const lastMonth = dayjs().subtract(1, 'month');
      passesDateFilter = createdDate.isSame(lastMonth, 'month');
    } else if (selectDatePurchase === 'custom' && fromDatePurchase && toDatePurchase) {
      passesDateFilter =
        createdDate.isSameOrAfter(dayjs(fromDatePurchase)) &&
        createdDate.isSameOrBefore(dayjs(toDatePurchase).endOf('day'));
    }

    let passesBalagruhaFilter =
      filterBalagruha === "all"
        ? balagruhaIdsFromStorage.includes(bal.balagruhaId)
        : bal.balagruhaId === filterBalagruha;

    const searchFilter = !purchaseSearch || purchaseSearch && bal?.machineDetails?.toLowerCase().includes(purchaseSearch?.toLowerCase()) || purchaseSearch && bal?.vendorDetails?.toLowerCase().includes(purchaseSearch?.toLowerCase()) || purchaseSearch && bal?.requiredParts?.toLowerCase().includes(purchaseSearch?.toLowerCase())

    const searchStatus = filterStatusPurchase === 'all' || bal.status === filterStatusPurchase

    return passesDateFilter && passesBalagruhaFilter && searchFilter && searchStatus;
  });

  const exportPurchaseOrdersToPDF = () => {
    const doc = new jsPDF();

    // --- 1. Add Title & Date Filter Info ---
    doc.setFontSize(14);
    doc.text("Purchase Order Report", 14, 15);

    // Format filter info
    let filterInfo = "";
    const today = dayjs();

    if (selectDatePurchase === 'custom' && fromDatePurchase && toDatePurchase) {
      filterInfo = `Date Range: ${dayjs(fromDatePurchase).format('DD-MM-YYYY')} to ${dayjs(toDatePurchase).format('DD-MM-YYYY')}`;
    } else if (selectDatePurchase === 'today') {
      filterInfo = `Date: ${today.format('DD-MM-YYYY')}`;
    } else if (selectDatePurchase === 'thisWeek') {
      const startOfWeek = today.startOf('week');
      // Adjust the end of the week: if today is before the week's Sunday, use today as the end date.
      const endOfWeek = today.isBefore(today.endOf('week')) ? today : today.endOf('week');
      filterInfo = `Date Range: ${startOfWeek.format('DD-MM-YYYY')} to ${endOfWeek.format('DD-MM-YYYY')}`;
    } else if (selectDatePurchase === 'thisMonth') {
      const startOfMonth = today.startOf('month');
      const endOfMonth = today.endOf('month');
      filterInfo = `Date Range: ${startOfMonth.format('DD-MM-YYYY')} to ${endOfMonth.format('DD-MM-YYYY')}`;
    } else if (selectDatePurchase === 'lastMonth') {
      const startOfLastMonth = today.subtract(1, 'month').startOf('month');
      const endOfLastMonth = today.subtract(1, 'month').endOf('month');
      filterInfo = `Date Range: ${startOfLastMonth.format('DD-MM-YYYY')} to ${endOfLastMonth.format('DD-MM-YYYY')}`;
    } else {
      filterInfo = "Date Filter: All";
    }

    doc.setFontSize(10);
    doc.text(filterInfo, 14, 25);



    // --- 2. Table Data ---
    const tableColumn = [
      "Machine Details",
      "Vendor Details",
      "Required Materials",
      "Balagruha",
      "Cost Estimate",
      "Date",
      "Status"
    ];

    const tableRows = filteredPurchaseOrders.map((req) => [
      req.machineDetails,
      req.vendorDetails,
      req.requiredParts,
      req.balagruhaName,
      `₹${req.costEstimate}`,
      dayjs(req.createdAt).format('DD-MM-YYYY'),
      req.status,
    ]);

    // Add table below date info
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [120, 153, 248] }
    });

    // --- 3. Total Cost Summary ---
    const totalCost = filteredPurchaseOrders.reduce((acc, curr) => acc + (curr.costEstimate || 0), 0);
    const finalY = doc.lastAutoTable.finalY || 30;

    doc.setFontSize(11);
    doc.text(`Total Estimated Cost: ₹${totalCost}`, 14, finalY + 10);

    // --- 4. Save ---
    doc.save('PurchaseOrders.pdf');
  };


  return (
    <div className="purchase-dashboard">
      {/* Main Content Area */}
      <div className="purchase-main-content">
        {/* Dashboard Content */}
        <div className="purchase-dashboard-content">
          <div className="purchase-dashboard-overview">
            {/* Stats Cards */}
            <div className="purchase-stats-cards">
              <div className="purchase-stat-card">
                <div className="purchase-stat-icon">🔧</div>
                <div className="purchase-stat-info">
                  <h3>{dashboardData.activeRepairs}</h3>
                  <p>Active Repairs</p>
                </div>
              </div>
              <div className="purchase-stat-card">
                <div className="purchase-stat-icon">🛒</div>
                <div className="purchase-stat-info">
                  <h3>{dashboardData.pendingOrders}</h3>
                  <p>Pending Orders</p>
                </div>
              </div>
              <div className="purchase-stat-card">
                <div className="purchase-stat-icon" style={{ color: '#d97706' }}>⚠️</div>
                <div className="purchase-stat-info">
                  <h3>{dashboardData.lowStockItems || 0}</h3>
                  <p>Low Stock Items</p>
                </div>
              </div>

              <div className="purchase-stat-card">
                <div className="purchase-stat-icon">✅</div>
                <div className="purchase-stat-info">
                  <h3>{dashboardData.completedThisWeek}</h3>
                  <p>Completed This Week</p>
                </div>
              </div>
              <div className="purchase-stat-card">
                <div className="purchase-stat-icon">💰</div>
                <div className="purchase-stat-info">
                  <h3>₹{dashboardData.budgetUsed.toLocaleString()}</h3>
                  <p>Total Expenditure</p>
                </div>
              </div>
            </div>

            {/* Detailed Statistics */}
            <div className="dashboard-detailed-stats">
              {/* Purchase Requests (Sprint5) */}
              <div className="dashboard-card recent-activities">
                <h3>Purchase Requests</h3>
                <div className="purchase-data-table" style={{ padding: '0', boxShadow: 'none', border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Req Date</th>
                        <th>Item Name</th>
                        <th>Qty</th>
                        <th>Requested by</th>
                        <th>Priority</th>
                        <th>Deadline</th>
                        <th>Status</th>
                        <th>Special Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pmPurchaseRequests.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ padding: '16px', color: '#6b7280' }}>
                            No purchase requests found.
                          </td>
                        </tr>
                      )}

                      {pmPurchaseRequests.map((req) => {
                        const firstItem = Array.isArray(req.items) && req.items.length > 0 ? req.items[0] : null;
                        const itemName = firstItem?.productName || '—';
                        const qty = Array.isArray(req.items)
                          ? req.items.reduce((sum, item) => sum + Number(item.requestedQuantity || 0), 0)
                          : 0;

                        const requestedBy = req.requestedBy?.name || req.requestedBy?.email || '—';
                        const priority = getPriorityLabel(req);

                        return (
                          <tr key={req._id || req.requestId}>
                            <td>{req.createdAt ? dayjs(req.createdAt).format('DD/MM/YY') : '—'}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{itemName}</span>
                                {firstItem?.currentStock === 0 ? (
                                  <span className="stock-badge out-of-stock">Out</span>
                                ) : firstItem?.currentStock <= (firstItem?.lowStockThreshold || 0) ? (
                                  <span className="stock-badge low-stock">Low</span>
                                ) : null}
                              </div>
                            </td>
                            <td>{qty}</td>
                            <td>{requestedBy}</td>
                            <td>
                              <span
                                className={`purchase-tag ${priority === 'High'
                                  ? 'purchase-high'
                                  : priority === 'Low'
                                    ? 'purchase-low'
                                    : 'purchase-medium'
                                  }`}
                              >
                                {priority}
                              </span>
                            </td>
                            <td>{req.deadline ? dayjs(req.deadline).format('DD/MM/YY') : '—'}</td>
                            <td>
                              <span className={`purchase-tag purchase-status-${(req.status || '').toString().replace('_', '-')}`}>
                                {req.status || '—'}
                              </span>
                            </td>
                            <td>{req.justification || req.reason || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDashboard;
