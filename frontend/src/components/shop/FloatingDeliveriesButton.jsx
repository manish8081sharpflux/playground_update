import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCoachDeliveryStats } from '../../api';

/**
 * FloatingDeliveriesButton - Sprint5-Story-13
 * Floating action button for admins showing pending delivery count
 *
 * Features:
 * - Visible only to admins (removed from coaches - they use shop navigation instead)
 * - Shows real-time pending delivery count
 * - Pulses when there are pending deliveries
 * - Auto-refreshes every 30 seconds
 * - Navigates to /coach/deliveries on click
 */

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (error) {
    return {};
  }
};

export default function FloatingDeliveriesButton() {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is admin
  const user = getStoredUser();
  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.roleName;
  const isAdmin = userRole?.toLowerCase() === 'admin';

  // Fetch pending count
  const fetchPendingCount = async () => {
    try {
      const response = await getCoachDeliveryStats();
      if (response.success) {
        setPendingCount(response.pendingCount || 0);
      }
    } catch (err) {
      console.error('Error fetching pending delivery count:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    // Initial fetch
    fetchPendingCount();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);

    return () => clearInterval(interval);
  }, [isAdmin]);

  // Don't render if not an admin
  if (!isAdmin) return null;

  // Don't render during loading
  if (loading) return null;

  return (
    <button
      onClick={() => navigate('/coach/deliveries')}
      className={`fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-40 ${
        pendingCount > 0
          ? 'bg-purple-600 hover:bg-purple-700 animate-pulse'
          : 'bg-slate-600 hover:bg-slate-700'
      }`}
      title={`${pendingCount} pending ${pendingCount === 1 ? 'delivery' : 'deliveries'}`}
    >
      {/* Delivery Box Icon */}
      <svg
        className="w-7 h-7 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>

      {/* Badge Count */}
      {pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white shadow-md">
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
    </button>
  );
}
