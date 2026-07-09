import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function DeactivateConfirmModal({ machine, onClose, onConfirm }) {
  const [submitting, setSubmitting] = useState(false);

  const confirmButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management: focus the confirm button on mount
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    if (confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
    return () => {
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(machine._id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deactivate-machine-title"
    >
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" aria-hidden="true" />
            <h2 id="deactivate-machine-title" className="text-xl font-bold text-slate-900">
              Confirm Deactivation
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={submitting}
            aria-label="Close confirmation dialog"
          >
            <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-slate-700 mb-4">
            Are you sure you want to deactivate this machine? The machine will be marked as
            inactive and will no longer be available for use.
          </p>

          {/* Machine info */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-1 mb-6">
            <p className="text-sm text-slate-600">
              <span className="font-medium">Machine ID:</span> {machine.machineId}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-medium">Serial Number:</span> {machine.serialNumber}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-medium">MAC Address:</span> {machine.macAddress}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              aria-label="Confirm deactivation of machine"
            >
              {submitting ? 'Deactivating...' : 'Deactivate Machine'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
