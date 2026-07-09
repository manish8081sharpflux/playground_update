import config from "../../config";
import React, { useEffect, useState } from "react";
import {
  createRepair,
  deleteRepair,
  getAllRepairs,
  getBalagruha,
  updateRepairRequest,
} from "../../api";
import showToast from "../../utils/toast";
import "./RepairManagement.css";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function RepairManagement() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mutatingId, setMutatingId] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [repairRequests, setRepairRequests] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [filterBalagruha, setFilterBalagruha] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedBalagruha, setSelectedBalagruha] = useState();
  const [balagruhas, setBalagruhas] = useState([]);
  const [repairSearch, setRepairSearch] = useState();
  const [selectDate, setSelectDate] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
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

  useEffect(() => {
    fetchRepairRequests();
    fetchBalagruha();
  }, []);

  const openRepairModal = (repair = null) => {
    if (repair) {
      setRepairForm({
        balagruhaId: repair.balagruhaId?._id || repair.balagruhaId || "",
        issueName: repair.issueName || "",
        description: repair.description || "",
        dateReported: repair.dateReported || new Date().toISOString(),
        urgency: repair.urgency || "medium",
        estimatedCost: repair.estimatedCost || "",
        attachments: [],
        existingAttachments:
          repair.attachments || repair.attachment || repair.existingAttachments || [],
        repairDetails: repair.repairDetails || "",
        status: repair.status || "pending",
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
        attachments: [],
        existingAttachments: [],
        repairDetails: "",
        status: "pending",
      });
      setEditingItem(null);
    }
    setShowRepairModal(true);
  };

  const fetchRepairRequests = async (isBackground = false) => {
    try {
      if (isBackground) setIsRefreshing(true);
      else setIsInitialLoading(true);
      setFetchError(null);

      const response = await getAllRepairs();
      if (response.success) {
        setRepairRequests(response.data.repairRequests || []);
      } else {
        const msg = "Error fetching repairs: " + (response.message || "Unknown error");
        showToast(msg, "error");
        setFetchError(msg);
      }
    } catch (error) {
      console.error("Error fetching repairs:", error);
      const msg = "Error fetching repairs: " + (error.message || "Unknown error");
      showToast(msg, "error");
      setFetchError(msg);
    } finally {
      if (isBackground) setIsRefreshing(false);
      else setIsInitialLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    setMutatingId(deleteId);
    try {
      const response = await deleteRepair(deleteId);
      if (response.success) {
        showToast("Repair request deleted successfully", "success");
        await fetchRepairRequests(true);
      } else {
        showToast(
          "Error deleting repair request: " +
          (response.message || "Unknown error"),
          "error"
        );
      }
      setShowDeleteConfirmation(false);
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting repair request:", error);
      showToast(
        "Error deleting repair request: " + (error.message || "Unknown error"),
        "error"
      );
    } finally {
      setMutatingId(null);
    }
  };

  const handleDeleteRepair = (id) => {
    setDeleteId(id);
    setShowDeleteConfirmation(true);
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

  const handleRepairSubmit = async (e) => {
    e.preventDefault();
    setIsRefreshing(true);

    try {
      // Validate required fields
      if (!repairForm.balagruhaId) {
        showToast("Please select a Balagruha", "error");
        setIsRefreshing(false);
        return;
      }
      if (!repairForm.issueName) {
        showToast("Please enter an issue name", "error");
        setIsRefreshing(false);
        return;
      }
      if (!repairForm.description) {
        showToast("Please enter a description", "error");
        setIsRefreshing(false);
        return;
      }
      if (!repairForm.estimatedCost || Number(repairForm.estimatedCost) <= 0) {
        showToast(
          !repairForm.estimatedCost
            ? "Estimated cost is required"
            : "Estimated cost must be greater than 0",
          "error"
        );
        setIsRefreshing(false);
        return;
      }

      const formData = new FormData();
      formData.append("balagruhaId", repairForm.balagruhaId);
      formData.append("issueName", repairForm.issueName);
      formData.append("description", repairForm.description);
      formData.append("dateReported", repairForm.dateReported);
      formData.append("urgency", repairForm.urgency);
      formData.append("estimatedCost", repairForm.estimatedCost);
      formData.append("repairDetails", repairForm.repairDetails || "");

      if (editingItem) {
        formData.append("status", repairForm.status);
      }

      // Only append attachments if there are any
      if (repairForm.attachments && repairForm.attachments.length > 0) {
        repairForm.attachments.forEach((file) => {
          formData.append("attachments", file);
        });
      }

      if (editingItem) {
        formData.append(
          "existingAttachments",
          JSON.stringify(repairForm.existingAttachments || [])
        );
      }

      let response;
      if (editingItem) {
        response = await updateRepairRequest(editingItem._id, formData);
      } else {
        response = await createRepair(formData);
      }

      if (response.success) {
        showToast(
          editingItem
            ? "Repair request updated successfully"
            : "Repair request created successfully",
          "success"
        );
        setShowRepairModal(false);
        fetchRepairRequests(true);
      } else {
        showToast("Error: " + (response.message || "Unknown error"), "error");
      }
    } catch (error) {
      console.error("Error submitting repair:", error);
      showToast("Error: " + (error.message || "Unknown error"), "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const getAttachmentUrl = (file) => {
    if (!file) return "";

    const url =
      typeof file === "string"
        ? file
        : file.fileUrl || file.url || file.filePath || file.path || "";

    if (!url) return "";

    if (url.startsWith("http")) return url;

    return `${config.API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
  };

  const getAttachmentName = (file) => {
    if (!file) return "Document";
    if (typeof file === "string") {
      const cleaned = file.split("?")[0].split("#")[0] || "";
      return cleaned.split("/").pop() || "Document";
    }
    if (file.fileName) return file.fileName;
    if (file.name) return file.name;
    const url = getAttachmentUrl(file);
    const cleaned = url.split("?")[0].split("#")[0] || "";
    return cleaned.split("/").pop() || "Document";
  };

  const getAttachmentExtension = (file) => {
    const name = getAttachmentName(file);
    const url = getAttachmentUrl(file);
    const source = name || url;
    const cleaned = (source || "").split("?")[0].split("#")[0];
    return cleaned.split(".").pop().toLowerCase();
  };

  const FilePreview = ({ file }) => {
    const [preview, setPreview] = useState("");

    useEffect(() => {
      if (!file) return;

      if (file instanceof File) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(getAttachmentUrl(file));
      }
    }, [file]);

    const isImage = (file) => {
      const imageTypes = ["jpg", "jpeg", "png", "gif"];
      return imageTypes.includes(getAttachmentExtension(file));
    };

    return (
      <div className="file-preview">
        {isImage(file) ? (
          <img
            src={preview}
            alt="Repair request attachment preview"
            className="preview-image"
          />
        ) : (
          <div className="preview-document">
            <span>📄</span>
            <p>{getAttachmentName(file)}</p>
          </div>
        )}
      </div>
    );
  };

  const fetchBalagruha = async () => {
    try {
      const response = await getBalagruha();

      if (response.success) {
        setBalagruhas(response.data.balagruhas || []);

      } else {
        showToast(
          "Error fetching balagruha: " + (response.message || "Unknown error"),
          "error"
        );
      }
    } catch (error) {
      console.error("Error fetching balagruha:", error);
      showToast(
        "Error fetching balagruha: " + (error.message || "Unknown error"),
        "error"
      );
    }
  };
  const filteredRepairRequests = repairRequests.filter((bal) => {
    if (!bal) return false;

    const reportedDate = dayjs(bal.dateReported);

    let passesDateFilter = true;

    if (selectDate === "today") {
      passesDateFilter = reportedDate.isSame(dayjs(), "day");
    }

    if (selectDate === "thisWeek") {
      passesDateFilter = reportedDate.isSame(dayjs(), "week");
    }

    if (selectDate === "thisMonth") {
      passesDateFilter = reportedDate.isSame(dayjs(), "month");
    }

    if (selectDate === "lastMonth") {
      const lastMonth = dayjs().subtract(1, "month");
      passesDateFilter =
        reportedDate.month() === lastMonth.month() &&
        reportedDate.year() === lastMonth.year();
    }

    else if (selectDate === "custom") {
      if (!fromDate || !toDate) {
        passesDateFilter = true;
      } else if (dayjs(fromDate).isAfter(dayjs(toDate))) {
        passesDateFilter = false;
      } else {
        passesDateFilter =
          reportedDate.isSameOrAfter(dayjs(fromDate).startOf("day")) &&
          reportedDate.isSameOrBefore(dayjs(toDate).endOf("day"));
      }
    }

    const passesBalagruhaFilter =
      filterBalagruha === "all" ||
      bal.balagruhaId?._id === filterBalagruha ||
      bal.balagruhaId === filterBalagruha;

    const searchFilter =
      !repairSearch ||
      bal?.issueName?.toLowerCase().includes(repairSearch.toLowerCase());

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
      req.issueName || "",
      req.description || "",
      dayjs(req.dateReported).format("DD-MM-YYYY"),
      req.urgency || "",
      req.balagruhaId?.name || req.balagruhaName || "",
      req.status || "",
      `₹${req.estimatedCost || 0}`,
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

  const renderSkeletonRows = (rowCount = 5, columnCount = 8) => (
    <tbody>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={`skeleton-row-${rowIndex}`}>
          {Array.from({ length: columnCount }).map((_, columnIndex) => (
            <td key={`skeleton-cell-${rowIndex}-${columnIndex}`}>
              <div className="skeleton-cell">&nbsp;</div>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  return (
    <div style={{ width: "100%", margin: "20px" }}>
      <div className="purchase-repairs-section">
        <div className="date-container">
          <div className="date-picker">
            <div>
              <button
                onClick={() => setSelectDate(null)}
                className={`date-picker-button ${selectDate === null ? "selected" : ""
                  }`}
              >
                All
              </button>
            </div>
            <div>
              <button
                onClick={() => setSelectDate("today")}
                className={`date-picker-button ${selectDate === "today" ? "selected" : ""
                  }`}
              >
                Today
              </button>
            </div>
            <div>
              <button
                onClick={() => setSelectDate("thisWeek")}
                className={`date-picker-button ${selectDate === "thisWeek" ? "selected" : ""
                  }`}
              >
                This week
              </button>
            </div>
            <div>
              <button
                onClick={() => setSelectDate("thisMonth")}
                className={`date-picker-button ${selectDate === "thisMonth" ? "selected" : ""
                  }`}
              >
                This month
              </button>
            </div>
            <div>
              <button
                onClick={() => setSelectDate("lastMonth")}
                className={`date-picker-button ${selectDate === "lastMonth" ? "selected" : ""
                  }`}
              >
                Last Month
              </button>
            </div>
            <div>
              <button
                onClick={() => setSelectDate(selectDate === "custom" ? null : "custom")}
                className={`date-picker-button ${selectDate === "custom" ? "selected" : ""
                  }`}
              >
                Custom
              </button>
            </div>
          </div>
          {selectDate === "custom" && (
            <div className="custom-date-container">
              <div className="from-to-container">
                <div>
                  <label htmlFor="repair-from-date">From date</label>
                  <input
                    type="date"
                    id="repair-to-date"
                    className="from-to-date-input"
                    value={toDate}
                    min={fromDate}
                    max={dayjs().format("YYYY-MM-DD")}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="repair-to-date">To date</label>
                  <input
                    type="date"
                    id="repair-from-date"
                    className="from-to-date-input"
                    value={fromDate}
                    max={toDate || dayjs().format("YYYY-MM-DD")}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="purchase-section-header">
          <div style={{ marginTop: "10px" }}>
            <div
              style={{
                maxWidth: "700px",
                marginBottom: "10px",
                display: "flex",
                gap: "10px",
              }}
            >
              <div style={{ position: "relative", width: "500px" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                >
                  🔍
                </span>

                <input
                  type="text"
                  id="repair-search"
                  placeholder="Search Issue Name"
                  onChange={(e) => setRepairSearch(e.target.value)}
                  aria-label="Search repair requests by issue name"
                  style={{
                    paddingLeft: "42px",
                    borderRadius: "30px",
                    border: "2px solid #7ed6df",
                    fontWeight: "500",
                    fontFamily: "'Patrick Hand', cursive",
                    color: "black",
                  }}
                />
              </div>
              <select
                id="repair-filter-balagruha"
                value={filterBalagruha}
                onChange={(e) => setFilterBalagruha(e.target.value)}
                className="filter-select"
                aria-label="Filter by balagruha"
              >
                <option value="all">All Balagruhas</option>
                {balagruhas.map((bg, index) => (
                  <option key={index} value={bg._id}>
                    {bg.name}
                  </option>
                ))}
              </select>
              <select
                id="repair-filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="in-progress">In progress</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div>
            <button
              className="purchase-action-button"
              onClick={() => openRepairModal()}
              disabled={isRefreshing}
            >
              + New Repair Request
            </button>
            <button
              className="purchase-action-button"
              style={{ marginLeft: "20px" }}
              onClick={exportToPDF}
            >
              Export Data
            </button>
          </div>
        </div>

        {fetchError && (
          <div className="error-banner">
            {fetchError}
            <button
              className="retry-button"
              onClick={() => fetchRepairRequests()}
            >
              Retry
            </button>
          </div>
        )}
        <div
          className="purchase-data-table"
          style={{ position: "relative", minHeight: "200px" }}
        >
          {isRefreshing && !isInitialLoading && (
            <div className="table-refresh-overlay">
              <span className="spinner-small" /> Updating…
            </div>
          )}
          {isInitialLoading ? (
            <table>
              <thead>
                <tr>
                  <th>Issue Name</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Urgency</th>
                  <th>Balagruha</th>
                  <th>Status</th>
                  <th>Est. Cost</th>
                  <th>Actions</th>
                </tr>
              </thead>
              {renderSkeletonRows(5, 8)}
            </table>
          ) : filteredRepairRequests.length === 0 ? (
            <div className="empty-state">No repair requests found.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Issue Name</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Urgency</th>
                  <th>Balagruha</th>
                  <th>Status</th>
                  <th>Est. Cost</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRepairRequests?.map((request) => (
                  <tr key={request._id}>
                    <td>{request.issueName}</td>
                    <td>{request.description}</td>
                    <td>
                      {new Date(request.dateReported).toLocaleDateString()}
                    </td>
                    <td>
                      <span
                        className={`purchase-tag purchase-${request.urgency?.toLowerCase()}`}
                      >
                        {request.urgency}
                      </span>
                    </td>
                    <td>
                      {request.balagruhaId?.name ||
                        request.balagruhaName ||
                        "N/A"}
                    </td>
                    <td>
                      <span
                        className={`purchase-tag purchase-status-${request.status?.toLowerCase()}`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td>₹{request.estimatedCost}</td>
                    <td className="action-buttons">
                      <button
                        className="purchase-icon-button edit"
                        onClick={() => openRepairModal(request)}
                        disabled={mutatingId === request._id}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="purchase-icon-button delete"
                        onClick={() => handleDeleteRepair(request._id)}
                        disabled={mutatingId === request._id}
                        title="Delete"
                      >
                        {mutatingId === request._id ? "…" : "🗑️"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Confirmation Modal */}
        {showDeleteConfirmation && (
          <div className="modal-overlay">
            <div className="modal-container confirmation-modal">
              <div className="modal-header">
                <h3>Confirm Delete</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowDeleteConfirmation(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this repair request?</p>
                <p>This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button
                  className="cancel-button"
                  onClick={() => setShowDeleteConfirmation(false)}
                  disabled={mutatingId === deleteId}
                >
                  Cancel
                </button>
                <button
                  className="delete-button"
                  onClick={confirmDelete}
                  disabled={mutatingId === deleteId}
                >
                  {mutatingId === deleteId ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showRepairModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>
                {editingItem ? "Edit Repair Request" : "New Repair Request"}
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowRepairModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleRepairSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="repair-balagruha">Balagruha *</label>
                  <select
                    id="repair-balagruha"
                    value={repairForm.balagruhaId}
                    onChange={(e) => {
                      setSelectedBalagruha(e.target.value);
                      setRepairForm((prev) => ({
                        ...prev,
                        balagruhaId: e.target.value,
                      }));
                    }}
                    required
                  >
                    <option value="">Select Balagruha</option>
                    {balagruhas.map((bal) => (
                      <option key={bal._id} value={bal._id}>
                        {bal.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="repair-issue-name">Issue Name *</label>
                  <input
                    type="text"
                    id="repair-issue-name"
                    value={repairForm.issueName}
                    onChange={(e) =>
                      setRepairForm((prev) => ({
                        ...prev,
                        issueName: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="repair-description">Description *</label>
                  <textarea
                    id="repair-description"
                    value={repairForm.description}
                    onChange={(e) =>
                      setRepairForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="repair-date-reported">Date Reported</label>
                  <input
                    type="datetime-local"
                    id="repair-date-reported"
                    value={repairForm.dateReported.slice(0, 16)}
                    onChange={(e) =>
                      setRepairForm((prev) => ({
                        ...prev,
                        dateReported: new Date(e.target.value).toISOString(),
                      }))
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="repair-urgency">Urgency:</label>
                  <select
                    id="repair-urgency"
                    value={repairForm.urgency}
                    onChange={(e) =>
                      setRepairForm((prev) => ({
                        ...prev,
                        urgency: e.target.value,
                      }))
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="repair-estimated-cost">Estimated Cost *</label>
                  <input
                    type="number"
                    id="repair-estimated-cost"
                    value={repairForm.estimatedCost}
                    onChange={(e) =>
                      setRepairForm((prev) => ({
                        ...prev,
                        estimatedCost: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                {editingItem && (
                  <div className="form-group">
                    <label htmlFor="repair-status">Status:</label>
                    <select
                      id="repair-status"
                      value={repairForm.status}
                      onChange={(e) =>
                        setRepairForm((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label>Attachments:</label>
                  <div className="file-upload-container">
                    <input
                      type="file"
                      id="file-upload"
                      onChange={handleFileUpload}
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                    />
                    <label htmlFor="file-upload" className="file-upload-label">
                      Choose Files (PDF, Images)
                    </label>
                  </div>

                  {repairForm.attachments.length > 0 && (
                    <div className="uploaded-files">
                      <h4>Selected Files:</h4>
                      <ul>
                        {repairForm.attachments.map((file, index) => (
                          <li key={index}>
                            {file.name}
                            <button
                              type="button"
                              className="remove-file"
                              onClick={() => removeFile(index)}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {editingItem &&
                    repairForm.existingAttachments?.filter((file) => {
                      const url = getAttachmentUrl(file);
                      const ext = getAttachmentExtension(file);
                      return url && ["jpg", "jpeg", "png", "gif"].includes(ext);
                    }).length > 0 && (
                      <div className="existing-attachments">
                        <h4>Existing Attachments:</h4>
                        <div className="attachments-grid">
                          {repairForm.existingAttachments
                            .filter((file) => {
                              const url = getAttachmentUrl(file);
                              const ext = getAttachmentExtension(file);
                              return url && ["jpg", "jpeg", "png", "gif"].includes(ext);
                            })
                            .map((file, index) => (
                              <div
                                key={`existing-${index}`}
                                className="attachment-item"
                              >
                                <FilePreview file={file} />
                                <div className="attachment-actions">
                                  <a
                                    href={getAttachmentUrl(file)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="view-button"
                                  >
                                    View
                                  </a>

                                  <button
                                    type="button"
                                    className="remove-file"
                                    onClick={() => {
                                      setRepairForm((prev) => ({
                                        ...prev,
                                        existingAttachments: prev.existingAttachments.filter(
                                          (_, i) => i !== index
                                        ),
                                      }));
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowRepairModal(false)}
                  disabled={isRefreshing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={isRefreshing}
                >
                  {isRefreshing
                    ? "Processing..."
                    : editingItem
                      ? "Update Request"
                      : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
