import React, { useState, useEffect } from 'react';

/**
 * CancellationTimer Component - Sprint5-Story-10
 * Countdown timer showing remaining time to cancel order
 * Orders can be cancelled within 5 minutes of placement
 *
 * @param {Object} order - Order object with placedAt timestamp
 */

export default function CancellationTimer({ order }) {
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const orderTime = new Date(order.placedAt).getTime();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
      const expiryTime = orderTime + fiveMinutes;
      const now = Date.now();
      const remaining = expiryTime - now;

      if (remaining <= 0) {
        setTimeRemaining(null);
        return false; // Expired
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        return true; // Still time remaining
      }
    };

    // Calculate immediately
    const stillActive = calculateTimeRemaining();

    if (!stillActive) {
      return; // Don't start interval if already expired
    }

    // Update every second
    const interval = setInterval(() => {
      const stillActive = calculateTimeRemaining();
      if (!stillActive) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order.placedAt]);

  if (!timeRemaining) {
    return null;
  }

  return (
    <div className="mt-4 bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-orange-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-orange-800">
          <span className="font-bold">Time remaining to cancel:</span> {timeRemaining}
        </p>
      </div>
    </div>
  );
}
