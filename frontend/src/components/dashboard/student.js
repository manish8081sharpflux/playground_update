import React, { useState, useEffect, useRef } from 'react';
import './style.css';
import { createMood } from '../../api';
import showToast from '../../utils/toast';
import { useAuth } from '../../contexts/AuthContext';

function StudentDashboard() {
    const { logout } = useAuth();
    const [mood, setMood] = useState("happy");
    const [moodMessage, setMoodMessage] = useState("I'm feeling happy today!");
    const [sessionTime, setSessionTime] = useState(30 * 60); // Start from 0 seconds
    const [isTimerRunning, setIsTimerRunning] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("Spoken English");
    const [coins, setCoins] = useState(50);
    const [notifications, setNotifications] = useState(1);
    const [showChatWindow, setShowChatWindow] = useState(null); // null, "coach", or "admin"
    const [showNotifications, setShowNotifications] = useState(false);
    const [chatMessages, setChatMessages] = useState({
        coach: [
            { sender: "person", message: "Hello! How is your day going?", time: "10:30 AM" },
            { sender: "me", message: "I'm doing great! Just finished my English lesson.", time: "10:32 AM" },
            { sender: "person", message: "That's wonderful! Did you practice the new words?", time: "10:33 AM" },
            { sender: "person", message: "Don't forget we have a group activity tomorrow!", time: "10:34 AM" },
            { sender: "person", message: "Let me know if you need any help with your homework.", time: "10:35 AM" },
            { sender: "person", message: "You're making great progress!", time: "10:40 AM" },
            { sender: "person", message: "Keep up the good work!", time: "10:45 AM" },
        ],
        admin: [
            { sender: "person", message: "Hi Arjun! Your progress report is ready.", time: "9:15 AM" },
            { sender: "me", message: "Thank you! Can I see it?", time: "9:20 AM" },
            { sender: "person", message: "Yes, you've earned 50 ISF coins this week!", time: "9:22 AM" },
            { sender: "person", message: "You can use them in the ISF shop.", time: "9:23 AM" },
            { sender: "person", message: "Your parents will be very proud of your progress.", time: "9:25 AM" },
            { sender: "person", message: "Keep learning and having fun!", time: "9:30 AM" },
            { sender: "person", message: "Let me know if you need anything else.", time: "9:35 AM" },
        ]
    });

    // Notification data
    const notificationsList = [
        { id: 1, title: "New Lesson Available", message: "Check out the new English lesson!", time: "1 hour ago" },
        { id: 2, title: "Homework Reminder", message: "Don't forget to complete your homework", time: "3 hours ago" },
        { id: 3, title: "Achievement Unlocked", message: "You've earned the 'Fast Learner' badge!", time: "Yesterday" },
        { id: 4, title: "Coach Message", message: "Your coach sent you a new message", time: "Yesterday" },
        { id: 5, title: "ISF Shop Update", message: "New items available in the ISF shop", time: "2 days ago" },
    ];

    // Timer formatting
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
    };

    // Timer effect - modified to count up instead of down
    // useEffect(() => {
    //     if (sessionTime <= 0) return; // Stop countdown at 0

    //     const interval = setInterval(() => {
    //       setSessionTime((prev) => prev - 1);
    //     }, 1000);

    //     return () => clearInterval(interval);
    // }, [sessionTime]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSessionTime((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval); // Clean up on unmount
    }, []);

    // Categories
    const categories = [
        { id: 1, name: "Schedule", color: "#ffccbc" },
        { id: 2, name: "Medical", color: "#ffccbc" },
        { id: 3, name: "Spoken English", color: "#b3c6ff" },
        { id: 4, name: "Educational Games", color: "#ffccbc" },
        { id: 5, name: "Cartoon & Animation", color: "#ffccbc" },
        { id: 6, name: "Image & Video Editing", color: "#ffccbc" },
        { id: 7, name: "Artweaver", color: "#ffccbc" },
    ];

    // Lessons
    const lessons = [
        { id: 1, name: "Actions Songs", color: "#8BC34A" },
        { id: 2, name: "God made the blue", color: "#FDD835" },
        { id: 3, name: "Ten Tiny Fingers", color: "#4CAF50" },
        { id: 4, name: "When you are happy", color: "#4CAF50" },
        { id: 5, name: "Hop a little", color: "#FF7043" },
        { id: 6, name: "Scenes", color: "#B3C6FF" },
        { id: 7, name: "Scene 1", color: "#8BC34A" },
        { id: 8, name: "Scene 2", color: "#FF7043" },
        { id: 9, name: "Scene 3", color: "#FDD835" },
        { id: 10, name: "Scene 4", color: "#FDD835" },
        { id: 11, name: "2 Min Balgruha Stories", color: "#B3C6FF" },
        { id: 12, name: "Dogs are Loving", color: "#8BC34A" },
        { id: 13, name: "Who took my sharperner", color: "#FF7043" },
        { id: 14, name: "Art Stories", color: "#B3C6FF" },
        { id: 15, name: "Wise Old Owl", color: "#FDD835" },
    ];

    // Mood options
    const moodOptions = [
        { id: "happy", emoji: "😁", alt: "Happy", message: "I'm feeling happy today!" },
        { id: "sad", emoji: "😢", alt: "Sad", message: "I'm feeling a bit sad..." },
        { id: "afraid", emoji: "😨", alt: "Afraid", message: "I'm feeling scared or anxious right now." },
        { id: "angry", emoji: "😠", alt: "Angry", message: "I'm feeling really upset and frustrated." },
        { id: "unwell", emoji: "🤒", alt: "Unwell", message: "I'm not feeling well today." },
    ];

    // Chat contacts
    const chatContacts = [
        // { id: 1, name: "Coach Chat", image: "https://placehold.co/60x60", notifications: 7 },
        { id: 2, name: "Chat", image: "https://placehold.co/60x60", notifications: 7 },
    ];

    // Handle mood selection
    const handleMoodSelect = async (moodId) => {

        alert("Mood clicked: " + moodId);
        const user =
            JSON.parse(localStorage.getItem("user")) ||
            JSON.parse(localStorage.getItem("currentUser")) ||
            JSON.parse(localStorage.getItem("authUser"));

        console.log("Logged user:", user);

        const userId = user?._id || user?.id;

        if (!userId) {
            showToast("User ID not found. Please login again.", "error");
            return;
        }

        const payload = {
            userId: userId,
            mood: moodId,
            date: new Date().toISOString(),
            notes: ""
        };

        console.log("Mood Payload:", payload);

        const response = await createMood(payload);
        console.log("Mood Save Response:", response);

        if (response?.success) {
            showToast("Today's mood updated successfully", "success");
        } else {
            showToast(response?.message || "Mood not saved", "error");
        }

        setMood(moodId);
        const selectedMood = moodOptions.find(m => m.id === moodId);
        setMoodMessage(selectedMood.message);
    };
    // Handle chat contact click
    const handleChatClick = (contactType) => {
        setShowChatWindow(contactType);
    };

    // Toggle notifications panel
    const handleNotificationClick = () => {
        setShowNotifications(!showNotifications);
    };

    // Handle logout
    const handleLogout = () => {
        logout();
    };

    // Send a new chat message
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

    // Chat window component
    const ChatWindow = ({ type, onClose }) => {
        const [newMessage, setNewMessage] = useState("");
        const messagesEndRef = useRef(null);

        const scrollToBottom = () => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            }
        };

        useEffect(() => {
            // Only scroll on mount and when new messages are added
            const timeoutId = setTimeout(() => {
                scrollToBottom();
            }, 100);
            return () => clearTimeout(timeoutId);
        }, [chatMessages[type].length]);

        return (
            <div className="chat-window">
                {/* Chat header */}
                <div className="chat-header">
                    <div className="chat-header-user">
                        <div className="chat-avatar">
                            <img
                                src="https://placehold.co/30x30"
                                alt={type === "coach" ? "Coach" : "Admin"}
                            />
                        </div>
                        <span>{type === "coach" ? "Chat" : "Chat"}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="chat-close-btn"
                    >
                        ✖
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
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
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
                        ➤
                    </button>
                </div>
            </div>
        );
    };

    // Notifications panel component
    const NotificationsPanel = () => {
        return (
            <div className="notifications-panel">
                <div className="notifications-header">
                    <h3>Notifications</h3>
                    <button onClick={() => setShowNotifications(false)}>✖</button>
                </div>
                <div className="notifications-list">
                    {notificationsList.map(notification => (
                        <div key={notification.id} className="notification-item">
                            <div className="notification-title">{notification.title}</div>
                            <div className="notification-message">{notification.message}</div>
                            <div className="notification-time">{notification.time}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="student-dashboard">
            {/* Header */}
            <div className="header">
                {/* User greeting */}
                {/* <div className="user-greeting">
                    <h2>Hi Arjun,</h2>
                    <div className="user-avatar">A</div>
                </div> */}

                {/* Session timer - now counting up */}


                {/* Coins and notifications */}
                <div className="user-stats">
                    <div className="coins">
                        <span className="coins-label">ISF COINS<br />EARNED</span>
                        <div className="coins-circle">{coins}</div>
                    </div>

                    <div className="notifications-container">
                        <div className="notification-bell" onClick={handleNotificationClick}>
                            🔔
                            {notifications > 0 && (
                                <span className="notification-badge">{notifications}</span>
                            )}
                        </div>
                        {showNotifications && <NotificationsPanel />}
                    </div>

                    <button className="logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content">

                {/* Left Panel - Mood and Chat */}
                <div className="left-panel">
                    {/* Mood selector */}
                    <div className="session-timer">
                        <span className="timer-text">{formatTime(sessionTime)}</span>
                        <span className="timer-label">Session timer</span>
                    </div>
                    <div className="mood-selector">
                        <h2>How are you? test</h2>
                        <div className="mood-options">
                            {moodOptions.map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        alert("Mood clicked: " + option.id);
                                        handleMoodSelect(option.id);
                                    }}
                                    className={`mood-emoji ${mood === option.id ? 'selected' : ''}`}
                                    title={option.alt}
                                >
                                    {option.emoji}
                                </button>
                            ))}
                        </div>
                        <div
                            id="mood-message"
                            className="mood-message"
                        >
                            {moodMessage}
                        </div>
                    </div>

                    {/* Chat section */}
                    <div className="chat-section">
                        <div className="chat-contacts">
                            {chatContacts.map(contact => (
                                <div
                                    key={contact.id}
                                    className="chat-contact"
                                    onClick={() => handleChatClick(contact.id === 1 ? "coach" : "admin")}
                                >
                                    <div className="contact-avatar-container">
                                        <div className="contact-avatar">
                                            <img
                                                src={contact.image}
                                                alt={contact.name}
                                            />
                                        </div>
                                        {contact.notifications > 0 && (
                                            <span className="contact-badge">
                                                {contact.notifications}
                                            </span>
                                        )}
                                    </div>
                                    <div className="contact-name">
                                        {contact.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Study and Shop */}
                    <div className="study-shop-section">
                        <div className="action-buttons">
                            <button className="action-btn homework-btn">
                                Homework
                            </button>

                            <button className="action-btn shop-btn">
                                ISF Shop
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Categories and Lessons */}
                <div className="right-panel">
                    {/* Categories */}
                    <div className="categories">
                        {categories.map(category => (
                            <div
                                key={category.id}
                                onClick={() => setSelectedCategory(category.name)}
                                className={`category-item ${selectedCategory === category.name ? 'selected' : ''}`}
                                style={{ backgroundColor: selectedCategory === category.name ? "#b3c6ff" : category.color }}
                            >
                                {category.name}
                            </div>
                        ))}
                    </div>

                    {/* Lessons */}
                    <div className="lessons">
                        {lessons.map(lesson => (
                            <div
                                key={lesson.id}
                                className="lesson-item"
                                style={{ backgroundColor: lesson.color }}
                            >
                                {lesson.name}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat windows */}
                {showChatWindow === "coach" && (
                    <ChatWindow
                        type="coach"
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

export default StudentDashboard;