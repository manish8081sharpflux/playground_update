import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import "./taskmanagement.css";
import {
  addComment,
  addOrUpdateMusicTaskAttachments,
  addOrUpdateMusicTaskComments,
  addOrUpdateSportsTaskAttachments,
  addOrUpdateSportsTaskComments,
  createMusicTask,
  createSportsTask,
  createTask,
  deleteAttachemnets,
  deleteCommentinTask,
  fetchUsers,
  getAssignableTaskUsers,
  getBalagruha,
  getBalagruhaById,
  getSportsTaskListByBalagruha,
  getTaskBytaskId,
  getTasks,
  updateMusicTask,
  updateSportsTask,
  updateTask,
  updateTaskAttachments,
  getAnyUserBasedonRoleandBalagruha,
} from "../../api";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const capitalize = (str) =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === "success"
            ? "✅"
            : type === "error"
            ? "❌"
            : type === "info"
            ? "ℹ️"
            : "🔔"}
        </span>
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
};

// Toast Container Component
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Task Filter Component
const TaskFilter = ({ onFilterChange, filters, balagruhas, users }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [searchTerms, setSearchTerms] = useState({
    status: "",
    balagruha: "",
    priority: "",
    createdBy: "",
    assignedFor: "",
    type: "",
  });
  const filterRef = useRef(null);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef(null);
  const role = localStorage.getItem("role");

  const taskTypes = [
    { id: "sports", label: "🏃‍♂️ Sports Tasks" },
    { id: "music", label: "🎵 Music Tasks" },
    { id: "general", label: "📝 General Tasks" },
    { id: "purchase", label: "🛒 Purchase Tasks" },
    { id: "order", label: "🔧 Repair Tasks" },
    { id: "medical", label: "🏥 Medical Tasks" },
  ];

  useEffect(() => {
    // Initialize filters only once when component mounts
    if (
      balagruhas?.length > 0 &&
      (!filters.type?.length || !filters.balagruhaId?.length)
    ) {
      const defaultType = getDefaultTypeForRole(role);
      const defaultBalagruhaId = [balagruhas[0]._id];

      onFilterChange({
        ...filters,
        balagruhaId: defaultBalagruhaId,
        type: defaultType,
      });
    }
  }, [balagruhas]);

  const handleTypeChange = (typeId) => {
    const availableTypes = getAvailableTaskTypes().map((t) => t.id);

    if (!availableTypes.includes(typeId)) {
      return;
    }

    const currentTypes = filters.type || [];
    let newTypes;

    if (currentTypes.includes(typeId)) {
      newTypes = currentTypes.filter((id) => id !== typeId);
    } else {
      newTypes = [...currentTypes, typeId];
    }

    // Ensure balagruhaId is set when changing type
    const currentBalagruhaId =
      filters.balagruhaId ||
      (balagruhas?.length > 0 ? [balagruhas[0]._id] : []);

    onFilterChange({
      ...filters,
      type: newTypes,
      balagruhaId: currentBalagruhaId,
    });
  };

  const getAvailableTaskTypes = () => {
    switch (role) {
      case "sports-coach":
        return taskTypes.filter(
          (type) => type.id === "sports" || type.id === "general"
        );
      case "music-coach":
        return taskTypes.filter(
          (type) => type.id === "music" || type.id === "general"
        );
      case "purchase-manager":
        return taskTypes.filter(
          (type) => type.id === "purchase" || type.id === "general"
        );
      case "medical-manager":
      case "medical-incharge":
        return taskTypes.filter(
          (type) => type.id === "medical" || type.id === "general"
        );
      default:
        return taskTypes;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target)
      ) {
        setIsTypeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsOpen(false);

        setActiveFilter(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleFilter = (filterName) => {
    if (activeFilter === filterName) {
      setActiveFilter(null);
    } else {
      setActiveFilter(filterName);
      setIsOpen(true);
    }
  };

  // const handleCheckboxChange = (filterType, value) => {
  //     const newFilters = { ...filters };

  //     if (!newFilters[filterType]) {
  //         newFilters[filterType] = [value];
  //     } else if (newFilters[filterType].includes(value)) {
  //         newFilters[filterType] = newFilters[filterType].filter(item => item !== value);
  //         if (newFilters[filterType].length === 0) {
  //             delete newFilters[filterType];
  //         }
  //     } else {
  //         newFilters[filterType] = [...newFilters[filterType], value];
  //     }

  //     onFilterChange(newFilters);
  // };

  // const handleCheckboxChange = useCallback((filterType, value) => {
  //     onFilterChange(prevFilters => {
  //         const newFilters = { ...prevFilters };

  //         if (!newFilters[filterType]) {
  //             newFilters[filterType] = [value];
  //         } else if (newFilters[filterType].includes(value)) {
  //             newFilters[filterType] = newFilters[filterType].filter(item => item !== value);
  //             if (newFilters[filterType].length === 0) {
  //                 delete newFilters[filterType];
  //             }
  //         } else {
  //             newFilters[filterType] = [...newFilters[filterType], value];
  //         }

  //         return newFilters;
  //     });
  // }, []);

  const handleCheckboxChange = useCallback(
    (filterType, value) => {
      const newFilters = { ...filters };

      if (!newFilters[filterType]) {
        newFilters[filterType] = [value];
      } else if (newFilters[filterType].includes(value)) {
        newFilters[filterType] = newFilters[filterType].filter(
          (item) => item !== value
        );
        if (newFilters[filterType].length === 0) {
          delete newFilters[filterType];
        }
      } else {
        newFilters[filterType] = [...newFilters[filterType], value];
      }

      // Make immediate API call with new filters
      onFilterChange(newFilters);
    },
    [filters, onFilterChange]
  );

  // const handleBalagruhaChange = (balagruhaId) => {
  //     const newBalagruhaId = filters.balagruhaId?.includes(balagruhaId)
  //         ? filters.balagruhaId.filter(id => id !== balagruhaId)
  //         : [...(filters.balagruhaId || []), balagruhaId];

  //     // Ensure type is set when changing balagruha
  //     let currentType = filters.type;
  //     if (!currentType || currentType.length === 0) {
  //         switch (role) {
  //             case 'sports-coach':
  //                 currentType = ['sports'];
  //                 break;
  //             case 'music-coach':
  //                 currentType = ['music'];
  //                 break;
  //             default:
  //                 currentType = ['general'];
  //         }
  //     }

  //     onFilterChange({
  //         ...filters,
  //         balagruhaId: newBalagruhaId,
  //         type: currentType
  //     });
  // };

  const handleBalagruhaChange = (balagruhaId) => {
    // Create a new state object
    const newFilters = { ...filters };

    // Update balagruhaId directly
    if (!newFilters.balagruhaId?.includes(balagruhaId)) {
      newFilters.balagruhaId = [...(newFilters.balagruhaId || []), balagruhaId];
    } else {
      newFilters.balagruhaId = newFilters.balagruhaId.filter(
        (id) => id !== balagruhaId
      );
    }

    // Only update type if it's not set
    if (!newFilters.type?.length) {
      newFilters.type = getDefaultTypeForRole(role);
    }

    onFilterChange(newFilters);
  };

  // Helper function to get default type
  const getDefaultTypeForRole = (role) => {
    switch (role) {
      case "sports-coach":
        return ["sports"];
      case "music-coach":
        return ["music"];
      case "medical-manager":
        return ["medical"];
      default:
        return ["general"];
    }
  };

  useEffect(() => {
    // Set initial type based on role if not already set
    if (!filters.type || filters.type.length === 0) {
      let initialType;
      switch (role) {
        case "sports-coach":
          initialType = ["sports"];
          break;
        case "music-coach":
          initialType = ["music"];
          break;
        default:
          initialType = ["general"]; // or [] if you want no default for other roles
      }

      onFilterChange({
        ...filters,
        type: initialType,
      });
    }
  }, []);

  const clearFilters = () => {
    let defaultType;
    switch (role) {
      case "sports-coach":
        defaultType = ["sports"];
        break;
      case "music-coach":
        defaultType = ["music"];
        break;
      default:
        defaultType = ["general"];
    }

    // Keep both balagruhaId and type while clearing other filters
    const defaultBalagruhaId =
      balagruhas && balagruhas.length > 0 ? [balagruhas[0]._id] : [];

    onFilterChange({
      balagruhaId: filters.balagruhaId || defaultBalagruhaId,
      type: defaultType,
    });
  };

  const getActiveFilterCount = () => {
    return Object.entries(filters)
      .filter(([key]) => key !== "balagruhaId")
      .reduce((count, [_, filterValues]) => {
        return count + (Array.isArray(filterValues) ? filterValues.length : 0);
      }, 0);
  };

  const handleSearchChange = (filterType, value) => {
    setSearchTerms((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  // Filter status options based on search
  const statusOptions = [
    { id: "pending", label: "Waiting to Start" },
    { id: "in progress", label: "Working On It" },
    { id: "completed", label: "All Done" },
  ].filter((option) =>
    option.label.toLowerCase().includes(searchTerms.status.toLowerCase())
  );

  // Filter priority options based on search
  const priorityOptions = [
    { id: "high", label: "High", icon: "🔴" },
    { id: "medium", label: "Medium", icon: "🟡" },
    { id: "low", label: "Low", icon: "🟢" },
  ].filter((option) =>
    option.label.toLowerCase().includes(searchTerms.priority.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveFilter(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter users based on search
  const filteredUsers =
    users?.filter((user) =>
      user.name.toLowerCase().includes(searchTerms.createdBy.toLowerCase())
    ) || [];

  const filterassignedFor =
    users?.filter((user) =>
      user.name.toLowerCase().includes(searchTerms.assignedFor.toLowerCase())
    ) || [];

  const filteredBalagruha =
    balagruhas?.filter((bal) =>
      bal.name.toLowerCase().includes(searchTerms.balagruha.toLowerCase())
    ) || [];
  const filteredTypes = getAvailableTaskTypes().filter((type) =>
    type.label.toLowerCase().includes(searchTerms.type.toLowerCase())
  );

  return (
    <div className="task-filter" ref={filterRef}>
      <div className="filter-buttons">
        <div style={{ position: "relative" }}>
          <button
            className={`filter-button ${
              activeFilter === "balagruha" ? "active" : ""
            }`}
            onClick={() => toggleFilter("balagruha")}
          >
            Balagruha{" "}
            {filters.balagruhaId ? `(${filters.balagruhaId.length})` : ""}
          </button>
          {isOpen && activeFilter === "balagruha" && (
            <div className="filter-dropdown">
              <div className="filter-search">
                <input
                  type="text"
                  placeholder="Search balagruha..."
                  value={searchTerms.balagruha}
                  onChange={(e) =>
                    handleSearchChange("balagruha", e.target.value)
                  }
                />
              </div>
              {filteredBalagruha.length > 0 ? (
                filteredBalagruha.map((balagruha) => (
                  <div key={balagruha._id} className="filter-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={filters.balagruhaId?.includes(balagruha._id)}
                        onChange={() => handleBalagruhaChange(balagruha._id)}
                      />
                      {balagruha.name}
                    </label>
                  </div>
                ))
              ) : (
                <div className="no-results">No matching balagruha found</div>
              )}
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            className={`filter-button ${
              activeFilter === "status" ? "active" : ""
            }`}
            onClick={() => toggleFilter("status")}
          >
            Status {filters.status?.length > 0 && `(${filters.status.length})`}
          </button>
          {isOpen && activeFilter === "status" && (
            <div className="filter-dropdown">
              <div className="filter-search">
                <input
                  type="text"
                  placeholder="Search status..."
                  value={searchTerms.status}
                  onChange={(e) => handleSearchChange("status", e.target.value)}
                />
              </div>
              {statusOptions.length > 0 ? (
                statusOptions.map((option) => (
                  <div key={option.id} className="filter-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={filters.status?.includes(option.id) || false}
                        onChange={() =>
                          handleCheckboxChange("status", option.id)
                        }
                      />
                      {option.label}
                    </label>
                  </div>
                ))
              ) : (
                <div className="no-results">No matching status found</div>
              )}
            </div>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <button
            className={`filter-button ${
              activeFilter === "priority" ? "active" : ""
            }`}
            onClick={() => toggleFilter("priority")}
          >
            Priority{" "}
            {filters.priority?.length > 0 && `(${filters.priority.length})`}
          </button>
          {isOpen && activeFilter === "priority" && (
            <div className="filter-dropdown">
              <div className="filter-search">
                <input
                  type="text"
                  placeholder="Search priority..."
                  value={searchTerms.priority}
                  onChange={(e) =>
                    handleSearchChange("priority", e.target.value)
                  }
                />
              </div>
              {priorityOptions.length > 0 ? (
                priorityOptions.map((option) => (
                  <div key={option.id} className="filter-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={filters.priority?.includes(option.id) || false}
                        onChange={() =>
                          handleCheckboxChange("priority", option.id)
                        }
                      />
                      <span className={`priority-indicator ${option.id}`}>
                        {option.icon}
                      </span>{" "}
                      {option.label}
                    </label>
                  </div>
                ))
              ) : (
                <div className="no-results">No matching priority found</div>
              )}
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            className={`filter-button ${
              activeFilter === "createdBy" ? "active" : ""
            }`}
            onClick={() => toggleFilter("createdBy")}
          >
            Created By{" "}
            {filters.createdBy?.length > 0 && `(${filters.createdBy.length})`}
          </button>
          {isOpen && activeFilter === "createdBy" && (
            <div className="filter-dropdown">
              <div className="filter-search">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerms.createdBy}
                  onChange={(e) =>
                    handleSearchChange("createdBy", e.target.value)
                  }
                />
              </div>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div key={user._id} className="filter-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={filters.createdBy?.includes(user._id) || false}
                        onChange={() =>
                          handleCheckboxChange("createdBy", user._id)
                        }
                      />
                      {user.name}{" "}
                      {user._id === localStorage.getItem("userId")
                        ? "(Me)"
                        : ""}
                    </label>
                  </div>
                ))
              ) : (
                <div className="no-results">No matching users found</div>
              )}
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            className={`filter-button ${
              activeFilter === "assignedFor" ? "active" : ""
            }`}
            onClick={() => toggleFilter("assignedFor")}
          >
            Assigned to{" "}
            {filters.assignedFor?.length > 0 &&
              `(${filters.assignedFor.length})`}
          </button>
          {isOpen && activeFilter === "assignedFor" && (
            <div className="filter-dropdown">
              <div className="filter-search">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerms.assignedFor}
                  onChange={(e) =>
                    handleSearchChange("assignedFor", e.target.value)
                  }
                />
              </div>
              {filterassignedFor.length > 0 ? (
                filterassignedFor.map((user) => (
                  <div key={user._id} className="filter-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          filters.assignedFor?.includes(user._id) || false
                        }
                        onChange={() =>
                          handleCheckboxChange("assignedFor", user._id)
                        }
                      />
                      {user.name}{" "}
                      {user._id === localStorage.getItem("userId")
                        ? "(Me)"
                        : ""}
                    </label>
                  </div>
                ))
              ) : (
                <div className="no-results">No matching users found</div>
              )}
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            className={`filter-button ${
              activeFilter === "type" ? "active" : ""
            }`}
            onClick={() => toggleFilter("type")}
          >
            Task Type {filters.type?.length > 0 && `(${filters.type.length})`}
          </button>

          {isOpen && activeFilter === "type" && (
            <div className="filter-dropdown">
              <div className="filter-search">
                <input
                  type="text"
                  placeholder="Search ..."
                  value={searchTerms.type}
                  onChange={(e) => handleSearchChange("type", e.target.value)}
                />
              </div>
              {filteredTypes.length > 0 ? (
                filteredTypes.map((type, index) => (
                  <div key={index} className="filter-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={filters.type?.includes(type.id) || false}
                        onChange={() => handleTypeChange(type.id)}
                      />
                      {type.label}
                    </label>
                  </div>
                ))
              ) : (
                <div className="no-results">No matching type found</div>
              )}
            </div>
          )}
        </div>

        {/* {getActiveFilterCount() > 0 && (
                    <button className="clear-filters-button" onClick={clearFilters}>
                        Clear All Filters ({getActiveFilterCount()})
                    </button>
                )} */}
      </div>
    </div>
  );
};

// File Preview Component
const FilePreview = ({ file }) => {
  const isImage = file.type.startsWith("image/");
  const isPDF = file.type === "application/pdf";

  return (
    <div className="file-preview-item">
      {isImage ? (
        <div className="image-preview">
          <img src={URL.createObjectURL(file)} alt={file.name} />
        </div>
      ) : isPDF ? (
        <div className="pdf-preview">
          <div className="pdf-icon">📄</div>
          <div className="pdf-name">{file.name}</div>
        </div>
      ) : (
        <div className="generic-file-preview">
          <div className="file-icon">📎</div>
          <div className="file-name">{file.name}</div>
        </div>
      )}
      <div className="file-info">
        <div className="file-name">{file.name}</div>
        <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
      </div>
    </div>
  );
};

// Comment Component
const Comment = ({ comment, users, onDelete }) => {
  const user = users.find((u) => u._id === comment.user) || {
    name: "Unknown User",
  };

  const formatDate = (dateString) => {
    const options = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="comment-item">
      <div className="comment-avatar">{user.name.charAt(0).toUpperCase()}</div>
      <div className="comment-content">
        <div className="comment-header">
          <span className="comment-author">{user.name}</span>
          <span className="comment-time">{formatDate(comment.createdAt)}</span>
          {typeof onDelete === "function" && (
            <button
              className="delete-button"
              onClick={() => onDelete(comment._id)}
            >
              Delete
            </button>
          )}
        </div>
        <div className="comment-text">{comment.comment}</div>
        {comment.attachments && comment.attachments.length > 0 && (
          <div className="comment-attachments">
            {comment.attachments.map((attachment, index) => (
              <div key={index} className="comment-attachment">
                <span className="attachment-icon">📎</span>
                <a
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {attachment.fileName}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Create Task Form Component
const CreateTaskForm = ({
  users,
  staffUsers = [],
  studentUsers = [],
  onSubmit,
  onCancel,
  balagruhaId,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // Default to 1 week from now
    assignedUser: [],
    status: "pending",
    balagruhaId: balagruhaId || "",
    attachments: [],
    drillOrExerciseType: "",
    machineDetails: "",
    vendorDetails: "",
    costEstimate: "",
    requiredParts: "",
    repairDetails: "",
    type: "general",
    // Medical task specific fields
    medicalBalagruhaId: "",
    students: [],
  });
  const [files, setFiles] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const fileInputRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const role = localStorage.getItem("role");

  // Medical task specific state
  const [availableBalagruhas, setAvailableBalagruhas] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [availableMedicalManagers, setAvailableMedicalManagers] = useState([]);
  const [isBalagruhaDropdownOpen, setIsBalagruhaDropdownOpen] = useState(false);
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [isAssignToDropdownOpen, setIsAssignToDropdownOpen] = useState(false);
  const [assignToSearchQuery, setAssignToSearchQuery] = useState("");
  const [assignSearchQuery, setAssignSearchQuery] = useState("");
  const balagruhaDropdownRef = useRef(null);
  const studentDropdownRef = useRef(null);
  const assignToDropdownRef = useRef(null);
  const assignableStaff = staffUsers || [];
  const assignableStudents = studentUsers || [];
  const allAssignableUsers = useMemo(
    () => [...assignableStaff, ...assignableStudents],
    [assignableStaff, assignableStudents]
  );

  const normalizedAssignSearch = assignSearchQuery.trim().toLowerCase();
  const filteredStaffUsers = useMemo(() => {
    if (!normalizedAssignSearch) {
      return assignableStaff;
    }
    return assignableStaff.filter((user) => {
      const name = user.name?.toLowerCase() || "";
      const roleLabel = user.role?.toLowerCase() || "";
      return (
        name.includes(normalizedAssignSearch) ||
        roleLabel.includes(normalizedAssignSearch)
      );
    });
  }, [assignableStaff, normalizedAssignSearch]);

  const filteredStudentUsers = useMemo(() => {
    if (!normalizedAssignSearch) {
      return assignableStudents;
    }
    return assignableStudents.filter((user) => {
      const name = user.name?.toLowerCase() || "";
      const roleLabel = user.role?.toLowerCase() || "";
      return (
        name.includes(normalizedAssignSearch) ||
        roleLabel.includes(normalizedAssignSearch)
      );
    });
  }, [assignableStudents, normalizedAssignSearch]);

  const initialType =
    role === "sports-coach"
      ? "sports"
      : role === "music-coach"
      ? "music"
      : role === "medical-manager" || role === "medical-incharge"
      ? "medical"
      : "general";

  const [type, setType] = useState(initialType);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef(null);
  const taskTypes = [
    { id: "sports", label: "🏃‍♂️ Sports Tasks" },
    { id: "music", label: "🎵 Music Tasks" },
    { id: "general", label: "📝 General Tasks" },
    { id: "purchase", label: "🛒 Purchase Tasks" },
    { id: "repair", label: "🔧 Repair Tasks" },
    { id: "medical", label: "🏥 Medical Tasks" },
  ];

  const assignedUserLabel = useMemo(() => {
    if (!formData.assignedUser || formData.assignedUser.length === 0) {
      return "Select Users";
    }
    return formData.assignedUser
      .map(
        (id) => allAssignableUsers.find((user) => user._id === id)?.name || "Unknown User"
      )
      .join(", ");
  }, [formData.assignedUser, allAssignableUsers]);

  const primaryAssigneeId = Array.isArray(formData.assignedUser)
    ? formData.assignedUser[0] || ""
    : formData.assignedUser || "";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target)
      ) {
        setIsTypeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const getSelectedTypeLabel = () => {
    const selectedType = taskTypes.find((t) => t.id === type);
    return selectedType ? selectedType.label : "Select Type";
  };

  // Handle type selection
  const handleTypeSelect = (selectedType) => {
    setType(selectedType);
    setIsTypeDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleCheckboxChange = (e) => {
    const { checked, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      assignedUser: checked
        ? [...(prev.assignedUser || []), value]
        : (prev.assignedUser || []).filter((id) => id !== value),
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    setFiles((prevFiles) => {
      const fileMap = new Map(prevFiles.map((file) => [file.name, file]));

      selectedFiles.forEach((file) => {
        if (!fileMap.has(file.name)) {
          fileMap.set(file.name, file);
        }
      });

      return Array.from(fileMap.values());
    });
  };

  const removeFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  // Medical task handlers
  const fetchMedicalManagerBalagruhas = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const response = await getBalagruhaById(userId);
      if (response.success && response.data) {
        setAvailableBalagruhas(response.data.balagruhas || []);
      }
    } catch (error) {
      console.error("Error fetching balagruhas:", error);
    }
  };

  const fetchStudentsByBalagruha = async (balagruhaId) => {
    try {
      const response = await getAnyUserBasedonRoleandBalagruha("student", balagruhaId);
      if (response.success) {
        setAvailableStudents(response.data.users || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchMedicalManagersByBalagruha = async () => {
    try {
      const currentUserId = localStorage.getItem("userId");
      const allUsers = [];

      // All roles except 'student'
      const rolesToFetch = [
        "admin",
        "coach",
        "balagruha-incharge",
        "purchase-manager",
        "medical-incharge",
        "sports-coach",
        "music-coach",
        "amma"
      ];

      // Fetch admins first (they're global, not tied to specific balagruhas)
      const adminResponse = await getAnyUserBasedonRoleandBalagruha("admin", availableBalagruhas[0]?._id);
      if (adminResponse.success) {
        const admins = adminResponse.data.users || [];
        allUsers.push(...admins);
      }

      // Fetch all other roles from ALL balagruhas that the current user has access to
      for (const balagruha of availableBalagruhas) {
        for (const role of rolesToFetch) {
          if (role !== "admin") { // Skip admin since we already fetched them globally
            const response = await getAnyUserBasedonRoleandBalagruha(role, balagruha._id);
            if (response.success) {
              const users = response.data.users || [];
              allUsers.push(...users);
            }
          }
        }
      }

      // Remove duplicates based on user ID
      const uniqueUsers = Array.from(new Map(allUsers.map(u => [u._id, u])).values());
      setAvailableMedicalManagers(uniqueUsers);
    } catch (error) {
      console.error("Error fetching assignable users:", error);
    }
  };

  const handleBalagruhaSelect = async (balagruhaId) => {
    setFormData((prev) => ({
      ...prev,
      medicalBalagruhaId: balagruhaId,
      students: [],
      assignedUser: [],
    }));
    setAvailableStudents([]);
    await fetchStudentsByBalagruha(balagruhaId);
    await fetchMedicalManagersByBalagruha();
    setIsBalagruhaDropdownOpen(false);
  };

  const handleStudentToggle = (studentId) => {
    setFormData((prev) => ({
      ...prev,
      students: prev.students.includes(studentId)
        ? prev.students.filter((id) => id !== studentId)
        : [...prev.students, studentId],
    }));
  };

  const handleAssignToSelect = (userId) => {
    setFormData((prev) => ({ ...prev, assignedUser: [userId] }));
    setIsAssignToDropdownOpen(false);
    setAssignToSearchQuery(""); // Clear search when user is selected
  };

  // Fetch balagruhas when medical type is selected
  useEffect(() => {
    if (type === "medical" && (role === "medical-manager" || role === "medical-incharge")) {
      fetchMedicalManagerBalagruhas();
    }
  }, [type, role]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (balagruhaDropdownRef.current && !balagruhaDropdownRef.current.contains(event.target)) {
        setIsBalagruhaDropdownOpen(false);
      }
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target)) {
        setIsStudentDropdownOpen(false);
      }
      if (assignToDropdownRef.current && !assignToDropdownRef.current.contains(event.target)) {
        setIsAssignToDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    }

    if (!formData.deadline) {
      errors.deadline = "Deadline is required";
    } else if (new Date(formData.deadline) < new Date().setHours(0, 0, 0, 0)) {
      errors.deadline = "Deadline cannot be in the past";
    }

    if (!formData.assignedUser || formData.assignedUser.length === 0) {
      errors.assignedUser = "At least one user must be assigned";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const taskData = {
      ...formData,
      type: type,
      attachments: files,
    };

    // For medical tasks, use medicalBalagruhaId as balagruhaId
    if (type === "medical") {
      taskData.balagruhaId = formData.medicalBalagruhaId;
      taskData.students = formData.students;
    }

    onSubmit(taskData);
  };

  const getAvailableTaskTypes = () => {
    switch (role) {
      case "sports-coach":
        return taskTypes.filter(
          (type) => type.id === "sports" || type.id === "general"
        );
      case "music-coach":
        return taskTypes.filter(
          (type) => type.id === "music" || type.id === "general"
        );
      case "purchase-manager":
        return taskTypes.filter(
          (type) => type.id === "purchase" || type.id === "general"
        );
      case "medical-manager":
      case "medical-incharge":
        return taskTypes.filter(
          (type) => type.id === "medical" || type.id === "general"
        );
      default:
        return taskTypes;
    }
  };

  return (
    <div className="create-task-container">
      <div className="create-task-header">
        <h2>Create New Task</h2>
        <button className="close-button" onClick={onCancel}>
          ×
        </button>
      </div>

      <form className="create-task-form" onSubmit={handleSubmit}>
        <div className="form-group" ref={typeDropdownRef}>
          <label>Task Type</label>
          <div className="custom-dropdown" style={{ position: "relative" }}>
            <button
              type="button"
              className="dropdown-toggle"
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            >
              {getSelectedTypeLabel()}
              <span className="arrow">&#9662;</span>
            </button>

            {isTypeDropdownOpen && (
              <div className="dropdown-menu">
                {taskTypes.map((taskType) => (
                  <div
                    key={taskType.id}
                    className={`dropdown-item ${
                      type === taskType.id ? "selected" : ""
                    }`}
                    onClick={() => handleTypeSelect(taskType.id)}
                  >
                    {taskType.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="title">
            Task Title <span className="required">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className={formErrors.title ? "error" : ""}
            placeholder="Enter task title"
          />
          {formErrors.title && (
            <div className="error-message">{formErrors.title}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="description">
            Description <span className="required">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className={formErrors.description ? "error" : ""}
            placeholder="Enter task description"
            rows="4"
          ></textarea>
          {formErrors.description && (
            <div className="error-message">{formErrors.description}</div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="deadline">
              Deadline <span className="required">*</span>
            </label>
            <input
              type="date"
              id="deadline"
              name="deadline"
              value={formData.deadline}
              onChange={handleInputChange}
              className={formErrors.deadline ? "error" : ""}
              min={new Date().toISOString().split("T")[0]}
            />
            {formErrors.deadline && (
              <div className="error-message">{formErrors.deadline}</div>
            )}
          </div>
        </div>

        {/* General Assign To field - exclude medical tasks as they have their own assign logic */}
        {type !== "medical" && (
          <div className="form-group dropdown-container" ref={dropdownRef}>
            <label>Assign To</label>
            <div className="dropdown">
              <button
                type="button"
                className="dropdown-toggle"
                onClick={toggleDropdown}
              >
                {assignedUserLabel}
                <span className="arrow">&#9662;</span>
              </button>

              {isDropdownOpen && (
                <div className="dropdown-menu" style={{ maxHeight: "260px", overflowY: "auto" }}>
                  <div className="filter-search" style={{ padding: "8px", borderBottom: "1px solid #e0e0e0" }}>
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={assignSearchQuery}
                      onChange={(e) => setAssignSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="dropdown-group">
                    <div className="dropdown-group-label" style={{ fontWeight: 600, padding: "8px" }}>
                      Staff
                    </div>
                    {filteredStaffUsers.length > 0 ? (
                      filteredStaffUsers.map((user) => (
                        <label key={user._id} className="dropdown-item">
                          <input
                            type="checkbox"
                            value={user._id}
                            checked={formData.assignedUser.includes(user._id)}
                            onChange={handleCheckboxChange}
                          />
                          {user.name} ({user.role})
                        </label>
                      ))
                    ) : (
                      <div className="dropdown-item" style={{ opacity: 0.7 }}>
                        No staff found
                      </div>
                    )}
                  </div>

                  <div className="dropdown-group">
                    <div className="dropdown-group-label" style={{ fontWeight: 600, padding: "8px" }}>
                      Students
                    </div>
                    {filteredStudentUsers.length > 0 ? (
                      filteredStudentUsers.map((user) => (
                        <label key={user._id} className="dropdown-item">
                          <input
                            type="checkbox"
                            value={user._id}
                            checked={formData.assignedUser.includes(user._id)}
                            onChange={handleCheckboxChange}
                          />
                          {user.name}
                        </label>
                      ))
                    ) : (
                      <div className="dropdown-item" style={{ opacity: 0.7 }}>
                        No students found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {formErrors.assignedUser && (
              <div className="error-message">{formErrors.assignedUser}</div>
            )}
          </div>
        )}

        {(localStorage.getItem("role") === "sports-coach" ||
          type == "sports" ||
          localStorage.getItem("role") === "music-coach" ||
          type == "music") && (
          <div className="form-group">
            <label htmlFor="drillOrExerciseType">Drill or Exercise Type</label>
            <input
              type="text"
              id="drillOrExerciseType"
              name="drillOrExerciseType" // Changed from 'title' to 'drillOrExerciseType'
              value={formData.drillOrExerciseType}
              onChange={handleInputChange}
              className={formErrors.drillOrExerciseType ? "error" : ""}
              placeholder="Enter drill or exercise type"
            />
            {/* {formErrors.drillOrExerciseType &&
                                <div className="error-message">{formErrors.drillOrExerciseType}</div>
                            } */}
          </div>
        )}

        {(type == "order" ||
          localStorage.getItem("role") === "purchase-manager" ||
          type == "purchase") && (
          <>
            <div className="form-group">
              <label htmlFor="drillOrExerciseType">Machine Details</label>
              <input
                type="text"
                id="machineDetails"
                name="machineDetails"
                value={formData.machineDetails}
                onChange={handleInputChange}
                className={formErrors.machineDetails ? "error" : ""}
                placeholder="Enter Machine Details"
              />
              {/* {formErrors.drillOrExerciseType &&
                                <div className="error-message">{formErrors.drillOrExerciseType}</div>
                            } */}
            </div>
            <div className="form-group">
              <label htmlFor="drillOrExerciseType">Vendor Details</label>
              <input
                type="text"
                id="vendorDetails"
                name="vendorDetails"
                value={formData.vendorDetails}
                onChange={handleInputChange}
                className={formErrors.vendorDetails ? "error" : ""}
                placeholder="Enter Vendor Details"
              />
              {/* {formErrors.drillOrExerciseType &&
                                <div className="error-message">{formErrors.drillOrExerciseType}</div>
                            } */}
            </div>

            <div className="form-group">
              <label htmlFor="costEstimate">Cost Estimate</label>
              <input
                type="text"
                id="costEstimate"
                name="costEstimate"
                value={formData.costEstimate}
                onChange={handleInputChange}
                className={formErrors.costEstimate ? "error" : ""}
                placeholder="Enter Cost Estimate"
              />
            </div>
          </>
        )}

        {(localStorage.getItem("role") === "purchase-manager" ||
          type == "purchase") && (
          <div className="form-group">
            <label htmlFor="requiredParts">Required Parts</label>
            <input
              type="text"
              id="requiredParts"
              name="requiredParts"
              value={formData.requiredParts}
              onChange={handleInputChange}
              className={formErrors.requiredParts ? "error" : ""}
              placeholder="Required Parts"
            />
          </div>
        )}
        {(localStorage.getItem("role") === "repair-manager" ||
          type == "order") && (
          <div className="form-group">
            <label htmlFor="repairDetails">Required Parts</label>
            <input
              type="text"
              id="repairDetails"
              name="repairDetails" // Changed from 'title' to 'drillOrExerciseType'
              value={formData.repairDetails}
              onChange={handleInputChange}
              className={formErrors.repairDetails ? "error" : ""}
              placeholder="Required Details"
            />
          </div>
        )}

        {/* Medical Task Specific Fields */}
        {(localStorage.getItem("role") === "medical-manager" || localStorage.getItem("role") === "medical-incharge" || type === "medical") && (
          <>
            {/* Balagruha Selection */}
            <div className="form-group dropdown-container" ref={balagruhaDropdownRef}>
              <label>
                Balagruha <span className="required">*</span>
              </label>
              <div className="dropdown">
                <button
                  type="button"
                  className="dropdown-toggle"
                  onClick={() => setIsBalagruhaDropdownOpen(!isBalagruhaDropdownOpen)}
                >
                  {formData.medicalBalagruhaId
                    ? availableBalagruhas.find((b) => b._id === formData.medicalBalagruhaId)?.name || "Select Balagruha"
                    : "Select Balagruha"}
                  <span className="arrow">&#9662;</span>
                </button>

                {isBalagruhaDropdownOpen && (
                  <div className="dropdown-menu">
                    {availableBalagruhas.map((balagruha) => (
                      <div
                        key={balagruha._id}
                        className={`dropdown-item ${
                          formData.medicalBalagruhaId === balagruha._id ? "selected" : ""
                        }`}
                        onClick={() => handleBalagruhaSelect(balagruha._id)}
                      >
                        {balagruha.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Assign To - Medical Managers or Admin (appears after balagruha selection) */}
            {formData.medicalBalagruhaId && (
              <div className="form-group dropdown-container" ref={assignToDropdownRef}>
                <label>
                  Assign To <span className="required">*</span>
                </label>
                <div className="dropdown">
                  <button
                    type="button"
                    className="dropdown-toggle"
                    onClick={() => setIsAssignToDropdownOpen(!isAssignToDropdownOpen)}
                  >
                    {primaryAssigneeId
                      ? availableMedicalManagers.find((u) => u._id === primaryAssigneeId)?.name || "Select User"
                      : "Select User"}
                    <span className="arrow">&#9662;</span>
                  </button>

                  {isAssignToDropdownOpen && (
                    <div className="dropdown-menu">
                      {/* Search input */}
                      <div style={{ padding: "8px", borderBottom: "1px solid #e0e0e0" }}>
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={assignToSearchQuery}
                          onChange={(e) => setAssignToSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            fontSize: "14px"
                          }}
                        />
                      </div>
                      {/* Filtered users list */}
                      {(() => {
                        const filteredUsers = availableMedicalManagers.filter((user) =>
                          user.name.toLowerCase().includes(assignToSearchQuery.toLowerCase()) ||
                          user.role.toLowerCase().includes(assignToSearchQuery.toLowerCase())
                        );
                        return filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <div
                              key={user._id}
                              className={`dropdown-item ${
                                primaryAssigneeId === user._id ? "selected" : ""
                              }`}
                              onClick={() => handleAssignToSelect(user._id)}
                            >
                              {user.name} ({user.role})
                            </div>
                          ))
                        ) : (
                          <div className="dropdown-item" style={{ opacity: 0.6 }}>
                            No users found
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Students Multi-Select (appears after balagruha selection) */}
            {formData.medicalBalagruhaId && (
              <div className="form-group dropdown-container" ref={studentDropdownRef}>
                <label>Select Students (Optional)</label>
                <div className="dropdown">
                  <button
                    type="button"
                    className="dropdown-toggle"
                    onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                  >
                    {formData.students.length > 0
                      ? `${formData.students.length} student${formData.students.length > 1 ? "s" : ""} selected`
                      : "Select Students"}
                    <span className="arrow">&#9662;</span>
                  </button>

                  {isStudentDropdownOpen && (
                    <div className="dropdown-menu" style={{ maxHeight: "250px", overflowY: "auto" }}>
                      {availableStudents.length > 0 ? (
                        availableStudents.map((student) => (
                          <label key={student._id} className="dropdown-item">
                            <input
                              type="checkbox"
                              checked={formData.students.includes(student._id)}
                              onChange={() => handleStudentToggle(student._id)}
                            />
                            {student.name}
                          </label>
                        ))
                      ) : (
                        <div className="dropdown-item" style={{ opacity: 0.6 }}>
                          No students found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div className="form-group">
          <label>Attachments</label>
          <div className="file-upload-container">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              ref={fileInputRef}
              // style={{ display: 'none' }}
            />
            <button
              type="button"
              className="upload-button"
              onClick={() => fileInputRef.current.click()}
            >
              Upload Files
            </button>
          </div>

          {files.length > 0 && (
            <div className="file-preview-list">
              {files.map((file, index) => (
                <div key={index} className="file-preview-container">
                  <FilePreview file={file} />
                  <button
                    type="button"
                    className="remove-file-button"
                    onClick={() => removeFile(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="submit-button">
            Create Task
          </button>
        </div>
      </form>
    </div>
  );
};

// Task Details Modal Component
// export const TaskDetailsModal = ({ task, getTask, onClose, users, onStatusChange, onUpdateTask }) => {
//     const [activeTab, setActiveTab] = useState('details');
//     const [commentText, setCommentText] = useState('');
//     const [files, setFiles] = useState([]);
//     const [comments, setComments] = useState(task.comments || []);
//     const [isUpdating, setIsUpdating] = useState(false);
//     const [showDeleteModal, setShowDeleteModal] = useState(false)
//     const fileInputRef = useRef(null);
//     const [selectedAttachmentId, setSelectedAttachmentId] = useState('')
//     const [selectedTask, setSelectedTask] = useState(task)
//     const currentUser = { _id: localStorage.getItem('userId') };
//     
//     if (!task) return null;

//     const assignedUser = users.find(user => user._id === selectedTask.assignedUser);
//     const createdByUser = users.find(user => user._id === selectedTask.createdBy);

//     const formatDate = (dateString) => {
//         const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
//         return new Date(dateString).toLocaleDateString(undefined, options);
//     };

//     const handleStatusChange = async (newStatus) => {
//         if (isUpdating) return;

//         setIsUpdating(true);
//         try {
//             const data = { status: newStatus };
//             const response = await updateTask(selectedTask._id, JSON.stringify(data));

//             if (response && response.success) {

//                 if (onStatusChange) {
//                     await onStatusChange(selectedTask._id, newStatus);
//                 }
//                 getTaskDetailsByTaskId(selectedTask._id)
//             } else {
//                 console.error('Error updating task status:', response?.message || 'Unknown error');
//             }
//         } catch (error) {
//             console.error('Error updating task status:', error);
//         } finally {
//             setIsUpdating(false);
//         }
//     };

//     const handleFileChange = (e) => {
//         const selectedFiles = Array.from(e.target.files);
//         setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
//     };

//     const removeFile = (index) => {
//         setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
//     };

//     const handleAddComment = async (data) => {
//         if (!commentText.trim() && files.length === 0) return;

//         setIsUpdating(true);
//         try {
//             const formData = new FormData();
//             formData.append('comments', commentText)
//             if (files.length > 0) {
//                 files.forEach(file => {
//                     formData.append('attachments', file);
//                 });
//             }

//             setIsUpdating(true);
//             let response;
//             if (localStorage.getItem('role') === "sports-coach") {
//                 response = await addOrUpdateSportsTaskComments(selectedTask._id, formData)
//             } else if (localStorage.getItem('role') === "music-coach") {
//                 response = await addOrUpdateMusicTaskComments(selectedTask._id, formData)
//             }
//             else {
//                 response = await addComment(selectedTask._id, formData);
//             }

//             getTaskDetailsByTaskId(selectedTask?._id)
//             

//             if (response && response.success) {
//                 const updatedTask = response.data.task;
//                 setComments(updatedTask.comments || []);
//                 if (onUpdateTask) {
//                     await onUpdateTask(selectedTask._id, { comments: updatedTask.comments });
//                 }
//                 setCommentText('');
//                 setFiles([]);
//                 setIsUpdating(false);

//             }
//         } catch (error) {
//             console.error('Error adding comment:', error);
//             alert('Failed to add comment');
//             setIsUpdating(false);
//         } finally {
//             setIsUpdating(false);
//         }
//     };

//     const getTaskDetailsByTaskId = async (id) => {
//         try {
//             const response = await getTaskBytaskId(id)
//             setSelectedTask(response.data?.task)
//         } catch (err) {
//             console.error('Error updating task status:', err);

//         }
//     }

//     const handleUploadFiles = async () => {
//         if (files.length === 0) return;

//         setIsUpdating(true);
//         try {
//             const formData = new FormData();
//             if (files.length > 0) {
//                 files.forEach(file => {
//                     formData.append('attachments', file);
//                 });
//             }
//             if (localStorage.getItem('role') === "sports-coach") {
//                 await addOrUpdateSportsTaskAttachments(selectedTask._id, formData)
//             } else if (localStorage.getItem('role') === "music-coach") {
//                 await addOrUpdateMusicTaskAttachments(selectedTask._id, formData)
//             } else {
//                 await updateTaskAttachments(selectedTask._id, formData);
//             }
//             getTaskDetailsByTaskId(selectedTask._id)
//             setFiles([])
//             // getAllTasks()
//         }

//         catch (error) {
//             console.error('Error uploading files:', error);
//         } finally {
//             setIsUpdating(false);
//         }
//     };

//     const deleteAttachments = async () => {
//         
//         const response = await deleteAttachemnets(task._id, selectedAttachmentId);
//         getTaskDetailsByTaskId(selectedTask._id)
//         setShowDeleteModal(false)
//     }

//     const handleDeleteComment = async (commentId) => {
//         const response = await deleteCommentinTask(selectedTask?._id, commentId)
//         
//         setComments((prevComments) => response?.data?.task?.comments || prevComments);
//     }

//     const priorityColors = {
//         High: '#ff7979',
//         Medium: '#f6e58d',
//         Low: '#badc58'
//     };

//     const isOverdue = new Date(selectedTask.deadline) < new Date() && selectedTask.status.toLowerCase() !== 'completed';

//     return (
//         <div className="modal-overlay" onClick={onClose}>
//             <div className="task-details-modal" onClick={e => e.stopPropagation()}>
//                 <div className="modal-header" style={{ borderBottom: `4px solid ${priorityColors[task.priority]}` }}>
//                     <h2>{task.title}</h2>
//                     <button className="close-button" onClick={onClose}>×</button>
//                 </div>

//                 <div className="modal-tabs">
//                     <button
//                         className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
//                         onClick={() => setActiveTab('details')}
//                     >
//                         📋 Details
//                     </button>
//                     <button
//                         className={`tab-button ${activeTab === 'files' ? 'active' : ''}`}
//                         onClick={() => setActiveTab('files')}
//                     >
//                         📁 Files
//                     </button>
//                     <button
//                         className={`tab-button ${activeTab === 'comments' ? 'active' : ''}`}
//                         onClick={() => setActiveTab('comments')}
//                     >
//                         💬 Comments
//                     </button>
//                 </div>

//                 <div className="modal-body">
//                     {activeTab === 'details' && (
//                         <div className="task-info">
//                             <div className="info-section">
//                                 <h3>Description</h3>
//                                 <p>{selectedTask.description}</p>
//                             </div>

//                             <div className="info-grid">
//                                 <div className="info-item">
//                                     <span className="info-label">Status</span>
//                                     <span className={`status-badge status-${selectedTask.status.replace(/\s+/g, '-').toLowerCase()}`}>
//                                         {selectedTask.status}
//                                     </span>
//                                 </div>

//                                 <div className="info-item">
//                                     <span className="info-label">Priority</span>
//                                     <span className={`priority-badge priority-${selectedTask.priority.toLowerCase()}`}>
//                                         {selectedTask.priority.toLowerCase() === 'high' ? '🔴 High' :
//                                             selectedTask.priority.toLowerCase() === 'medium' ? '🟡 Medium' : '🟢 Low'}
//                                     </span>
//                                 </div>

//                                 <div className="info-item">
//                                     <span className="info-label">Deadline</span>
//                                     <span className={`deadline-text ${isOverdue ? 'overdue' : ''}`}>
//                                         {isOverdue && '⚠️ '}{formatDate(selectedTask.deadline)}
//                                     </span>
//                                 </div>

//                                 <div className="info-item">
//                                     <span className="info-label">Created</span>
//                                     <span>{formatDate(selectedTask.createdAt)}</span>
//                                 </div>

//                                 <div className="info-item">
//                                     <span className="info-label">Assigned To</span>

//                                     <span>{selectedTask?.assignedUser ? selectedTask?.assignedUser.name : 'Unassigned'}</span>
//                                 </div>

//                                 <div className="info-item">
//                                     <span className="info-label">Created By</span>
//                                     <span>{selectedTask?.createdBy ? selectedTask?.createdBy.name : 'Unknown'}</span>
//                                 </div>
//                                 <div className="info-item">
//                                     <span className="info-label">Type</span>
//                                     <span>{selectedTask?.type ? selectedTask?.type : '--'}</span>
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     {activeTab === 'files' && (
//                         <div className="files-tab">
//                             <div className="files-header">
//                                 <h3>Task Attachments</h3>
//                                 <div className="file-upload-container">
//                                     <input
//                                         type="file"
//                                         multiple
//                                         onChange={handleFileChange}
//                                         ref={fileInputRef}
//                                         style={{ display: 'none' }}
//                                     />
//                                     <button
//                                         className="upload-button"
//                                         onClick={() => fileInputRef.current.click()}
//                                     >
//                                         Upload Files
//                                     </button>
//                                 </div>
//                             </div>

//                             {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
//                                 <div className="existing-files">
//                                     <h4>Existing Files</h4>
//                                     <div className="file-list">
//                                         {selectedTask.attachments.map((file, index) => (
//                                             <div key={index} className="file-item">
//                                                 <div className="file-icon">
//                                                     {file.fileType?.startsWith('image/') ? '🖼️' :
//                                                         file.fileType === 'application/pdf' ? '📄' : '📎'}
//                                                 </div>
//                                                 <div className="file-details">
//                                                     <div className="file-name">{file.name}</div>
//                                                     <div className="file-meta">
//                                                         <span className="file-size">
//                                                             {file.fileName}
//                                                         </span>
//                                                         <div className='download-wrapper'>
//                                                             <a
//                                                                 href={file.fileUrl}
//                                                                 target="_blank"
//                                                                 rel="noopener noreferrer"
//                                                                 className="file-download"
//                                                             >
//                                                                 Download
//                                                             </a>

//                                                             <div

//                                                                 className="file-download file-download-delete"
//                                                                 onClick={() => { setSelectedAttachmentId(file._id); setShowDeleteModal(true) }}
//                                                             >
//                                                                 Delete
//                                                             </div>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </div>
//                             ) : (
//                                 <div className="no-files-message">
//                                     <div className="no-files-icon">📂</div>
//                                     <p>No files attached to this task yet</p>
//                                 </div>
//                             )}

//                             {files.length > 0 && (
//                                 <div className="new-files">
//                                     <h4>New Files to Upload</h4>
//                                     <div className="file-preview-list">
//                                         {files.map((file, index) => (
//                                             <div key={index} className="file-preview-container">
//                                                 <FilePreview file={file} />
//                                                 <button
//                                                     className="remove-file-button"
//                                                     onClick={() => removeFile(index)}
//                                                 >
//                                                     ×
//                                                 </button>
//                                             </div>
//                                         ))}
//                                     </div>
//                                     <button
//                                         className="upload-all-button"
//                                         onClick={handleUploadFiles}
//                                         disabled={isUpdating}
//                                     >
//                                         {isUpdating ? 'Uploading...' : 'Upload All Files'}
//                                     </button>
//                                 </div>
//                             )}
//                         </div>
//                     )}

//                     {showDeleteModal && (
//                         <div className="modal-overlay">
//                             <div className="modal-content">
//                                 <div className="modal-header">
//                                     <div className="modal-icon">⚠️</div>
//                                     <h3 className="modal-title">Confirm Deletion</h3>
//                                 </div>
//                                 <div className="modal-body">
//                                     <p>Are you sure you want to delete the attachment <strong>{selectedTask.fileName}</strong>?</p>
//                                     <p>This action cannot be undone.</p>
//                                 </div>
//                                 <div className="modal-actions">
//                                     <button
//                                         className="delete-confirm-button"
//                                         onClick={() => deleteAttachments()}
//                                     >
//                                         Yes, Delete Attachments
//                                     </button>
//                                     <button
//                                         className="cancel-button"
//                                         onClick={() => setShowDeleteModal(false)}
//                                     >
//                                         Cancel
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     {activeTab === 'comments' && (
//                         <div className="comments-tab">
//                             <h3>Comments</h3>

//                             <div className="comments-list">
//                                 {comments.length > 0 ? (
//                                     comments.map((comment, index) => (
//                                         <Comment key={index} comment={comment} users={users} onDelete={handleDeleteComment} />
//                                     ))
//                                 ) : (
//                                     <div className="no-comments-message">
//                                         <div className="no-comments-icon">💬</div>
//                                         <p>No comments yet. Be the first to comment!</p>
//                                     </div>
//                                 )}
//                             </div>

//                             <div className="add-comment">
//                                 <textarea
//                                     className="comment-input"
//                                     placeholder="Add a comment..."
//                                     value={commentText}
//                                     onChange={(e) => setCommentText(e.target.value)}
//                                 ></textarea>

//                                 <div className="comment-actions">
//                                     <div className="file-upload-container">
//                                         <input
//                                             type="file"
//                                             multiple
//                                             onChange={handleFileChange}
//                                             ref={fileInputRef}
//                                             style={{ display: 'none' }}
//                                         />
//                                         <button
//                                             className="attach-button"
//                                             onClick={() => fileInputRef.current.click()}
//                                         >
//                                             📎 Attach Files
//                                         </button>
//                                     </div>

//                                     <button
//                                         className="post-comment-button"
//                                         onClick={(task) => handleAddComment(task)}
//                                         disabled={(!commentText.trim() && files.length === 0) || isUpdating}
//                                     >
//                                         {isUpdating ? 'Posting...' : 'Post Comment'}
//                                     </button>
//                                 </div>

//                                 {files.length > 0 && (
//                                     <div className="comment-attachments-preview">
//                                         {files.map((file, index) => (
//                                             <div key={index} className="attachment-preview">
//                                                 <span className="attachment-name">{file.name}</span>
//                                                 <button
//                                                     className="remove-attachment"
//                                                     onClick={() => removeFile(index)}
//                                                 >
//                                                     ×
//                                                 </button>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 )}
//                             </div>
//                         </div>
//                     )}
//                 </div>

//                 <div className="modal-footer">
//                     <div className="status-actions">
//                         <button
//                             className={`status-button pending ${selectedTask.status.toLowerCase() === 'pending' ? 'active' : ''}`}
//                             onClick={() => handleStatusChange('pending')}
//                             disabled={selectedTask.status.toLowerCase() === 'pending' || isUpdating}
//                         >
//                             {isUpdating ? 'Updating...' : 'Waiting to Start'}
//                         </button>
//                         <button
//                             className={`status-button in-progress ${selectedTask.status.toLowerCase() === 'in progress' ? 'active' : ''}`}
//                             onClick={() => handleStatusChange('in progress')}
//                             disabled={selectedTask.status.toLowerCase() === 'in progress' || isUpdating}
//                         >
//                             {isUpdating ? 'Updating...' : 'Working On It'}
//                         </button>
//                         <button
//                             className={`status-button completed ${selectedTask.status.toLowerCase() === 'completed' ? 'active' : ''}`}
//                             onClick={() => handleStatusChange('completed')}
//                             disabled={selectedTask.status.toLowerCase() === 'completed' || isUpdating}
//                         >
//                             {isUpdating ? 'Updating...' : 'All Done!'}
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

export const TaskDetailsModal = ({
  task,
  getTask,
  onClose,
  users,
  onStatusChange,
  onUpdateTask,
}) => {
  const [activeTab, setActiveTab] = useState("details");
  const [commentText, setCommentText] = useState("");
  const [files, setFiles] = useState([]);
  const [comments, setComments] = useState(task.comments || []);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState("");
  const [selectedTask, setSelectedTask] = useState(task);
  const [editMode, setEditMode] = useState({});
  const [editedValues, setEditedValues] = useState({});

  const currentUser = { _id: localStorage.getItem("userId") };
  const userRole = (localStorage.getItem("role") || "").toLowerCase();
  const canManageTask = userRole !== "student";

  if (!task) return null;

  const assignedUser = users?.find(
    (user) => user._id === selectedTask.assignedUser
  );
  const createdByUser = users?.find(
    (user) => user._id === selectedTask.createdBy
  );

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);

      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!canManageTask || isUpdating) return;

    setIsUpdating(true);
    try {
      const data = { status: newStatus };
      const response = await updateTask(selectedTask._id, JSON.stringify(data));

      if (response && response.success) {
        if (onStatusChange) {
          await onStatusChange(selectedTask._id, newStatus);
        }
        getTaskDetailsByTaskId(selectedTask._id);
      } else {
        console.error(
          "Error updating task status:",
          response?.message || "Unknown error"
        );
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleAddComment = async (data) => {
    if (!canManageTask || (!commentText.trim() && files.length === 0)) return;

    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append("comments", commentText);
      if (files.length > 0) {
        files.forEach((file) => {
          formData.append("attachments", file);
        });
      }

      setIsUpdating(true);
      let response;
      if (localStorage.getItem("role") === "sports-coach") {
        response = await addOrUpdateSportsTaskComments(
          selectedTask._id,
          formData
        );
      } else if (localStorage.getItem("role") === "music-coach") {
        response = await addOrUpdateMusicTaskComments(
          selectedTask._id,
          formData
        );
      } else {
        response = await addComment(selectedTask._id, formData);
      }

      getTaskDetailsByTaskId(selectedTask?._id);


      if (response && response.success) {
        const updatedTask = response.data.task;
        setComments(updatedTask.comments || []);
        if (onUpdateTask) {
          await onUpdateTask(selectedTask._id, {
            comments: updatedTask.comments,
          });
        }
        setCommentText("");
        setFiles([]);
        setIsUpdating(false);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment");
      setIsUpdating(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const getTaskDetailsByTaskId = async (id) => {
    try {
      const response = await getTaskBytaskId(id);
      setSelectedTask(response.data?.task);
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  const handleUploadFiles = async () => {
    if (!canManageTask || files.length === 0) return;

    setIsUpdating(true);
    try {
      const formData = new FormData();
      if (files.length > 0) {
        files.forEach((file) => {
          formData.append("attachments", file);
        });
      }
      if (localStorage.getItem("role") === "sports-coach") {
        await addOrUpdateSportsTaskAttachments(selectedTask._id, formData);
      } else if (localStorage.getItem("role") === "music-coach") {
        await addOrUpdateMusicTaskAttachments(selectedTask._id, formData);
      } else {
        await updateTaskAttachments(selectedTask._id, formData);
      }
      getTaskDetailsByTaskId(selectedTask._id);
      setFiles([]);
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteAttachments = async () => {
    if (!canManageTask) {
      return;
    }

    const response = await deleteAttachemnets(task._id, selectedAttachmentId);
    getTaskDetailsByTaskId(selectedTask._id);
    setShowDeleteModal(false);
  };

  const handleDeleteComment = async (commentId) => {
    if (!canManageTask) {
      return;
    }
    const response = await deleteCommentinTask(selectedTask?._id, commentId);

    setComments(
      (prevComments) => response?.data?.task?.comments || prevComments
    );
  };

  // Enable edit mode for a specific field
  const enableEditMode = (field) => {
    if (!canManageTask) {
      return;
    }
    setEditMode((prev) => ({ ...prev, [field]: true }));
    setEditedValues((prev) => ({
      ...prev,
      [field]:
        field === "assignedUser"
          ? selectedTask.assignedUser?._id
          : selectedTask[field],
    }));
  };

  // Handle changes to editable fields
  const handleEditChange = (field, value) => {
    setEditedValues((prev) => ({ ...prev, [field]: value }));
  };

  // Save changes for a specific field
  const saveFieldChange = async (field) => {
    if (!canManageTask) {
      return;
    }
    setIsUpdating(true);
    try {
      let data = {};

      // Special handling for assignedUser field
      if (field === "assignedUser") {
        data = { assignedUser: editedValues[field] };
      } else {
        data = { [field]: editedValues[field] };
      }

      const response = await updateTask(selectedTask._id, JSON.stringify(data));

      if (response && response.success) {
        getTaskDetailsByTaskId(selectedTask._id);
        setEditMode((prev) => ({ ...prev, [field]: false }));
      } else {
        console.error(
          `Error updating ${field}:`,
          response?.message || "Unknown error"
        );
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Cancel editing for a specific field
  const cancelEdit = (field) => {
    setEditMode((prev) => ({ ...prev, [field]: false }));
  };

  const priorityColors = {
    High: "#ff7979",
    Medium: "#f6e58d",
    Low: "#badc58",
  };

  const isOverdue =
    new Date(selectedTask.deadline) < new Date() &&
    selectedTask.status.toLowerCase() !== "completed";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="task-details-modal" onClick={(e) => e.stopPropagation()}>
        <div
          className="modal-header"
          style={{ borderBottom: `4px solid ${priorityColors[task.priority]}` }}
        >
          {editMode.title ? (
            <div className="edit-field-container">
              <input
                type="text"
                className="edit-field-input"
                value={editedValues.title || ""}
                onChange={(e) => handleEditChange("title", e.target.value)}
              />
              <div className="edit-field-actions">
                <button
                  className="save-edit-button"
                  onClick={() => saveFieldChange("title")}
                  disabled={isUpdating}
                >
                  {isUpdating ? "..." : "✓"}
                </button>
                <button
                  className="cancel-edit-button"
                  onClick={() => cancelEdit("title")}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <h2
              onClick={canManageTask ? () => enableEditMode("title") : undefined}
              style={{ cursor: canManageTask ? "pointer" : "default" }}
            >
              {selectedTask.title}
              {canManageTask && " ✏️"}
            </h2>
          )}
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-button ${activeTab === "details" ? "active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            📋 Details
          </button>
          <button
            className={`tab-button ${activeTab === "files" ? "active" : ""}`}
            onClick={() => setActiveTab("files")}
          >
            📁 Files
          </button>
          <button
            className={`tab-button ${activeTab === "comments" ? "active" : ""}`}
            onClick={() => setActiveTab("comments")}
          >
            💬 Comments
          </button>
        </div>

        <div className="modal-body">
          {activeTab === "details" && (
            <div className="task-info">
              <div className="info-section">
                <h3>Description</h3>
                {editMode.description ? (
                  <div className="edit-field-container">
                    <textarea
                      className="edit-field-textarea"
                      value={editedValues.description || ""}
                      onChange={(e) =>
                        handleEditChange("description", e.target.value)
                      }
                      rows={4}
                    />
                    <div className="edit-field-actions">
                      <button
                        className="save-edit-button"
                        onClick={() => saveFieldChange("description")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "..." : "✓"}
                      </button>
                      <button
                        className="cancel-edit-button"
                        onClick={() => cancelEdit("description")}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    onClick={
                      canManageTask ? () => enableEditMode("description") : undefined
                    }
                    style={{ cursor: canManageTask ? "pointer" : "default" }}
                  >
                    {selectedTask.description}
                    {canManageTask && " ✏️"}
                  </p>
                )}
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Status</span>
                  {editMode.status ? (
                    <div className="edit-field-container">
                      <select
                        className="edit-field-select"
                        value={editedValues.status || ""}
                        onChange={(e) =>
                          handleEditChange("status", e.target.value)
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="in progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <div className="edit-field-actions">
                        <button
                          className="save-edit-button"
                          onClick={() => saveFieldChange("status")}
                          disabled={isUpdating}
                        >
                          {isUpdating ? "..." : "✓"}
                        </button>
                        <button
                          className="cancel-edit-button"
                          onClick={() => cancelEdit("status")}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span
                      className={`status-badge status-${selectedTask.status
                        .replace(/\s+/g, "-")
                        .toLowerCase()}`}
                      onClick={
                        canManageTask ? () => enableEditMode("status") : undefined
                      }
                      style={{ cursor: canManageTask ? "pointer" : "default" }}
                    >
                      {selectedTask.status}
                      {canManageTask && " ✏️"}
                    </span>
                  )}
                </div>

                <div className="info-item">
                  <span className="info-label">Priority</span>
                  {editMode.priority ? (
                    <div className="edit-field-container">
                      <select
                        className="edit-field-select"
                        value={editedValues.priority || ""}
                        onChange={(e) =>
                          handleEditChange("priority", e.target.value)
                        }
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                      <div className="edit-field-actions">
                        <button
                          className="save-edit-button"
                          onClick={() => saveFieldChange("priority")}
                          disabled={isUpdating}
                        >
                          {isUpdating ? "..." : "✓"}
                        </button>
                        <button
                          className="cancel-edit-button"
                          onClick={() => cancelEdit("priority")}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span
                      className={`priority-badge priority-${selectedTask.priority.toLowerCase()}`}
                      onClick={
                        canManageTask ? () => enableEditMode("priority") : undefined
                      }
                      style={{ cursor: canManageTask ? "pointer" : "default" }}
                    >
                      {selectedTask.priority.toLowerCase() === "high"
                        ? "🔴 High"
                        : selectedTask.priority.toLowerCase() === "medium"
                        ? "🟡 Medium"
                        : "🟢 Low"}
                      {canManageTask && " ✏️"}
                    </span>
                  )}
                </div>

                <div className="info-item">
                  <span className="info-label">Deadline</span>
                  {editMode.deadline ? (
                    <div className="edit-field-container">
                      <input
                        type="date"
                        id="deadline"
                        name="deadline"
                        className="edit-field-select"
                        value={editedValues.deadline || selectedTask.deadline}
                        onChange={(e) =>
                          handleEditChange("deadline", e.target.value)
                        }
                        min={new Date().toISOString().split("T")[0]}
                      />
                      <div className="edit-field-actions">
                        <button
                          className="save-edit-button"
                          onClick={() => saveFieldChange("deadline")}
                          disabled={isUpdating}
                        >
                          {isUpdating ? "..." : "✓"}
                        </button>
                        <button
                          className="cancel-edit-button"
                          onClick={() => cancelEdit("deadline")}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span
                      className={`deadline-text ${isOverdue ? "overdue" : ""}`}
                      onClick={
                        canManageTask ? () => enableEditMode("deadline") : undefined
                      }
                      style={{ cursor: canManageTask ? "pointer" : "default" }}
                    >
                      {isOverdue && "⚠️ "}
                      {formatDate(selectedTask.deadline)}
                      {canManageTask && " ✏️"}
                    </span>
                  )}
                </div>

                <div className="info-item">
                  <span className="info-label">Created</span>
                  <span>{formatDate(selectedTask.createdAt)}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Assigned To</span>
                  {editMode.assignedUser ? (
                    <div className="edit-field-container">
                      <select
                        className="edit-field-select"
                        value={editedValues.assignedUser || ""}
                        onChange={(e) =>
                          handleEditChange("assignedUser", e.target.value)
                        }
                      >
                        <option value="">Unassigned</option>
                        {users?.map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                      <div className="edit-field-actions">
                        <button
                          className="save-edit-button"
                          onClick={() => saveFieldChange("assignedUser")}
                          disabled={isUpdating}
                        >
                          {isUpdating ? "..." : "✓"}
                        </button>
                        <button
                          className="cancel-edit-button"
                          onClick={() => cancelEdit("assignedUser")}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span
                      onClick={
                        canManageTask ? () => enableEditMode("assignedUser") : undefined
                      }
                      style={{ cursor: canManageTask ? "pointer" : "default" }}
                    >
                      {selectedTask?.assignedUser
                        ? selectedTask?.assignedUser.name
                        : "Unassigned"}
                      {canManageTask && " ✏️"}
                    </span>
                  )}
                </div>

                <div className="info-item">
                  <span className="info-label">Created By</span>
                  <span>
                    {selectedTask?.createdBy
                      ? selectedTask?.createdBy.name
                      : "Unknown"}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Type</span>
                  {/* {editMode.type ? (
                                        <div className="edit-field-container">
                                            <input
                                                type="text"
                                                className="edit-field-input"
                                                value={editedValues.type || ''}
                                                onChange={(e) => handleEditChange('type', e.target.value)}
                                            />
                                            <div className="edit-field-actions">
                                                <button
                                                    className="save-edit-button"
                                                    onClick={() => saveFieldChange('type')}
                                                    disabled={isUpdating}
                                                >
                                                    {isUpdating ? '...' : '✓'}
                                                </button>
                                                <button
                                                    className="cancel-edit-button"
                                                    onClick={() => cancelEdit('type')}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ) : ( */}
                  <span onClick={() => enableEditMode("type")}>
                    {selectedTask?.type ? selectedTask?.type : "--"}
                    {/* ✏️ */}
                  </span>
                  {/* )} */}
                </div>
              </div>
            </div>
          )}

          {activeTab === "files" && (
            <div className="files-tab">
              <div className="files-header">
                <h3>Task Attachments</h3>
                {canManageTask && (
                  <div className="file-upload-container">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      style={{ display: "none" }}
                    />
                    <button
                      className="upload-button"
                      onClick={() => fileInputRef.current.click()}
                    >
                      Upload Files
                    </button>
                  </div>
                )}
              </div>

              {selectedTask.attachments &&
              selectedTask.attachments.length > 0 ? (
                <div className="existing-files">
                  <h4>Existing Files</h4>
                  <div className="file-list">
                    {selectedTask.attachments.map((file, index) => (
                      <div key={index} className="file-item">
                        <div className="file-icon">
                          {file.fileType?.startsWith("image/")
                            ? "🖼️"
                            : file.fileType === "application/pdf"
                            ? "📄"
                            : "📎"}
                        </div>
                        <div className="file-details">
                          <div className="file-name">{file.name}</div>
                          <div className="file-meta">
                            <span className="file-size">{file.fileName}</span>
                            <div className="download-wrapper">
                              <a
                                href={file.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="file-download"
                              >
                                Download
                              </a>
                                {canManageTask && (
                                  <div
                                    className="file-download file-download-delete"
                                    onClick={() => {
                                      setSelectedAttachmentId(file._id);
                                      setShowDeleteModal(true);
                                    }}
                                  >
                                    Delete
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-files-message">
                  <div className="no-files-icon">📂</div>
                  <p>No files attached to this task yet</p>
                </div>
              )}

              {canManageTask && files.length > 0 && (
                <div className="new-files">
                  <h4>New Files to Upload</h4>
                  <div className="file-preview-list">
                    {files.map((file, index) => (
                      <div key={index} className="file-preview-container">
                        <FilePreview file={file} />
                        <button
                          className="remove-file-button"
                          onClick={() => removeFile(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="upload-all-button"
                    onClick={handleUploadFiles}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Uploading..." : "Upload All Files"}
                  </button>
                </div>
              )}
            </div>
          )}

          {canManageTask && showDeleteModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <div className="modal-icon">⚠️</div>
                  <h3 className="modal-title">Confirm Deletion</h3>
                </div>
                <div className="modal-body">
                  <p>
                    Are you sure you want to delete the attachment{" "}
                    <strong>{selectedTask.fileName}</strong>?
                  </p>
                  <p>This action cannot be undone.</p>
                </div>
                <div className="modal-actions">
                  <button
                    className="delete-confirm-button"
                    onClick={() => deleteAttachments()}
                  >
                    Yes, Delete Attachments
                  </button>
                  <button
                    className="cancel-button"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "comments" && (
            <div className="comments-tab">
              <h3>Comments</h3>

              <div className="comments-list">
                {comments.length > 0 ? (
                  comments.map((comment, index) => (
                    <Comment
                      key={index}
                      comment={comment}
                      users={users}
                      onDelete={canManageTask ? handleDeleteComment : undefined}
                    />
                  ))
                ) : (
                  <div className="no-comments-message">
                    <div className="no-comments-icon">💬</div>
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </div>

              {canManageTask ? (
                <div className="add-comment">
                  <textarea
                    className="comment-input"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  ></textarea>

                  <div className="comment-actions">
                    <div className="file-upload-container">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        style={{ display: "none" }}
                      />
                      <button
                        className="attach-button"
                        onClick={() => fileInputRef.current.click()}
                      >
                        📎 Attach Files
                      </button>
                    </div>

                    <button
                      className="post-comment-button"
                      onClick={(task) => handleAddComment(task)}
                      disabled={
                        (!commentText.trim() && files.length === 0) || isUpdating
                      }
                    >
                      {isUpdating ? "Posting..." : "Post Comment"}
                    </button>
                  </div>

                  {files.length > 0 && (
                    <div className="comment-attachments-preview">
                      {files.map((file, index) => (
                        <div key={index} className="attachment-preview">
                          <span className="attachment-name">{file.name}</span>
                          <button
                            className="remove-attachment"
                            onClick={() => removeFile(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: "14px", color: "#666" }}>
                  Comments are read-only for students.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="status-actions">
            <button
              className={`status-button pending ${
                selectedTask.status.toLowerCase() === "pending" ? "active" : ""
              }`}
              onClick={() => handleStatusChange("pending")}
              disabled={
                selectedTask.status.toLowerCase() === "pending" ||
                isUpdating ||
                !canManageTask
              }
            >
              {isUpdating ? "Updating..." : "Waiting to Start"}
            </button>
            <button
              className={`status-button in-progress ${
                selectedTask.status.toLowerCase() === "in progress"
                  ? "active"
                  : ""
              }`}
              onClick={() => handleStatusChange("in progress")}
              disabled={
                selectedTask.status.toLowerCase() === "in progress" ||
                isUpdating ||
                !canManageTask
              }
            >
              {isUpdating ? "Updating..." : "Working On It"}
            </button>
            <button
              className={`status-button completed ${
                selectedTask.status.toLowerCase() === "completed"
                  ? "active"
                  : ""
              }`}
              onClick={() => handleStatusChange("completed")}
              disabled={
                selectedTask.status.toLowerCase() === "completed" ||
                isUpdating ||
                !canManageTask
              }
            >
              {isUpdating ? "Updating..." : "All Done!"}
            </button>
          </div>
        </div>

        <style jsx>{`
          /* Existing styles */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }

          .task-details-modal {
            background-color: white;
            border-radius: 8px;
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #eee;
          }

          .modal-header h2 {
            margin: 0;
            cursor: pointer;
          }

          .modal-header h2:hover {
            text-decoration: underline;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
          }

          .modal-tabs {
            display: flex;
            border-bottom: 1px solid #eee;
          }

          .tab-button {
            padding: 12px 20px;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 16px;
            opacity: 0.7;
            border-bottom: 3px solid transparent;
          }

          .tab-button.active {
            opacity: 1;
            border-bottom-color: #3498db;
            font-weight: bold;
          }

          .modal-body {
            padding: 20px;
          }

          .task-info {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .info-section h3 {
            margin-bottom: 10px;
            font-size: 18px;
          }

          .info-section p {
            margin: 0;
            cursor: pointer;
          }

          .info-section p:hover {
            text-decoration: underline;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 16px;
          }

          .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .info-label {
            font-size: 14px;
            color: #666;
          }

          .info-item span:not(.info-label) {
            cursor: pointer;
          }

          .info-item span:not(.info-label):hover {
            text-decoration: underline;
          }

          .status-badge,
          .priority-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
          }

          .status-badge.status-pending {
            background-color: #f39c12;
            color: white;
          }

          .status-badge.status-in-progress {
            background-color: #3498db;
            color: white;
          }

          .status-badge.status-completed {
            background-color: #2ecc71;
            color: white;
          }

          .priority-badge.priority-high {
            background-color: #ff7979;
            color: white;
          }

          .priority-badge.priority-medium {
            background-color: #f6e58d;
          }

          .priority-badge.priority-low {
            background-color: #badc58;
          }

          .deadline-text.overdue {
            color: #e74c3c;
            font-weight: bold;
          }

          .files-tab,
          .comments-tab {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .files-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .upload-button,
          .attach-button,
          .post-comment-button,
          .upload-all-button {
            padding: 8px 16px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            background-color: #3498db;
            color: white;
          }

          .file-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .file-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-radius: 4px;
            background-color: #f9f9f9;
          }

          .file-icon {
            font-size: 24px;
          }

          .file-details {
            flex: 1;
          }

          .file-name {
            font-weight: bold;
            margin-bottom: 4px;
          }

          .file-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #666;
          }

          .download-wrapper {
            display: flex;
            gap: 12px;
          }

          .file-download {
            color: #3498db;
            cursor: pointer;
            text-decoration: none;
          }

          .file-download-delete {
            color: #e74c3c;
          }

          .no-files-message,
          .no-comments-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: #666;
            text-align: center;
          }

          .no-files-icon,
          .no-comments-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
          }

          .file-preview-list {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }

          .file-preview-container {
            position: relative;
            padding: 12px;
            border-radius: 4px;
            background-color: #f9f9f9;
          }

          .remove-file-button {
            position: absolute;
            top: 4px;
            right: 4px;
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }

          .comments-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .comment {
            padding: 12px;
            border-radius: 4px;
            background-color: #f9f9f9;
          }

          .comment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .comment-user {
            font-weight: bold;
          }

          .comment-date {
            font-size: 12px;
            color: #666;
          }

          .delete-comment {
            background: none;
            border: none;
            cursor: pointer;
            color: #e74c3c;
            font-size: 16px;
          }

          .comment-text {
            margin-bottom: 8px;
          }

          .comment-attachments {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .comment-attachment {
            padding: 4px 8px;
            background-color: #eee;
            border-radius: 4px;
            font-size: 12px;
            text-decoration: none;
            color: #333;
          }

          .add-comment {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .comment-input {
            padding: 12px;
            border-radius: 4px;
            border: 1px solid #ddd;
            resize: vertical;
            min-height: 80px;
          }

          .comment-actions {
            display: flex;
            justify-content: space-between;
          }

          .comment-attachments-preview {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .attachment-preview {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 8px;
            background-color: #eee;
            border-radius: 4px;
            font-size: 12px;
          }

          .remove-attachment {
            background: none;
            border: none;
            cursor: pointer;
            color: #e74c3c;
          }

          .modal-footer {
            padding: 16px 20px;
            border-top: 1px solid #eee;
          }

          .status-actions {
            display: flex;
            justify-content: space-between;
            gap: 12px;
          }

          .status-button {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            opacity: 0.7;
          }

          .status-button:hover:not(:disabled) {
            opacity: 0.9;
          }

          .status-button.active {
            opacity: 1;
          }

          .status-button:disabled {
            cursor: not-allowed;
            opacity: 0.5;
          }

          .status-button.pending {
            background-color: #f39c12;
            color: white;
          }

          .status-button.in-progress {
            background-color: #3498db;
            color: white;
          }

          .status-button.completed {
            background-color: #2ecc71;
            color: white;
          }

          /* New styles for editable fields */
          .edit-field-container {
            position: relative;
            width: 100%;
          }

          .edit-field-input,
          .edit-field-textarea,
          .edit-field-select,
          .edit-field-date {
            width: 100%;
            padding: 8px;
            border: 1px solid #3498db;
            border-radius: 4px;
            font-size: 14px;
            background-color: #f8f9fa;
          }

          .edit-field-textarea {
            min-height: 100px;
            resize: vertical;
          }

          .edit-field-actions {
            position: absolute;
            top: 8px;
            right: 8px;
            display: flex;
            gap: 4px;
          }

          .save-edit-button,
          .cancel-edit-button {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 12px;
          }

          .save-edit-button {
            background-color: #2ecc71;
            color: white;
          }

          .save-edit-button:disabled {
            background-color: #95a5a6;
            cursor: not-allowed;
          }

          .cancel-edit-button {
            background-color: #e74c3c;
            color: white;
          }

          .modal-content {
            background-color: white;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          }

          .modal-icon {
            font-size: 24px;
            margin-right: 10px;
          }

          .modal-title {
            margin: 0;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 20px;
          }

          .delete-confirm-button {
            background-color: #e74c3c;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          }

          .cancel-button {
            background-color: #95a5a6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          }
        `}</style>
      </div>
    </div>
  );
};

// Task Card Component
const TaskCard = ({ task }) => {
  const priorityColors = {
    High: "#ff7979",
    Medium: "#f6e58d",
    Low: "#badc58",
  };

  const isOverdue =
    new Date(task.deadline) < new Date() &&
    task.status.toLowerCase() !== "completed";

  return (
    <div
      className={`task-card ${isOverdue ? "overdue" : ""}`}
      style={{
        borderLeft: `8px solid ${priorityColors[task.priority] || "#7ed6df"}`,
      }}
    >
      <h4 className="task-title">{task.title}</h4>
      <p className="task-description">{task.description.substring(0, 60)}...</p>
      <div className="task-meta">
        <span className="deadline">
          {isOverdue ? "⚠️ " : "⏰ "}
          Due: {new Date(task.deadline).toLocaleDateString()}
        </span>
        <span className={`priority priority-${task.priority.toLowerCase()}`}>
          {task.priority === "High"
            ? "🔴"
            : task.priority === "Medium"
            ? "🟡"
            : "🟢"}
        </span>
      </div>
    </div>
  );
};

// Main Task Management Component
const TaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [users, setUsers] = useState([]);
  const [balagruhas, setBalagruhas] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [filters, setFilters] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [assignableStaff, setAssignableStaff] = useState([]);
  const [assignableStudents, setAssignableStudents] = useState([]);
  const role = localStorage.getItem("role");
  const normalizedRole = (role || "").toLowerCase();
  const isStudent = normalizedRole === "student";

  // Fetch balagruha list
  const getBalagruhaList = async () => {
    try {
      const id = localStorage.getItem("userId");
      const response = await getBalagruhaById(id);
      const balagruhaList = response?.data?.balagruhas || [];
      setBalagruhas(balagruhaList);

      // Set default balagruhaId if available
      if (balagruhaList.length > 0 && !filters.balagruhaId) {
        setFilters((prev) => ({
          ...prev,
          balagruhaId: [balagruhaList[0]._id],
        }));
      }
    } catch (error) {
      console.error("Error fetching balagruhas:", error);
      addToast("Failed to load balagruhas", "error");
    }
  };

  // Update this function to pass filters to the API
  const getAllTasks = async (filterParams = {}) => {

    setIsLoading(true);

    const finalFilters = { ...filterParams };

    // Ensure type is set based on role
    if (role === "sports-coach") {
      finalFilters.type = ["sports"];
    } else if (role === "music-coach") {
      finalFilters.type = ["music"];
    } else if (role === "medical-manager" || role === "medical-incharge") {
      if (!finalFilters.type || finalFilters.type.length === 0) {
        finalFilters.type = ["medical", "general"];
      }
    } else if (!finalFilters.type) {
      finalFilters.type = ["general"];
    }
    try {
      // const response =;
      // let response
      // if (role === "sports-coach") {
      //     response = await getSportsTaskListByBalagruha(JSON.stringify(filterParams))
      // } else {
      const response = await getTasks(JSON.stringify(finalFilters));
      // }
      setTasks(response?.data?.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      addToast("Failed to load tasks", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Update filter handling to call API with new filters
  const handleFilterChange = async (newFilters) => {
    setFilters(newFilters);
    // if (newFilters.balagruhaId?.length > 0 && newFilters.type?.length > 0) {
    await getAllTasks(newFilters);
    // }
  };
  const handleAddTask = async (taskData) => {

    try {
      if (isStudent) {
        addToast("Students cannot create tasks", "error");
        return;
      }
      const formData = new FormData();
      formData.append("title", taskData.title);
      formData.append("description", taskData.description);
      const assignedUserIds = Array.isArray(taskData.assignedUser)
        ? taskData.assignedUser.join(",")
        : taskData.assignedUser || "";
      formData.append("assignedUser", assignedUserIds);
      formData.append("createdBy", localStorage.getItem("userId"));
      formData.append("deadline", taskData.deadline);
      formData.append("priority", taskData.priority);
      formData.append("status", taskData.status);
      if (
        localStorage.getItem("role") === "sports-coach" ||
        localStorage.getItem("role") === "music-coach"
      ) {
        formData.append("drillOrExerciseType", taskData.drillOrExerciseType);
      }

      if (taskData.type === "purchase" || taskData.type === "order") {
        formData.append("machineDetails", taskData.machineDetails);
        formData.append("vendorDetails", taskData.vendorDetails);
        formData.append("costEstimate", taskData.costEstimate);
        formData.append("type", taskData.type);
      }

      if (taskData.type === "order") {
        formData.append("repairDetails", taskData.repairDetails);
      } else if (taskData.type === "purchase") {
        formData.append("requiredParts", taskData.requiredParts);
      }

      // Handle medical tasks
      if (taskData.type === "medical") {
        formData.append("type", taskData.type);
        if (taskData.balagruhaId) {
          formData.append("balagruhaId", taskData.balagruhaId);
        }
        if (taskData.students && taskData.students.length > 0) {
          taskData.students.forEach((studentId) => {
            formData.append("students[]", studentId);
          });
        }
      }

      if (taskData.attachments && taskData.attachments.length > 0) {
        taskData.attachments.forEach((file, index) => {
          formData.append("attachments", file);
        });
      }

      let response;
      if (localStorage.getItem("role") === "sports-coach") {
        response = await createSportsTask(formData);
      } else if (localStorage.getItem("role") === "music-coach") {
        response = await createMusicTask(formData);
      } else {
        response = await createTask(formData);

      }


      addToast(`Task "${taskData.title}" created successfully!`, "success");
      setShowCreateTask(false);
      getAllTasks(filters);
    } catch (error) {
      console.error("Error creating task:", error);
      addToast("Failed to create task", "error");
    }
  };

  const getUsers = async () => {
    try {
      const response = await fetchUsers();
      setUsers(Array.isArray(response) ? response : (response?.data || []));
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const getAssignableUsersList = async () => {
    try {
      if (isStudent) {
        setAssignableStaff([]);
        setAssignableStudents([]);
        return;
      }
      const response = await getAssignableTaskUsers();
      const staff = response?.data?.staff || [];
      const students = response?.data?.students || [];
      setAssignableStaff(staff);
      setAssignableStudents(students);
    } catch (error) {
      console.error("Error fetching assignable users:", error);
      addToast("Failed to load assignable users", "error");
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await getAssignableUsersList();
      await getUsers();
      await getBalagruhaList();
    };

    initializeData();
  }, []);

  // Effect to load tasks when filters change or when balagruhas are loaded
  useEffect(() => {
    if (balagruhas.length > 0) {
      // Ensure we have a balagruhaId in filters
      const currentFilters = { ...filters };
      if (!currentFilters.balagruhaId) {
        currentFilters.balagruhaId = balagruhas[0]._id;
        setFilters(currentFilters);
      }

      getAllTasks(currentFilters);
    }
  }, [balagruhas]);

  const addToast = (message, type = "info") => {
    const newToast = {
      id: Date.now(),
      message,
      type,
    };
    setToasts((prevToasts) => [...prevToasts, newToast]);
  };

  const removeToast = (id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const getTaskDetailsByTaskId = async (id) => {
    try {
      const response = await getTaskBytaskId(id);
      setSelectedTask(response.data?.task);
    } catch (err) {
      console.error("Error updating task status:", err);
      addToast("Failed to fetch Task based on id", "error");
    }
  };

  const updateTaskStatus = async (id, status) => {
    const statusMessages = {
      pending: 'Task moved to "Waiting to Start"',
      "in progress": 'Task moved to "Working On It"',
      completed: 'Task marked as "All Done!"',
    };

    try {
      if (isStudent) {
        addToast("Students cannot update tasks", "error");
        return;
      }
      if (role === "sports-coach") {
        await updateSportsTask(id, JSON.stringify({ status }));
      } else if (role === "music-coach") {
        await updateMusicTask(id, JSON.stringify({ status }));
      } else {
        await updateTask(id, JSON.stringify({ status }));
      }
      addToast(statusMessages[status], "success");
      getTaskDetailsByTaskId(id);

      getAllTasks(filters);

      if (selectedTask && selectedTask._id === id) {
        setSelectedTask((prev) => ({ ...prev, status }));
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      addToast("Failed to update task status", "error");
    }
  };

  // Update task with new data
  const handleUpdateTask = async (id, updateData) => {
    try {
      if (isStudent) {
        addToast("Students cannot update tasks", "error");
        return;
      }
      await updateTask(id, JSON.stringify(updateData));
      addToast("Task updated successfully", "success");

      // Refresh tasks with current filters
      getAllTasks(filters);
      getTaskDetailsByTaskId(id);
      // Update selected task if it's the one being edited
      if (selectedTask && selectedTask._id === id) {
        setSelectedTask((prev) => ({ ...prev, ...updateData }));
      }
    } catch (error) {
      console.error("Error updating task:", error);
      addToast("Failed to update task", "error");
    }
  };

  // Handle task click to show details
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  // Handle drag-and-drop
  const handleDragEnd = async (result) => {
    if (isStudent) {
      return;
    }
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // If dropped in the same column and same position, do nothing
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Get the new status based on the destination column
    const newStatus = destination.droppableId;

    // Find the task that was dragged
    const task = tasks.find((t) => t._id === draggableId);

    if (task && task.status.toLowerCase() !== newStatus) {
      // Update the task status
      await updateTaskStatus(task._id, newStatus);
    }
  };

  // Get filtered tasks for each column
  const pendingTasks = tasks.filter(
    (task) => task.status.toLowerCase() === "pending"
  );
  const inProgressTasks = tasks.filter(
    (task) => task.status.toLowerCase() === "in progress"
  );
  const completedTasks = tasks.filter(
    (task) => task.status.toLowerCase() === "completed"
  );

  return (
    <div className="task-management">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {showTaskDetails && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => {
            setShowTaskDetails(false);
          }}
          users={users}
          onStatusChange={updateTaskStatus}
          onUpdateTask={handleUpdateTask}
        />
      )}

      {showCreateTask && (
        <div className="modal-overlay">
          <CreateTaskForm
            users={users}
            staffUsers={assignableStaff}
            studentUsers={assignableStudents}
            onSubmit={handleAddTask}
            onCancel={() => setShowCreateTask(false)}
            balagruhaId={filters.balagruhaId}
          />
        </div>
      )}

      <div className="task-header-container">
        <div className="task-header">
          <h2>Task Management</h2>
          {localStorage.getItem("role") !== "student" && (
            <button
              className="add-task-button"
              onClick={() => setShowCreateTask(true)}
            >
              {/* {localStorage?.getItem('role') === 'sports-coach' ? '➕ Create Sports Task' : localStorage?.getItem('role') === "music-coach" ? '➕ Create Sports Task' : '➕ New Task'} */}
              ➕ New Task
            </button>
          )}
        </div>
        <TaskFilter
          onFilterChange={handleFilterChange}
          filters={filters}
          balagruhas={balagruhas}
          users={users}
        />
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading tasks...</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="task-categories">
            <Droppable droppableId="pending">
              {(provided) => (
                <div
                  className="category-column pending"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <h3>🚀 Waiting to Start</h3>
                  {pendingTasks.map((task, index) => (
                    <Draggable
                      key={task._id}
                      draggableId={task._id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.8 : 1,
                          }}
                          onClick={() => handleTaskClick(task)}
                        >
                          <TaskCard task={task} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {pendingTasks.length === 0 && (
                    <div className="empty-column-message">
                      <p>No tasks waiting to start</p>
                      {!isStudent && (
                        <button
                          className="add-here-button"
                          onClick={() => setShowCreateTask(true)}
                        >
                          Add Task Here
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Droppable>

            <Droppable droppableId="in progress">
              {(provided) => (
                <div
                  className="category-column in-progress"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <h3>⚙️ Working On It</h3>
                  {inProgressTasks.map((task, index) => (
                    <Draggable
                      key={task._id}
                      draggableId={task._id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.8 : 1,
                          }}
                          onClick={() => handleTaskClick(task)}
                        >
                          <TaskCard task={task} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {inProgressTasks.length === 0 && (
                    <div className="empty-column-message">
                      <p>No tasks in progress</p>
                      <p className="drag-hint">
                        Drag tasks here to start working on them
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Droppable>

            <Droppable droppableId="completed">
              {(provided) => (
                <div
                  className="category-column completed"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <h3>🎉 All Done!</h3>
                  {completedTasks.map((task, index) => (
                    <Draggable
                      key={task._id}
                      draggableId={task._id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.8 : 1,
                          }}
                          onClick={() => handleTaskClick(task)}
                        >
                          <TaskCard task={task} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {completedTasks.length === 0 && (
                    <div className="empty-column-message">
                      <p>No completed tasks</p>
                      <p className="drag-hint">
                        Drag tasks here when they're done
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      )}
    </div>
  );
};

export default TaskManagement;
