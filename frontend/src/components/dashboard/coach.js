// Coach Dashboard
import React, { useState, useEffect } from 'react';
import './coach-styles.css';
import WeeklyCalendar from './WeeklyCalendar';
import AttendanceComponent from '../Attendance/attendance';
import {
    getBalagruha,
    getTasks,
    updateTask,
    fetchUsers,
    getTaskBytaskId,
    getUserBalagruhas,
    getSchedulesCoach,
    getAssignableUsersForSchedule,
    getMedicalConditionBasedOnBalagruha,
    getMyPurchaseRequests,
    getCoachDeliveries
} from '../../api';
import { TaskDetailsModal } from '../TaskManagement/taskmanagement';
import { useRBAC } from '../../contexts/RBACContext';

function CoachDashboard() {
    // State variables remain the same
    const [selectedCoach, setSelectedCoach] = useState(1);
    const [coachMenuSelected, setCoachMenuSelected] = useState(1);
    const [showChatWindow, setShowChatWindow] = useState(null);
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [eventHoverPosition, setEventHoverPosition] = useState({ top: 0, left: 0 });
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [users, setUsers] = useState([]);
    const [coaches, setCoaches] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [medicalData, setMedicalData] = useState([]);
    const [purchaseData, setPurchaseData] = useState([]);
    const [isfShopData, setIsfShopData] = useState([]);
    const [balagruhas, setBalagruhas] = useState([]);
    const [machines, setMachines] = useState([]);
    const [selectedBalagruha, setSelectedBalagruha] = useState();
    const [schedules, setSchedules] = useState([]);
    const { hasPermission, isLoading: rbacLoading, permissions } = useRBAC();
    const [chatMessages, setChatMessages] = useState({
        child: [
            { sender: "child", message: "Hello Coach! How are you today?", time: "10:30 AM" },
            { sender: "me", message: "I'm doing great! How was your English lesson?", time: "10:32 AM" },
            { sender: "child", message: "It was fun! I learned new words.", time: "10:33 AM" },
            { sender: "child", message: "When is our next activity?", time: "10:34 AM" },
            { sender: "me", message: "We have a group activity tomorrow at 3 PM.", time: "10:35 AM" },
            { sender: "me", message: "Don't forget to bring your notebook.", time: "10:36 AM" },
            { sender: "child", message: "I won't forget! Thank you.", time: "10:40 AM" },
        ],
        admin: [
            { sender: "admin", message: "Hi Coach! How are the children doing?", time: "9:15 AM" },
            { sender: "me", message: "They're doing well. We completed the English module.", time: "9:20 AM" },
            { sender: "admin", message: "Great! Any issues to report?", time: "9:22 AM" },
            { sender: "me", message: "No major issues. A few children need extra help.", time: "9:23 AM" },
            { sender: "admin", message: "Let's discuss that in our meeting tomorrow.", time: "9:25 AM" },
            { sender: "admin", message: "Also, please submit your weekly report by Friday.", time: "9:30 AM" },
            { sender: "me", message: "Will do. Thanks for the reminder!", time: "9:35 AM" },
        ]
    });

    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        setSearchText("");
        setStatusFilter("all");
        setCurrentPage(1);
    }, [coachMenuSelected, selectedBalagruha, permissions, rbacLoading]);

    const getCurrentData = () => {
        if (coachMenuSelected === 2) return tasks;
        if (coachMenuSelected === 3) return medicalData;
        if (coachMenuSelected === 6) return attendance;
        if (coachMenuSelected === 7) return purchaseData;
        if (coachMenuSelected === 8) return isfShopData;
        return [];
    };

    const formatDate = (date) => {
        if (!date || date === "N/A") return "N/A";
        const parsedDate = new Date(date);
        return Number.isNaN(parsedDate.getTime()) ? "N/A" : parsedDate.toLocaleDateString("en-IN");
    };

    const getSymptoms = (item) => {
        if (Array.isArray(item.symptoms) && item.symptoms.length > 0) {
            return item.symptoms.join(", ").replaceAll("_", " ");
        }

        return item.customSymptom || "N/A";
    };
    const getStudentName = (item) => {
        return item?.userId?.name || item?.studentId?.name || item?.userName || item?.studentName || item?.name || "N/A";
    };

    const getLatestDoctorVisit = (item) => {
        const visits = Array.isArray(item?.doctorVisits) ? item.doctorVisits.filter(Boolean) : [];
        const visit = visits.length > 0 ? visits[visits.length - 1] : item?.doctorVisit;

        if (!visit) return "N/A";

        const place = [visit.doctorName, visit.hospitalName].filter(Boolean).join(" / ");
        const date = visit.visitDate ? ` (${formatDate(visit.visitDate)})` : "";
        return place ? `${place}${date}` : "N/A";
    };

    const getLatestFollowUp = (item) => {
        const followUps = Array.isArray(item?.followUps) ? item.followUps.filter(Boolean) : [];
        const followUp = followUps.length > 0 ? followUps[followUps.length - 1] : item?.followUp;
        return followUp || {};
    };

    const getMedication = (item) => {
        const visit = Array.isArray(item?.doctorVisits) && item.doctorVisits.length > 0
            ? item.doctorVisits[item.doctorVisits.length - 1]
            : item?.doctorVisit;

        return visit?.testDetails || visit?.conclusion || item?.medication || item?.medicine || "N/A";
    };

    const getTreatmentStatus = (item) => {
        const followUp = getLatestFollowUp(item);
        return followUp.status || item?.treatmentStatus || item?.healthStatus || "N/A";
    };

    const getTaskProgress = (item) => {
        if (item.progress !== undefined && item.progress !== null) return item.progress;
        if (item.status === "Completed") return "100%";
        if (item.status === "In Progress") return "50%";
        return "0%";
    };

    const getTaskRemarks = (item) => {
        return item.remarks || item.description || item.taskData?.description || "N/A";
    };

    const getRequestItems = (items = []) => {
        if (!Array.isArray(items) || items.length === 0) return "N/A";
        const names = items.map((entry) => entry.productName || entry.name || entry.shopItemId?.name).filter(Boolean);
        if (names.length === 0) return "N/A";
        return names.length > 1 ? `${names[0]} +${names.length - 1} more` : names[0];
    };

    const getRequestQuantity = (items = []) => {
        if (!Array.isArray(items) || items.length === 0) return "N/A";
        return items.reduce((total, entry) => total + Number(entry.requestedQuantity || entry.quantity || 0), 0) || "N/A";
    };

    const getPurchaseCost = (item) => {
        const cost = item?.totalEstimatedCost ?? item?.totalActualCost ?? item?.items?.reduce((total, entry) => {
            return total + Number(entry.estimatedTotalCost || entry.actualTotalCost || 0);
        }, 0);

        return cost ? `Rs. ${cost}` : "N/A";
    };

    const getShopRequestStatus = (item) => {
        if (item.deliveryStatus === "cancelled" || item.status === "cancelled" || item.status === "refunded") return "Rejected";
        if (item.deliveryStatus === "pending_delivery" || item.deliveryStatus === "delivered") return "Approved";
        return "Pending";
    };

    const getSearchValue = (item) => {
        if (coachMenuSelected === 2) {
            return `${item.title} ${item.status} ${item.date} ${item.assignedDate} ${item.priority} ${item.attendees?.[0]} ${getTaskRemarks(item)}`;
        }

        if (coachMenuSelected === 3) {
            const followUp = getLatestFollowUp(item);
            return `${getStudentName(item)} ${item.healthStatus} ${getSymptoms(item)} ${getMedication(item)} ${getLatestDoctorVisit(item)} ${getTreatmentStatus(item)} ${formatDate(followUp.followUpDate)} ${formatDate(item.date)}`;
        }

        if (coachMenuSelected === 7) {
            return `${item.requestId} ${getRequestItems(item.items)} ${getRequestQuantity(item.items)} ${item.requestedBy?.name || item.requestedByName || ""} ${item.status} ${item.deliveryStatus || ""} ${getPurchaseCost(item)} ${formatDate(item.createdAt)}`;
        }

        if (coachMenuSelected === 8) {
            return `${getStudentName(item)} ${item.orderNumber} ${getRequestItems(item.items)} ${getRequestQuantity(item.items)} ${getShopRequestStatus(item)} ${item.deliveryStatus} ${formatDate(item.placedAt || item.createdAt)} ${formatDate(item.deliveredAt)}`;
        }

        return "";
    };

    const getItemStatus = (item) => {
        if (coachMenuSelected === 2) {
            return formatStatus(item.status);
        }

        if (coachMenuSelected === 3) return item.healthStatus;
        if (coachMenuSelected === 7) return item.status;

        if (coachMenuSelected === 8) return item.deliveryStatus || getShopRequestStatus(item);

        return "";
    };

    const filteredData = getCurrentData().filter((item) => {
        const searchMatch = getSearchValue(item)
            .toLowerCase()
            .includes(searchText.toLowerCase());

        const filterMatch =
            statusFilter === "all" ||
            getItemStatus(item)?.toLowerCase() === statusFilter.toLowerCase();

        return searchMatch && filterMatch;
    });

    const totalPages = Math.max(
        1,
        Math.ceil(filteredData.length / itemsPerPage)
    );

    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // API function implementations
    const getBalagruhaList = async () => {
        try {
            const response = await getUserBalagruhas();


            const rawBalagruhas = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response?.data?.data)
                    ? response.data.data
                    : [];

            const actualBalagruhas = rawBalagruhas.filter(
                b => b._id !== "STOCK"
            );


            setBalagruhas(actualBalagruhas);

            if (actualBalagruhas.length > 0) {
                setSelectedBalagruha(actualBalagruhas[0]._id);
            }
        } catch (error) {
            console.error("Error fetching balagruha list:", error);
        }
    };

    useEffect(() => {
        if (!selectedBalagruha || !can("Schedule Management", "Read")) return;

        const today = new Date();
        const dayOfWeek = today.getDay();

        const monday = new Date(today);
        monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        fetchSchedules(
            selectedBalagruha,
            monday.toISOString().slice(0, 10),
            sunday.toISOString().slice(0, 10)
        );
    }, [selectedBalagruha, permissions, rbacLoading]);

    const getTasksList = async () => {
        try {
            // If a balagruha is selected, use that ID, otherwise use a default
            const data = {
                balagruhaId: selectedBalagruha || "67b63186d2486ca7b43fe418"
            };
            const response = await getTasks(JSON.stringify(data));


            // Convert tasks to calendar events format
            const formattedTasks = (response?.data?.tasks || []).map(task => {
                const assignedUserId = task.assignedUser?._id || task.assignedUser;
                const createdById = task.createdBy?._id || task.createdBy;
                const assignedUserName = task.assignedUser?.name || users.find(u => u._id === assignedUserId)?.name || "Unassigned";
                const createdByName = task.createdBy?.name || users.find(u => u._id === createdById)?.name || "Unknown";
                const status = task.status === "completed" ? "Completed" :
                    task.status === "in progress" ? "In Progress" : "Pending";

                return {
                    id: task._id,
                    title: task.title,
                    location: task.location || "Not specified",
                    date: task.deadline ? task.deadline.split('T')[0] : new Date().toISOString().split('T')[0],
                    assignedDate: task.createdAt ? task.createdAt.split('T')[0] : "N/A",
                    time: task.startTime || "All day",
                    type: (task.priority || "medium").toLowerCase(),
                    priority: task.priority || "medium",
                    description: task.description,
                    attendees: [assignedUserName, createdByName],
                    assignedTo: assignedUserName,
                    createdBy: createdByName,
                    status,
                    progress: status === "Completed" ? "100%" : status === "In Progress" ? "50%" : "0%",
                    remarks: task.comments?.[task.comments.length - 1]?.comment || task.description || "N/A",
                    taskData: task
                };
            });

            setTasks(formattedTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    const getMedicalList = async () => {
        try {
            const balagruhaIds = JSON.parse(
                localStorage.getItem("balagruhaIds") || "[]"
            );

            console.log("Balagruha IDs:", balagruhaIds);

            const response = await getMedicalConditionBasedOnBalagruha(
                balagruhaIds
            );

            console.log("Medical Response:", response);

            if (response.success) {
                setMedicalData(response?.data?.medicalCheckIns || []);
            } else {
                setMedicalData([]);
            }
        } catch (error) {
            console.error(error);
            setMedicalData([]);
        }
    };

    const getPurchaseList = async () => {
        try {
            const response = await getMyPurchaseRequests({
                balagruhaId: selectedBalagruha,
            });

            console.log("Purchase Response:", response);

            const purchaseList = response?.data?.requests || [];

            setPurchaseData(Array.isArray(purchaseList) ? purchaseList : []);
        } catch (error) {
            console.error("Error fetching purchase data:", error);
            setPurchaseData([]);
        }
    };

    const getIsfShopList = async () => {
        try {
            const response = await getCoachDeliveries({
                balagruhaId: selectedBalagruha,
                status: "all",
                limit: 100,
            });

            const orders = response?.orders || [];
            setIsfShopData(Array.isArray(orders) ? orders : []);
        } catch (error) {
            console.error("Error fetching ISF shop data:", error);
            setIsfShopData([]);
        }
    };

    const getUsersList = async () => {
        try {
            // S6-S1-PROD-BUG-001: Use new API that returns filtered users based on role and Balagruha
            const response = await getAssignableUsersForSchedule();


            // The backend already filters users, so we use the data directly
            const assignableUsers = response?.data || [];
            setUsers(assignableUsers);

            // Filter coaches from assignable users
            const coachUsers = assignableUsers.filter(user =>
                user.role === "coach" || user.role === "sports-coach" || user.role === "music-coach"
            );
            setCoaches(coachUsers);

            // Students are not included in assignable users (as per requirements)
            setStudents([]);
        } catch (error) {
            console.error('Error fetching assignable users:', error);
        }
    };

    const fetchSchedules = async (balagruha, startDate, endDate) => {
        try {
            const userId = localStorage.getItem("userId");
            const balagruhaId = balagruha || selectedBalagruha;

            if (!balagruhaId) {
                console.warn("Please select a Balagruha first");
                return;
            }

            const dataToSend = {
                balagruhaIds: [balagruhaId],
                assignedTo: userId,
                startDate,
                endDate,
            };

            const response = await getSchedulesCoach(dataToSend);
            setSchedules(response?.data?.schedules || []);
        } catch (error) {
            console.error("Error in fetching schedules", error?.response?.data || error);
        }
    };

    const getTaskDetailsByTaskId = async (id) => {
        try {
            const response = await getTaskBytaskId(id)
            setSelectedTask(response)
        } catch (err) {
            console.error('Error updating task status:', err);

        }
    }

    // Handle task status change
    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await updateTask(taskId, JSON.stringify({ status: newStatus }));
            // Refresh tasks after update
            getTasksList();
            getTaskDetailsByTaskId(taskId)
        } catch (error) {
            console.error('Error updating task status:', error);
        }
    };

    // Handle task update
    const handleUpdateTask = async (taskId, updateData) => {
        try {
            await updateTask(taskId, JSON.stringify(updateData));
            // Refresh tasks after update
            getTasksList();
            getTaskDetailsByTaskId(taskId)
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    useEffect(() => {
        if (!selectedBalagruha) return;

        if (can("Medical Management", "Read")) {
            getMedicalList();
        }

        if (can("Purchase Management", "Read")) {
            getPurchaseList();
        }

        if (can("Shop Management", "Read") || can("ISF Shop", "Read")) {
            getIsfShopList();
        }
    }, [selectedBalagruha, permissions, rbacLoading]);
    // Load data when component mounts
    useEffect(() => {
        getBalagruhaList();
        getUsersList();
    }, []);

    useEffect(() => {
        if (balagruhas.length > 0 && !selectedBalagruha) {
            setSelectedBalagruha(balagruhas[0]._id);
        }
    }, [balagruhas, selectedBalagruha]);

    // Load tasks when selected balagruha changes
    useEffect(() => {
        if (selectedBalagruha && can("Task Management", "Read")) {
            getTasksList();
        }
    }, [selectedBalagruha, users, permissions, rbacLoading]); // Also refresh when users are loaded for proper name display


    useEffect(() => {
        if (coachMenuSelected === 3 && can("Medical Management", "Read")) {
            getMedicalList();
        }

        if (coachMenuSelected === 7 && can("Purchase Management", "Read")) {
            getPurchaseList();
        }

        if (coachMenuSelected === 8 && (can("Shop Management", "Read") || can("ISF Shop", "Read"))) {
            getIsfShopList();
        }
    }, [coachMenuSelected, selectedBalagruha, permissions, rbacLoading]);

    // Event handlers
    const handleEventClick = (event) => {
        setSelectedTask(event.taskData);
        setShowTaskModal(true);
    };

    const handleChatClick = (contactType) => {
        setShowChatWindow(contactType);
    };

    const handleSendMessage = (chatType, message) => {
        if (!message.trim()) return;

        const newMessage = {
            sender: "me",
            message: message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setChatMessages(prev => ({
            ...prev,
            [chatType]: [...prev[chatType], newMessage]
        }));
    };

    const permissionsLoaded = Object.keys(permissions || {}).length > 0;

    const can = (moduleName, actionName = "Read") => {
        if (rbacLoading || !permissionsLoaded) {
            return false;
        }

        if (actionName.toLowerCase() === "read") {
            return hasPermission(moduleName, "Read") || hasPermission(moduleName, "Manage");
        }

        return hasPermission(moduleName, actionName);
    };
    // Coach menus - Sprint6-Story-1-AC3: Removed 6 unused cards, kept 5 active ones
    const coachMenus = [
        {
            id: 1,
            name: "Daily Schedule",
            count: schedules?.length || 0,
            show: can("Schedule Management", "Read"),
        },
        {
            id: 2,
            name: "Task Tracker",
            count: tasks.length,
            show: can("Task Management", "Read"),
        },
        {
            id: 3,
            name: "Medical",
            count: medicalData.length,
            show: can("Medical Management", "Read"),
        },
        // {
        //     id: 6,
        //     name: "Attendance",
        //     count: 0,
        //     show: can("User Management", "Read") || can("Attendance Management", "Read"),
        // },
        {
            id: 7,
            name: "Purchase",
            count: purchaseData.length,
            show: can("Purchase Management", "Read"),
        },
        {
            id: 8,
            name: "ISF Shop",
            count: isfShopData.length,
            show: can("Shop Management", "Read") || can("ISF Shop", "Read"),
        },
    ].filter(menu => menu.show);

    // Top menus
    const topMenus = [
        { id: 1, name: "Task Tracker" },
        { id: 2, name: "Child Chats" },
        { id: 3, name: "Coach Chats" },
        { id: 4, name: "Cont Deve" },
        { id: 5, name: "ISF Shop" },
        { id: 6, name: "Slow learner" },
        { id: 7, name: "Comp Usage" },
        { id: 8, name: "Med Camp" },
        // { id: 9, name: "Reports" },
        { id: 10, name: "Settings" },
    ];

    useEffect(() => {
        if (coachMenus.length > 0 && !coachMenus.some(menu => menu.id === coachMenuSelected)) {
            setCoachMenuSelected(coachMenus[0].id);
        }
    }, [permissions, rbacLoading, coachMenus.length, coachMenuSelected]);

    // Generate dummy data for menu items
    // const getDummyData = (menuName) => {
    //     const data = [];
    //     for (let i = 1; i <= 10; i++) {
    //         data.push({
    //             id: i,
    //             name: `${menuName} Item ${i}`,
    //             status: Math.floor(Math.random() * 100),
    //             date: new Date().toLocaleDateString()
    //         });
    //     }
    //     return data;
    // };

    const getStatusClass = (status = "") => {
        const value = status.toLowerCase();

        if (
            value === "completed" ||
            value === "normal" ||
            value === "delivered_balagruha" ||
            value === "active"
        ) {
            return "status-success";
        }

        if (
            value === "pending" ||
            value === "pending_approval" ||
            value === "important" ||
            value === "ordered" ||
            value === "delivered_store"
        ) {
            return "status-warning";
        }

        if (
            value === "critical" ||
            value === "cancelled" ||
            value === "rejected" ||
            value === "inactive"
        ) {
            return "status-danger";
        }

        return "status-info";
    };

    // const formatDate = (date) => {
    //     return date ? new Date(date).toLocaleDateString("en-IN") : "N/A";
    // };

    const formatStatus = (status = "") => {
        if (!status) return "N/A";

        return status
            .replaceAll("_", " ")
            .replaceAll("-", " ")
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    // const getSymptoms = (item) => {
    //     if (Array.isArray(item.symptoms) && item.symptoms.length > 0) {
    //         return item.symptoms.join(", ").replaceAll("_", " ");
    //     }

    //     return item.customSymptom || "N/A";
    // };


    // Chat window component
    const ChatWindow = ({ type, onClose }) => {
        const [newMessage, setNewMessage] = useState("");
        const messagesEndRef = React.useRef(null);

        const scrollToBottom = () => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            }
        };

        React.useEffect(() => {
            const timeoutId = setTimeout(() => {
                scrollToBottom();
            }, 100);
            return () => clearTimeout(timeoutId);
        }, [chatMessages[type].length]);


        return (
            <div className="chat-window">
                <div className="chat-header">
                    <div className="chat-header-user">
                        <div className="chat-avatar">
                            {type === "child" ? (
                                <div className="avatar-circle">C</div>
                            ) : (
                                <div className="avatar-circle">A</div>
                            )}
                        </div>
                        <span>{type === "child" ? "Child Chat" : "Admin Chat"}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="chat-close-btn"
                    >
                        &times;
                    </button>
                </div>

                {/* Chat messages */}
                <div className="chat-messages">
                    {chatMessages[type].map((msg, index) => (
                        <div
                            key={index}
                            className={`chat-message ${msg.sender === "me" ? "my-message" : "their-message"}`}
                        >
                            <div className="message-content">{msg.message}</div>
                            <div className="message-time">{msg.time}</div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chat input */}
                <div className="chat-input">
                    <label htmlFor={`chat-input-${type}`} className="sr-only">Type a message</label>
                    <input
                        type="text"
                        id={`chat-input-${type}`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        aria-label={`Type a message to ${type}`}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleSendMessage(type, newMessage);
                                setNewMessage("");
                            }
                        }}
                    />
                    <button
                        onClick={() => {
                            handleSendMessage(type, newMessage);
                            setNewMessage("");
                        }}
                        className="send-btn"
                    >
                        &#10148;
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="coach-dashboard w-full">
            {/* Sticky Chat Buttons */}
            {showTaskModal && selectedTask && (
                <TaskDetailsModal
                    task={selectedTask}
                    onClose={() => { setShowTaskModal(false); }}
                    users={users}
                    onStatusChange={handleStatusChange}
                    onUpdateTask={handleUpdateTask}
                />
            )}
            {/* <div className="sticky-chat-buttons">
                <button
                    className="sticky-chat-button child"
                    onClick={() => handleChatClick("child")}
                    title="Child Chat"
                >
                    C
                    <span className="sticky-chat-badge">7</span>
                </button>
                <button
                    className="sticky-chat-button admin"
                    onClick={() => handleChatClick("admin")}
                    title="Admin Chat"
                >
                    A
                    <span className="sticky-chat-badge">7</span>
                </button>
            </div> */}

            <div className="main-content full-width">
                <div className="full-panel">
                    {/* Balagruha assigned to coach */}
                    <div className="assigned-balagruha">
                        <div className="scroll-container">
                            {balagruhas.map(balagruha => (
                                <div
                                    key={balagruha._id}
                                    className={`balagruha-item ${selectedBalagruha === balagruha._id ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedBalagruha(balagruha._id)

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

                                        fetchSchedules(balagruha._id, startDate, endDate);
                                    }}
                                >
                                    {balagruha.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Coach Menus */}
                    <div className="coach-menus">
                        <div className="menu-grid">
                            {coachMenus.map(menu => (
                                <div key={menu.id} style={{ position: "relative" }}>
                                    <div
                                        key={menu.id}
                                        className={`menu-item ${coachMenuSelected === menu.id ? 'selected' : ''}`}
                                        onClick={() => setCoachMenuSelected(menu.id)}
                                    >

                                        {menu.name}
                                    </div>
                                    <div className='menu-bubble'>{menu.count ? menu.count : 0}</div>
                                </div>
                            ))}
                        </div>

                        {/* Display dummy data when coach menu is selected */}
                        {coachMenuSelected && coachMenuSelected !== 1 && coachMenuSelected !== 6 && (
                            <div className="data-display">
                                <h3>{coachMenus.find(m => m.id === coachMenuSelected)?.name}</h3>
                                <div className="table-controls">
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchText}
                                        onChange={(e) => {
                                            setSearchText(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="table-search-input"
                                    />

                                    <select
                                        value={statusFilter}
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="table-filter-select"
                                    >
                                        <option value="all">All</option>

                                        {coachMenuSelected === 2 && (
                                            <>
                                                <option value="Completed">Completed</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Pending">Pending</option>
                                            </>
                                        )}

                                        {coachMenuSelected === 3 && (
                                            <>
                                                <option value="normal">Normal</option>
                                                <option value="important">Important</option>
                                                <option value="critical">Critical</option>
                                            </>
                                        )}

                                        {coachMenuSelected === 7 && (
                                            <>
                                                <option value="pending">Pending</option>
                                                <option value="approved">Approved</option>
                                                <option value="rejected">Rejected</option>
                                                <option value="ordered">Ordered</option>
                                                <option value="delivered_store">Delivered Store</option>
                                                <option value="delivered_balagruha">Delivered Balagruha</option>
                                                <option value="completed">Completed</option>
                                            </>
                                        )}

                                        {coachMenuSelected === 8 && (
                                            <>
                                                <option value="pending_confirmation">Pending</option>
                                                <option value="pending_delivery">Approved</option>
                                                <option value="delivered">Delivered</option>
                                                <option value="cancelled">Rejected</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            {coachMenuSelected === 2 && (
                                                <>
                                                    <th>Task Name</th>
                                                    <th>Assigned Date</th>
                                                    <th>Due Date</th>
                                                    <th>Priority</th>
                                                    <th>Status</th>
                                                    <th>Progress</th>
                                                    <th>Remarks</th>
                                                </>
                                            )}

                                            {coachMenuSelected === 3 && (
                                                <>
                                                    <th>Student Name</th>
                                                    <th>Health Issue</th>
                                                    <th>Medication</th>
                                                    <th>Doctor/Hospital Visit</th>
                                                    <th>Treatment Status</th>
                                                    <th>Follow-up Date</th>
                                                    <th>Status</th>
                                                </>
                                            )}

                                            {coachMenuSelected === 7 && (
                                                <>
                                                    <th>Request ID</th>
                                                    <th>Item Name</th>
                                                    <th>Quantity</th>
                                                    <th>Requested By</th>
                                                    <th>Request Date</th>
                                                    <th>Approval Status</th>
                                                    <th>Delivery Status</th>
                                                </>
                                            )}

                                            {coachMenuSelected === 8 && (
                                                <>
                                                    <th>Student Name</th>
                                                    <th>Item Requested</th>
                                                    <th>Quantity</th>
                                                    <th>Request Date</th>
                                                    <th>Status</th>
                                                    <th>Distribution Date</th>
                                                    <th>Delivery Status</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {coachMenuSelected === 2 ? (
                                            paginatedData.length > 0 ? (
                                                paginatedData.map((item, index) => (
                                                    <tr key={item.id} className={index % 2 === 0 ? "even-row" : "odd-row"}>
                                                        <td>{item.title || "N/A"}</td>
                                                        <td>{formatDate(item.assignedDate)}</td>
                                                        <td>{formatDate(item.date)}</td>
                                                        <td>{formatStatus(item.priority)}</td>
                                                        <td>
                                                            <span className={`status-badge ${getStatusClass(item.status)}`}>
                                                                {formatStatus(item.status)}
                                                            </span>
                                                        </td>
                                                        <td>{getTaskProgress(item)}</td>
                                                        <td className="remarks-cell">{getTaskRemarks(item)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: "center" }}>
                                                        No tasks found
                                                    </td>
                                                </tr>
                                            )
                                        ) : coachMenuSelected === 3 ? (
                                            paginatedData.length > 0 ? (
                                                paginatedData.map((item, index) => {
                                                    const followUp = getLatestFollowUp(item);
                                                    const treatmentStatus = getTreatmentStatus(item);

                                                    return (
                                                        <tr key={item._id || index} className={index % 2 === 0 ? "even-row" : "odd-row"}>
                                                            <td>{getStudentName(item)}</td>
                                                            <td>{getSymptoms(item)}</td>
                                                            <td>{getMedication(item)}</td>
                                                            <td>{getLatestDoctorVisit(item)}</td>
                                                            <td>{formatStatus(treatmentStatus)}</td>
                                                            <td>{formatDate(followUp.followUpDate)}</td>
                                                            <td>
                                                                <span className={`status-badge ${getStatusClass(item.healthStatus)}`}>
                                                                    {formatStatus(item.healthStatus)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: "center" }}>
                                                        No medical data found
                                                    </td>
                                                </tr>
                                            )
                                        ) : coachMenuSelected === 7 ? (
                                            paginatedData.length > 0 ? (
                                                paginatedData.map((item, index) => (
                                                    <tr key={item._id || index} className={index % 2 === 0 ? "even-row" : "odd-row"}>
                                                        <td>{item.requestId || item._id || "N/A"}</td>
                                                        <td>{getRequestItems(item.items)}</td>
                                                        <td>{getRequestQuantity(item.items)}</td>
                                                        <td>{item.requestedBy?.name || item.requestedByName || "N/A"}</td>
                                                        <td>{formatDate(item.createdAt)}</td>
                                                        <td>
                                                            <span className={`status-badge ${getStatusClass(item.status)}`}>
                                                                {formatStatus(item.status)}
                                                            </span>
                                                        </td>
                                                        <td>{formatStatus(item.deliveryStatus || item.status)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: "center" }}>
                                                        No purchase data found
                                                    </td>
                                                </tr>
                                            )
                                        ) : coachMenuSelected === 8 ? (
                                            paginatedData.length > 0 ? (
                                                paginatedData.map((item, index) => (
                                                    <tr key={item._id || index} className={index % 2 === 0 ? "even-row" : "odd-row"}>
                                                        <td>{getStudentName(item)}</td>
                                                        <td>{getRequestItems(item.items)}</td>
                                                        <td>{getRequestQuantity(item.items)}</td>
                                                        <td>{formatDate(item.placedAt || item.createdAt)}</td>
                                                        <td>
                                                            <span className={`status-badge ${getStatusClass(getShopRequestStatus(item))}`}>
                                                                {getShopRequestStatus(item)}
                                                            </span>
                                                        </td>
                                                        <td>{formatDate(item.deliveredAt)}</td>
                                                        <td>{formatStatus(item.deliveryStatus || item.status)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: "center" }}>
                                                        No ISF shop data found
                                                    </td>
                                                </tr>
                                            )
                                        ) : (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: "center" }}>
                                                    No data found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                {filteredData.length > itemsPerPage && (
                                    <div className="pagination">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage((prev) => prev - 1)}
                                        >
                                            Prev
                                        </button>

                                        <span>
                                            Page {currentPage} of {totalPages}
                                        </span>

                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage((prev) => prev + 1)}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {coachMenuSelected === 6 && (
                            <AttendanceComponent />
                        )}

                        {/* Weekly Calendar (shown when Daily Schedule is selected) */}
                        {coachMenuSelected === 1 && can("Schedule Management", "Read") && (
                            <div className='full-calendar'>
                                <WeeklyCalendar
                                    currentWeekOffset={currentWeekOffset}
                                    setCurrentWeekOffset={setCurrentWeekOffset}
                                    hideAddSchedule={!can("Schedule Management", "Create")}
                                    canUpdateSchedule={can("Schedule Management", "Update")}
                                    canDeleteSchedule={can("Schedule Management", "Delete")}

                                    // calendarEvents={tasks.length > 0 ? tasks : [
                                    //     // Fallback dummy data if no tasks are loaded
                                    //     {
                                    //         id: 1,
                                    //         title: "Visit to Sampare",
                                    //         location: "Shelpimplegaon",
                                    //         date: "2025-03-20",
                                    //         time: "09:00-11:00",
                                    //         type: "visit",
                                    //         description: "Regular visit to check on children's progress",
                                    //         attendees: ["Coach 1", "Admin", "Local Volunteer"],
                                    //         status: "Confirmed",
                                    //         taskData: {
                                    //             _id: "1",
                                    //             title: "Visit to Sampare",
                                    //             description: "Regular visit to check on children's progress",
                                    //             status: "pending",
                                    //             priority: "High",
                                    //             deadline: "2025-03-20T11:00:00",
                                    //             createdAt: "2025-03-15T09:00:00",
                                    //             assignedUser: "1",
                                    //             createdBy: "2",
                                    //             comments: [],
                                    //             attachments: []
                                    //         }
                                    //     }
                                    // ]}
                                    calendarEvents={schedules}
                                    users={users}
                                    onEventClick={handleEventClick}
                                    fetchSchedules={fetchSchedules}
                                    selectedBalagruhaOfCoach={selectedBalagruha}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat windows */}
                {showChatWindow === "child" && (
                    <ChatWindow
                        type="child"
                        onClose={() => setShowChatWindow(null)}
                    />
                )}

                {showChatWindow === "admin" && (
                    <ChatWindow
                        type="admin"
                        onClose={() => setShowChatWindow(null)}
                    />
                )}
            </div>
        </div>
    );
}

export default CoachDashboard;
