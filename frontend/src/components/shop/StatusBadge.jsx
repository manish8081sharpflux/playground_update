import React from 'react';

/**
 * StatusBadge Component - Sprint5-Story-04
 * Displays order status with color coding
 *
 * @param {string} status - Order status (completed, cancelled, processing, pending)
 */

const statusConfig = {
  completed: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: '●',
    label: 'Completed'
  },
  cancelled: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: '✕',
    label: 'Cancelled'
  },
  processing: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: '◐',
    label: 'Processing'
  },
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: '○',
    label: 'Pending'
  },
  refunded: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    icon: '↩',
    label: 'Refunded'
  }
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`
        inline-flex items-center gap-1
        px-3 py-1 rounded-full
        text-xs font-bold
        ${config.bg}
        ${config.text}
      `}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
