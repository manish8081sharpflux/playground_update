import React, { useState, useEffect, useRef } from "react";
import "./SportCoachDashboard.css";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import TaskManagement, {
  TaskDetailsModal,
} from "../TaskManagement/taskmanagement";
import WeeklyCalendar from "./WeeklyCalendar";
import {
  getBalagruha,
  getTasks,
  updateTask,
  fetchUsers,
  getStudentListforAttendance,
  getMachines,
  getTaskBytaskId,
  createTraining,
  getTraining,
  updateTraining,
  deleteTrainign,
  getUserBalagruhas,
  coachBasedUsers,
} from "../../api";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { CSVLink } from "react-csv";
import UserManagement from "../usermanagement/usermanagement";

const TrainingSessionModal = ({
  isOpen,
  onClose,
  onSave,
  balagruhas,
  editSession = null,
}) => {
  const [session, setSession] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    drillsAndExercises: "",
    notificationPreferences: [],
    balagruhaId: "",
    assignedStudents: [],
    type:
      localStorage.getItem("role") === "sports-coach"
        ? "sports"
        : localStorage.getItem("role") === "music-coach"
        ? "music"
        : "general",
  });

  const [selectedBalagruha, setSelectedBalagruha] = useState("");
  const [availableStudents, setAvailableStudents] = useState([]);
  const [trainingSessions, setTrainingSessions] = useState([]);

  const [studentSearchTerm, setStudentSearchTerm] = useState("");

  // Filter students based on search term
  const filteredStudents = availableStudents.filter((student) =>
    student.name.toLowerCase().includes(studentSearchTerm.toLowerCase())
  );

  // Check if all students are selected
  const allStudentsSelected =
    availableStudents.length > 0 &&
    availableStudents.every((student) =>
      session.assignedStudents.includes(student._id)
    );

  // Handle select all students
  const handleSelectAllStudents = () => {
    if (allStudentsSelected) {
      // Deselect all students
      setSession({
        ...session,
        assignedStudents: [],
      });
    } else {
      // Select all students
      const allStudentIds = availableStudents.map((student) => student._id);
      setSession({
        ...session,
        assignedStudents: allStudentIds,
      });
    }
  };

  useEffect(() => {
    if (editSession) {
      // Format the date string for datetime-local input
      let formattedDate = "";
      if (editSession.date) {
        const date = new Date(editSession.date);
        // Format: YYYY-MM-DDThh:mm
        formattedDate = date.toISOString().slice(0, 16);
      }

      // Set the session state with all fields
      setSession({
        title: editSession.title || "",
        description: editSession.description || "",
        date: formattedDate,
        location: editSession.location || "",
        drillsAndExercises: editSession.drillsAndExercises || "",
        notificationPreferences: editSession.notificationPreferences || [],
        balagruhaId: editSession.balagruhaId || "",
        assignedStudents: editSession.assignedStudents || [],
        type:
          editSession.type ||
          (localStorage.getItem("role") === "sports-coach"
            ? "sports"
            : localStorage.getItem("role") === "music-coach"
            ? "music"
            : "general"),
      });

      // If there's a balagruhaId, fetch the students
      if (editSession.balagruhaId) {
        handleBalagruhaChange(editSession.balagruhaId);
      }
    } else {
      // Reset form when creating new session
      setSession({
        title: "",
        description: "",
        date: "",
        location: "",
        drillsAndExercises: "",
        notificationPreferences: [],
        balagruhaId: "",
        assignedStudents: [],
        type:
          localStorage.getItem("role") === "sports-coach"
            ? "sports"
            : localStorage.getItem("role") === "music-coach"
            ? "music"
            : "general",
      });
      setAvailableStudents([]);
      setSelectedBalagruha("");
      setStudentSearchTerm("");
    }
  }, [editSession]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSession({ ...session, [name]: value });
  };

  const handleNotificationChange = (type) => {
    const updatedNotifications = [...session.notificationPreferences];
    if (updatedNotifications.includes(type)) {
      const index = updatedNotifications.indexOf(type);
      updatedNotifications.splice(index, 1);
    } else {
      updatedNotifications.push(type);
    }
    setSession({ ...session, notificationPreferences: updatedNotifications });
  };

  const handleBalagruhaChange = async (balagruhaId) => {
    try {
      setSession((prevSession) => ({
        ...prevSession,
        balagruhaId,
      }));
      setSelectedBalagruha(balagruhaId);

      if (balagruhaId) {
        const response = await getStudentListforAttendance(
          balagruhaId,
          new Date()
        );
        const studentList = response?.data?.studentList || [];
        setAvailableStudents(studentList);

        // If editing and we have assigned students, keep them selected
        if (editSession && editSession.assignedStudents?.length > 0) {
          setSession((prevSession) => ({
            ...prevSession,
            assignedStudents: editSession.assignedStudents,
          }));
        }
      } else {
        setAvailableStudents([]);
        setSession((prevSession) => ({
          ...prevSession,
          assignedStudents: [],
        }));
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      // Handle error appropriately (maybe show an error message to user)
    }
  };

  const handleStudentSelection = (studentId) => {
    const updatedStudents = [...session.assignedStudents];
    if (updatedStudents.includes(studentId)) {
      const index = updatedStudents.indexOf(studentId);
      updatedStudents.splice(index, 1);
    } else {
      updatedStudents.push(studentId);
    }
    setSession({ ...session, assignedStudents: updatedStudents });
  };
  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    if (!session.title.trim()) {
      alert("Please enter a session title");
      return;
    }
    if (!session.description.trim()) {
      alert("Please enter a session description");
      return;
    }
    if (!session.date) {
      alert("Please select a date and time");
      return;
    }
    if (!session.location.trim()) {
      alert("Please enter a location");
      return;
    }
    if (!session.drillsAndExercises.trim()) {
      alert("Please enter drills and exercises");
      return;
    }
    if (!session.balagruhaId) {
      alert("Please select a Balagruha");
      return;
    }
    if (session.assignedStudents.length === 0) {
      alert("Please assign at least one student");
      return;
    }

    // If all validation passes, save the session
    onSave({
      ...session,
      date: new Date(session.date).toISOString(),
    });
    onClose();
  };

  useEffect(() => {
    return () => {
      // Clean up state when component unmounts
      setSession({
        title: "",
        description: "",
        date: "",
        location: "",
        drillsAndExercises: "",
        notificationPreferences: [],
        balagruhaId: "",
        assignedStudents: [],
        type:
          localStorage.getItem("role") === "sports-coach"
            ? "sports"
            : localStorage.getItem("role") === "music-coach"
            ? "music"
            : "general",
      });
      setAvailableStudents([]);
      setSelectedBalagruha("");
      setStudentSearchTerm("");
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>
            {editSession
              ? "Edit Training Session"
              : "Create New Training Session"}
          </h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Session Title*</label>
            <input
              type="text"
              name="title"
              value={session.title}
              onChange={handleChange}
              required
              placeholder="E.g., Morning Sprint Drill"
            />
          </div>

          <div className="form-group">
            <label>Session Description*</label>
            <textarea
              name="description"
              value={session.description}
              onChange={handleChange}
              required
              placeholder="Objectives and detailed agenda"
              rows="3"
            ></textarea>
          </div>

          <div className="form-group">
            <label>Date & Time*</label>
            <input
              type="datetime-local"
              name="date"
              value={session.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Location*</label>
            <input
              type="text"
              name="location"
              value={session.location}
              onChange={handleChange}
              required
              placeholder="Physical location or online link"
            />
          </div>

          <div className="form-group">
            <label>Drills/Exercises*</label>
            <textarea
              name="drillsAndExercises"
              value={session.drillsAndExercises}
              onChange={handleChange}
              required
              placeholder="Specific activities to be performed (one per line)"
              rows="4"
            ></textarea>
          </div>

          <div className="form-group">
            <label>Select Balagruha*</label>
            <select
              name="balagruhaId"
              value={session.balagruhaId}
              onChange={(e) => handleBalagruhaChange(e.target.value)}
              required
            >
              <option value="">Select a Balagruha</option>
              {balagruhas?.map((balagruha) => (
                <option key={balagruha._id} value={balagruha._id}>
                  {balagruha.name}
                </option>
              ))}
            </select>
          </div>

          {session.balagruhaId && (
            <div className="form-group">
              <label>Assign Students*</label>
              <div className="student-filter-container">
                <div className="filter-search">
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                  />
                </div>
                <div className="student-selection">
                  {availableStudents.length > 0 && (
                    <div className="filter-option select-all">
                      <label>
                        <input
                          type="checkbox"
                          checked={allStudentsSelected}
                          onChange={handleSelectAllStudents}
                        />
                        {allStudentsSelected ? "Deselect All" : "Select All"}{" "}
                        Students
                      </label>
                    </div>
                  )}
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <div key={student._id} className="filter-option">
                        <label>
                          <input
                            type="checkbox"
                            checked={session.assignedStudents.includes(
                              student._id
                            )}
                            onChange={() => handleStudentSelection(student._id)}
                          />
                          {student.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">No matching students found</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Notification Preferences</label>
            <div className="notification-options">
              <label>
                <input
                  type="checkbox"
                  checked={session.notificationPreferences.includes("email")}
                  onChange={() => handleNotificationChange("email")}
                />
                Email
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={session.notificationPreferences.includes("sms")}
                  onChange={() => handleNotificationChange("sms")}
                />
                SMS
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-button">
              Save Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Performance Detail Modal Component
const PerformanceDetailModal = ({
  isOpen,
  onClose,
  performanceData,
  studentName,
  metricName,
}) => {
// Debug log

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${studentName} - ${metricName} Performance Report`, 20, 20);

    doc.setFontSize(12);
    doc.text(`Current Value: ${performanceData.current}`, 20, 40);
    doc.text(`Previous Value: ${performanceData.previous}`, 20, 50);
    doc.text(`Change: ${performanceData.change}`, 20, 60);
    doc.text(`Last Updated: March 25, 2025`, 20, 70);

    doc.setFontSize(14);
    doc.text("Historical Data", 20, 90);

    const historicalData = [
      { date: "2025-01-15", value: performanceData.previous },
      {
        date: "2025-02-01",
        value:
          (parseFloat(performanceData.previous) +
            parseFloat(performanceData.current)) /
            2 +
          (performanceData.metric.includes("Time") ? "s" : "%"),
      },
      { date: "2025-02-15", value: performanceData.current },
    ];

    const tableColumn = ["Date", "Value"];
    const tableRows = historicalData.map((data) => [data.date, data.value]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 100,
      theme: "grid",
    });

    doc.save(`${studentName}_${metricName}_Performance.pdf`);
  };

  const handleExportCSV = () => {
    const historicalData = [
      { date: "2025-01-15", value: performanceData.previous },
      {
        date: "2025-02-01",
        value:
          (parseFloat(performanceData.previous) +
            parseFloat(performanceData.current)) /
            2 +
          (performanceData.metric.includes("Time") ? "s" : "%"),
      },
      { date: "2025-02-15", value: performanceData.current },
    ];

    const csvData = [
      ["Student", "Metric", "Date", "Value"],
      [studentName, metricName, "2025-01-15", performanceData.previous],
      [
        studentName,
        metricName,
        "2025-02-01",
        (parseFloat(performanceData.previous) +
          parseFloat(performanceData.current)) /
          2 +
          (performanceData.metric.includes("Time") ? "s" : "%"),
      ],
      [studentName, metricName, "2025-02-15", performanceData.current],
    ];

    // Create a temporary link element
    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvData.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${studentName}_${metricName}_Performance.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  // Mock historical data for the selected metric
  const historicalData = [
    { date: "2025-01-15", value: performanceData.previous },
    {
      date: "2025-02-01",
      value:
        (parseFloat(performanceData.previous) +
          parseFloat(performanceData.current)) /
          2 +
        (performanceData.metric.includes("Time") ? "s" : "%"),
    },
    { date: "2025-02-15", value: performanceData.current },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>
            {studentName} - {metricName} Performance
          </h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="performance-detail-content">
          <div className="performance-chart">
            <h3>Performance Trend</h3>
            <div className="chart-placeholder">
              {/* In a real implementation, this would be a chart component */}
              <div className="mock-chart">
                <div className="chart-y-axis">
                  <span>High</span>
                  <span>Med</span>
                  <span>Low</span>
                </div>
                <div className="chart-bars">
                  {historicalData.map((data, index) => (
                    <div key={index} className="chart-bar-container">
                      <div
                        className="chart-bar"
                        style={{
                          height: `${index * 25 + 25}%`,
                          backgroundColor: index === 2 ? "#4CAF50" : "#2196F3",
                        }}
                      ></div>
                      <span className="chart-date">{data.date}</span>
                      <span className="chart-value">{data.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="performance-details">
            <h3>Performance Details</h3>
            <table className="detail-table">
              <tbody>
                <tr>
                  <td>Current Value:</td>
                  <td>
                    <strong>{performanceData.current}</strong>
                  </td>
                </tr>
                <tr>
                  <td>Previous Value:</td>
                  <td>{performanceData.previous}</td>
                </tr>
                <tr>
                  <td>Change:</td>
                  <td
                    className={`${
                      performanceData.change.includes("+")
                        ? "positive"
                        : "negative"
                    }`}
                  >
                    {performanceData.change}
                  </td>
                </tr>
                <tr>
                  <td>Last Updated:</td>
                  <td>March 25, 2025</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="coach-feedback">
            <h3>Coach Feedback</h3>
            <textarea
              placeholder="Enter your feedback and suggestions for improvement..."
              rows="4"
            ></textarea>
            <button className="save-feedback">Save Feedback</button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="export-button" onClick={handleExportPDF}>
            Export Data (PDF)
          </button>
          <button className="export-button" onClick={handleExportCSV}>
            Export Data (CSV)
          </button>
          <button className="close-modal" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const AddMetricModal = ({ isOpen, onClose, onSave }) => {
  const [metric, setMetric] = useState({
    student: "",
    metricName: "",
    currentValue: "",
    previousValue: "",
    date: new Date().toISOString().split("T")[0],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMetric({ ...metric, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Calculate change based on metric type
    let change = "";
    if (
      metric.metricName.toLowerCase().includes("time") ||
      metric.metricName.toLowerCase().includes("speed")
    ) {
      // For time/speed metrics, negative change is good (faster time)
      const prev = parseFloat(metric.previousValue);
      const curr = parseFloat(metric.currentValue);
      const diff = prev - curr;
      change =
        diff > 0 ? `-${diff.toFixed(1)}s` : `+${Math.abs(diff).toFixed(1)}s`;
    } else {
      // For other metrics like accuracy, positive change is good
      const prev = parseFloat(metric.previousValue);
      const curr = parseFloat(metric.currentValue);
      const diff = curr - prev;
      change = diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
    }

    onSave({
      ...metric,
      change,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Performance Metric</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Student*</label>
            <select
              name="student"
              value={metric.student}
              onChange={handleChange}
              required
            >
              <option value="">Select Student</option>
              <option value="Alex Johnson">Alex Johnson</option>
              <option value="Maya Patel">Maya Patel</option>
              <option value="Tyler Smith">Tyler Smith</option>
              <option value="Emma Wilson">Emma Wilson</option>
            </select>
          </div>

          <div className="form-group">
            <label>Metric Name*</label>
            <input
              type="text"
              name="metricName"
              value={metric.metricName}
              onChange={handleChange}
              required
              placeholder="E.g., Free Throw Accuracy, 100m Sprint Time"
            />
          </div>

          <div className="form-group">
            <label>Current Value*</label>
            <input
              type="text"
              name="currentValue"
              value={metric.currentValue}
              onChange={handleChange}
              required
              placeholder="E.g., 75%, 12.5s"
            />
          </div>

          <div className="form-group">
            <label>Previous Value*</label>
            <input
              type="text"
              name="previousValue"
              value={metric.previousValue}
              onChange={handleChange}
              required
              placeholder="E.g., 70%, 13.2s"
            />
          </div>

          <div className="form-group">
            <label>Date Recorded</label>
            <input
              type="date"
              name="date"
              value={metric.date}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-button">
              Save Metric
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// New File Upload Modal Component
const FileUploadModal = ({ isOpen, onClose, onUpload }) => {
  const [files, setFiles] = useState([]);
  const [fileType, setFileType] = useState("report");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setUploading(true);

    // Simulate upload process
    setTimeout(() => {
      onUpload({
        files: files.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        })),
        fileType,
        description,
        uploadDate: new Date().toISOString(),
      });
      setUploading(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Upload Files</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>File Type</label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              required
            >
              <option value="report">Performance Report</option>
              <option value="video">Training Video</option>
              <option value="assessment">Student Assessment</option>
              <option value="other">Other Document</option>
            </select>
          </div>

          <div className="form-group">
            <label>Select Files</label>
            <input
              type="file"
              onChange={handleFileChange}
              multiple
              required
              className="file-input"
            />
            <div className="selected-files">
              {files.length > 0 ? (
                <ul>
                  {files.map((file, index) => (
                    <li key={index}>
                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No files selected</p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for these files..."
              rows="3"
            ></textarea>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Files"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TrainingFilter = ({ onFilterChange, filters, balagruhas }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const filterRef = useRef(null);

  // useEffect(() => {
  //     if (balagruhas?.length > 0 && (!filters.balagruhaId || filters.balagruhaId.length === 0)) {
  //         const allBalagruhaIds = balagruhas.map(bal => bal._id);
  //         onFilterChange({
  //             ...filters,
  //             balagruhaIds: allBalagruhaIds
  //         });
  //     }
  // }, [balagruhas]);

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

  const handleBalagruhaChange = (balagruhaId) => {
    const newBalagruhaIds = filters.balagruhaIds?.includes(balagruhaId)
      ? filters.balagruhaIds.filter((id) => id !== balagruhaId)
      : [...(filters.balagruhaIds || []), balagruhaId];

    onFilterChange({
      ...filters,
      balagruhaIds: newBalagruhaIds,
    });
  };

  const handleSelectAllVisible = () => {
    const visibleBalagruhaIds = filteredBalagruha.map((bal) => bal._id);
    const allCurrentlySelected = visibleBalagruhaIds.every((id) =>
      filters.balagruhaIds?.includes(id)
    );

    if (allCurrentlySelected) {
      // Deselect all visible items
      const newSelected = filters.balagruhaIds?.filter(
        (id) => !visibleBalagruhaIds.includes(id)
      );
      onFilterChange({
        ...filters,
        balagruhaIds: newSelected || [],
      });
    } else {
      // Select all visible items
      const newSelected = [
        ...new Set([...(filters.balagruhaIds || []), ...visibleBalagruhaIds]),
      ];
      onFilterChange({
        ...filters,
        balagruhaIds: newSelected,
      });
    }
  };

  const clearFilters = () => {
    const allBalagruhaIds = balagruhas.map((bal) => bal._id);
    onFilterChange({
      balagruhaIds: allBalagruhaIds,
    });
  };

  const filteredBalagruha =
    balagruhas?.filter((bal) =>
      bal.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  // Check if all visible balagruhas are selected
  const allVisibleSelected =
    filteredBalagruha.length > 0 &&
    filteredBalagruha.every((bal) => filters.balagruhaIds?.includes(bal._id));
  return (
    <div className="training-filter" ref={filterRef}>
      <div className="filter-buttons">
        <div style={{ position: "relative" }}>
          <button
            className={`filter-button ${
              activeFilter === "balagruha" ? "active" : ""
            }`}
            onClick={() => toggleFilter("balagruha")}
          >
            Balagruha{" "}
            {filters.balagruhaIds?.length > 0 &&
              `(${filters.balagruhaIds.length})`}
          </button>
          {isOpen && activeFilter === "balagruha" && (
            <div className="filter-dropdown">
              <div className="filter-search">
                <input
                  type="text"
                  placeholder="Search balagruha..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {filteredBalagruha.length > 0 && (
                <div className="filter-option select-all">
                  <label>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={handleSelectAllVisible}
                    />
                    {allVisibleSelected ? "Deselect All" : "Select All"} Visible
                  </label>
                </div>
              )}
              {filteredBalagruha.length > 0 ? (
                filteredBalagruha.map((balagruha) => (
                  <div key={balagruha._id} className="filter-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={filters.balagruhaIds?.includes(balagruha._id)}
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

        {filters.balagruhaIds?.length !== balagruhas?.length && (
          <button className="clear-filters-button" onClick={clearFilters}>
            Select All ({balagruhas?.length})
          </button>
        )}
      </div>
    </div>
  );
};

const MusicCoachDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [balagruhas, setBalagruhas] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedBalagruha, setSelectedBalagruha] = useState();
  const [coaches, setCoaches] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [machines, setMachines] = useState([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [balagruhaStudents, setBalagruhaStudents] = useState([]);
  const [showAddMetricModal, setShowAddMetricModal] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState([]);
  const [performanceData, setPerformanceData] = useState([
    {
      student: "Alex Johnson",
      metric: "Free Throw Accuracy",
      current: "75%",
      previous: "68%",
      change: "+7%",
    },
    {
      student: "Maya Patel",
      metric: "100m Freestyle Time",
      current: "1:05",
      previous: "1:08",
      change: "-3s",
    },
    {
      student: "Tyler Smith",
      metric: "Sprint Speed (40m)",
      current: "5.2s",
      previous: "5.4s",
      change: "-0.2s",
    },
  ]);

  const [musicSessions, setMusicSessions] = useState([
    {
      id: "MUS001",
      title: "Beginner Piano Techniques",
      description: "Introduction to basic piano scales and finger exercises.",
      dateTime: "2025-04-01T10:00",
      location: "Music Room 101",
      repertoire:
        "1. C Major Scale (5 min)\n2. Basic Finger Exercises (10 min)\n3. Twinkle Twinkle (15 min)\n4. Hands Coordination Drill (20 min)",
    },
    {
      id: "MUS002",
      title: "Vocal Warm-ups & Breath Control",
      description:
        "Improving breath control and vocal range through structured exercises.",
      dateTime: "2025-04-02T14:30",
      location: "Zoom Link: https://zoom.us/j/123456789",
      repertoire:
        "1. Deep Breathing (5 min)\n2. Humming Exercises (10 min)\n3. Lip Trills (10 min)\n4. Singing Scales (15 min)",
    },
    {
      id: "MUS003",
      title: "Guitar Chord Transitions",
      description:
        "Developing smooth chord transitions and strumming patterns.",
      dateTime: "2025-04-03T16:00",
      location: "Music Studio B",
      repertoire:
        "1. Warm-up Strumming (5 min)\n2. C to G Chord Changes (10 min)\n3. Strumming Patterns (15 min)\n4. Simple Song Practice (20 min)",
    },
  ]);

  const [dashboardStats, setDashboardStats] = useState({
    assignedStudents: 24,
    trainingSessions: 0,
    activeTasks: 8,
    attendanceRate: 100,
  });

  const calculateDashboardStats = () => {
    // Calculate assigned students from all balagruhas
    const totalStudents = users.length;

    // Calculate active tasks
    const activeTasks = tasks.filter(
      (task) => task.status !== "completed" && task.status !== "cancelled"
    ).length;

    // Calculate attendance rate (if you have attendance data)
    // const attendanceRate = attendance.length > 0
    //     ? Math.round((attendance.filter(a => a.present).length / attendance.length) * 100)
    //     : 0;

    setDashboardStats({
      trainingSessions: trainingSessions.length,
      assignedStudents: totalStudents,
      activeTasks: activeTasks,
      attendanceRate: 100,
    });
  };

  const [trainingFilters, setTrainingFilters] = useState({
    balagruhaIds: [],
  });

  const handleTrainingFilterChange = (newFilters) => {
    setTrainingFilters(newFilters);

    getTrainingSessions(newFilters);
  };

  const getTrainingSessions = async (filters) => {
    try {
      // Get all balagruha IDs
      // if (!filters) {

      //     const balagruhaIds = balagruhas.map(b => b._id).join(',');
      let balagruhaIds;

      if (filters.balagruhaIds.length !== 0) {
        balagruhaIds = filters.balagruhaIds;
      } else {
        balagruhaIds =
          "67e90b97f85808bbedb325b7,67e90becf85808bbedb325c9,67e90ccff85808bbedb32690,67e90d00f85808bbedb32699,67e910bab77f10b9b20e23d9,67e9159f5071b4b7175342b5,67e915f65071b4b717534358,67ea7d5e2b7ffe9e17e8c93c";
      }
      const type =
        localStorage.getItem("role") === "sports-coach" ? "sports" : "music";
      // }

      const response = await getTraining(balagruhaIds, type);

      setTrainingSessions(response.data.trainingSessions || []);
    } catch (error) {
      console.error("Error fetching training sessions:", error);
    }
  };

  useEffect(() => {
    getTrainingSessions(trainingFilters);
  }, [activeTab]);

  useEffect(() => {
    if (balagruhas.length > 0) {
      getTrainingSessions(trainingFilters);
    }
  }, [balagruhas]);

  // New state variables for reports and file uploads
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([
    {
      id: "file001",
      name: "Team Performance Q1 2025.pdf",
      type: "report",
      size: "1.2 MB",
      uploadDate: "2025-03-15T10:30:00",
      description: "Quarterly performance analysis for basketball team",
    },
    {
      id: "file002",
      name: "Swimming Technique Analysis.mp4",
      type: "video",
      size: "45.8 MB",
      uploadDate: "2025-03-10T14:15:00",
      description: "Video analysis of freestyle swimming techniques",
    },
  ]);
  const [reportType, setReportType] = useState("attendance");
  const [reportDateRange, setReportDateRange] = useState("thisWeek");
  const [reportData, setReportData] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // CSV export ref
  const csvLinkRef = useRef();

  const handleSaveMetric = (metricData) => {
    const newMetric = {
      student: metricData.student,
      metric: metricData.metricName,
      current: metricData.currentValue,
      previous: metricData.previousValue,
      change: metricData.change,
    };

    // Update both state arrays
    setPerformanceMetrics([...performanceMetrics, newMetric]);
    setPerformanceData([...performanceData, newMetric]);
  };

  // Handle file upload
  const handleFileUpload = (uploadData) => {
    const newFiles = uploadData.files.map((file, index) => ({
      id: `file${String(uploadedFiles.length + index + 1).padStart(3, "0")}`,
      name: file.name,
      type: uploadData.fileType,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      uploadDate: uploadData.uploadDate,
      description: uploadData.description,
    }));

    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  // Generate report data
  const generateReport = () => {
    setIsGeneratingReport(true);

    // Simulate report generation
    setTimeout(() => {
      let data;

      if (reportType === "attendance") {
        data = {
          title: "Student Attendance Report",
          summary: {
            totalStudents: 24,
            averageAttendance: "92%",
            perfectAttendance: 15,
            missedSessions: 8,
          },
          details: [
            {
              student: "Alex Johnson",
              attendance: "90%",
              missedSessions: 2,
              notes: "Excused absence on Mar 15",
            },
            {
              student: "Maya Patel",
              attendance: "95%",
              missedSessions: 1,
              notes: "Always on time",
            },
            {
              student: "Tyler Smith",
              attendance: "85%",
              missedSessions: 3,
              notes: "Late twice this month",
            },
            {
              student: "Emma Wilson",
              attendance: "88%",
              missedSessions: 2,
              notes: "Improving consistency",
            },
          ],
        };
      } else if (reportType === "performance") {
        data = {
          title: "Performance Metrics Report",
          summary: {
            totalMetrics: performanceData.length,
            improvementRate: "78%",
            topPerformer: "Maya Patel",
            mostImproved: "Alex Johnson",
          },
          details: performanceData.map((item) => ({
            student: item.student,
            metric: item.metric,
            current: item.current,
            previous: item.previous,
            change: item.change,
            trend: item.change.includes("+") ? "Improving" : "Needs Focus",
          })),
        };
      } else if (reportType === "training") {
        data = {
          title: "Training Progress Report",
          summary: {
            totalSessions: trainingSessions.length,
            completionRate: "95%",
            averageStudents: 9,
            topActivity: "Sprint Training",
          },
          details: trainingSessions.map((session) => ({
            id: session.id,
            title: session.title,
            date: new Date(session.dateTime).toLocaleDateString(),
            location: session.location,
            students: session.students,
            status: "Completed",
          })),
        };
      }

      setReportData(data);
      setIsGeneratingReport(false);
    }, 1500);
  };

  // Export report as PDF
  const exportReportPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(reportData.title, 20, 20);

    doc.setFontSize(14);
    doc.text("Summary", 20, 35);

    doc.setFontSize(12);
    let yPos = 45;
    Object.entries(reportData.summary).forEach(([key, value]) => {
      const formattedKey = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      doc.text(`${formattedKey}: ${value}`, 25, yPos);
      yPos += 8;
    });

    doc.setFontSize(14);
    doc.text("Details", 20, yPos + 10);

    // Create table for details
    const tableColumn = Object.keys(reportData.details[0]).map((key) =>
      key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
    );

    const tableRows = reportData.details.map((item) => Object.values(item));

    doc.save(`${reportData.title.replace(/\s+/g, "_")}.pdf`);
  };

  // Export report as CSV
  const exportReportCSV = () => {
    if (!reportData) return;

    const csvData = [
      // Header row with column names
      Object.keys(reportData.details[0]).map((key) =>
        key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
      ),
      // Data rows
      ...reportData.details.map((item) => Object.values(item)),
    ];

    // Trigger CSV download
    if (csvLinkRef.current) {
      csvLinkRef.current.link.click();
    }
  };

  // New state variables for training sessions and performance tracking
  const [trainingSessions, setTrainingSessions] = useState([]);

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedPerformance, setSelectedPerformance] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [performanceFilter, setPerformanceFilter] = useState({
    student: "all",
    metric: "all",
    timeRange: "30days",
  });
  useEffect(() => {
    calculateDashboardStats();
  }, [balagruhas, trainingSessions, tasks, attendance]);

  const [showUpdatePerformanceModal, setShowUpdatePerformanceModal] =
    useState(false);

  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getCalendarEvents = () => {
    if (!tasks || tasks.length === 0) {
      // If no tasks, use dummy data
      return [
        {
          id: 1,
          title: "Visit to Sampare",
          location: "Shelpimplegaon",
          date: "2025-03-20",
          time: "09:00-11:00",
          type: "visit",
          description: "Regular visit to check on children's progress",
          attendees: ["Coach 1", "Admin", "Local Volunteer"],
          status: "Confirmed",
          // Create a task-like object for the modal
          taskData: {
            _id: "1",
            title: "Visit to Sampare",
            description: "Regular visit to check on children's progress",
            status: "pending",
            priority: "High",
            deadline: "2025-03-20T11:00:00",
            createdAt: "2025-03-15T09:00:00",
            assignedUser: "1",
            createdBy: "2",
            comments: [],
            attachments: [],
          },
        },
      ];
    }

    return tasks.map((task) => ({
      id: task._id,
      title: task.title,
      location: task.location || "Not specified",
      date: task.deadline ? task.deadline.split("T")[0] : "2025-03-20",
      time: task.startTime || "All day",
      type: (task.priority || "medium").toLowerCase(),
      description: task.description,
      attendees: [
        users.find((u) => u._id === task.assignedUser)?.name || "Unassigned",
        users.find((u) => u._id === task.createdBy)?.name || "Unknown",
      ],
      status:
        task.status === "completed"
          ? "Completed"
          : task.status === "in progress"
          ? "In Progress"
          : "Pending",
      taskData: task,
    }));
  };

  // Calendar events data
  const calendarEvents = getCalendarEvents();

  const getBalagruhaList = async () => {
    try {
      // Use getUserBalagruhas instead of getBalagruha - works for all roles
      const response = await getUserBalagruhas();
      // Filter out STOCK option
      const actualBalagruhas = (response?.data || []).filter(b => b._id !== 'STOCK');
      setBalagruhas(actualBalagruhas);
    } catch (error) {
      console.error("Error fetching balagruha list:", error);
    }
  };

  const getTasksList = async () => {
    let data = {
      balagruhaId: "67b63186d2486ca7b43fe418",
    };
    try {
      const response = await getTasks(JSON.stringify(data));

      setTasks(response?.data?.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const getUsersList = async () => {
    try {
      const response = await coachBasedUsers();


      // Set all users
      setUsers(response || []);

      // Filter coaches
      const coachUsers = (response || []).filter(
        (user) => user.role === "coach"
      );
      setCoaches(coachUsers);

      // Filter students
      const studentUsers = (response || []).filter(
        (user) => user.role === "student"
      );
      setStudents(studentUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const getStudentListBasedonDate = async (id) => {
    try {
      const response = await getStudentListforAttendance(id, new Date());
      setAttendance(response?.data?.studentList || []);

      // Set students for the selected balagruha
      const balagruhaStudentsList = response?.data?.studentList || [];
      setBalagruhaStudents(balagruhaStudentsList);
      setShowStudentDropdown(true);
    } catch (error) {
      console.error("Error fetching student list:", error);
    }
  };
  const getTaskDetailsByTaskId = async (id) => {
    try {
      const response = await getTaskBytaskId(id);
      setSelectedTask(response);
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, JSON.stringify({ status: newStatus }));
      // Refresh tasks after update
      getTasksList();
      getTaskDetailsByTaskId(taskId);
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  // Handle task update
  const handleUpdateTask = async (taskId, updateData) => {
    try {
      await updateTask(taskId, JSON.stringify(updateData));
      // Refresh tasks after update
      getTasksList();
      getTaskDetailsByTaskId(taskId);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (
      window.confirm("Are you sure you want to delete this training session?")
    ) {
      try {
        // Add your delete API call here
        // await deleteTrainingSession(sessionId);

        // Update the local state
        const response = await deleteTrainign(sessionId);
        getTrainingSessions(trainingFilters);
        setTrainingSessions((prevSessions) =>
          prevSessions.filter((session) => session._id !== sessionId)
        );
      } catch (error) {
        console.error("Error deleting training session:", error);
      }
    }
  };

  useEffect(() => {
    getTrainingSessions(trainingFilters);
    getBalagruhaList();
    getTasksList();
    getUsersList();
  }, []);

  // Handle navigation from Layout menu with state
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleEventClick = (event) => {
    setSelectedTask(event.taskData);
    setShowTaskModal(true);
  };

  // Handle creating or updating a training session
  const handleSaveSession = async (sessionData) => {
    // if (editingSession) {
    //     // Update existing session
    //     const updatedSessions = trainingSessions.map(session =>
    //         session.id === editingSession.id ? { ...sessionData, id: session.id } : session
    //     );
    //     setTrainingSessions(updatedSessions);
    // } else {
    //     // Create new session
    //     const newSession = {
    //         ...sessionData,
    //         id: `SES${String(trainingSessions.length + 1).padStart(3, '0')}`,
    //         students: Math.floor(Math.random() * 10) + 5 // Random number of students for demo
    //     };
    //     setTrainingSessions([...trainingSessions, newSession]);
    // }
    if (editingSession?._id) {
      const response = await updateTraining(
        editingSession._id,
        JSON.stringify(sessionData)
      );
      getTrainingSessions(trainingFilters);
    } else {
      const response = await createTraining(JSON.stringify(sessionData));
      getTrainingSessions(trainingFilters);

    }
    setEditingSession(null);
  };

  // Handle opening the performance detail modal
  const handlePerformanceClick = (performance, student, metric) => {
    setSelectedPerformance(performance);
    setSelectedStudent(student);
    setSelectedMetric(metric);
    setShowPerformanceModal(true);

  };

  // Handle performance filter change
  const handlePerformanceFilterChange = (e) => {
    const { name, value } = e.target;
    setPerformanceFilter({
      ...performanceFilter,
      [name]: value,
    });
  };

  // Export performance data as CSV
  const exportPerformanceData = () => {
    const csvData = [
      ["Student", "Metric", "Current Value", "Previous Value", "Change"],
      ...performanceData.map((item) => [
        item.student,
        item.metric,
        item.current,
        item.previous,
        item.change,
      ]),
    ];

    // Create a temporary link element
    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvData.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "performance_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mock data for dashboard
  const assignedStudents = [
    {
      id: "STU001",
      name: "Alex Johnson",
      musicTask: "Piano Scales Practice",
      level: "Intermediate",
      practiceCompletion: "90%",
      taskDescription: "Practice C major and G major scales for both hands.",
      dueDate: "2025-04-05",
      priority: "Medium",
      attachedMedia: "https://example.com/alex-piano-practice.mp3",
    },
    {
      id: "STU002",
      name: "Maya Patel",
      musicTask: "Vocal Warm-Up Exercises",
      level: "Advanced",
      practiceCompletion: "95%",
      taskDescription:
        "Perform 15-minute vocal warm-ups including arpeggios and sirens.",
      dueDate: "2025-04-06",
      priority: "High",
      attachedMedia: "https://example.com/maya-vocal.mp4",
    },
    {
      id: "STU003",
      name: "Tyler Smith",
      musicTask: "Guitar Chord Transitions",
      level: "Beginner",
      practiceCompletion: "85%",
      taskDescription:
        "Practice transitioning between G, D, and C chords smoothly.",
      dueDate: "2025-04-07",
      priority: "Low",
      attachedMedia: "",
    },
    {
      id: "STU004",
      name: "Emma Wilson",
      musicTask: "Violin Bowing Technique",
      level: "Intermediate",
      practiceCompletion: "88%",
      taskDescription: "Work on smooth bowing and maintaining consistent tone.",
      dueDate: "2025-04-08",
      priority: "Medium",
      attachedMedia: "https://example.com/emma-violin.mp3",
    },
  ];

  const filteredPerformanceData = performanceData.filter((data) => {
    if (
      performanceFilter.student !== "all" &&
      data.student !== performanceFilter.student
    ) {
      return false;
    }
    if (performanceFilter.metric !== "all") {
      const metricType = performanceFilter.metric;
      if (
        metricType === "speed" &&
        !data.metric.toLowerCase().includes("speed") &&
        !data.metric.toLowerCase().includes("time")
      ) {
        return false;
      }
      if (
        metricType === "accuracy" &&
        !data.metric.toLowerCase().includes("accuracy")
      ) {
        return false;
      }
      if (
        metricType === "endurance" &&
        !data.metric.toLowerCase().includes("endurance")
      ) {
        return false;
      }
    }
    return true;
  });

  const sportCoachMenu = [
    { id: 1, name: "Dashboard", activeTab: "dashboard" },
    // { id: 2, name: "Students", activeTab: "students" },
    { id: 3, name: "Training", activeTab: "training" },
    { id: 4, name: "Tasks", activeTab: "tasks", link: "/task" },
    // { id: 5, name: "Performance", activeTab: "performance" },
    // { id: 6, name: "Reports", activeTab: "reports" },
    { id: 7, name: "Users", activeTab: "users" },
    { id: 8, name: "Purchases", activeTab: "purchases", link: "/purchase" },
    { id: 9, name: "Shop", activeTab: "shop", link: "/shop" },
  ];

  return (
    <div className="sports-coach-dashboard">
      <div className="header">
        <div className="user-info" style={{ flexDirection: "row" }}>
          <h2>Hi {localStorage?.getItem("name")},</h2>
          <div className="avatar">
            {localStorage?.getItem("name")?.charAt(0)}
          </div>
        </div>

        {/* Top Menu */}
        <div className="top-menu scrollable-menu">
          {sportCoachMenu.map((menu) => (
            <div
              key={menu.id}
              className={`menu-item ${
                activeTab === menu.activeTab ? "active" : ""
              }`}
              onClick={() => {
                if (menu.link) {
                  navigate(menu.link);
                } else {
                  setActiveTab(menu?.activeTab);
                }
              }}
            >
              {menu.name}
            </div>
          ))}
        </div>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>

      {/* Main Content Area */}
      <div className="sport-main-content">
        {/* Tab Content */}
        <div className="sport-dashboard-content">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="sport-dashboard-overview">
              {activeTab === "dashboard" && (
                <div className="sport-dashboard-overview">
                  <div className="sport-stats-cards">
                    <div className="sport-stat-card">
                      <div className="sport-stat-icon">👥</div>
                      <div className="sport-stat-info">
                        <h3>{dashboardStats.assignedStudents}</h3>
                        <p>Assigned Students</p>
                      </div>
                    </div>
                    <div className="sport-stat-card">
                      <div className="sport-stat-icon">📅</div>
                      <div className="sport-stat-info">
                        <h3>{dashboardStats.trainingSessions}</h3>
                        <p>Training Sessions</p>
                      </div>
                    </div>
                    {/* <div className="sport-stat-card">
                                            <div className="sport-stat-icon">✅</div>
                                            <div className="sport-stat-info">
                                                <h3>{dashboardStats.activeTasks}</h3>
                                                <p>Active Tasks</p>
                                            </div>
                                        </div> */}
                    <div className="sport-stat-card">
                      <div className="sport-stat-icon">📈</div>
                      <div className="sport-stat-info">
                        <h3>{dashboardStats.attendanceRate}</h3>
                        <p>Attendance Rate</p>
                      </div>
                    </div>
                  </div>
                  {/* Performance Summary */}
                  <div className="dashboard-row">
                    {/* <div className="dashboard-card performance-summary">
                                            <h3>Performance Highlights</h3>
                                            <div className="performance-metrics">
                                                {performanceData.slice(0, 3).map((data, index) => (
                                                    <div key={index} className="performance-metric-item">
                                                        <div className="student-info">
                                                            <span className="student-avatar">{data.student.charAt(0)}</span>
                                                            <span className="student-name">{data.student}</span>
                                                        </div>
                                                        <div className="metric-info">
                                                            <span className="metric-name">{data.metric}</span>
                                                            <span className={`metric-change ${data.change.includes('+') ? 'positive' : 'negative'}`}>
                                                                {data.change}
                                                            </span>
                                                        </div>
                                                        <div className="progress-container">
                                                            <div
                                                                className="progress-bar"
                                                                style={{
                                                                    width: `${data.metric.includes('Accuracy') ? data.current.replace('%', '') : '75'}%`,
                                                                    backgroundColor: data.change.includes('+') ? '#4CAF50' :
                                                                        data.change.includes('-') && data.metric.includes('Time') ? '#4CAF50' : '#F44336'
                                                                }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    className="view-all-button"
                                                    onClick={() => setActiveTab('performance')}
                                                >
                                                    View All Metrics
                                                </button>
                                            </div>
                                        </div> */}

                    {/* Upcoming Sessions */}

                    <div className="dashboard-card upcoming-sessions">
                      <h3>Today's Training Sessions</h3>
                      <div className="session-list">
                        {trainingSessions
                          .filter((session) => {
                            const sessionDate = new Date(session.date);
                            const today = new Date();
                            return (
                              sessionDate.toDateString() ===
                              today.toDateString()
                            );
                          })
                          .slice(0, 2)
                          .map((session) => (
                            <div key={session._id} className="session-item">
                              <div className="session-time">
                                {new Date(session.date).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              <div className="session-details">
                                <h4>{session.title}</h4>
                                <p>
                                  {session.location} •{" "}
                                  {session.assignedStudents?.length || 0}{" "}
                                  students
                                </p>
                              </div>
                              <button
                                className="view-session-button"
                                onClick={() => {
                                  setEditingSession(session);
                                  setActiveTab("training");
                                  setShowSessionModal(true);
                                }}
                              >
                                Details
                              </button>
                            </div>
                          ))}
                        {trainingSessions.filter((session) => {
                          const sessionDate = new Date(session.date);
                          const today = new Date();
                          return (
                            sessionDate.toDateString() === today.toDateString()
                          );
                        }).length === 0 && (
                          <div className="no-sessions">
                            No training sessions scheduled for today
                          </div>
                        )}
                        <button
                          className="view-all-button"
                          onClick={() => setActiveTab("training")}
                        >
                          View All Sessions
                        </button>
                      </div>
                    </div>

                    <div className="dashboard-card tasks-overview">
                      <h3>Tasks</h3>
                      <div className="tasks-summary">
                        <div className="task-stat">
                          <div className="task-stat-number">8</div>
                          <div className="task-stat-label">Active</div>
                        </div>
                        <div className="task-stat">
                          <div className="task-stat-number">3</div>
                          <div className="task-stat-label">Due Today</div>
                        </div>
                        <div className="task-stat">
                          <div className="task-stat-number">12</div>
                          <div className="task-stat-label">Completed</div>
                        </div>
                      </div>
                      <div className="recent-tasks">
                        <h4>Recent Tasks</h4>
                        {tasks.slice(0, 3).map((task) => (
                          <div
                            key={task._id || Math.random()}
                            className="task-item"
                          >
                            <div
                              className={`task-priority ${
                                task.priority?.toLowerCase() || "medium"
                              }`}
                            ></div>
                            <div className="task-content">
                              <h5>{task.title || "Untitled Task"}</h5>
                              <p>
                                {task.deadline
                                  ? new Date(task.deadline).toLocaleDateString()
                                  : "No deadline"}
                              </p>
                            </div>
                            <div
                              className={`task-status ${
                                task.status
                                  ?.replace(/\s+/g, "-")
                                  .toLowerCase() || "pending"
                              }`}
                            >
                              {task.status || "Pending"}
                            </div>
                          </div>
                        ))}
                        <button
                          className="view-all-button"
                          onClick={() => setActiveTab("tasks")}
                        >
                          Manage Tasks
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tasks and Student Overview */}
                  {/* <div className="dashboard-row">
                                       


                                    </div> */}

                  {/* Quick Actions */}
                  {/* <div className="quick-actions">
                                        <h3>Quick Actions</h3>
                                        <div className="action-buttons">

                                            <button onClick={() => setShowFileUploadModal(true)}>
                                                <span>📊</span> Record Performance
                                            </button>
                                            <button onClick={() => setShowFileUploadModal(true)}>
                                                <span>📁</span> Upload Files
                                            </button>
                                            <button onClick={() => setActiveTab('reports')}>
                                                <span>📝</span> Generate Report
                                            </button>
                                        </div>
                                    </div> */}
                </div>
              )}
            </div>
          )}

          {/* Students Tab */}
          {activeTab === "students" && (
            <div className="music-students-section">
              <div className="music-section-header">
                <h2>Assigned Students</h2>
              </div>

              {/* Enhanced Filter Section */}
              <div className="music-filter-container">
                <div className="music-filter-row">
                  <div className="music-filter-group">
                    <label>Search:</label>
                    <input
                      type="text"
                      placeholder="Search by name, ID or task..."
                    />
                  </div>

                  <div className="music-filter-group">
                    <label>Task Type:</label>
                    <select>
                      <option value="all">All Tasks</option>
                      <option value="practice">Practice</option>
                      <option value="performance">Performance</option>
                      <option value="composition">Composition</option>
                    </select>
                  </div>

                  <div className="music-filter-group">
                    <label>Priority:</label>
                    <select>
                      <option value="all">All Priorities</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="music-filter-actions">
                  <button className="music-filter-button">Apply Filters</button>
                  <button className="music-filter-button clear">
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="music-data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Assigned Music Task</th>
                      <th>Task Description</th>
                      <th>Due Date</th>
                      <th>Priority Level</th>
                      <th>Attached Media</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.id}</td>
                        <td>{student.name}</td>
                        <td>{student.musicTask || "N/A"}</td>
                        <td>
                          {student.taskDescription || "No description provided"}
                        </td>
                        <td>
                          {new Date(student.dueDate).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`priority-tag ${
                              student.priority === "High"
                                ? "high"
                                : student.priority === "Medium"
                                ? "medium"
                                : "low"
                            }`}
                          >
                            {student.priority}
                          </span>
                        </td>
                        <td>
                          {student.attachedMedia ? (
                            <a
                              href={student.attachedMedia}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Media
                            </a>
                          ) : (
                            "No Media"
                          )}
                        </td>
                        <td>
                          <button
                            className="update-performance-btn"
                            onClick={() => {
                              setSelectedPerformance(student);
                              setShowUpdatePerformanceModal(true);
                            }}
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="music-pagination">
                <span>Showing 1-4 of 24 students</span>
                <div className="music-pagination-controls">
                  <button disabled>Previous</button>
                  <button className="active">1</button>
                  <button>2</button>
                  <button>3</button>
                  <button>Next</button>
                </div>
              </div>
            </div>
          )}

          {/* Training Tab */}
          {activeTab === "training" && (
            <div className="sport-training-section">
              <div className="sport-section-header">
                <h2>Training Schedule</h2>
                <button
                  className="sport-action-button"
                  onClick={() => {
                    setEditingSession(null);
                    setShowSessionModal(true);

                  }}
                >
                  + New Training Session
                </button>
              </div>

              {/* Weekly Calendar View */}
              {showTaskModal && selectedTask && (
                <TaskDetailsModal
                  task={selectedTask}
                  onClose={() => {
                    setShowTaskModal(false);
                  }}
                  users={users}
                  onStatusChange={handleStatusChange}
                  onUpdateTask={handleUpdateTask}
                />
              )}

              {/* Training Sessions List */}
              <div className="training-sessions-list">
                <TrainingFilter
                  onFilterChange={handleTrainingFilterChange}
                  filters={trainingFilters}
                  balagruhas={balagruhas}
                />

                <div className="sport-data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Date & Time</th>
                        <th>Location</th>
                        <th>Type</th>
                        <th>Drills & Exercises</th>
                        <th>Status</th>
                        <th>Notifications</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainingSessions.map((session) => (
                        <tr key={session._id}>
                          <td>{session.title}</td>
                          <td>{session.description}</td>
                          <td>
                            {new Date(session.date).toLocaleDateString()}{" "}
                            {new Date(session.date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td>{session.location}</td>
                          <td>
                            <span className={`type-badge ${session.type}`}>
                              {session.type}
                            </span>
                          </td>
                          <td>
                            <div className="drills-content">
                              {session.drillsAndExercises}
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${session.status}`}>
                              {session.status}
                            </span>
                          </td>
                          <td>
                            <div className="notification-preferences">
                              {session?.notificationPreferences.length > 0
                                ? session?.notificationPreferences.join(",")
                                : "--"}
                            </div>
                          </td>
                          <td>
                            <button
                              className="edit-button"
                              onClick={() => {
                                setEditingSession(session);
                                setShowSessionModal(true);
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              className="delete-button"
                              onClick={() => handleDeleteSession(session._id)}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Training Session Modal - Alternative rendering approach */}
              {showSessionModal && (
                <TrainingSessionModal
                  isOpen={true}
                  onClose={() => {
                    setShowSessionModal(false);

                  }}
                  onSave={handleSaveSession}
                  balagruhas={balagruhas}
                  editSession={editingSession}
                />
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === "tasks" && <TaskManagement />}

          {activeTab === "users" && <UserManagement />}

          {/* Performance Tab */}
          {activeTab === "performance" && (
            <div className="sport-performance-section">
              <div className="sport-section-header">
                <h2>Performance Tracking</h2>
              </div>

              <div className="sport-performance-filters">
                <select
                  name="student"
                  value={performanceFilter.student}
                  onChange={handlePerformanceFilterChange}
                >
                  <option value="all">All Students</option>
                  <option value="Alex Johnson">Alex Johnson</option>
                  <option value="Maya Patel">Maya Patel</option>
                  <option value="Tyler Smith">Tyler Smith</option>
                </select>
                <select
                  name="metric"
                  value={performanceFilter.metric}
                  onChange={handlePerformanceFilterChange}
                >
                  <option value="all">All Metrics</option>
                  <option value="speed">Speed</option>
                  <option value="accuracy">Accuracy</option>
                  <option value="endurance">Endurance</option>
                </select>
                <select
                  name="timeRange"
                  value={performanceFilter.timeRange}
                  onChange={handlePerformanceFilterChange}
                >
                  <option value="30days">Last 30 Days</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              <div className="sport-performance-charts">
                <div className="sport-chart-container">
                  <h3>Performance Overview</h3>

                  {/* Performance Table */}
                  <div className="performance-table-container">
                    <table className="performance-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Metric</th>
                          <th>Current</th>
                          <th>Previous</th>
                          <th>Change</th>
                          <th>Progress</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPerformanceData.map((data, index) => (
                          <tr key={index} className="performance-table-row">
                            <td className="student-name">{data.student}</td>
                            <td className="metric-name">{data.metric}</td>
                            <td className="current-value">{data.current}</td>
                            <td className="previous-value">{data.previous}</td>
                            <td
                              className={`change-value ${
                                data.change.includes("+")
                                  ? "positive"
                                  : "negative"
                              }`}
                            >
                              {data.change}
                            </td>
                            <td className="progress-cell">
                              <div className="progress-bar-container">
                                <div
                                  className="progress-bar"
                                  style={{
                                    width: `${
                                      data.metric.includes("Accuracy")
                                        ? data.current.replace("%", "")
                                        : "75"
                                    }%`,
                                    backgroundColor:
                                      data.change.includes("+") ||
                                      data.change.includes("-")
                                        ? data.change.includes("+")
                                          ? "#4CAF50"
                                          : "#F44336"
                                        : "#2196F3",
                                  }}
                                ></div>
                              </div>
                            </td>
                            <td className="actions-cell">
                              <button
                                className="update-performance-btn"
                                onClick={() => {
                                  setSelectedPerformance(data);
                                  setShowUpdatePerformanceModal(true);
                                }}
                              >
                                Update
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile List View */}
                  <div className="performance-list-container">
                    <ul className="performance-list">
                      {filteredPerformanceData.map((data, index) => (
                        <li key={index} className="performance-list-item">
                          <div className="performance-list-header">
                            <div className="student-avatar">
                              {data.student.charAt(0)}
                            </div>
                            <div className="student-details">
                              <div className="student-name">{data.student}</div>
                              <div className="metric-name">{data.metric}</div>
                            </div>
                            <div
                              className={`change-badge ${
                                data.change.includes("+")
                                  ? "positive"
                                  : "negative"
                              }`}
                            >
                              {data.change}
                            </div>
                          </div>
                          <div className="performance-list-body">
                            <div className="value-comparison">
                              <div className="value-item">
                                <span className="value-label">Current:</span>
                                <span className="value-number">
                                  {data.current}
                                </span>
                              </div>
                              <div className="value-item">
                                <span className="value-label">Previous:</span>
                                <span className="value-number">
                                  {data.previous}
                                </span>
                              </div>
                            </div>
                            <div className="progress-bar-container">
                              <div
                                className="progress-bar"
                                style={{
                                  width: `${
                                    data.metric.includes("Accuracy")
                                      ? data.current.replace("%", "")
                                      : "75"
                                  }%`,
                                  backgroundColor:
                                    data.change.includes("+") ||
                                    data.change.includes("-")
                                      ? data.change.includes("+")
                                        ? "#4CAF50"
                                        : "#F44336"
                                      : "#2196F3",
                                }}
                              ></div>
                            </div>
                            <button
                              className="update-performance-btn mobile"
                              onClick={() => {
                                setSelectedPerformance(data);
                                setShowUpdatePerformanceModal(true);
                              }}
                            >
                              Update Performance
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    className="view-all-button"
                    onClick={() => setActiveTab("performance")}
                  >
                    View All Performance Data
                  </button>

                  {/* Update Performance Modal */}
                  {showUpdatePerformanceModal && selectedPerformance && (
                    <div className="modal-overlay">
                      <div className="update-performance-modal">
                        <div className="modal-header">
                          <h3>
                            Update Performance: {selectedPerformance?.student}
                          </h3>
                          <button
                            className="close-modal-btn"
                            onClick={() => setShowUpdatePerformanceModal(false)}
                          >
                            ×
                          </button>
                        </div>

                        <div className="modal-body">
                          <div className="performance-info">
                            <div className="info-row">
                              <span className="info-label">Student:</span>
                              <span className="info-value">
                                {selectedPerformance?.student}
                              </span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Metric:</span>
                              <span className="info-value">
                                {selectedPerformance?.metric}
                              </span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Current Value:</span>
                              <span className="info-value">
                                {selectedPerformance?.current}
                              </span>
                            </div>
                          </div>

                          <div className="update-form">
                            <div className="form-group">
                              <label>New Performance Value:</label>
                              <input
                                type="text"
                                placeholder={`Enter new ${selectedPerformance?.metric} value`}
                                className="performance-input"
                              />
                            </div>

                            <div className="form-group">
                              <label>Date Recorded:</label>
                              <input
                                type="date"
                                defaultValue={
                                  new Date().toISOString().split("T")[0]
                                }
                                className="date-input"
                              />
                            </div>

                            <div className="form-group">
                              <label>Coach Comments:</label>
                              <textarea
                                placeholder="Add your observations and feedback..."
                                rows="3"
                                className="comments-input"
                              ></textarea>
                            </div>

                            <div className="form-group file-upload">
                              <label>Upload Evidence/Media:</label>
                              <div className="file-upload-container">
                                <input
                                  type="file"
                                  id="performance-file"
                                  className="file-input"
                                  multiple
                                />
                                <label
                                  htmlFor="performance-file"
                                  className="file-upload-label"
                                >
                                  <span className="upload-icon">📁</span>
                                  Choose Files
                                </label>
                                <span className="file-info">
                                  Supports images, videos, and PDFs (max 10MB)
                                </span>
                              </div>
                            </div>

                            <div className="uploaded-files-preview">
                              {/* This would show previews of uploaded files */}
                              <div className="no-files">
                                No files uploaded yet
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="modal-footer">
                          <button
                            className="cancel-btn"
                            onClick={() => setShowUpdatePerformanceModal(false)}
                          >
                            Cancel
                          </button>
                          <button
                            className="save-btn"
                            onClick={() => {
                              // Handle saving the updated performance
                              // This would update the performanceData state
                              setShowUpdatePerformanceModal(false);
                            }}
                          >
                            Save Performance Update
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {showAddMetricModal && (
                <AddMetricModal
                  isOpen={true}
                  onClose={() => setShowAddMetricModal(false)}
                  onSave={handleSaveMetric}
                />
              )}

              {/* Performance Detail Modal - Alternative rendering approach */}
              {showPerformanceModal && (
                <PerformanceDetailModal
                  isOpen={true}
                  onClose={() => {
                    setShowPerformanceModal(false);

                  }}
                  performanceData={selectedPerformance}
                  studentName={selectedStudent}
                  metricName={selectedMetric}
                />
              )}
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <div className="sport-reports-section">
              <h2>Performance Reports</h2>

              <div className="sport-report-filters">
                <div className="sport-filter-group">
                  <label>Report Type:</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <option value="attendance">Attendance Report</option>
                    <option value="performance">Performance Metrics</option>
                    <option value="training">Training Progress</option>
                  </select>
                </div>
                <div className="sport-filter-group">
                  <label>Date Range:</label>
                  <select
                    value={reportDateRange}
                    onChange={(e) => setReportDateRange(e.target.value)}
                  >
                    <option value="thisWeek">This Week</option>
                    <option value="thisMonth">This Month</option>
                    <option value="lastThreeMonths">Last 3 Months</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                <button
                  className="sport-action-button"
                  onClick={generateReport}
                  disabled={isGeneratingReport}
                >
                  {isGeneratingReport ? "Generating..." : "Generate Report"}
                </button>
              </div>

              <div className="sport-report-actions">
                <button
                  className="sport-action-button"
                  onClick={() => setShowFileUploadModal(true)}
                >
                  Upload Files
                </button>
                {reportData && (
                  <>
                    <button
                      className="sport-action-button"
                      onClick={exportReportPDF}
                    >
                      Export Report (PDF)
                    </button>
                    <button
                      className="sport-action-button"
                      onClick={exportReportCSV}
                    >
                      Export Report (CSV)
                    </button>
                    {/* Hidden CSVLink component for CSV export */}
                    {reportData && (
                      <CSVLink
                        data={reportData.details}
                        filename={`${reportData.title.replace(
                          /\s+/g,
                          "_"
                        )}.csv`}
                        className="hidden"
                        ref={csvLinkRef}
                        target="_blank"
                      />
                    )}
                  </>
                )}
              </div>

              {reportData ? (
                <div className="sport-report-preview">
                  <div className="sport-report-header">
                    <h3>{reportData.title}</h3>
                    <p>Generated on {new Date().toLocaleDateString()}</p>
                  </div>

                  <div className="sport-report-summary">
                    <h3>Report Summary</h3>
                    <ul>
                      {Object.entries(reportData.summary).map(
                        ([key, value], index) => {
                          const formattedKey = key
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (str) => str.toUpperCase());
                          return (
                            <li key={index}>
                              <strong>{formattedKey}:</strong> {value}
                            </li>
                          );
                        }
                      )}
                    </ul>
                  </div>

                  <div className="sport-report-details">
                    <h3>Detailed Data</h3>
                    <div className="sport-data-table">
                      <table>
                        <thead>
                          <tr>
                            {Object.keys(reportData.details[0]).map(
                              (key, index) => {
                                const formattedKey = key
                                  .replace(/([A-Z])/g, " $1")
                                  .replace(/^./, (str) => str.toUpperCase());
                                return <th key={index}>{formattedKey}</th>;
                              }
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.details.map((item, rowIndex) => (
                            <tr key={rowIndex}>
                              {Object.values(item).map((value, colIndex) => (
                                <td key={colIndex}>{value}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sport-report-placeholder">
                  {/* <div className="sport-placeholder-chart">
                                        <p>Generate a report to see data visualization</p>
                                        <div className="sport-chart-placeholder"></div>
                                    </div> */}
                </div>
              )}
              {/* File List Section */}
              <div className="sport-files-section">
                <h3>Uploaded Files</h3>
                <div className="sport-data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>File ID</th>
                        <th>File Name</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Upload Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedFiles.map((file) => (
                        <tr key={file.id}>
                          <td>{file.id}</td>
                          <td>{file.name}</td>
                          <td>
                            <span className={`file-type-tag ${file.type}`}>
                              {file.type === "report"
                                ? "📊"
                                : file.type === "video"
                                ? "🎥"
                                : file.type === "assessment"
                                ? "📝"
                                : "📄"}
                              {file.type.charAt(0).toUpperCase() +
                                file.type.slice(1)}
                            </span>
                          </td>
                          <td>{file.size}</td>
                          <td>
                            {new Date(file.uploadDate).toLocaleDateString()}
                          </td>
                          <td>
                            <button className="sport-icon-button">⬇️</button>
                            <button className="sport-icon-button">🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Upload Modal */}
      {showFileUploadModal && (
        <FileUploadModal
          isOpen={true}
          onClose={() => setShowFileUploadModal(false)}
          onUpload={handleFileUpload}
        />
      )}
    </div>
  );
};

export default MusicCoachDashboard;
