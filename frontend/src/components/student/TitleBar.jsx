import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api';
import TransactionHistoryModal from './coins/TransactionHistoryModal';
import MilestoneCelebrationModal from './coins/MilestoneCelebrationModal';
import useMilestones from '../../hooks/useMilestones';
import { useAuth } from '../../contexts/AuthContext';
import { useCoinBalance } from '../../contexts/CoinBalanceContext';
import CartIcon from '../shop/CartIcon';
import Cart from '../shop/Cart';

/** Polling interval for notification badge and coin balance (in ms) */
const POLLING_INTERVAL_MS = 30000;

/**
 * TitleBar Component - Epic 01 Story 01 + Story 06
 * Persistent header for student pages showing:
 * - ISF Playground logo
 * - Real-time coin balance (clickable - opens transaction history modal)
 * - Notification bell with unread count
 * - Session timer (HH:MM:SS)
 * - Offline indicator
 * - Milestone celebrations (100, 500, 1000, 5000 coins)
 */
export default function TitleBar() {
  const { logout, user } = useAuth();

  // Coin balance from single source of truth (CoinBalanceContext)
  const { balance: coinBalance, loading: coinLoading, refreshBalance } = useCoinBalance();
  const coinBalanceDisplay = typeof coinBalance === 'number' ? coinBalance.toLocaleString() : '...';

  // State management
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionTime, setSessionTime] = useState(0); // seconds
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationRef = useRef(null);

  // Milestone detection hook (Epic 01 Story 06 - Phase 3)
  const { celebrationMilestone, closeCelebration } = useMilestones(coinBalance ?? 0);

  // Format session time as HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Fetch unread notification count for the authenticated student
  const fetchNotificationCount = async () => {
    if (!user?.id) return;

    try {
      const response = await api.get('/api/notifications/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.data?.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };


  const fetchNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const response = await api.get('/api/notifications', { params: { limit: 20, skip: 0 } });
      const data = response.data?.data || response.data?.notifications || [];
      setNotificationsList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotificationsList([]);
    } finally {
      setNotificationsLoading(false);
    }
  };
  // Initialize session timer from localStorage
  const initSessionTimer = () => {
    const today = new Date().toDateString();
    const lastResetDate = localStorage.getItem('sessionResetDate');

    // Reset timer if it's a new day
    if (lastResetDate !== today) {
      localStorage.setItem('sessionResetDate', today);
      localStorage.setItem('sessionTime', '0');
      setSessionTime(0);
    } else {
      // Load saved session time
      const savedTime = localStorage.getItem('sessionTime');
      if (savedTime) {
        setSessionTime(parseInt(savedTime, 10));
      }
    }
  };

  // Handle online/offline events
  const handleOnline = () => {
    setIsOffline(false);
    refreshBalance();
    fetchNotificationCount();
  };

  const handleOffline = () => {
    setIsOffline(true);
  };

  // Handle notification bell click
  const handleNotificationClick = async () => {
    const nextOpen = !showNotifications;
    setShowNotifications(nextOpen);
    if (!nextOpen) return;

    try {
      await api.put('/api/notifications/mark-all-read');
      setUnreadCount(0);
      setNotificationsList([]);
      await fetchNotifications();
      await fetchNotificationCount();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      await fetchNotifications();
      await fetchNotificationCount();
    }
  };

  const handleNotificationItemClick = async (notificationId) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      await fetchNotifications();
      await fetchNotificationCount();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDeleteNotification = async (event, notificationId) => {
    event.stopPropagation();
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      setNotificationsList((prev) => prev.filter((notification) => notification._id !== notificationId));
      await fetchNotificationCount();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };
  // Effects
  useEffect(() => {
    // Initialize session timer
    initSessionTimer();

    // Fetch initial data (coin balance handled by CoinBalanceContext)
    fetchNotificationCount();
    setLoading(false);

    // Set up coin balance polling via context
    const coinInterval = setInterval(refreshBalance, POLLING_INTERVAL_MS);

    // Set up notification count polling
    const notificationInterval = setInterval(fetchNotificationCount, POLLING_INTERVAL_MS);

    // Set up session timer (every 1 second)
    const timerInterval = setInterval(() => {
      setSessionTime(prev => {
        const newTime = prev + 1;
        localStorage.setItem('sessionTime', String(newTime));
        return newTime;
      });
    }, 1000);

    // Offline/Online listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      clearInterval(coinInterval);
      clearInterval(notificationInterval);
      clearInterval(timerInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left: Logo and Title */}
          <div className="flex items-center gap-3">
            <Link to="/student/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 flex items-center justify-center bg-purple-600 rounded-lg text-white font-bold text-xl">
                I
              </div>
              <h1 className="text-xl font-bold text-gray-900 hidden md:block">
                ISF Playground
              </h1>
            </Link>
          </div>

          {/* Center: Navigation Menu */}
          <nav className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-full">
            <NavItem to="/student/dashboard" icon="🏠" label="Dashboard" />
            <NavItem to="/student/dashboard" icon="📚" label="My Courses" />
            <NavItem to="/shop" icon="🛒" label="Shop" />
            <NavItem to="/wtf" icon="🏆" label="WTF" />
          </nav>

          {/* Right: Coin Balance, Notifications, Session Timer */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Coin Balance - Epic 01 Story 06: Clickable, opens transaction history modal */}
            <button
              onClick={() => setShowTransactionModal(true)}
              className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full border-2 border-yellow-300 hover:bg-yellow-200 transition-colors cursor-pointer"
              aria-label="View coin balance and transaction history"
            >
              <span className="text-2xl">💰</span>
              <span className="font-bold text-xl text-gray-900">
                {coinLoading ? '...' : coinBalanceDisplay}
              </span>
              {isOffline && (
                <span className="text-xs text-gray-600 ml-1">(Offline)</span>
              )}
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={handleNotificationClick}
                className="relative hover:bg-gray-100 p-2 rounded-full transition-colors"
                aria-label="Notifications"
                aria-expanded={showNotifications}
              >
                <span className="text-2xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 z-[70] w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-500 hover:text-gray-800 text-lg leading-none"
                      aria-label="Close notifications"
                    >
                      x
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="px-4 py-6 text-sm text-gray-500 text-center">Loading notifications...</div>
                    ) : notificationsList.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-gray-500 text-center">No notifications</div>
                    ) : (
                      notificationsList.map((notification) => (
                        <div
                          key={notification._id}
                          className={`group flex items-start gap-2 border-b border-gray-100 hover:bg-purple-50 transition-colors ${!notification.isRead ? 'bg-purple-50/70' : 'bg-white'}`}
                        >
                          <button
                            type="button"
                            onClick={() => handleNotificationItemClick(notification._id)}
                            className="flex-1 text-left px-4 py-3 pr-1"
                          >
                            <div className="text-sm font-semibold text-gray-900">{notification.title}</div>
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</div>
                            <div className="text-[11px] text-gray-400 mt-2">
                              {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={(event) => handleDeleteNotification(event, notification._id)}
                            className="mt-2 mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-700"
                            aria-label="Delete notification"
                            title="Delete notification"
                          >
                            x
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cart Icon */}
            <CartIcon />

            {/* Session Timer */}
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-xl">⏱️</span>
              <span className="font-medium text-base hidden sm:block">
                {formatTime(sessionTime)}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-medium transition-colors"
              aria-label="Logout"
            >
              <span className="text-lg">🚪</span>
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-yellow-200 border-b border-yellow-300 px-6 py-2 text-center sticky top-[72px] z-40">
          <span className="text-sm font-medium text-gray-800">
            ⚠️ You are offline. Some features may not work.
          </span>
        </div>
      )}

      {/* Transaction History Modal - Epic 01 Story 06 - Phase 1 */}
      <TransactionHistoryModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        currentBalance={coinBalance}
      />

      {/* Shopping Cart Drawer */}
      <Cart />

      {/* Milestone Celebration Modal - Epic 01 Story 06 - Phase 3 */}
      <MilestoneCelebrationModal
        milestone={celebrationMilestone}
        onClose={closeCelebration}
      />
    </>
  );
}

/**
 * Helper component for navigation items
 */
function NavItem({ to, icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <Link
      to={to}
      className={`
        flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all
        ${isActive
          ? 'bg-white text-purple-700 shadow-sm ring-1 ring-gray-200'
          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}
      `}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}












