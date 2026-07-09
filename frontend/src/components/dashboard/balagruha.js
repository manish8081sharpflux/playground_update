import React, { useEffect, useState } from 'react';
import './balagruha-styles.css';
import {
    getBalagruha,
    getTasks,
    fetchUsers,
    getStudentListforAttendance,
    getMachines,
    // getPerformanceReports,
    // sendMessage,
    // getMessages
} from "../../api";

function BalagruhaDashboard() {
    const [selectedCard, setSelectedCard] = useState(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [activeRoute, setActiveRoute] = useState('dashboard');
    const [showAnimation, setShowAnimation] = useState(false);
    const [balagruhas, setBalagruhas] = useState([]);
    const [selectedBalagruha, setSelectedBalagruha] = useState(null);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [machines, setMachines] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [performanceReports, setPerformanceReports] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [messageRecipient, setMessageRecipient] = useState('');
    const [users, setUsers] = useState([]);
    const [coaches, setCoaches] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [language, setLanguage] = useState('english');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Translations for multi-language support
    const translations = {
        english: {
            dashboard: "Home",
            students: "Students",
            academics: "Learning",
            medical: "Health",
            repairs: "Fix-it",
            inventory: "Stuff",
            events: "Fun Events",
            reports: "Progress",
            settings: "Controls",
            totalUsers: "Total Users",
            computers: "Computers",
            tasks: "Tasks",
            healthCheckUps: "Health Check Ups",
            repairJobs: "Repair Jobs",
            learning: "Learning",
            whatWeLearning: "What We're Learning",
            studentsHealth: "Students' Health",
            allHealthy: "All Healthy!",
            noStudents: "No students found",
            sendMessage: "Send Message",
            selectRecipient: "Select Recipient",
            typeMessage: "Type your message here...",
            send: "Send",
            attendance: "Attendance",
            present: "Present",
            absent: "Absent",
            messagesSent: "Messages Sent",
            messagesReceived: "Messages Received",
            from: "From",
            to: "To",
            message: "Message",
            date: "Date",
            noMessages: "No messages found",
            loading: "Loading...",
            error: "Something went wrong. Please try again."
        },
        hindi: {
            dashboard: "होम",
            students: "छात्र",
            academics: "शिक्षा",
            medical: "स्वास्थ्य",
            repairs: "मरम्मत",
            inventory: "सामान",
            events: "मज़ेदार कार्यक्रम",
            reports: "प्रगति",
            settings: "नियंत्रण",
            totalUsers: "कुल उपयोगकर्ता",
            computers: "कंप्यूटर",
            tasks: "कार्य",
            healthCheckUps: "स्वास्थ्य जांच",
            repairJobs: "मरम्मत कार्य",
            learning: "सीखना",
            whatWeLearning: "हम क्या सीख रहे हैं",
            studentsHealth: "छात्रों का स्वास्थ्य",
            allHealthy: "सभी स्वस्थ हैं!",
            noStudents: "कोई छात्र नहीं मिला",
            sendMessage: "संदेश भेजें",
            selectRecipient: "प्राप्तकर्ता चुनें",
            typeMessage: "अपना संदेश यहां लिखें...",
            send: "भेजें",
            attendance: "उपस्थिति",
            present: "उपस्थित",
            absent: "अनुपस्थित",
            messagesSent: "भेजे गए संदेश",
            messagesReceived: "प्राप्त संदेश",
            from: "से",
            to: "को",
            message: "संदेश",
            date: "तारीख",
            noMessages: "कोई संदेश नहीं मिला",
            loading: "लोड हो रहा है...",
            error: "कुछ गलत हो गया। कृपया पुनः प्रयास करें।"
        },
        marathi: {
            dashboard: "मुख्यपृष्ठ",
            students: "विद्यार्थी",
            academics: "शिक्षण",
            medical: "आरोग्य",
            repairs: "दुरुस्ती",
            inventory: "सामान",
            events: "मजेदार कार्यक्रम",
            reports: "प्रगती",
            settings: "नियंत्रणे",
            totalUsers: "एकूण वापरकर्ते",
            computers: "संगणक",
            tasks: "कामे",
            healthCheckUps: "आरोग्य तपासणी",
            repairJobs: "दुरुस्ती कामे",
            learning: "शिकणे",
            whatWeLearning: "आपण काय शिकत आहोत",
            studentsHealth: "विद्यार्थ्यांचे आरोग्य",
            allHealthy: "सर्व निरोगी!",
            noStudents: "कोणतेही विद्यार्थी सापडले नाहीत",
            sendMessage: "संदेश पाठवा",
            selectRecipient: "प्राप्तकर्ता निवडा",
            typeMessage: "आपला संदेश येथे टाइप करा...",
            send: "पाठवा",
            attendance: "उपस्थिती",
            present: "उपस्थित",
            absent: "अनुपस्थित",
            messagesSent: "पाठवलेले संदेश",
            messagesReceived: "प्राप्त संदेश",
            from: "कडून",
            to: "प्रति",
            message: "संदेश",
            date: "तारीख",
            noMessages: "कोणतेही संदेश सापडले नाहीत",
            loading: "लोड होत आहे...",
            error: "काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा."
        }
    };

    const t = translations[language];

    const scrollableMenuStyle = {
        display: "flex",
        overflowX: "auto",
        gap: "10px",
        padding: "5px 0",
        msOverflowStyle: "none",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        scrollbarColor: "transparent transparent"
    };

    // Routes with emojis
    const routes = [
        { id: 'dashboard', name: `🏠 ${t.dashboard}` },
        { id: 'students', name: `👧👦 ${t.students}` },
        { id: 'academics', name: `📝 ${t.academics}` },
        { id: 'medical', name: `🩺 ${t.medical}` },
        { id: 'repairs', name: `🔧 ${t.repairs}` },
        { id: 'messages', name: `💬 Messages` },
        { id: 'reports', name: `📊 ${t.reports}` },
        { id: 'settings', name: `⚙️ ${t.settings}` }
    ];

    // Sample notifications
    const notifications = [
        { id: 1, title: 'Tooth Check Time!', message: 'Abhilasha has a tooth check on 25 Mar', time: '2 hours ago', read: false },
        { id: 2, title: 'Hooray! Task Done!', message: 'Computer Fun task is all done!', time: '3 hours ago', read: false },
        { id: 3, title: 'New Math Puzzle!', message: 'New Math Puzzle for Group A friends', time: '5 hours ago', read: true },
        { id: 4, title: 'Fix-it Alert!', message: 'Big Fan will be fixed tomorrow', time: '1 day ago', read: true },
        { id: 5, title: 'Website Update', message: 'This page will get even better tonight!', time: '1 day ago', read: true }
    ];

    // Progress data for chart
    const progressData = {
        'Talking English': 45.5,
        'Life Skills': 18.2,
        'Arts & Crafts': 9.1,
        'Cartoons & Fun': 9.1,
        'Other Cool Skills': 18.1
    };

    // API Calls
    const getBalagruhaList = async () => {
        try {
            setLoading(true);
            const response = await getBalagruha(JSON.stringify());

            setBalagruhas(response?.data?.balagruhas || []);

            // If there are balagruhas, select the first one by default
            if (response?.data?.balagruhas && response.data.balagruhas.length > 0) {
                setSelectedBalagruha(response.data.balagruhas[0]._id);
                getStudentListBasedonDate(response.data.balagruhas[0]._id);
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching balagruha list:', error);
            setError('Failed to load balagruhas');
            setLoading(false);
        }
    };

    const getMachinesData = async () => {
        try {
            const response = await getMachines();

            setMachines(response.data.machines || []);
        } catch (error) {
            console.error('Error fetching machines data:', error);
        }
    };

    const getTasksList = async (balagruhaId) => {
        if (!balagruhaId) return;

        let data = {
            balagruhaId: balagruhaId
        };

        try {
            const response = await getTasks(JSON.stringify(data));

            setTasks(response?.data?.tasks || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    const getUsersList = async () => {
        try {
            const response = await fetchUsers();

            const userList = response?.data || [];
            setUsers(userList);
            const coachUsers = userList.filter(user => user.role === "coach");
            setCoaches(coachUsers);
            const adminUsers = userList.filter(user => user.role === "admin");
            setAdmins(adminUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const getStudentListBasedonDate = async (id) => {
        if (!id) return;

        try {
            const response = await getStudentListforAttendance(id, new Date());

            setStudents(response?.data?.studentList || []);
        } catch (error) {
            console.error('Error fetching student list:', error);
        }
    };

    const getAttendanceData = async (balagruhaId) => {
        if (!balagruhaId) return;

        try {
            const response = await getStudentListforAttendance(balagruhaId);

            setAttendance(response?.data || []);
        } catch (error) {
            console.error('Error fetching attendance data:', error);
        }
    };

    const getPerformanceData = async (balagruhaId) => {
        if (!balagruhaId) return;

        setPerformanceReports([])
        // try {
        //     const response = await getPerformanceReports(balagruhaId);
        //     
        //     setPerformanceReports(response?.data || []);
        // } catch (error) {
        //     console.error('Error fetching performance data:', error);
        // }
    };

    const getMessagesData = async () => {
        setMessages([])
        // try {
        //     const response = await getMessages();
        //     
        //     setMessages(response?.data || []);
        // } catch (error) {
        //     console.error('Error fetching messages:', error);
        // }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !messageRecipient) return;

        // try {
        //     const messageData = {
        //         recipientId: messageRecipient,
        //         message: newMessage
        //     };

        //     await sendMessage(JSON.stringify(messageData));
        //     setNewMessage('');
        //     getMessagesData();

        //     setShowAnimation(true);
        //     setTimeout(() => setShowAnimation(false), 1000);
        // } catch (error) {
        //     console.error('Error sending message:', error);
        // }
    };

    useEffect(() => {
        getBalagruhaList();
        getUsersList();
        getMachinesData();
        getMessagesData();
    }, []);

    useEffect(() => {
        if (selectedBalagruha) {
            getStudentListBasedonDate(selectedBalagruha);
            getTasksList(selectedBalagruha);
            getAttendanceData(selectedBalagruha);
            getPerformanceData(selectedBalagruha);
        }
    }, [selectedBalagruha]);

    // Handle card click
    const handleCardClick = (cardId) => {
        setSelectedCard(cardId === selectedCard ? null : cardId);
        // Play a fun animation when card is clicked
        setShowAnimation(true);
        setTimeout(() => setShowAnimation(false), 1000);
    };

    // Handle notification toggle
    const handleNotificationToggle = () => {
        setShowNotifications(!showNotifications);
    };

    // Handle route change
    const handleRouteChange = (routeId) => {
        setActiveRoute(routeId);
    };

    // Handle language change
    const handleLanguageChange = (lang) => {
        setLanguage(lang);
    };

    // Generate overview cards based on API data
    const generateOverviewCards = () => {
        return [
            {
                id: 'total-users',
                title: t.totalUsers,
                value: students.length || '0',
                icon: '👧👦',
                color: '#FFB6C1'
            },
            {
                id: 'machine-overview',
                title: t.computers,
                value: `${machines.filter(m => m.status === 'active').length || 0}/${machines.length || 0}`,
                icon: '🖥️',
                color: '#87CEFA'
            },
            {
                id: 'task-overview',
                title: t.tasks,
                value: `${tasks.filter(task => task.status === 'completed').length || 0}/${tasks.length || 0}`,
                icon: '✏️',
                color: '#98FB98'
            },
            {
                id: 'medical-overview',
                title: t.healthCheckUps,
                value: students.filter(student =>
                    student.medicalIssues && student.medicalIssues.length > 0
                ).length || '0',
                icon: '🩺',
                color: '#FFA07A'
            },
            {
                id: 'repairs',
                title: t.repairJobs,
                value: machines.filter(m => m.status === 'maintainence').length || '0',
                icon: '🔧',
                color: '#FFFFE0'
            },
            {
                id: 'subject-progress',
                title: t.learning,
                value: performanceReports.length > 0 ?
                    `${Math.round(performanceReports.reduce((acc, curr) => acc + curr.percentage, 0) / performanceReports.length)}%` :
                    '0%',
                icon: '📚',
                color: '#E6E6FA'
            }
        ];
    };

    // Generate table data based on selected card and API data
    const generateTableData = () => {
        const tableData = {
            'total-users': {
                headers: ['Name', 'Role', 'Status', 'Last Seen'],
                rows: students.map(student => [
                    student.name,
                    'Student',
                    student.status || 'Active',
                    new Date(student.updatedAt).toLocaleString()
                ])
            },
            'machine-overview': {
                headers: ['Computer Name', 'Type', 'Status', 'Last Fixed'],
                rows: machines.map(machine => [
                    machine.name || `Computer-${machine._id.substring(0, 5)}`,
                    machine.type || 'Desktop',
                    machine.status || 'Unknown',
                    machine.lastMaintenance ? new Date(machine.lastMaintenance).toLocaleDateString() : 'N/A'
                ])
            },
            'task-overview': {
                headers: ['Task', 'Assigned To', 'Deadline', 'Status'],
                rows: tasks.map(task => [
                    task.title,
                    users.find(u => u._id === task.assignedUser)?.name || 'Unassigned',
                    task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline',
                    task.status
                ])
            },
            'medical-overview': {
                headers: ['Student', 'Issue', 'Treatment', 'Status'],
                rows: students
                    .filter(student => student.medicalIssues && student.medicalIssues.length > 0)
                    .flatMap(student =>
                        student.medicalIssues.map(issue => [
                            student.name,
                            issue.name || 'General Checkup',
                            issue.treatment || 'Pending',
                            issue.status || 'Ongoing'
                        ])
                    )
            },
            'repairs': {
                headers: ['Item', 'Problem', 'Status', 'Reported Date'],
                rows: machines
                    .filter(machine => machine.status === 'maintainence')
                    .map(machine => [
                        machine.name || `Computer-${machine._id.substring(0, 5)}`,
                        machine.issue || 'Maintenance required',
                        machine.repairStatus || 'Pending',
                        machine.reportedDate ? new Date(machine.reportedDate).toLocaleDateString() : 'N/A'
                    ])
            },
            'subject-progress': {
                headers: ['Subject', 'Average Score', 'Highest Score', 'Improvement'],
                rows: performanceReports.length > 0 ?
                    performanceReports.map(report => [
                        report.subject,
                        `${report.averageScore || 0}%`,
                        `${report.highestScore || 0}%`,
                        `${report.improvement || 0}%`
                    ]) :
                    [['No data available', '', '', '']]
            }
        };

        return tableData[selectedCard] || { headers: [], rows: [] };
    };

    // If loading, show loading indicator
    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-animation">
                    <div className="loading-circle"></div>
                    <div className="loading-circle"></div>
                    <div className="loading-circle"></div>
                </div>
                <div className="loading-text">{t.loading}</div>
            </div>
        );
    }

    // If error, show error message
    if (error) {
        return (
            <div className="error-container">
                <div className="error-icon">❌</div>
                <div className="error-message">{t.error}</div>
                <button className="retry-button" onClick={getBalagruhaList}>Retry</button>
            </div>
        );
    }

    const overviewCards = generateOverviewCards();
    const tableData = generateTableData();

    return (
        <div className="balagruha-dashboard">
            {/* Fun animation overlay */}
            {showAnimation && (
                <div className="fun-animation">
                    <div className="confetti-piece"></div>
                    <div className="confetti-piece"></div>
                    <div className="confetti-piece"></div>
                    <div className="confetti-piece"></div>
                    <div className="confetti-piece"></div>
                    <div className="confetti-piece"></div>
                    <div className="confetti-piece"></div>
                    <div className="confetti-piece"></div>
                    <div className="confetti-piece"></div>
                    <div className="confetti-piece"></div>
                </div>
            )}



            {/* Navigation Routes */}
            {/* Balagruha Selection (if multiple balagruhas) */}
            {balagruhas.length > 1 && (
                <div className="balagruha-selection">
                    <h3>Select Balagruha:</h3>
                    <div className="balagruha-list">
                        {balagruhas.map(bal => (
                            <div
                                key={bal._id}
                                className={`balagruha-item ${selectedBalagruha === bal._id ? 'selected' : ''}`}
                                onClick={() => setSelectedBalagruha(bal._id)}
                            >
                                {bal.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="routes-container">
                <div className="routes-scroll">
                    {routes.map(route => (
                        <div
                            key={route.id}
                            className={`route-item ${activeRoute === route.id ? 'active' : ''}`}
                            onClick={() => handleRouteChange(route.id)}
                        >
                            {route.name}
                        </div>
                    ))}
                </div>
            </div>



            {/* Main Content based on active route */}
            {activeRoute === 'dashboard' && (
                <div className="dashboard-content">
                    <div className="content-left">
                        {/* Progress Chart */}
                        <div className="progress-chart-container">
                            <h2 className="chart-title">{t.whatWeLearning}</h2>
                            <div className="progress-chart">
                                <div className="donut-chart">
                                    <div className="donut-hole"></div>
                                    <div className="donut-segment" style={{ transform: 'rotate(0deg)', backgroundColor: '#FF9999', clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%)' }}></div>
                                    <div className="donut-segment" style={{ transform: 'rotate(160deg)', backgroundColor: '#9999FF', clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%)' }}></div>
                                    <div className="donut-segment" style={{ transform: 'rotate(225deg)', backgroundColor: '#99FF99', clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 25%)' }}></div>
                                    <div className="donut-segment" style={{ transform: 'rotate(260deg)', backgroundColor: '#FFFF99', clipPath: 'polygon(50% 50%, 50% 0%, 75% 0%, 75% 25%)' }}></div>
                                </div>
                                <div className="chart-legend">
                                    {Object.entries(progressData).map(([key, value], index) => (
                                        <div key={index} className="legend-item">
                                            <div className="legend-color" style={{ backgroundColor: index === 0 ? '#FF9999' : index === 1 ? '#9999FF' : index === 2 ? '#99FF99' : index === 3 ? '#FFFF99' : '#FF99FF' }}></div>
                                            <div className="legend-text">
                                                <div>{key}</div>
                                                <div>{value}%</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="content-right">
                        {/* Overview Cards */}
                        <div className="cards-container">
                            {overviewCards.map(card => (
                                <div
                                    key={card.id}
                                    className={`overview-card ${selectedCard === card.id ? 'selected' : ''}`}
                                    style={{ backgroundColor: card.color }}
                                    onClick={() => handleCardClick(card.id)}
                                >
                                    <div className="card-icon">{card.icon}</div>
                                    <div className="card-content">
                                        <h3>{card.title}</h3>
                                        <div className="card-value">{card.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Table Display */}
                        {selectedCard && (
                            <div className="table-container">
                                <h2>{overviewCards.find(card => card.id === selectedCard)?.title} Details</h2>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            {tableData.headers.map((header, index) => (
                                                <th key={index}>{header}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableData.rows.length > 0 ? (
                                            tableData.rows.map((row, rowIndex) => (
                                                <tr key={rowIndex}>
                                                    {row.map((cell, cellIndex) => (
                                                        <td key={cellIndex}>{cell}</td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={tableData.headers.length} className="no-data">
                                                    No data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Children List with Medical Issues */}
                        {!selectedCard && (
                            <div className="children-container">
                                <h2>{t.studentsHealth}</h2>
                                <div className="children-list">
                                    {students.length > 0 ? (
                                        students.map(student => (
                                            <div key={student._id} className="child-item">
                                                <div className="child-name">{student.name}</div>
                                                <div className="medical-issues">
                                                    {student.medicalIssues && student.medicalIssues.length > 0 ? (
                                                        student.medicalIssues.map((issue, index) => (
                                                            <span
                                                                key={index}
                                                                className="issue-tag"
                                                                style={{
                                                                    backgroundColor: issue.name?.includes('Tooth') ? '#FF9999' :
                                                                        issue.name?.includes('Skin') ? '#FFFF99' :
                                                                            issue.name?.includes('Blood') ? '#FFCC99' :
                                                                                issue.name?.includes('Hot') ? '#FF9999' : '#99FF99'
                                                                }}
                                                            >
                                                                {issue.name || 'Medical Issue'}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="no-issues">{t.allHealthy}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-students">{t.noStudents}</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Students Route */}
            {activeRoute === 'students' && (
                <div className="route-content">
                    <h2>Students</h2>
                    <div className="students-container">
                        {students.length > 0 ? (
                            <div className="students-grid">
                                {students.map(student => (
                                    <div key={student._id} className="student-card">
                                        <div className="student-avatar">
                                            {student.avatar || '👧👦'}
                                        </div>
                                        <div className="student-details">
                                            <h3>{student.name}</h3>
                                            <p>Age: {student.age || 'N/A'}</p>
                                            <p>Class: {student.class || 'N/A'}</p>
                                            <div className="student-status"
                                                style={{
                                                    backgroundColor:
                                                        student.attendance && student.attendance[0]?.status === 'Present' ? '#4CAF50' : '#FF5252'
                                                }}>
                                                {student.attendance && student.attendance[0]?.status || 'Unknown'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-data-message">{t.noStudents}</div>
                        )}
                    </div>
                </div>
            )}

            {/* Attendance Route */}
            {activeRoute === 'academics' && (
                <div className="route-content">
                    <h2>{t.attendance}</h2>
                    <div className="attendance-container">
                        <div className="attendance-date">
                            <h3>Date: {new Date().toLocaleDateString()}</h3>
                        </div>
                        <table className="data-table attendance-table">
                            <thead>
                                <tr>
                                    <th>Student Name</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.length > 0 ? (
                                    students.map(student => (
                                        <tr key={student._id}>
                                            <td>{student.name}</td>
                                            <td>
                                                <span className={`attendance-badge ${student.attendance && student.attendance[0]?.status?.toLowerCase() || 'unknown'
                                                    }`}>
                                                    {student.attendance && student.attendance[0]?.status || 'Unknown'}
                                                </span>
                                            </td>
                                            <td>{student.attendance && student.attendance[0]?.time || 'N/A'}</td>
                                            <td>{student.attendance && student.attendance[0]?.notes || 'No notes'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="no-data">No attendance data available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Medical Route */}
            {activeRoute === 'medical' && (
                <div className="route-content">
                    <h2>{t.medical}</h2>
                    <div className="medical-container">
                        <div className="medical-stats">
                            <div className="medical-stat-card">
                                <div className="stat-icon" style={{ backgroundColor: '#FF9999' }}>🩺</div>
                                <div className="stat-info">
                                    <div className="stat-value">
                                        {students.filter(s => s.medicalIssues && s.medicalIssues.length > 0).length}
                                    </div>
                                    <div className="stat-title">Students with Medical Issues</div>
                                </div>
                            </div>
                            <div className="medical-stat-card">
                                <div className="stat-icon" style={{ backgroundColor: '#99FF99' }}>✅</div>
                                <div className="stat-info">
                                    <div className="stat-value">
                                        {students.filter(s => !s.medicalIssues || s.medicalIssues.length === 0).length}
                                    </div>
                                    <div className="stat-title">Healthy Students</div>
                                </div>
                            </div>
                        </div>

                        <h3>Medical Issues</h3>
                        <table className="data-table medical-table">
                            <thead>
                                <tr>
                                    <th>Student Name</th>
                                    <th>Issue</th>
                                    <th>Treatment</th>
                                    <th>Status</th>
                                    <th>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.filter(s => s.medicalIssues && s.medicalIssues.length > 0).length > 0 ? (
                                    students
                                        .filter(s => s.medicalIssues && s.medicalIssues.length > 0)
                                        .flatMap(student =>
                                            student.medicalIssues.map((issue, index) => (
                                                <tr key={`${student._id}-${index}`}>
                                                    <td>{student.name}</td>
                                                    <td>{issue.name || 'Medical Issue'}</td>
                                                    <td>{issue.treatment || 'Pending'}</td>
                                                    <td>
                                                        <span className={`medical-status ${issue.status?.toLowerCase() || 'ongoing'}`}>
                                                            {issue.status || 'Ongoing'}
                                                        </span>
                                                    </td>
                                                    <td>{issue.updatedAt ? new Date(issue.updatedAt).toLocaleDateString() : 'N/A'}</td>
                                                </tr>
                                            ))
                                        )
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="no-data">No medical issues found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Messages Route */}
            {activeRoute === 'messages' && (
                <div className="route-content">
                    <h2>Messages</h2>
                    <div className="messages-container">
                        <div className="send-message-form">
                            <h3>{t.sendMessage}</h3>
                            <div className="form-group">
                                <label htmlFor="balagruha-msg-recipient">{t.selectRecipient}</label>
                                <select
                                    id="balagruha-msg-recipient"
                                    value={messageRecipient}
                                    onChange={(e) => setMessageRecipient(e.target.value)}
                                    className="recipient-select"
                                >
                                    <option value="">Select a recipient</option>
                                    <optgroup label="Admins">
                                        {admins.map(admin => (
                                            <option key={admin._id} value={admin._id}>{admin.name}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Coaches">
                                        {coaches.map(coach => (
                                            <option key={coach._id} value={coach._id}>{coach.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                            <div className="form-group">
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={t.typeMessage}
                                    className="message-textarea"
                                    rows="4"
                                ></textarea>
                            </div>
                            <button
                                className="send-message-btn"
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim() || !messageRecipient}
                            >
                                {t.send} 📨
                            </button>
                        </div>

                        <div className="messages-history">
                            <div className="messages-tabs">
                                <button className="message-tab active">All Messages</button>
                                <button className="message-tab">Sent</button>
                                <button className="message-tab">Received</button>
                            </div>

                            <table className="data-table messages-table">
                                <thead>
                                    <tr>
                                        <th>{t.from}</th>
                                        <th>{t.to}</th>
                                        <th>{t.message}</th>
                                        <th>{t.date}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {messages.length > 0 ? (
                                        messages.map((msg, index) => (
                                            <tr key={index} className={msg.read ? '' : 'unread-message'}>
                                                <td>{users.find(u => u._id === msg.senderId)?.name || 'Unknown'}</td>
                                                <td>{users.find(u => u._id === msg.recipientId)?.name || 'Unknown'}</td>
                                                <td className="message-content">{msg.message}</td>
                                                <td>{new Date(msg.createdAt).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="no-data">{t.noMessages}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Reports Route */}
            {activeRoute === 'reports' && (
                <div className="route-content">
                    <h2>{t.reports}</h2>
                    <div className="reports-container">
                        <div className="report-tabs">
                            <button className="report-tab active">Performance</button>
                            <button className="report-tab">Attendance</button>
                            <button className="report-tab">Activities</button>
                        </div>

                        <div className="report-content">
                            <h3>Student Performance</h3>
                            <table className="data-table performance-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Subject</th>
                                        <th>Score</th>
                                        <th>Progress</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {performanceReports.length > 0 ? (
                                        performanceReports.map((report, index) => (
                                            <tr key={index}>
                                                <td>{report.studentName}</td>
                                                <td>{report.subject}</td>
                                                <td>{report.score || '0'}%</td>
                                                <td>
                                                    <div className="progress-bar-bg">
                                                        <div
                                                            className="progress-bar-fill"
                                                            style={{
                                                                width: `${report.score || 0}%`,
                                                                backgroundColor: (report.score || 0) > 70 ? "#4caf50" :
                                                                    (report.score || 0) > 40 ? "#ff9800" : "#f44336"
                                                            }}
                                                        ></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="no-data">No performance data available</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BalagruhaDashboard;