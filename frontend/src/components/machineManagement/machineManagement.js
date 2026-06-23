import React, { useState, useEffect } from "react";
import "./machineManagement.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  addMachines,
  assignMachineToAnotherBalagruha,
  deleteMachineById,
  getBalagruha,
  getMachines,
  toggleMachineStatus,
} from "../../api";

const MachineManagement = () => {
  const [view, setView] = useState("report"); // 'dashboard', 'detail', 'report'
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [dateRange, setDateRange] = useState("week");
  const [filterBalagruha, setFilterBalagruha] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBalagruha, setSelectedBalagruha] = useState("");
  const [newMachine, setNewMachine] = useState({
    machineId: "",
    macAddress: "",
    serialNumber: "",
    assignedBalagruha: "",
    status: "active",
  });
  const [balagruhaOptions, setBalagruhaOptions] = useState([
    { value: "67b63186d2486ca7b43fe418", label: "Balagruha 1" },
  ]);

  const getBalagruhaList = async () => {
    const response = await getBalagruha();

    setBalagruhaOptions(response?.data?.balagruhas || []);
  };

  const getMachinesData = async () => {
    const response = await getMachines();

    setMachines(response.data.machines);
  };

  useEffect(() => {
    getBalagruhaList();
    getMachinesData();
  }, []);
  const handleAssignBalagruha = async (e) => {
    e.preventDefault();


    let data = {
      newBalagruha: selectedBalagruha,
    };
    const response = await assignMachineToAnotherBalagruha(
      selectedMachine?._id,
      data
    );
    getMachinesData();
    setShowAssignModal(false);
    setSelectedBalagruha("");
  };

  const handleAddMachine = async (e) => {
    e.preventDefault();

    const response = await addMachines(JSON.stringify(newMachine));

    getMachinesData();

    setShowAddForm(false);
    setNewMachine({
      machineId: "",
      macAddress: "",
      serialNumber: "",
      assignedBalagruha: "",
      status: "active",
    });
  };

  const toggleStatus = async (id) => {
    const response = await toggleMachineStatus(id);

    getMachinesData();
  };

  const deleteMachines = async (id) => {
    const response = await deleteMachineById(id);

    getMachinesData();
  };

  const [currentPage, setCurrentPage] = useState(1);
  const machinesPerPage = 8;

  // // Generate mock machine data
  // const generateMockMachines = () => {
  //     const balagruhas = [
  //         "Sunshine Home", "Rainbow Haven", "Star Kids Center",
  //         "Happy Hearts", "Little Dreamers", "Hope House"
  //     ];

  //     const statuses = ["active", "inactive", "maintenance"];

  //     return Array.from({ length: 20 }, (_, i) => {
  //         const isActive = Math.random() > 0.3;
  //         const status = isActive ?
  //             (Math.random() > 0.2 ? "active" : "maintenance") :
  //             "inactive";

  //         const usageHours = isActive ?
  //             Math.floor(Math.random() * 8) + (status === "active" ? 2 : 0) :
  //             Math.floor(Math.random() * 2);

  //         // Generate random login events
  //         const loginEvents = [];
  //         if (isActive) {
  //             const numEvents = Math.floor(Math.random() * 5) + 1;
  //             for (let j = 0; j < numEvents; j++) {
  //                 const startHour = Math.floor(Math.random() * 10) + 8; // Between 8 AM and 6 PM
  //                 const duration = Math.floor(Math.random() * 3) + 0.5; // 0.5 to 3.5 hours

  //                 const today = new Date();
  //                 const eventDate = new Date(today);
  //                 eventDate.setDate(today.getDate() - Math.floor(Math.random() * 7)); // Within the last week
  //                 eventDate.setHours(startHour, Math.floor(Math.random() * 60), 0);

  //                 const loginTime = new Date(eventDate);
  //                 const logoutTime = new Date(eventDate);
  //                 logoutTime.setHours(logoutTime.getHours() + duration);

  //                 loginEvents.push({
  //                     id: `event-${i}-${j}`,
  //                     loginTime: loginTime.toISOString(),
  //                     logoutTime: logoutTime.toISOString(),
  //                     duration: duration,
  //                     user: `User-${Math.floor(Math.random() * 100) + 1}`
  //                 });
  //             }
  //         }

  //         return {
  //             id: `MACH-${1000 + i}`,
  //             name: `Computer ${i + 1}`,
  //             type: Math.random() > 0.7 ? "Laptop" : "Desktop",
  //             status: status,
  //             balagruha: balagruhas[Math.floor(Math.random() * balagruhas.length)],
  //             lastActive: isActive ?
  //                 new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString() :
  //                 new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)).toISOString(),
  //             usageHours: usageHours,
  //             usagePercentage: (usageHours / 8) * 100,
  //             loginEvents: loginEvents,
  //             specs: {
  //                 processor: "Intel Core i5",
  //                 ram: "8GB",
  //                 storage: "256GB SSD",
  //                 os: "Windows 10"
  //             }
  //         };
  //     });
  // };

  // Calculate dashboard metrics
  const calculateMetrics = () => {
    const totalMachines = machines.length;
    const activeMachines = machines.filter((m) => m.status === "active").length;
    const inactiveMachines = machines.filter(
      (m) => m.status === "inactive"
    ).length;
    const maintenanceMachines = machines.filter(
      (m) => m.status === "maintenance"
    ).length;

    // Sort by usage hours to find highest and lowest
    const sortedByUsage = [...machines].sort(
      (a, b) => b.usageHours - a.usageHours
    );
    const highestUsage = sortedByUsage.length > 0 ? sortedByUsage[0] : null;
    const lowestUsage =
      sortedByUsage.length > 0 ? sortedByUsage[sortedByUsage.length - 1] : null;

    // Calculate average usage
    const totalUsageHours = machines.reduce(
      (sum, machine) => sum + machine.usageHours,
      0
    );
    const averageUsage =
      totalMachines > 0 ? (totalUsageHours / totalMachines).toFixed(1) : 0;

    // Get recent login events (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return {
      totalMachines,
      activeMachines,
      inactiveMachines,
      maintenanceMachines,
      highestUsage,
      lowestUsage,
      averageUsage,
      // recentEvents
    };
  };

  // Filter machines based on current filters
  const filteredMachines = machines.filter((machine) => {
    // Filter by Balagruha
    if (filterBalagruha !== "all" && machine.balagruha !== filterBalagruha) {
      return false;
    }

    // Filter by status
    if (filterStatus !== "all" && machine.status !== filterStatus) {
      return false;
    }

    // Filter by search term
    if (
      searchTerm &&
      !machine.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !machine.id.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // Get unique Balagruhas for filter dropdown
  const uniqueBalagruhas = [
    ...new Set(machines.map((machine) => machine.balagruha)),
  ];

  // Prepare data for charts
  const prepareStatusChartData = () => {
    const metrics = calculateMetrics();
    return [
      { name: "Active", value: metrics.activeMachines, color: "#4CAF50" },
      { name: "Inactive", value: metrics.inactiveMachines, color: "#F44336" },
      {
        name: "Maintenance",
        value: metrics.maintenanceMachines,
        color: "#FFC107",
      },
    ];
  };

  const prepareBalagruhaChartData = () => {
    const balagruhaCount = {};
    machines.forEach((machine) => {
      balagruhaCount[machine.balagruha] =
        (balagruhaCount[machine.balagruha] || 0) + 1;
    });

    return Object.entries(balagruhaCount).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const prepareUsageChartData = () => {
    const usageByBalagruha = {};

    machines.forEach((machine) => {
      if (!usageByBalagruha[machine.balagruha]) {
        usageByBalagruha[machine.balagruha] = {
          name: machine.balagruha,
          totalHours: 0,
          machineCount: 0,
        };
      }

      usageByBalagruha[machine.balagruha].totalHours += machine.usageHours;
      usageByBalagruha[machine.balagruha].machineCount += 1;
    });

    return Object.values(usageByBalagruha).map((data) => ({
      name: data.name,
      averageHours:
        data.machineCount > 0
          ? (data.totalHours / data.machineCount).toFixed(1)
          : 0,
    }));
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate duration between two dates in hours
  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const diffHrs = diffMs / (1000 * 60 * 60);
    return diffHrs.toFixed(1);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "#4CAF50";
      case "inactive":
        return "#F44336";
      case "maintenance":
        return "#FFC107";
      default:
        return "#9E9E9E";
    }
  };

  // Get status emoji
  const getStatusEmoji = (status) => {
    switch (status) {
      case "active":
        return "✅";
      case "inactive":
        return "❌";
      case "maintenance":
        return "🔧";
      default:
        return "❓";
    }
  };

  // Pagination
  const indexOfLastMachine = currentPage * machinesPerPage;
  const indexOfFirstMachine = indexOfLastMachine - machinesPerPage;
  const currentMachines = filteredMachines.slice(
    indexOfFirstMachine,
    indexOfLastMachine
  );
  const totalPages = Math.ceil(filteredMachines.length / machinesPerPage);
  const pageStart = filteredMachines.length === 0 ? 0 : indexOfFirstMachine + 1;
  const pageEnd = Math.min(indexOfLastMachine, filteredMachines.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterBalagruha, filterStatus, searchTerm]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="machine-management">
      <div className="navigation-tabs">
        {/* <button
                    className={`tab ${view === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setView('dashboard')}
                >
                    📊 Dashboard
                </button> */}
        <button
          className={`tab ${view === "report" ? "active" : ""}`}
          onClick={() => setView("report")}
        >
          📝 Machine Reports
        </button>

        {localStorage.getItem("role") !== "purchase-manager" && (
          <button
            className="add-machine-button"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "❌ Cancel" : "➕ Add New Machine"}
          </button>
        )}
      </div>

      {view === "dashboard" && (
        <div className="dashboard">
          <div className="metrics-cards">
            <div className="metric-card total">
              <h3>Total Machines</h3>
              <div className="metric-value">
                {calculateMetrics().totalMachines}
              </div>
              <div className="metric-icon">🖥️</div>
            </div>

            <div className="metric-card active">
              <h3>Active Machines</h3>
              <div className="metric-value">
                {calculateMetrics().activeMachines}
              </div>
              <div className="metric-icon">✅</div>
            </div>

            <div className="metric-card inactive">
              <h3>Inactive Machines</h3>
              <div className="metric-value">
                {calculateMetrics().inactiveMachines}
              </div>
              <div className="metric-icon">❌</div>
            </div>

            <div className="metric-card maintenance">
              <h3>In Maintenance</h3>
              <div className="metric-value">
                {calculateMetrics().maintenanceMachines}
              </div>
              <div className="metric-icon">🔧</div>
            </div>
          </div>

          <div className="dashboard-charts">
            <div className="chart-container">
              <h3>Machine Status</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={prepareStatusChartData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {prepareStatusChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-container">
              <h3>Average Usage by Balagruha</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={prepareUsageChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                      label={{
                        value: "Hours",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="averageHours"
                      fill="#8884d8"
                      name="Avg. Hours"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="recent-activity">
            <h3>Recent Machine Activity</h3>
            <div className="activity-list">
              {(calculateMetrics().recentEvents || []).slice(0, 5).map((event, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">🔄</div>
                    <div className="activity-details">
                      <div className="activity-title">
                        <strong>{event.machineName}</strong> was used by{" "}
                        <strong>{event.user}</strong>
                      </div>
                      <div className="activity-meta">
                        {formatDate(event.loginTime)} for{" "}
                        {calculateDuration(event.loginTime, event.logoutTime)}{" "}
                        hours
                      </div>
                      <div className="activity-location">
                        at <strong>{event.balagruha}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              {(calculateMetrics().recentEvents || []).length === 0 && (
                <div className="no-activity">
                  No recent activity in the last 24 hours
                </div>
              )}
            </div>
          </div>

          <div className="machine-highlights">
            <div className="highlight-card">
              <h3>Highest Usage Machine</h3>
              {calculateMetrics().highestUsage && (
                <div className="highlight-content">
                  <div className="highlight-title">
                    {calculateMetrics().highestUsage.name}
                  </div>
                  <div className="highlight-value">
                    {calculateMetrics().highestUsage.usageHours} hours
                  </div>
                  <div className="highlight-location">
                    at {calculateMetrics().highestUsage.balagruha}
                  </div>
                  <button
                    className="view-details-button"
                    onClick={() => {
                      setSelectedMachine(calculateMetrics().highestUsage);
                      // setView('detail');
                    }}
                  >
                    View Details
                  </button>
                </div>
              )}
            </div>

            <div className="highlight-card">
              <h3>Lowest Usage Machine</h3>
              {calculateMetrics().lowestUsage && (
                <div className="highlight-content">
                  <div className="highlight-title">
                    {calculateMetrics().lowestUsage.name}
                  </div>
                  <div className="highlight-value">
                    {calculateMetrics().lowestUsage.usageHours} hours
                  </div>
                  <div className="highlight-location">
                    at {calculateMetrics().lowestUsage.balagruha}
                  </div>
                  <button
                    className="view-details-button"
                    onClick={() => {
                      setSelectedMachine(calculateMetrics().lowestUsage);
                      // setView('detail');
                    }}
                  >
                    View Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === "report" && (
        <>
          <div className="add-machine-section">
            {localStorage.getItem("role") === "admin" && !showAddForm && (
              <div className="metrics-cards">
                <div className="metric-card total">
                  <h3>Total Machines</h3>
                  <div className="metric-value">
                    {calculateMetrics().totalMachines}
                  </div>
                  <div className="metric-icon">🖥️</div>
                </div>

                <div className="metric-card active">
                  <h3>Active Machines</h3>
                  <div className="metric-value">
                    {calculateMetrics().activeMachines}
                  </div>
                  <div className="metric-icon">✅</div>
                </div>

                <div className="metric-card inactive">
                  <h3>Inactive Machines</h3>
                  <div className="metric-value">
                    {calculateMetrics().inactiveMachines}
                  </div>
                  <div className="metric-icon">❌</div>
                </div>

                <div className="metric-card maintenance">
                  <h3>In Maintenance</h3>
                  <div className="metric-value">
                    {calculateMetrics().maintenanceMachines}
                  </div>
                  <div className="metric-icon">🔧</div>
                </div>
              </div>
            )}

            {showAddForm && (
              <div className="add-machine-form-container">
                <form onSubmit={handleAddMachine} className="add-machine-form">
                  <h3>Add New Machine</h3>

                  <div className="form-group">
                    <label htmlFor="machineId">Machine ID</label>
                    <input
                      type="text"
                      id="machineId"
                      value={newMachine.machineId}
                      onChange={(e) =>
                        setNewMachine({
                          ...newMachine,
                          machineId: e.target.value,
                        })
                      }
                      placeholder="e.g., M004"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="macAddress">MAC Address</label>
                    <input
                      type="text"
                      id="macAddress"
                      value={newMachine.macAddress}
                      onChange={(e) =>
                        setNewMachine({
                          ...newMachine,
                          macAddress: e.target.value,
                        })
                      }
                      placeholder="e.g., 14:1B:44:11:3A:B7"
                      pattern="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="serialNumber">Serial Number</label>
                    <input
                      type="text"
                      id="serialNumber"
                      value={newMachine.serialNumber}
                      onChange={(e) =>
                        setNewMachine({
                          ...newMachine,
                          serialNumber: e.target.value,
                        })
                      }
                      placeholder="e.g., SR-04"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="assignedBalagruha">
                      Assigned Balagruha
                    </label>
                    <select
                      id="assignedBalagruha"
                      value={newMachine.assignedBalagruha}
                      onChange={(e) =>
                        setNewMachine({
                          ...newMachine,
                          assignedBalagruha: e.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Select Balagruha</option>
                      {balagruhaOptions.map((balagruha, index) => (
                        <option key={index} value={balagruha?._id}>
                          {balagruha?.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      value={newMachine.status}
                      onChange={(e) =>
                        setNewMachine({
                          ...newMachine,
                          status: e.target.value,
                        })
                      }
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="submit-button">
                      Add Machine
                    </button>
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {!showAddForm && (
            <div className="machine-reports">
              <div className="report-controls">
                {/* <div className="search-box">
                                    <input
                                        type="text"
                                        placeholder="Search machines..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="search-input"
                                    />
                                    <span className="search-icon">🔍</span>
                                </div> */}

                <div className="filters">
                  {/* <select
                                        value={filterBalagruha}
                                        onChange={(e) => setFilterBalagruha(e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="all">All Balagruhas</option>
                                        {balagruhaOptions.map((balagruha, index) => (
                                            <option key={index} value={balagruha?.balagruhaId}>{balagruha?.name}</option>
                                        ))}
                                    </select> */}

                  {/* <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select> */}

                  {/* <select
                                        value={dateRange}
                                        onChange={(e) => setDateRange(e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="day">Last 24 Hours</option>
                                        <option value="week">Last Week</option>
                                        <option value="month">Last Month</option>
                                    </select> */}
                </div>
              </div>

              <div className="machines-grid">
                {currentMachines.map((machine) => (
                  <div
                    key={machine.id}
                    className={`machine-card ${machine.status}`}
                    onClick={() => {
                      setSelectedMachine(machine);
                      // setView('detail');
                    }}
                  >
                    <div className="machine-status">
                      <span
                        className="status-indicator"
                        style={{
                          backgroundColor: getStatusColor(machine.status),
                        }}
                      ></span>
                      <span className="status-text">
                        {getStatusEmoji(machine.status)}{" "}
                        {machine.status.charAt(0).toUpperCase() +
                          machine.status.slice(1)}
                      </span>
                    </div>

                    <h3 className="machine-sno">{machine.serialNumber}</h3>
                    <div className="machine-id">{machine.machineId}</div>

                    <div className="machine-meta">
                      <div className="meta-item">
                        <span className="meta-label">Mac Id:</span>
                        <span className="meta-value">{machine.macAddress}</span>
                      </div>

                      <div className="meta-item">
                        <span className="meta-label">Balagruha:</span>
                        <span className="meta-value">
                          {machine.assignedBalagruha?.name || "--"}
                        </span>
                      </div>

                      <div className="meta-item">
                        <span className="meta-label">Last Active:</span>
                        <span className="meta-value">
                          {formatDate(machine.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* <div className="usage-bar-container">
                                            <div className="usage-label">Usage: {machine.usageHours} hours</div>
                                            <div className="usage-bar">
                                                <div
                                                    className="usage-fill"
                                                    style={{ width: `${Math.min(machine.usagePercentage, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div> */}

                    <button
                      className="view-details-button"
                      onClick={() => toggleStatus(machine?._id)}
                    >
                      Toggle Status
                    </button>
                    <button
                      className="view-details-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMachine(machine);
                        setShowAssignModal(true);
                      }}
                    >
                      Assign to Balagruha
                    </button>
                    <button
                      className="view-details-button"
                      onClick={() => {
                        deleteMachines(machine?._id);
                      }}
                    >
                      Delete Machine
                    </button>
                  </div>
                ))}

                {currentMachines.length === 0 && (
                  <div className="no-machines">
                    <div className="no-data-message">No Data found</div>
                  </div>
                )}

                {showAssignModal && (
                  <div className="modal-overlay">
                    <div className="assign-modal">
                      <div className="modal-header">
                        <h3>Assign Balagruha</h3>
                        <button
                          className="close-button"
                          onClick={() => {
                            setShowAssignModal(false);
                            setSelectedBalagruha("");
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      <form
                        onSubmit={handleAssignBalagruha}
                        className="assign-form"
                      >
                        <div className="form-group">
                          <label>Machine ID</label>
                          <input
                            type="text"
                            value={selectedMachine?.machineId || ""}
                            disabled
                            className="disabled-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>Serial Number</label>
                          <input
                            type="text"
                            value={selectedMachine?.serialNumber || ""}
                            disabled
                            className="disabled-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>Current Balagruha</label>
                          <input
                            type="text"
                            value={
                              selectedMachine?.assignedBalagruha?.name ||
                              "Not Assigned"
                            }
                            disabled
                            className="disabled-input"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="newBalagruha">New Balagruha</label>
                          <select
                            id="newBalagruha"
                            value={selectedBalagruha}
                            onChange={(e) =>
                              setSelectedBalagruha(e.target.value)
                            }
                            required
                          >
                            <option value="">Select Balagruha</option>
                            {balagruhaOptions.map((balagruha, index) => (
                              <option key={index} value={balagruha?._id}>
                                {balagruha?.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="modal-actions">
                          <button type="submit" className="submit-button">
                            Assign
                          </button>
                          <button
                            type="button"
                            className="cancel-button"
                            onClick={() => {
                              setShowAssignModal(false);
                              setSelectedBalagruha("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>

              {filteredMachines.length > 0 && (
                <div className="pagination">
                  <div className="pagination-info">
                    Showing {pageStart}-{pageEnd} of {filteredMachines.length}
                  </div>
                  {totalPages > 1 && (
                    <div className="pagination-pages">
                      <button
                        type="button"
                        className="pagination-btn"
                        onClick={prevPage}
                        disabled={currentPage === 1}
                      >
                        Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, index) => {
                        const pageNumber = index + 1;

                        return (
                          <button
                            type="button"
                            key={pageNumber}
                            className={`pagination-btn ${
                              currentPage === pageNumber ? "active" : ""
                            }`}
                            onClick={() => paginate(pageNumber)}
                            aria-current={
                              currentPage === pageNumber ? "page" : undefined
                            }
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        className="pagination-btn"
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      {/* 
            {view === 'detail' && selectedMachine && (
                <div className="machine-detail">
                    <div className="detail-header">
                        <button className="back-button" onClick={() => setView('report')}>← Back to Machines</button>
                        <h2>{selectedMachine.name} Details</h2>
                    </div>

                    <div className="detail-content">
                        <div className="detail-section">
                            <div className="machine-info-card">
                                <div className="machine-header">
                                    <div className="machine-title">
                                        <h3>{selectedMachine.name}</h3>
                                        <div className="machine-id">{selectedMachine.id}</div>
                                    </div>
                                    <div className="machine-status">
                                        <span className="status-indicator" style={{ backgroundColor: getStatusColor(selectedMachine.status) }}></span>
                                        <span className="status-text">
                                            {getStatusEmoji(selectedMachine.status)} {selectedMachine.status.charAt(0).toUpperCase() + selectedMachine.status.slice(1)}
                                        </span>
                                    </div>
                                </div>

                                <div className="machine-details-grid">
                                    <div className="detail-item">
                                        <div className="detail-label">Type</div>
                                        <div className="detail-value">{selectedMachine.type}</div>
                                    </div>

                                    <div className="detail-item">
                                        <div className="detail-label">Balagruha</div>
                                        <div className="detail-value">{selectedMachine.balagruha}</div>
                                    </div>

                                    <div className="detail-item">
                                        <div className="detail-label">Last Active</div>
                                        <div className="detail-value">{formatDate(selectedMachine.lastActive)}</div>
                                    </div>

                                    <div className="detail-item">
                                        <div className="detail-label">Usage (Last Week)</div>
                                        <div className="detail-value">{selectedMachine.usageHours} hours</div>
                                    </div>
                                </div>

                                <div className="specs-section">
                                    <h4>Machine Specifications</h4>
                                    <div className="specs-grid">
                                        <div className="spec-item">
                                            <div className="spec-icon">💻</div>
                                            <div className="spec-label">Processor</div>
                                            <div className="spec-value">{selectedMachine.specs.processor}</div>
                                        </div>
                                        <div className="spec-item">
                                            <div className="spec-icon">🧠</div>
                                            <div className="spec-label">RAM</div>
                                            <div className="spec-value">{selectedMachine.specs.ram}</div>
                                        </div>
                                        <div className="spec-item">
                                            <div className="spec-icon">💾</div>
                                            <div className="spec-label">Storage</div>
                                            <div className="spec-value">{selectedMachine.specs.storage}</div>
                                        </div>
                                        <div className="spec-item">
                                            <div className="spec-icon">🪟</div>
                                            <div className="spec-label">Operating System</div>
                                            <div className="spec-value">{selectedMachine.specs.os}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h3>Usage History</h3>
                            <div className="usage-history-card">
                                <div className="usage-chart">
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart
                                            data={selectedMachine.loginEvents.map(event => ({
                                                date: new Date(event.loginTime).toLocaleDateString(),
                                                hours: calculateDuration(event.loginTime, event.logoutTime)
                                            }))}
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="hours" stroke="#8884d8" activeDot={{ r: 8 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h3>Recent Login Events</h3>
                            <div className="login-events-card">
                                <div className="events-list">
                                    {selectedMachine.loginEvents.length > 0 ? (
                                        selectedMachine.loginEvents.map((event, index) => (
                                            <div key={index} className="event-item">
                                                <div className="event-icon">👤</div>
                                                <div className="event-details">
                                                    <div className="event-user">{event.user}</div>
                                                    <div className="event-time">
                                                        {formatDate(event.loginTime)} - {formatDate(event.logoutTime)}
                                                    </div>
                                                    <div className="event-duration">
                                                        Duration: {calculateDuration(event.loginTime, event.logoutTime)} hours
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-events">No login events recorded for this machine</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="detail-actions">
                            <button
                                className="action-button assign"
                                onClick={() => {
                                    setAssignMachineId(selectedMachine.id);
                                    setView('assign');
                                }}
                            >
                                🏠 Assign to Balagruha
                            </button>
                            <button
                                className="action-button remove"
                                onClick={() => {
                                    setRemoveMachineId(selectedMachine.id);
                                    setView('remove');
                                }}
                            >
                                🗑️ Remove from Balagruha
                            </button>
                            <button
                                className={`action-button ${selectedMachine.status === 'maintenance' ? 'active' : 'maintenance'}`}
                                onClick={() => {
                                    const updatedMachines = [...machines];
                                    const machineIndex = updatedMachines.findIndex(m => m.id === selectedMachine.id);

                                    if (machineIndex !== -1) {
                                        const newStatus = selectedMachine.status === 'maintenance' ? 'active' : 'maintenance';
                                        updatedMachines[machineIndex] = {
                                            ...updatedMachines[machineIndex],
                                            status: newStatus
                                        };
                                        setMachines(updatedMachines);
                                        setSelectedMachine({
                                            ...selectedMachine,
                                            status: newStatus
                                        });
                                    }
                                }}
                            >
                                {selectedMachine.status === 'maintenance' ? '✅ Mark as Active' : '🔧 Mark for Maintenance'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {view === 'add' && (
                <div className="form-container">
                    <div className="form-header">
                        <h2>➕ Add New Machine</h2>
                    </div>

                    {formSuccess && (
                        <div className="form-success">
                            {formSuccess}
                        </div>
                    )}

                    <form onSubmit={handleAddMachine} className="machine-form">
                        <div className="form-group">
                            <label htmlFor="name">Machine Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={newMachine.name}
                                onChange={handleNewMachineChange}
                                className={formErrors.name ? 'error' : ''}
                            />
                            {formErrors.name && <div className="error-message">{formErrors.name}</div>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="type">Machine Type</label>
                            <select
                                id="type"
                                name="type"
                                value={newMachine.type}
                                onChange={handleNewMachineChange}
                            >
                                <option value="Desktop">Desktop</option>
                                <option value="Laptop">Laptop</option>
                                <option value="Tablet">Tablet</option>
                                <option value="All-in-One">All-in-One</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="status">Initial Status</label>
                            <select
                                id="status"
                                name="status"
                                value={newMachine.status}
                                onChange={handleNewMachineChange}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="balagruha">Assign to Balagruha</label>
                            <input
                                type="text"
                                id="balagruha"
                                name="balagruha"
                                value={newMachine.balagruha}
                                onChange={handleNewMachineChange}
                                className={formErrors.balagruha ? 'error' : ''}
                                list="balagruha-list"
                            />
                            <datalist id="balagruha-list">
                                {uniqueBalagruhas.map((balagruha, index) => (
                                    <option key={index} value={balagruha} />
                                ))}
                            </datalist>
                            {formErrors.balagruha && <div className="error-message">{formErrors.balagruha}</div>}
                        </div>

                        <div className="form-section">
                            <h3>Machine Specifications</h3>

                            <div className="form-group">
                                <label htmlFor="specs.processor">Processor</label>
                                <input
                                    type="text"
                                    id="specs.processor"
                                    name="specs.processor"
                                    value={newMachine.specs.processor}
                                    onChange={handleNewMachineChange}
                                    className={formErrors.processor ? 'error' : ''}
                                />
                                {formErrors.processor && <div className="error-message">{formErrors.processor}</div>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="specs.ram">RAM</label>
                                <input
                                    type="text"
                                    id="specs.ram"
                                    name="specs.ram"
                                    value={newMachine.specs.ram}
                                    onChange={handleNewMachineChange}
                                    className={formErrors.ram ? 'error' : ''}
                                />
                                {formErrors.ram && <div className="error-message">{formErrors.ram}</div>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="specs.storage">Storage</label>
                                <input
                                    type="text"
                                    id="specs.storage"
                                    name="specs.storage"
                                    value={newMachine.specs.storage}
                                    onChange={handleNewMachineChange}
                                    className={formErrors.storage ? 'error' : ''}
                                />
                                {formErrors.storage && <div className="error-message">{formErrors.storage}</div>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="specs.os">Operating System</label>
                                <input
                                    type="text"
                                    id="specs.os"
                                    name="specs.os"
                                    value={newMachine.specs.os}
                                    onChange={handleNewMachineChange}
                                    className={formErrors.os ? 'error' : ''}
                                />
                                {formErrors.os && <div className="error-message">{formErrors.os}</div>}
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="cancel-button" onClick={() => setView('report')}>
                                Cancel
                            </button>
                            <button type="submit" className="submit-button">
                                Add Machine
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {view === 'assign' && (
                <div className="form-container">
                    <div className="form-header">
                        <h2>🏠 Assign Machine to Balagruha</h2>
                    </div>

                    {formSuccess && (
                        <div className="form-success">
                            {formSuccess}
                        </div>
                    )}

                    <form onSubmit={handleAssignMachine} className="machine-form">
                        <div className="form-group">
                            <label htmlFor="assignMachineId">Machine ID</label>
                            <input
                                type="text"
                                id="assignMachineId"
                                value={assignMachineId}
                                onChange={(e) => setAssignMachineId(e.target.value)}
                                className={formErrors.machineId ? 'error' : ''}
                                list="machine-id-list"
                            />
                            <datalist id="machine-id-list">
                                {machines.map((machine, index) => (
                                    <option key={index} value={machine.id} />
                                ))}
                            </datalist>
                            {formErrors.machineId && <div className="error-message">{formErrors.machineId}</div>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="assignBalagruha">Balagruha</label>
                            <input
                                type="text"
                                id="assignBalagruha"
                                value={assignBalagruha}
                                onChange={(e) => setAssignBalagruha(e.target.value)}
                                className={formErrors.balagruha ? 'error' : ''}
                                list="balagruha-list"
                            />
                            <datalist id="balagruha-list">
                                {uniqueBalagruhas.map((balagruha, index) => (
                                    <option key={index} value={balagruha} />
                                ))}
                            </datalist>
                            {formErrors.balagruha && <div className="error-message">{formErrors.balagruha}</div>}
                        </div>

                        <div className="form-actions">
                            <button type="button" className="cancel-button" onClick={() => setView('report')}>
                                Cancel
                            </button>
                            <button type="submit" className="submit-button">
                                Assign Machine
                            </button>
                        </div>
                    </form>
                </div>
            )} */}
    </div>
  );
};

export default MachineManagement;
