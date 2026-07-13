import React, { useState, useEffect, useRef } from "react";
import "./usermanagement.css";
import {
  addUsers,
  deleteUsers,
  fetchUsers,
  coachBasedUsers,
  getBalagruha,
  updateUsers,
  getMachines,
  getBalagruhaById,
  getBalagruhaListByAssignedID,
  getBalagruhaListbyUserID,
  getUserById,
} from "../../api";
import { usePermission } from "../../hooks/usePermission";
import { useAuth } from "../../contexts/AuthContext";
import UserForm from "./UserForm";

const ITEMS_PER_PAGE = 10;

const UserManagement = () => {
  const [view, setView] = useState("list");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterBalagruha, setFilterBalagruha] = useState("all");
  const [balagruhas, setBalagruhas] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    status: "active",
    age: "",
    gender: "",
    balagruhaIds: [],
    parentalStatus: "",
    guardianContact: "",
    assignedMachines: [],
    facialData: null,
  });
  const [balagruhaOptions, setBalagruhaOptions] = useState([
    { value: "67b63186d2486ca7b43fe418", label: "Balagruha 1" },
  ]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [facialDataFile, setFacialDataFile] = useState(null);
  const [facialDataPreview, setFacialDataPreview] = useState(null);
  const facialDataRef = useRef(null);
  const [formErrors, setFormErrors] = useState({});
  const { user } = useAuth();
  const { canCreate, canRead, canUpdate, canDelete } = usePermission();
  const canCreateUser = canCreate("User Management");
  const canReadUser = canRead("User Management");
  const canUpdateUser = canUpdate("User Management");
  const isAdmin = localStorage.getItem("role") === "admin";

  const canDeleteUser =
    isAdmin || canDelete("User Management");

  const storedRoleRaw = localStorage.getItem("role") || "";
  const storedRole = storedRoleRaw.toLowerCase();
  const coachOnlyRoles = new Set(["coach", "sports-coach", "music-coach"]);
  const coachRoleSet = new Set([...coachOnlyRoles, "medical-incharge"]);
  const isCoachLike = coachRoleSet.has(storedRole);
  const shouldHideOtherCoaches = coachOnlyRoles.has(storedRole);
  const currentUserId = localStorage.getItem("userId");

  const normalizeBalagruhaId = (value) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      const candidate = value._id || value.id || value;
      return candidate ? candidate.toString() : null;
    }
    return String(value);
  };

  useEffect(() => {
    getBalagruhaList();
    getUsers();
    getBalagruhaByUserId();
  }, []);

  // Reset to page 1 whenever filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, filterBalagruha, filterStatus]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownOpen &&
        !event.target.closest(".dropdown-checkbox-container")
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (view === "edit" && selectedUser) {
      setFormData({
        name: selectedUser.name,
        email: selectedUser.email,
        password: "",
        role: selectedUser.role,
        status: selectedUser.status,
        age: selectedUser.age || "",
        gender: selectedUser.gender || "",
        balagruhaId: selectedUser.balagruhaId || "",
        parentalStatus: selectedUser.parentalStatus || "",
        guardianContact: selectedUser.guardianContact || "",
      });
      if (selectedUser.facialDataUrl) {
        setFacialDataPreview(selectedUser.facialDataUrl);
      } else {
        setFacialDataPreview(null);
      }
    }
  }, [view, selectedUser]);

  const getUsers = async () => {
    try {
      if (isCoachLike) {
        const response = await coachBasedUsers();
        setUsers(response);
        return;
      }
      const response = await fetchUsers();
      const userList = Array.isArray(response)
        ? response
        : response.data || [];
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const getBalagruhaByUserId = async () => {
    try {
      const id = localStorage.getItem("userId");
      const response = await getBalagruhaById(id);
      setBalagruhas(response?.data?.balagruhas || []);
    } catch (error) {
      console.error("Error fetching balagruha list:", error);
    }
  };

  const getBalagruhaList = async () => {
    try {
      const role = (localStorage.getItem("role") || "").toLowerCase();
      const isCoachLike = [
        "coach",
        "sports-coach",
        "music-coach",
        "medical-incharge",
      ].includes(role);

      if (isCoachLike) {
        const userId = localStorage.getItem("userId");
        const userResp = await getBalagruhaListbyUserID(userId);
        let options = userResp?.data?.balagruhas || [];

        if (!Array.isArray(options) || options.length === 0) {
          const assignedResp = await getBalagruhaListByAssignedID(userId);
          options = assignedResp?.data?.balagruhas || [];
        }

        setBalagruhaOptions(options);
        return;
      }

      const response = await getBalagruha();
      setBalagruhaOptions(response?.data?.balagruhas || []);
    } catch (error) {
      console.error("Error fetching balagruha list:", error);
    }
  };

  const handleEditUserClick = async (userRecord) => {
    if (!userRecord) return;

    let resolvedUser = userRecord;
    try {
      if (userRecord?._id) {
        const detailedUser = await getUserById(userRecord._id);
        if (detailedUser && detailedUser._id) {
          resolvedUser = { ...userRecord, ...detailedUser };
        }
      }
    } catch (error) {
      console.error("Error fetching user details for edit:", error);
    }

    const previewSource =
      resolvedUser?.facialDataUrl ||
      resolvedUser?.facialData?.url ||
      resolvedUser?.facialData?.location ||
      resolvedUser?.facialData?.photoUrl ||
      null;

    setSelectedUser(resolvedUser);
    setFacialDataPreview(previewSource);
    setFacialDataFile(null);
    setFormErrors({});
    setView("edit");
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormErrors({ ...formErrors, [fileType]: "File size exceeds 5MB limit" });
      return;
    }

    if (formErrors[fileType]) {
      setFormErrors({ ...formErrors, [fileType]: null });
    }

    if (fileType === "facialData") {
      if (!file.type.startsWith("image/")) {
        setFormErrors({ ...formErrors, facialData: "Only image files are allowed" });
        return;
      }
      setFacialDataFile(file);
      const fileReader = new FileReader();
      fileReader.onload = () => setFacialDataPreview(fileReader.result);
      fileReader.readAsDataURL(file);
    }
  };

  // ─── Filter + Sort ───────────────────────────────────────────────────────────
  const filteredUsers = users
    .filter((user) => {
      const role = localStorage.getItem("role");

      if (
        searchTerm &&
        !user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      if (filterRole !== "all" && user.role !== filterRole) return false;
      if (filterStatus !== "all" && user.status !== filterStatus) return false;

      if (
        (["coach", "medical-incharge", "sports-coach", "music-coach", "admin"].includes(role)) &&
        filterBalagruha !== "all"
      ) {
        const userBalagruhaIds = (user.balagruhaIds || [])
          .map((bg) => normalizeBalagruhaId(bg))
          .filter(Boolean);
        const normalizedFilter = normalizeBalagruhaId(filterBalagruha);
        return userBalagruhaIds.includes(normalizedFilter);
      }

      return true;
    })
    .sort((a, b) => {
      let valueA, valueB;
      switch (sortBy) {
        case "name":
          valueA = a?.name?.toLowerCase();
          valueB = b?.name?.toLowerCase();
          break;
        case "email":
          valueA = a?.email?.toLowerCase();
          valueB = b?.email?.toLowerCase();
          break;
        case "role":
          valueA = a?.role?.toLowerCase();
          valueB = b?.role?.toLowerCase();
          break;
        case "status":
          valueA = a?.status?.toLowerCase();
          valueB = b?.status?.toLowerCase();
          break;
        case "lastLogin":
          valueA = a?.lastLogin ? new Date(a.lastLogin) : new Date(0);
          valueB = b?.lastLogin ? new Date(b.lastLogin) : new Date(0);
          break;
        default:
          valueA = a?.name?.toLowerCase();
          valueB = b?.name?.toLowerCase();
      }
      return sortOrder === "asc" ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
    })
    .filter((user) => {
      if (!shouldHideOtherCoaches) return true;
      const userRoleLower = (user?.role || "").toLowerCase();
      if (coachOnlyRoles.has(userRoleLower)) {
        const id = user?._id ? user._id.toString() : "";
        if (!currentUserId) return true;
        return id === currentUserId;
      }
      return true;
    });

  // ─── Pagination ──────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pages.push(i);
      } else if (
        (i === currentPage - 2 && i > 1) ||
        (i === currentPage + 2 && i < totalPages)
      ) {
        pages.push("...");
      }
    }
    // Deduplicate "..." entries
    return pages.filter(
      (p, idx, arr) => !(p === "..." && arr[idx - 1] === "...")
    );
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const uniqueRoles = [...new Set(users.map((user) => user.role))];

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  };

  const getRoleEmoji = (role) => {
    switch (role) {
      case "admin": return "👑";
      case "coach": return "🏆";
      case "incharge": return "🏠";
      case "student": return "🎓";
      case "purchase": return "🛒";
      case "medical": return "⚕️";
      default: return "👤";
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin": return "#8e44ad";
      case "coach": return "#2980b9";
      case "incharge": return "#16a085";
      case "student": return "#f39c12";
      case "purchase": return "#c0392b";
      case "medical": return "#27ae60";
      default: return "#7f8c8d";
    }
  };

  const getStatusColor = (status) =>
    status === "active" ? "#27ae60" : "#e74c3c";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    const email = (formData.email || "").trim();
    if (formData.role !== "student" && !email) {
      errors.email = "Email is required";
    } else if (email && !/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Email is invalid";
    } else if (
      email &&
      view === "add" &&
      users.some((user) => (user.email || "").toLowerCase() === email.toLowerCase())
    ) {
      errors.email = "Email already exists";
    }
    if (formData.role !== "student" && view === "add" && !formData.password.trim()) errors.password = "Password is required";
    else if (formData.role !== "student" && view === "add" && formData.password.length < 3)
      errors.password = "Password must be at least 4 characters";
    if (!formData.role) errors.role = "Role is required";
    if (formData.role === "student") {
      if (!formData.age) errors.age = "Age is required";
      if (!formData.gender) errors.gender = "Gender is required";
      if (!formData.parentalStatus) errors.parentalStatus = "Parental status is required";
      // if (!formData.guardianContact) errors.guardianContact = "Guardian contact is required";
      if (!formData.balagruhaId) errors.balagruhaId = "Please select a Balagruha";
      if (view === "add" && !facialDataFile && !facialDataPreview)
        errors.facialData = "Facial photo is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      if ((formData.email || "").trim()) {
        formDataToSend.append("email", formData.email.trim());
      }
      formDataToSend.append("role", formData.role);
      formDataToSend.append("status", formData.status);
      if (view === "add" && formData.role !== "student") formDataToSend.append("password", formData.password);

      if (formData.role === "student") {
        formDataToSend.append("age", formData.age);
        formDataToSend.append("gender", formData.gender);
        formDataToSend.append("balagruhaId", formData.balagruhaId);
        formDataToSend.append("parentalStatus", formData.parentalStatus);
        formDataToSend.append("guardianContact", formData.guardianContact);
        if (facialDataFile) formDataToSend.append("facialData", facialDataFile);
      }

      if (view === "add") {
        await addUsers(formDataToSend, formData?.role);
        setConfirmationMessage("User added successfully!");
      } else if (view === "edit" && selectedUser) {
        await updateUsers(selectedUser._id, formDataToSend);
        setConfirmationMessage("User updated successfully!");
      }

      setShowConfirmation(true);
      getUsers();
      setView("list");
      setFormData({
        name: "", email: "", password: "", role: "student", status: "active",
        age: "", gender: "", balagruhaIds: "", parentalStatus: "", guardianContact: "",
      });
      setFacialDataFile(null);
      setFacialDataPreview(null);
      setTimeout(() => setShowConfirmation(false), 2000);
    } catch (error) {
      console.error("Error processing user:", error);
      setConfirmationMessage("Failed to process user. Please try again.");
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);
    }
  };

  const handleDeleteUser = async () => {
    if (selectedUser) {
      try {
        await deleteUsers(selectedUser._id);
        setUsers(users.filter((user) => user._id !== selectedUser._id));
        setShowDeleteModal(false);
        setConfirmationMessage("User deleted successfully!");
        setShowConfirmation(true);
        setTimeout(() => {
          setView("list");
          setShowConfirmation(false);
        }, 2000);
        getUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
        setConfirmationMessage("Failed to delete user. Please try again.");
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 2000);
      }
    }
  };

  const generateRandomPassword = () => {
    const chars = "123456789";
    let password = "";
    for (let i = 0; i < 7; i++)
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData({ ...formData, password });
  };

  const calculateMetrics = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.status === "active").length;
    const inactiveUsers = users.filter((u) => u.status === "inactive").length;
    const usersByRole = {};
    uniqueRoles.forEach((role) => {
      usersByRole[role] = users.filter((u) => u.role === role).length;
    });
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = users.filter(
      (u) => new Date(u.updatedAt) > thirtyDaysAgo
    ).length;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const recentLogins = users.filter(
      (u) => u.lastLogin && new Date(u.lastLogin) > oneDayAgo
    ).length;
    return { totalUsers, activeUsers, inactiveUsers, usersByRole, newUsers, recentLogins };
  };

  const handleCheckboxChange = (optionId) => {
    const updatedIds = formData.balagruhaIds.includes(optionId)
      ? formData.balagruhaIds.filter((id) => id !== optionId)
      : [...formData.balagruhaIds, optionId];
    setFormData({ ...formData, balagruhaIds: updatedIds });
  };

  const handleSuccess = (response) => {
    const createdUser = response?.data?.user || response?.data?.data?.user;
    getUsers();

    // Student User IDs are allocated atomically by the backend on creation.
    // Show the saved student in edit mode so the generated ID is visible in
    // the existing read-only Student User ID field.
    if (createdUser?.role === "student" && createdUser?.userId != null) {
      setSelectedUser(createdUser);
      setView("edit");
      return;
    }

    setSelectedUser(null);
    setFilterRole("all");
    setFilterStatus("all");
    setFilterBalagruha("all");
    setShowAdvancedSearch(false);
    setView("list");
  };

  const clearAdvancedFilters = () => {
    setFilterRole("all");
    setFilterBalagruha("all");
    setFilterStatus("all");
  };

  const hasActiveAdvancedFilters =
    filterRole !== "all" || filterBalagruha !== "all" || filterStatus !== "all";

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("asc");
    }
  };

  const sortIcon = (col) =>
    sortBy === col ? (sortOrder === "asc" ? " ↑" : " ↓") : "";

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="user-management">

      {/* ── DASHBOARD ── */}
      {view === "dashboard" && (
        <div className="dashboard">
          <div className="metrics-cards">
            <div className="metric-card total">
              <h3>Total Users</h3>
              <div className="metric-value">{calculateMetrics().totalUsers}</div>
              <div className="metric-icon">👥</div>
            </div>
            <div className="metric-card active">
              <h3>Active Users</h3>
              <div className="metric-value">{calculateMetrics().activeUsers}</div>
              <div className="metric-icon">✅</div>
            </div>
            <div className="metric-card inactive">
              <h3>Inactive Users</h3>
              <div className="metric-value">{calculateMetrics().inactiveUsers}</div>
              <div className="metric-icon">❌</div>
            </div>
            <div className="metric-card new">
              <h3>New Users (30 days)</h3>
              <div className="metric-value">{calculateMetrics().newUsers}</div>
              <div className="metric-icon">🆕</div>
            </div>
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div className="user-list-view">

          {/* Metrics (admin only) */}
          {localStorage.getItem("role") === "admin" && (
            <div className="metrics-cards">
              <div className="metric-card total">
                <h3>Total Users</h3>
                <div className="metric-value">{calculateMetrics().totalUsers}</div>
                <div className="metric-icon">👥</div>
              </div>
              <div className="metric-card active">
                <h3>Active Users</h3>
                <div className="metric-value">{calculateMetrics().activeUsers}</div>
                <div className="metric-icon">✅</div>
              </div>
              <div className="metric-card inactive">
                <h3>Inactive Users</h3>
                <div className="metric-value">{calculateMetrics().inactiveUsers}</div>
                <div className="metric-icon">❌</div>
              </div>
              <div className="metric-card new">
                <h3>New Users (30 days)</h3>
                <div className="metric-value">{calculateMetrics().newUsers}</div>
                <div className="metric-icon">🆕</div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="list-controls">
            <div >
              <p className="search-icon"></p>
              <input
                type="text"
                id="user-search"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                aria-label="Search users by name or email"
              />
            </div>

            <button
              type="button"
              className={`advanced-search-button ${hasActiveAdvancedFilters ? "active" : ""
                }`}
              onClick={() => setShowAdvancedSearch(true)}
            >
              Advanced Search
              {hasActiveAdvancedFilters && <span className="filter-dot"></span>}
            </button>

            {canCreateUser && (
              <button
                className={`tab add-user-tab ${view === "add" ? "active" : ""}`}
                onClick={() => {
                  setView("add");
                  setSelectedUser(null);
                  setFormData({
                    name: "",
                    email: "",
                    password: "",
                    role: "student",
                    status: "active",
                    age: "",
                    gender: "",
                    balagruhaIds: [],
                    parentalStatus: "",
                    guardianContact: "",
                  });
                  setFacialDataFile(null);
                  setFacialDataPreview(null);
                  setFormErrors({});
                }}
              >
                ➕ Add User
              </button>
            )}
          </div>

          {showAdvancedSearch && (
            <div
              className="advanced-search-overlay"
              onClick={() => setShowAdvancedSearch(false)}
            >
              <div
                className="advanced-search-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="advanced-search-title"
              >
                <div className="advanced-search-header">
                  <h3 id="advanced-search-title">Advanced Search</h3>
                  <button
                    type="button"
                    className="advanced-search-close"
                    onClick={() => setShowAdvancedSearch(false)}
                    aria-label="Close advanced search"
                  >
                    ×
                  </button>
                </div>

                <div className="advanced-filter-grid">
                  {localStorage.getItem("role") === "admin" ? (
                    <>
                      <label className="advanced-filter-field">
                        <span>Balagruha</span>
                        <select
                          value={filterBalagruha}
                          onChange={(e) => setFilterBalagruha(e.target.value)}
                          className="filter-select"
                          aria-label="Filter by balagruha"
                        >
                          <option value="all">All Balagruhas</option>
                          {balagruhaOptions.map((bg, index) => (
                            <option key={index} value={bg._id}>{bg.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="advanced-filter-field">
                        <span>Role</span>
                        <select
                          value={filterRole}
                          onChange={(e) => setFilterRole(e.target.value)}
                          className="filter-select"
                          aria-label="Filter by role"
                        >
                          <option value="all">All Roles</option>
                          {uniqueRoles.map((role, index) => (
                            <option key={index} value={role}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : ["coach", "medical-incharge", "sports-coach", "music-coach"].includes(
                    localStorage.getItem("role")
                  ) ? (
                    <label className="advanced-filter-field">
                      <span>Balagruha</span>
                      <select
                        value={filterBalagruha}
                        onChange={(e) => setFilterBalagruha(e.target.value)}
                        className="filter-select"
                        aria-label="Filter by balagruha"
                      >
                        <option value="all">All Balagruhas</option>
                        {balagruhaOptions.map((bg, index) => (
                          <option key={index} value={bg._id}>{bg.name}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="advanced-filter-field">
                      <span>Role</span>
                      <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="filter-select"
                        aria-label="Filter by role"
                      >
                        <option value="all">All Roles</option>
                        {uniqueRoles.map((role, index) => (
                          <option key={index} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="advanced-filter-field">
                    <span>Status</span>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="filter-select"
                      aria-label="Filter by status"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>

                <div className="advanced-search-actions">
                  <button
                    type="button"
                    className="clear-filter-button"
                    onClick={clearAdvancedFilters}
                  >
                    Clear Filters
                  </button>
                  <button
                    type="button"
                    className="apply-filter-button"
                    onClick={() => setShowAdvancedSearch(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="list-meta">
            Showing{" "}
            {filteredUsers.length === 0
              ? 0
              : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            –{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of{" "}
            {filteredUsers.length} users
          </div>

          {/* Table */}
          <div className="user-table-container">
            <div className="table-scroll-wrapper">
              <table className="user-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("name")}>
                      Name{sortIcon("name")}
                    </th>
                    <th onClick={() => handleSort("email")}>
                      Email{sortIcon("email")}
                    </th>
                    <th onClick={() => handleSort("role")}>
                      Role{sortIcon("role")}
                    </th>
                    <th onClick={() => handleSort("status")}>
                      Status{sortIcon("status")}
                    </th>
                    <th onClick={() => handleSort("lastLogin")}>
                      Last Login{sortIcon("lastLogin")}
                    </th>
                    {(canUpdateUser || canDeleteUser) && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr
                      key={user._id}
                      className={user.status === "inactive" ? "inactive-row" : ""}
                    >
                      <td>
                        <div className="user-name-cell">
                          <div

                            style={{ backgroundColor: getRoleColor(user.role) }}
                          >

                          </div>
                          <span>{user.name}</span>
                        </div>
                      </td>
                      <td align="left">{user.email || "N/A"}</td>
                      <td align="left">
                        <div
                          className="role-badge"
                          style={{ backgroundColor: getRoleColor(user.role) }}
                        >
                          {/* <span className="role-emoji">{getRoleEmoji(user.role)}</span> */}
                          <span className="role-text">
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td align="left">
                        <div
                          className="user-status-indicator"
                          style={{ backgroundColor: getStatusColor(user.status) }}
                        >
                          {user.status === "active" ? "Active" : "Inactive"}
                        </div>
                      </td>
                      <td align="left">{formatDate(user.lastLogin)}</td>
                      {(canUpdateUser || canDeleteUser) && (
                        <td align="left"  >
                          <div className="action-buttons">
                            {canUpdateUser && (
                              <button
                                onClick={() => handleEditUserClick(user)}
                                title="Edit User"
                              >
                                ✏️
                              </button>
                            )}
                            {canDeleteUser && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteModal(true);
                                }}
                                title="Delete User"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="no-users">
                <div className="no-data-icon">🔍</div>
                <div className="no-data-message">No users match your search criteria</div>
              </div>
            )}
          </div>

          {/* ── PAGINATION ── */}
          {filteredUsers.length > 0 && (
            <div className="pagination-controls">
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              <div className="page-buttons">
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                >
                  «
                </button>
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  ‹
                </button>

                {getPageNumbers().map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="page-ellipsis">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      className={`page-btn ${p === currentPage ? "active" : ""}`}
                      onClick={() => setCurrentPage(p)}
                      aria-label={`Page ${p}`}
                      aria-current={p === currentPage ? "page" : undefined}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  className="page-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  ›
                </button>
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ADD / EDIT ── */}
      {(view === "add" || view === "edit") && (
        <UserForm
          mode={view}
          user={selectedUser}
          existingUsers={users}
          onSuccess={handleSuccess}
          onCancel={() => setView("list")}
        />
      )}

      {/* ── ACTIVITY ── */}
      {view === "activity" && selectedUser && (
        <div className="activity-view">
          <div className="activity-header">
            <div className="user-profile">
              <div
                className="user-avatar large"
                style={{ backgroundColor: getRoleColor(selectedUser.role) }}
              >
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <h2>{selectedUser.name}</h2>
                <div className="user-meta">
                  <div className="user-email">{selectedUser.email || "—"}</div>
                  <div
                    className="role-badge"
                    style={{ backgroundColor: getRoleColor(selectedUser.role) }}
                  >
                    {/* <span className="role-emoji">{getRoleEmoji(selectedUser.role)}</span> */}
                    <span className="role-text">
                      {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                    </span>
                  </div>
                  <div
                    className="status-indicator"
                    style={{ backgroundColor: getStatusColor(selectedUser.status) }}
                  >
                    {selectedUser.status === "active" ? "Active" : "Inactive"}
                  </div>
                </div>
                <div className="user-info-row">
                  <div className="info-item">
                    <span className="info-label">User ID:</span>
                    <span className="info-value">{selectedUser._id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Created:</span>
                    <span className="info-value">{formatDate(selectedUser.createdAt)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Login:</span>
                    <span className="info-value">{formatDate(selectedUser.lastLogin)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Balagruha:</span>
                    <span className="info-value">{selectedUser.balagruha}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="activity-actions">
              <button className="back-button" onClick={() => setView("list")}>
                ← Back to List
              </button>
              <button
                className="edit-button"
                onClick={() => {
                  setFormData({
                    name: selectedUser.name,
                    email: selectedUser.email,
                    password: "",
                    role: selectedUser.role,
                    status: selectedUser.status,
                    age: selectedUser.age || "",
                    gender: selectedUser.gender || "",
                    balagruhaId: selectedUser.balagruhaId || "",
                    parentalStatus: selectedUser.parentalStatus || "",
                    guardianContact: selectedUser.guardianContact || "",
                  });
                  setFormErrors({});
                  setView("edit");
                }}
              >
                ✏️ Edit User
              </button>
            </div>
          </div>

          <div className="activity-content">
            <h3>Activity Log</h3>
            {selectedUser.loginEvents && selectedUser.loginEvents.length > 0 ? (
              <div className="activity-timeline">
                {selectedUser.loginEvents.map((event, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-icon">
                      {event.action === "Login"
                        ? "🔑"
                        : event.action === "Logout"
                          ? "👋"
                          : event.action === "Password Change"
                            ? "🔒"
                            : "✏️"}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-time">{formatDate(event.timestamp)}</div>
                      <div className="timeline-title">{event.action}</div>
                      <div className="timeline-details">{event.details}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-activity">
                <div className="no-data-icon">📝</div>
                <div className="no-data-message">No activity recorded for this user</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation toast */}
      {showConfirmation && (
        <div className="confirmation-message">
          <div className="confirmation-icon">✅</div>
          <div className="confirmation-text">{confirmationMessage}</div>
        </div>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-icon">⚠️</div>
              <h3 className="modal-title">Confirm Deletion</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete the user{" "}
                <strong>{selectedUser.name}</strong>?
              </p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="delete-confirm-button" onClick={handleDeleteUser}>
                Yes, Delete User
              </button>
              <button className="cancel-button" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
