import React, { useEffect, useRef, useState } from "react";
import "./AdminDashboard.css";
import {
  getBalagruha,
  getTasks,
  updateTask,
  fetchUsers,
  getStudentListforAttendance,
  getMachines,
  getTaskBytaskId,
  getAnyUserBasedonRoleandBalagruha,
  getMedicalConditionBasedOnBalagruha,
  getMoodBasedOnBalagruha,
  getBalagruhaListbyUserID,
  getBalagruhaListByAssignedID,
  getSchedules,
} from "../../api";
import { TaskDetailsModal } from "../TaskManagement/taskmanagement";
import WeeklyCalendar from "./WeeklyCalendar";

function AdminDashboard() {
  // Initialize with pre-selected values
  const [selectedBalagruha, setSelectedBalagruha] = useState();
  const [selectedBalagruhaOfCoach, setSelectedBalagruhaOfCoach] = useState();
  const [selectedCoach, setSelectedCoach] = useState();
  const [adminMenuSelected, setAdminMenuSelected] = useState(1);
  const [coachMenuSelected, setCoachMenuSelected] = useState(1);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [balagruhas, setBalagruhas] = useState([]);
  const [balagruhaOfCoach, setBalagruhaOfCoach] = useState([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [balagruhaStudents, setBalagruhaStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [medicalIssuesData, setMedicalIssuesData] = useState();
  const [studentUserId, setStudentUserId] = useState([]);
  const [moodData, setMoodData] = useState();

  // New state variables for task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [machines, setMachines] = useState([]);
  const [schedules, setSchedules] = useState([]);
  // const [schedules, setSchedules] = useState({
  //     balagruhaId: '',
  //     assignedTo: '',
  //     startDate: '',
  //     endDate: '',
  //     status: []
  // });

  const getBalagruhaList = async () => {
    try {
      const response = await getBalagruha(JSON.stringify());

      setBalagruhas(response?.data?.balagruhas || []);
    } catch (error) {
      console.error("Error fetching balagruha list:", error);
    }
  };

  const scrollRef = useRef(null);

  const scrollMenu = (direction) => {
    const scrollAmount = 200;
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const getCoachNameBasedonBalagruha = async () => {
    if (!selectedBalagruha) return;
    const response = await getAnyUserBasedonRoleandBalagruha(
      "coach",
      selectedBalagruha
    );
    setCoaches(response.data?.users || []);
  };

  const getMachinesData = async () => {
    const response = await getMachines();

    setMachines(response.data.machines);
  };

  const getTasksList = async () => {
    let data = {
      balagruhaId: selectedBalagruha,
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
      const response = await fetchUsers();


      const userList = response?.data || [];
      setUsers(userList);

      const studentUsers = userList.filter(
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

  const fetchBalagruhaByCoach = async (id) => {
    try {
      const response = await getBalagruhaListByAssignedID(id);
      setBalagruhaOfCoach(response?.data?.balagruhas);
    } catch (error) {
      console.error("Error in fetching balagruha based on user", error);
    }
  };

  const fetchSchedules = async (balagruha, startDate, endDate) => {
    try {
      let dataToSend;
      if (balagruha) {
        dataToSend = {
          balagruhaIds: [balagruha],
          assignedTo: selectedCoach,
          startDate: startDate,
          endDate: endDate,
          status: [],
        };
      } else {
        dataToSend = {
          balagruhaIds: [selectedBalagruhaOfCoach],
          assignedTo: selectedCoach,
          startDate: startDate,
          endDate: endDate,
          status: [],
        };
      }

      const response = await getSchedules(dataToSend);
      setSchedules(response?.data?.schedules);
    } catch (error) {
      console.error("Error in fetching schedules", error);
    }
  };

  useEffect(() => {
    getBalagruhaList();
    getTasksList();
    getUsersList();
    getMachinesData();
    getCoachNameBasedonBalagruha();
  }, [selectedBalagruha]);

  // Handle student checkbox change
  // const handleStudentCheckboxChange = async (studentId, userId) => {
  //     setSelectedStudents(prevSelected => {
  //         if (prevSelected?.includes(studentId)) {
  //             return prevSelected.filter(id => id !== studentId);
  //         } else {
  //             return [...prevSelected, studentId];
  //         }
  //     });

  //     setStudentUserId(prevSelected => {
  //         if (prevSelected?.includes(userId)) {
  //             return prevSelected.filter(id => id !== userId);
  //         } else {
  //             return [...prevSelected, userId];
  //         }
  //     });

  //     // setSelectedStudents(studentId)
  //     // setStudentUserId(userId);

  //     const balagruhaIds = {
  //         balagruhaIds: [selectedBalagruha]
  //     }

  //     const response = await getMedicalConditionBasedOnBalagruha(balagruhaIds);
  //     const moodResponse = await getMoodBasedOnBalagruha(balagruhaIds);

  //     if (response.success) {
  //         setMedicalIssuesData(prev => {
  //             const selectedIds = [...selectedStudents]; // Using stale state here
  //             const filteredCheckIns = response.data.medicalCheckIns.filter(
  //                 checkIn => selectedIds.includes(checkIn.studentId)
  //             );
  //             return filteredCheckIns;
  //         });
  //     }

  //     if (moodResponse.success) {
  //         setMoodData(prev => {
  //             const selectedUserIds = [...studentUserId]; // Also stale
  //             const filteredMood = moodResponse.data.moodInfor.filter(
  //                 mood => selectedUserIds.includes(mood.userId)
  //             );
  //             return filteredMood;
  //         });
  //     }

  //     
  // };

  const handleStudentCheckboxChange = async (studentId, userId) => {
    // Calculate new selections
    const newSelectedStudents = selectedStudents.includes(studentId)
      ? selectedStudents.filter((id) => id !== studentId)
      : [...selectedStudents, studentId];

    const newStudentUserIds = studentUserId.includes(userId)
      ? studentUserId.filter((id) => id !== userId)
      : [...studentUserId, userId];

    // Apply them to state
    setSelectedStudents(newSelectedStudents);
    setStudentUserId(newStudentUserIds);

    const balagruhaIds = { balagruhaIds: [selectedBalagruha] };

    const response = await getMedicalConditionBasedOnBalagruha(balagruhaIds);
    if (response.success) {
      const filteredCheckIns = response?.data?.medicalCheckIns?.filter(
        (checkIn) => newSelectedStudents.includes(checkIn.studentId)
      );
      setMedicalIssuesData(filteredCheckIns);
    }

    const moodResponse = await getMoodBasedOnBalagruha(balagruhaIds);
    if (moodResponse.success) {
      const filteredMood = moodResponse?.data?.moodInfo?.filter((mood) => {
        return newStudentUserIds.includes(mood.userId);
      });
      setMoodData(filteredMood);
    }


  };

  // Handle select all students
  const handleSelectAllStudents = () => {
    if (selectedStudents.length === balagruhaStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(balagruhaStudents?.map((student) => student._id));
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

  // Handle task status change
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

  const adminMenus = [
    // { id: 1, name: "Subject wise progress" },
    // { id: 2, name: "Computer Usage" },
    { id: 3, name: "Medical Issues" },
    // { id: 4, name: "Balgruh & Children Details" },
    // { id: 5, name: "Performance Reports" },
    // { id: 6, name: "Attendance" },
    { id: 7, name: "Mood" },
  ];

  const coachMenus = [
    { id: 1, name: "Daily Schedule", count: tasks.length },
    { id: 2, name: "Task Tracker" },
    { id: 3, name: "Medical" },
    { id: 4, name: "Syllabus Tracker" },
    { id: 5, name: "Slow Learners" },
    { id: 8, name: "ISF Shop" },
    { id: 9, name: "Suggestion" },
    { id: 10, name: "Activities" },
    { id: 11, name: "Events" },
  ];

  // Convert tasks to calendar events
  // const getCalendarEvents = () => {
  //     if (!tasks || tasks.length === 0) {
  //         // If no tasks, use dummy data
  //         return [
  //             {
  //                 id: 1,
  //                 title: "Visit to Sampare",
  //                 location: "Shelpimplegaon",
  //                 date: "2025-03-20",
  //                 time: "09:00-11:00",
  //                 type: "visit",
  //                 description: "Regular visit to check on children's progress",
  //                 attendees: ["Coach 1", "Admin", "Local Volunteer"],
  //                 status: "Confirmed",
  //                 // Create a task-like object for the modal
  //                 taskData: {
  //                     _id: "1",
  //                     title: "Visit to Sampare",
  //                     description: "Regular visit to check on children's progress",
  //                     status: "pending",
  //                     priority: "High",
  //                     deadline: "2025-03-20T11:00:00",
  //                     createdAt: "2025-03-15T09:00:00",
  //                     assignedUser: "1",
  //                     createdBy: "2",
  //                     comments: [],
  //                     attachments: []
  //                 }
  //             }
  //         ];
  //     }

  //     return tasks?.map(task => ({
  //         id: task._id,
  //         title: task.title,
  //         location: task.location || "Not specified",
  //         date: task.deadline ? task.deadline.split('T')[0] : "2025-03-20",
  //         time: task.startTime || "All day",
  //         type: (task.priority || "medium").toLowerCase(),
  //         description: task.description,
  //         attendees: [
  //             users.find(u => u._id === task.assignedUser)?.name || "Unassigned",
  //             users.find(u => u._id === task.createdBy)?.name || "Unknown"
  //         ],
  //         status: task.status === "completed" ? "Completed" :
  //             task.status === "in progress" ? "In Progress" : "Pending",
  //         taskData: task
  //     }));
  // };

  // // Calendar events data
  // const calendarEvents = getCalendarEvents();

  // Function to handle event click - opens the task modal
  const handleEventClick = (event) => {
    setSelectedTask(event.taskData);
    setShowTaskModal(true);
  };

  // Dashboard stats for admin overview
  const dashboardStats = [
    {
      title: "Total Balagruhas",
      value: balagruhas.length || 12,
      icon: "🏠",
      color: "#8a7bff",
    },
    {
      title: "Active Coaches",
      value: coaches.length || 5,
      icon: "👨‍🏫",
      color: "#ff9966",
    },
    {
      title: "Total Children",
      value: students.length || 120,
      icon: "👧",
      color: "#4caf50",
    },
  ];

  // Subject progress data
  const subjectProgressData = [
    {
      id: 1,
      studentName: "Rahul Sharma",
      subject: "Mathematics",
      progress: 85,
      date: "2025-03-20",
    },
    {
      id: 2,
      studentName: "Priya Patel",
      subject: "Science",
      progress: 92,
      date: "2025-03-21",
    },
    {
      id: 3,
      studentName: "Amit Kumar",
      subject: "English",
      progress: 78,
      date: "2025-03-19",
    },
    {
      id: 4,
      studentName: "Sneha Gupta",
      subject: "Hindi",
      progress: 88,
      date: "2025-03-22",
    },
    {
      id: 5,
      studentName: "Raj Malhotra",
      subject: "Social Studies",
      progress: 75,
      date: "2025-03-18",
    },
    {
      id: 6,
      studentName: "Neha Singh",
      subject: "Computer Science",
      progress: 95,
      date: "2025-03-23",
    },
    {
      id: 7,
      studentName: "Vikram Joshi",
      subject: "Art",
      progress: 90,
      date: "2025-03-21",
    },
    {
      id: 8,
      studentName: "Meera Reddy",
      subject: "Physical Education",
      progress: 82,
      date: "2025-03-20",
    },
  ];

  // Computer usage stats
  const computerUsageStats = [
    {
      title: "Active Computers",
      value: machines.filter((machine) => machine.status === "active").length,
      icon: "💻",
      color: "#4caf50",
    },
    {
      title: "Inactive Computers",
      value: machines.filter((machine) => machine.status === "inactive").length,
      icon: "🔌",
      color: "#ff9800",
    },
    {
      title: "In Maintenance",
      value: machines.filter((machine) => machine.status === "maintainence")
        .length,
      icon: "🔧",
      color: "#f44336",
    },
    {
      title: "Total Computers",
      value: machines.length,
      icon: "📦",
      color: "#9e9e9e",
    },
  ];

  // Medical issues data
  // const medicalIssuesData = [
  //     { id: 1, studentName: "Rahul Sharma", balagruhaName: "Balagruha 1", doctorName: "Dr. Mehta", disease: "Common Cold" },
  //     { id: 2, studentName: "Priya Patel", balagruhaName: "Balagruha 2", doctorName: "Dr. Sharma", disease: "Allergic Rhinitis" },
  //     { id: 3, studentName: "Amit Kumar", balagruhaName: "Balagruha 1", doctorName: "Dr. Gupta", disease: "Viral Fever" },
  //     { id: 4, studentName: "Sneha Gupta", balagruhaName: "Balagruha 3", doctorName: "Dr. Patel", disease: "Skin Rash" },
  //     { id: 5, studentName: "Raj Malhotra", balagruhaName: "Balagruha 2", doctorName: "Dr. Singh", disease: "Gastroenteritis" }
  // ];

  // Balagruha and children details
  const balagruhaDetailsData = [
    {
      id: 1,
      name: "Balagruha 1",
      childrenCount: 25,
      location: "Mumbai, Maharashtra",
    },
    {
      id: 2,
      name: "Balagruha 2",
      childrenCount: 32,
      location: "Pune, Maharashtra",
    },
    {
      id: 3,
      name: "Balagruha 3",
      childrenCount: 18,
      location: "Nagpur, Maharashtra",
    },
    {
      id: 4,
      name: "Balagruha 4",
      childrenCount: 27,
      location: "Nashik, Maharashtra",
    },
    {
      id: 5,
      name: "Balagruha 5",
      childrenCount: 22,
      location: "Aurangabad, Maharashtra",
    },
  ];

  // Performance reports data
  const performanceReportsData = [
    {
      id: 1,
      studentName: "Rahul Sharma",
      subject: "Mathematics",
      excellsIn: "Algebra",
      percentage: 92,
    },
    {
      id: 2,
      studentName: "Priya Patel",
      subject: "Science",
      excellsIn: "Biology",
      percentage: 88,
    },
    {
      id: 3,
      studentName: "Amit Kumar",
      subject: "English",
      excellsIn: "Creative Writing",
      percentage: 85,
    },
    {
      id: 4,
      studentName: "Sneha Gupta",
      subject: "Computer Science",
      excellsIn: "Programming",
      percentage: 95,
    },
    {
      id: 5,
      studentName: "Raj Malhotra",
      subject: "Social Studies",
      excellsIn: "History",
      percentage: 82,
    },
    {
      id: 6,
      studentName: "Neha Singh",
      subject: "Art",
      excellsIn: "Painting",
      percentage: 90,
    },
  ];

  // Attendance data
  const attendanceData = [
    {
      id: 1,
      studentName: "Rahul Sharma",
      date: new Date().toLocaleDateString(),
      status: "Present",
    },
    {
      id: 2,
      studentName: "Priya Patel",
      date: new Date().toLocaleDateString(),
      status: "Present",
    },
    {
      id: 3,
      studentName: "Amit Kumar",
      date: new Date().toLocaleDateString(),
      status: "Absent",
    },
    {
      id: 4,
      studentName: "Sneha Gupta",
      date: new Date().toLocaleDateString(),
      status: "Present",
    },
    {
      id: 5,
      studentName: "Raj Malhotra",
      date: new Date().toLocaleDateString(),
      status: "Present",
    },
    {
      id: 6,
      studentName: "Neha Singh",
      date: new Date().toLocaleDateString(),
      status: "Absent",
    },
    {
      id: 7,
      studentName: "Vikram Joshi",
      date: new Date().toLocaleDateString(),
      status: "Present",
    },
  ];

  return (
    <div className="admin-dashboard">
      {/* Task Details Modal */}
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

      {/* Dashboard Overview */}
      <div className="dashboard-overview">
        <div className="main-content">
          {/* Left Panel */}
          <div className="left-panel">
            {/* Balagruha Selection */}
            <div className="balagruha-selection">
              <h3>Balagruhas</h3>
              {/* <div className="scroll-container scrollable-menu">
                                {balagruhas?.map(bal => (
                                    <div
                                        key={bal._id}
                                        className={`balagruha-item ${selectedBalagruha === bal._id ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSelectedStudents([]);
                                            setStudentUserId([]);
                                            setMoodData();
                                            setMedicalIssuesData();
                                            setSelectedBalagruha(bal._id);
                                            getStudentListBasedonDate(bal._id);
                                            // setAdminMenuSelected(3);
                                        }}
                                    >
                                        <div>{bal.name}</div>
                                    </div>
                                ))}
                            </div> */}
              <div className="scroll-wrapper">
                <button
                  className="scroll-button left"
                  onClick={() => scrollMenu("left")}
                >
                  &lt;
                </button>

                <div
                  className="scroll-container scrollable-menu"
                  ref={scrollRef}
                >
                  {balagruhas?.map((bal) => (
                    <div
                      key={bal._id}
                      className={`balagruha-item ${
                        selectedBalagruha === bal._id ? "selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedStudents([]);
                        setStudentUserId([]);
                        setMoodData();
                        setMedicalIssuesData();
                        setSelectedBalagruha(bal._id);
                        getStudentListBasedonDate(bal._id);
                      }}
                    >
                      <div>{bal.name}</div>
                    </div>
                  ))}
                </div>

                <button
                  className="scroll-button right"
                  onClick={() => scrollMenu("right")}
                >
                  &gt;
                </button>
              </div>
            </div>

            {/* Student Dropdown */}
            {/* {showStudentDropdown && (
                            
                        )} */}

            <div className="student-dropdown-container">
              <div
                className="student-dropdown-header"
                onClick={() => setShowStudentDropdown(!showStudentDropdown)}
              >
                <h3>Students</h3>
                <span className="dropdown-arrow">
                  {showStudentDropdown ? "▲" : "▼"}
                </span>
              </div>

              <div className={`drop-container`}>
                {/* <div className="select-all-option">
                                    <label className="checkbox-container">
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.length === balagruhaStudents.length && balagruhaStudents.length > 0}
                                            onChange={handleSelectAllStudents}
                                        />
                                        <span className="checkmark"></span>
                                        Select All
                                    </label>
                                </div> */}

                {showStudentDropdown && (
                  <div className="student-list">
                    {balagruhaStudents.length > 0 ? (
                      balagruhaStudents?.map((student) => (
                        <div key={student._id} className="student-item">
                          <label className="checkbox-container">
                            <input
                              type="checkbox"
                              checked={selectedStudents?.includes(student._id)}
                              onChange={() =>
                                handleStudentCheckboxChange(
                                  student._id,
                                  student.userId
                                )
                              }
                            />
                            <span className="checkmark"></span>
                            {student.name}
                          </label>
                        </div>
                      ))
                    ) : (
                      <div className="no-students-message">
                        No students found for this balagruha
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Admin Menus (shown when Balagruha is selected) */}
            {selectedBalagruha && (
              <div className="admin-menus">
                <h3>Management Options</h3>
                <div className="menu-grid scrollable-menu">
                  {adminMenus?.map((menu) => (
                    <div
                      key={menu.id}
                      className={`menu-item ${
                        adminMenuSelected === menu.id ? "selected" : ""
                      }`}
                      onClick={() => setAdminMenuSelected(menu.id)}
                    >
                      {menu.name}
                    </div>
                  ))}
                </div>

                {/* {adminMenuSelected === 1 && (
                                    <div className="data-display">
                                        <h3>Subject Wise Progress</h3>
                                        <div className="table-container">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Student Name</th>
                                                        <th>Subject</th>
                                                        <th>Progress</th>
                                                        <th>Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {subjectProgressData.map((item, index) => (
                                                        <tr key={item.id} className={index % 2 === 0 ? 'even-row' : ''}>
                                                            <td>{students[index]?.name || item.studentName}</td>
                                                            <td>{item.subject}</td>
                                                            <td>
                                                                <div className="progress-bar-bg">
                                                                    <div
                                                                        className="progress-bar-fill"
                                                                        style={{
                                                                            width: `${item.progress}%`,
                                                                            backgroundColor: item.progress > 70 ? "#4caf50" : item.progress > 40 ? "#ff9800" : "#f44336"
                                                                        }}
                                                                    ></div>
                                                                </div>
                                                                <div className="progress-text">{item.progress}%</div>
                                                            </td>
                                                            <td>{item.date}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )} */}

                {/* {adminMenuSelected === 2 && (
                                    <div className="data-display">
                                        <h3>Computer Usage</h3>
                                        <div className="computer-stats-container">
                                            {computerUsageStats.map((stat, index) => (
                                                <div className="computer-stat-card" key={index} style={{ backgroundColor: stat.color + '15', borderLeft: `4px solid ${stat.color}` }}>
                                                    <div className="stat-icon" style={{ backgroundColor: stat.color }}>{stat.icon}</div>
                                                    <div className="stat-info">
                                                        <div className="stat-value">{stat.value}</div>
                                                        <div className="stat-title">{stat.title}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )} */}

                {adminMenuSelected === 3 && (
                  <div className="data-display">
                    <h3>Medical Issues</h3>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>SI NO</th>
                            <th>Student Name</th>
                            <th>Medical Incharge</th>
                            <th>Temperature</th>
                            <th>Time Stamp</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {medicalIssuesData?.map((item, index) => (
                            <tr
                              key={item.id}
                              className={index % 2 === 0 ? "even-row" : ""}
                            >
                              <td>{index + 1}</td>
                              <td>{item?.userName}</td>
                              <td>{item.createdByUser}</td>
                              <td>{item.temperature}</td>
                              <td>
                                {new Date(item.date).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </td>
                              <td>{item.healthStatus}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* {adminMenuSelected === 4 && (
                                    <div className="data-display">
                                        <h3>Balagruha & Children Details</h3>
                                        <div className="table-container">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Balagruha Name</th>
                                                        <th>Children Count</th>
                                                        <th>Location</th>

                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {balagruhas.map((item, index) => (
                                                        <tr key={item._id} className={index % 2 === 0 ? 'even-row' : ''}>
                                                            <td>{item.name}</td>
                                                            <td>25</td>
                                                            <td>{item.location}</td>

                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )} */}

                {/* {adminMenuSelected === 5 && (
                                    <div className="data-display">
                                        <h3>Performance Reports</h3>
                                        <div className="table-container">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Student Name</th>
                                                        <th>Subject</th>
                                                        <th>Excels In</th>
                                                        <th>Percentage</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {performanceReportsData.map((item, index) => (
                                                        <tr key={item.id} className={index % 2 === 0 ? 'even-row' : ''}>
                                                            <td>{students[index]?.name || item.studentName}</td>
                                                            <td>{item.subject}</td>
                                                            <td>{item.excellsIn}</td>
                                                            <td>
                                                                <div className="percentage-badge" style={{
                                                                    backgroundColor: item.percentage > 85 ? "#4caf50" :
                                                                        item.percentage > 70 ? "#8bc34a" :
                                                                            item.percentage > 60 ? "#ff9800" : "#f44336"
                                                                }}>
                                                                    {item.percentage}%
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )} */}

                {/* {adminMenuSelected === 6 && (
                                    <div className="data-display">
                                        <h3>Attendance</h3>
                                        <div className="table-container">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Student Name</th>
                                                        <th>Date</th>
                                                        <th>Status</th>

                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {attendance.map((item, index) => (
                                                        <tr key={item._id} className={index % 2 === 0 ? 'even-row' : ''}>
                                                            <td>{item.name}</td>
                                                            <td>{new Date(item.updatedAt).toDateString()}</td>
                                                            <td>
                                                                <span className={`attendance-badge ${item.status?.toLowerCase() || (item.attendance && item.attendance[0]?.status?.toLowerCase())}`}>
                                                                    {item.status || (item.attendance && item.attendance[0]?.status) || "Unknown"}
                                                                </span>
                                                            </td>

                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )} */}

                {adminMenuSelected === 7 && (
                  <div className="data-display">
                    <h3>Mood</h3>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>SI NO</th>
                            <th>Student Name</th>
                            <th>User ID</th>
                            <th>Mood</th>
                            <th>Time Stamp</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {moodData?.map((item, index) => (
                            <tr
                              key={item.id}
                              className={index % 2 === 0 ? "even-row" : ""}
                            >
                              <td>{index + 1}</td>
                              <td>{item?.userName}</td>
                              <td>{item.userId}</td>
                              <td>{item.mood}</td>
                              <td>
                                {new Date(item.date).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </td>
                              <td>{item.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="right-panel">
            {/* Coach Selection */}
            {/* <div className="coach-selection">
                            <h3>Coaches</h3>
                            <div className="scroll-container scrollable-menu">
                                {coaches.length > 0 ?
                                    coaches.map(coach => (
                                        <div
                                            key={coach._id}
                                            className={`coach-item ${selectedCoach === coach._id ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSelectedCoach(coach._id);
                                                setCoachMenuSelected(1);
                                            }}
                                        >
                                            {coach.name}
                                        </div>
                                    )) :
                                    // Fallback to dummy data if no coaches found
                                    [1, 2, 3, 4, 5].map(id => (
                                        <div
                                            key={id}
                                            className={`coach-item ${selectedCoach === id ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSelectedCoach(id);
                                                setCoachMenuSelected(1);
                                            }}
                                        >
                                            Coach {id}
                                        </div>
                                    ))
                                }
                            </div>
                        </div> */}

            {/* Balagruha assigned to coach */}

            {/* <div className="coach-selection">
                            <h3>Coaches</h3>
                            <div className="scroll-container scrollable-menu">
                                {coaches.length > 0 ?
                                    coaches?.map(coach => (
                                        <div
                                            key={coach._id}
                                            className={`coach-item ${selectedCoach === coach._id ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSelectedCoach(coach._id);
                                                setSelectedBalagruhaOfCoach();
                                                fetchBalagruhaByCoach(coach._id);
                                                // setCoachMenuSelected(1);
                                            }}
                                        >
                                            {coach.name}
                                        </div>
                                    )) :
                                    // Fallback to dummy data if no coaches found
                                    <p>Select a balagruha to view coaches</p>
                                }
                            </div>
                        </div> */}

            <div className="coach-selection">
              <h3>Coaches</h3>
              <div className="scroll-wrapper" style={{ position: "relative" }}>
                <button
                  className="scroll-button left"
                  onClick={() => {
                    document
                      .getElementById("coach-scroll-container")
                      .scrollBy({ left: -200, behavior: "smooth" });
                  }}
                >
                  &lt;
                </button>
                <div
                  id="coach-scroll-container"
                  className="scroll-container scrollable-menu"
                >
                  {coaches.length > 0 ? (
                    coaches.map((coach) => (
                      <div
                        key={coach._id}
                        className={`coach-item ${
                          selectedCoach === coach._id ? "selected" : ""
                        }`}
                        onClick={() => {
                          setSelectedCoach(coach._id);
                          setSelectedBalagruhaOfCoach();
                          fetchBalagruhaByCoach(coach._id);
                        }}
                      >
                        {coach.name}
                      </div>
                    ))
                  ) : (
                    <p>Select a balagruha to view coaches</p>
                  )}
                </div>
                <button
                  className="scroll-button right"
                  onClick={() => {
                    document
                      .getElementById("coach-scroll-container")
                      .scrollBy({ left: 200, behavior: "smooth" });
                  }}
                >
                  &gt;
                </button>
              </div>
            </div>

            {/* {balagruhaOfCoach.length > 0 && (
              <div className="assigned-balagruha">
                <h3>Assigned Balagruhas</h3>
                <div className="scroll-container scrollable-menu">
                  {balagruhaOfCoach?.map((bal) => (
                    <div
                      key={bal._id}
                      className={`balagruha-item ${
                        selectedBalagruhaOfCoach === bal._id ? "selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedBalagruhaOfCoach(bal._id);
                        // const today = new Date();
                        // const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

                        // // Get Monday (start of week)
                        // const startDate = new Date(today);
                        // startDate.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
                        // startDate.setHours(0, 0, 0, 0);

                        // // Get Sunday (end of week)
                        // const endDate = new Date(startDate);
                        // endDate.setDate(startDate.getDate() + 6);
                        // endDate.setHours(23, 59, 59, 999);

                        // // Now call fetchSchedules
                        // fetchSchedules(bal._id, startDate, endDate);

                        const today = new Date();
                        const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

                        // Get Monday
                        const monday = new Date(today);
                        monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
                        monday.setHours(0, 0, 0, 0);

                        // Get Sunday
                        const sunday = new Date(monday);
                        sunday.setDate(monday.getDate() + 6);
                        sunday.setHours(23, 59, 59, 999);

                        // Format to 'YYYY-MM-DD'
                        const startDate = monday.toISOString().slice(0, 10);
                        const endDate = sunday.toISOString().slice(0, 10);

                        // Call your function
                        fetchSchedules(bal._id, startDate, endDate);
                        // getStudentListBasedonDate(bal._id);
                        // setAdminMenuSelected(3);
                      }}
                    >
                      <div>{bal.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )} */}

            {balagruhaOfCoach.length > 0 && (
              <div className="assigned-balagruha">
                <h3>Assigned Balagruhas</h3>
                <div
                  className="scroll-wrapper"
                  style={{ position: "relative" }}
                >
                  <button
                    className="scroll-button left"
                    onClick={() => {
                      document
                        .getElementById("balagruha-scroll-container")
                        .scrollBy({ left: -200, behavior: "smooth" });
                    }}
                  >
                    &lt;
                  </button>

                  <div
                    id="balagruha-scroll-container"
                    className="scroll-container scrollable-menu"
                  >
                    {balagruhaOfCoach.map((bal) => (
                      <div
                        key={bal._id}
                        className={`balagruha-item ${
                          selectedBalagruhaOfCoach === bal._id ? "selected" : ""
                        }`}
                        onClick={() => {
                          setSelectedBalagruhaOfCoach(bal._id);

                          const today = new Date();
                          const dayOfWeek = today.getDay();
                          const monday = new Date(today);
                          monday.setDate(
                            today.getDate() - ((dayOfWeek + 6) % 7)
                          );
                          monday.setHours(0, 0, 0, 0);

                          const sunday = new Date(monday);
                          sunday.setDate(monday.getDate() + 6);
                          sunday.setHours(23, 59, 59, 999);

                          const startDate = monday.toISOString().slice(0, 10);
                          const endDate = sunday.toISOString().slice(0, 10);

                          fetchSchedules(bal._id, startDate, endDate);
                        }}
                      >
                        <div>{bal.name}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="scroll-button right"
                    onClick={() => {
                      document
                        .getElementById("balagruha-scroll-container")
                        .scrollBy({ left: 200, behavior: "smooth" });
                    }}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}

            {/* Coach Menus */}
            {selectedCoach && (
              <div className="coach-menus">
                {/* <h3>Coach Options</h3>
                <div
                  className="menu-grid scrollable-menu"
                  style={{ paddingTop: "15px", boxSizing: "border-box" }}
                >
                  {coachMenus?.map((menu) => (
                    <div style={{ position: "relative" }}>
                      <div
                        key={menu.id}
                        className={`menu-item ${
                          coachMenuSelected === menu.id ? "selected" : ""
                        }`}
                        onClick={() => setCoachMenuSelected(menu.id)}
                      >
                        {menu.name}
                      </div>
                      <div className="menu-bubble">
                        {menu.count ? menu.count : 0}
                      </div>
                    </div>
                  ))}
                </div> */}

                <h3>Coach Options</h3>
                <div
                  className="scroll-wrapper"
                  style={{ position: "relative" }}
                >
                  <button
                    className="scroll-button left"
                    onClick={() =>
                      document
                        .getElementById("coach-options-scroll")
                        .scrollBy({ left: -200, behavior: "smooth" })
                    }
                  >
                    &lt;
                  </button>

                  <div
                    id="coach-options-scroll"
                    className="menu-grid scrollable-menu"
                    style={{
                      paddingTop: "15px",
                      boxSizing: "border-box",
                      overflowX: "auto",
                      display: "flex",
                      gap: "1rem",
                    }}
                  >
                    {coachMenus?.map((menu) => (
                      <div key={menu.id} style={{ position: "relative" }}>
                        <div
                          className={`menu-item ${
                            coachMenuSelected === menu.id ? "selected" : ""
                          }`}
                          onClick={() => setCoachMenuSelected(menu.id)}
                        >
                          {menu.name}
                        </div>
                        <div className="menu-bubble">{menu.count || 0}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="scroll-button right"
                    onClick={() =>
                      document
                        .getElementById("coach-options-scroll")
                        .scrollBy({ left: 200, behavior: "smooth" })
                    }
                  >
                    &gt;
                  </button>
                </div>

                {/* Display dummy data when coach menu is selected */}
                {coachMenuSelected && coachMenuSelected !== 1 && (
                  <div className="data-display">
                    <h3>
                      {coachMenus.find((m) => m.id === coachMenuSelected)?.name}
                    </h3>
                    <div className="table-container">
                      <table className="data-table coach-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array(5)
                            .fill()
                            .map((_, index) => (
                              <tr
                                key={index}
                                className={index % 2 === 0 ? "even-row" : ""}
                              >
                                <td>
                                  {
                                    coachMenus.find(
                                      (m) => m.id === coachMenuSelected
                                    )?.name
                                  }{" "}
                                  Item {index + 1}
                                </td>
                                <td>
                                  <div className="progress-bar-bg">
                                    <div
                                      className="progress-bar-fill"
                                      style={{
                                        width: `${Math.floor(
                                          Math.random() * 100
                                        )}%`,
                                        backgroundColor:
                                          index > 3
                                            ? "#4caf50"
                                            : index > 1
                                            ? "#ff9800"
                                            : "#f44336",
                                      }}
                                    ></div>
                                  </div>
                                </td>
                                <td>{new Date().toLocaleDateString()}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Weekly Calendar (shown when Daily Schedule is selected) */}
                {coachMenuSelected === 1 && (
                  <WeeklyCalendar
                    currentWeekOffset={currentWeekOffset}
                    setCurrentWeekOffset={setCurrentWeekOffset}
                    calendarEvents={schedules}
                    users={users}
                    onEventClick={handleEventClick}
                    fetchSchedules={fetchSchedules}
                    selectedBalagruhaOfCoach={selectedBalagruhaOfCoach}
                    // selectedCoach={selectedCoach}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
