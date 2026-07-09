export const PurchaseRequestStatuses = {
  // Story 2.1 strict lifecycle
  PENDING: 'pending',
  ORDERED: 'ordered',
  DELIVERED_STORE: 'delivered_store',
  DELIVERED_BALAGRUHA: 'delivered_balagruha',
  ON_HOLD: 'on_hold',

  // Legacy / approval workflow
  PENDING_APPROVAL: 'pending_approval',
  PENDING_FULFILLMENT: 'pending_fulfillment',
  APPROVED: 'approved',
  FULFILLED: 'fulfilled',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const PurchaseRequestStatusMeta = {
  [PurchaseRequestStatuses.PENDING]: {
    icon: '🟠',
    label: 'Pending',
    className: 'status-pending',
    tooltip: 'Awaiting purchase manager action'
  },
  [PurchaseRequestStatuses.ORDERED]: {
    icon: '🛒',
    label: 'Ordered',
    className: 'status-ordered',
    tooltip: 'Order placed with vendor'
  },
  [PurchaseRequestStatuses.DELIVERED_STORE]: {
    icon: '📦',
    label: 'Delivered to Store',
    className: 'status-delivered-store',
    tooltip: 'Received into store'
  },
  [PurchaseRequestStatuses.DELIVERED_BALAGRUHA]: {
    icon: '🏠',
    label: 'Delivered to Balagruha',
    className: 'status-delivered-balagruha',
    tooltip: 'Delivered to requester/balagruha'
  },
  [PurchaseRequestStatuses.ON_HOLD]: {
    icon: '⏸️',
    label: 'On Hold',
    className: 'status-on-hold',
    tooltip: 'Request on hold'
  },
  [PurchaseRequestStatuses.PENDING_APPROVAL]: {
    icon: '🔴',
    label: 'Pending Approval',
    className: 'status-pending-approval',
    tooltip: 'Requires admin approval'
  },
  [PurchaseRequestStatuses.PENDING_FULFILLMENT]: {
    icon: '🟡',
    label: 'Pending Fulfillment',
    className: 'status-pending-fulfillment',
    tooltip: 'Ready for purchase manager to fulfill'
  },
  [PurchaseRequestStatuses.APPROVED]: {
    icon: '🔵',
    label: 'Approved',
    className: 'status-approved',
    tooltip: 'Approved by admin, awaiting fulfillment'
  },
  [PurchaseRequestStatuses.FULFILLED]: {
    icon: '✅',
    label: 'Fulfilled',
    className: 'status-fulfilled',
    tooltip: 'Purchase completed'
  },
  [PurchaseRequestStatuses.REJECTED]: {
    icon: '❌',
    label: 'Rejected',
    className: 'status-rejected',
    tooltip: 'Request was rejected'
  },
  [PurchaseRequestStatuses.COMPLETED]: {
    icon: '✅',
    label: 'Completed',
    className: 'status-completed',
    tooltip: 'Request completed'
  },
  [PurchaseRequestStatuses.CANCELLED]: {
    icon: '⚫',
    label: 'Cancelled',
    className: 'status-cancelled',
    tooltip: 'Request cancelled'
  }
};

export const getPurchaseRequestStatusMeta = (status) => {
  return (
    PurchaseRequestStatusMeta?.[status] || {
      icon: 'ℹ️',
      label: status,
      className: 'status-pending',
      tooltip: status
    }
  );
};

export const PurchaseRequestStatusFilterOptions = [
  PurchaseRequestStatuses.PENDING,
  PurchaseRequestStatuses.ORDERED,
  PurchaseRequestStatuses.DELIVERED_STORE,
  PurchaseRequestStatuses.DELIVERED_BALAGRUHA,
  PurchaseRequestStatuses.ON_HOLD,
  PurchaseRequestStatuses.PENDING_APPROVAL,
  PurchaseRequestStatuses.PENDING_FULFILLMENT,
  PurchaseRequestStatuses.APPROVED,
  PurchaseRequestStatuses.FULFILLED,
  PurchaseRequestStatuses.REJECTED,
  PurchaseRequestStatuses.COMPLETED,
  PurchaseRequestStatuses.CANCELLED
].map((status) => ({
  value: status,
  label: getPurchaseRequestStatusMeta(status).label
}));
