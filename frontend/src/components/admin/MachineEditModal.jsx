import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function MachineEditModal({ machine, balagruhaOptions, onClose, onSubmit }) {
  const [selectedBalagruha, setSelectedBalagruha] = useState(
    typeof machine.assignedBalagruha === 'object'
      ? machine.assignedBalagruha?._id || ''
      : machine.assignedBalagruha || ''
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    if (selectRef.current) {
      selectRef.current.focus();
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedBalagruha) {
      setError('Please select a Balagruha');
      return;
    }

    // Determine current balagruha ID for comparison
    const currentId =
      typeof machine.assignedBalagruha === 'object'
        ? machine.assignedBalagruha?._id
        : machine.assignedBalagruha;

    // if (selectedBalagruha === currentId) {
    //   setError('Please select a different Balagruha to reassign');
    //   return;
    // }

    setSubmitting(true);
    setError('');
    try {
      await onSubmit(machine._id, selectedBalagruha);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-machine-title"
    >
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 id="edit-machine-title" className="text-xl font-bold text-slate-900">
            Edit Machine Assignment
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={submitting}
            aria-label="Close edit form"
          >
            <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Machine info (read-only) */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-1">
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

          {/* Balagruha Dropdown */}
          <div>
            <label
              htmlFor="edit-assignedBalagruha"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Assign to Balagruha <span className="text-red-500">*</span>
            </label>
            <select
              ref={selectRef}
              id="edit-assignedBalagruha"
              value={selectedBalagruha}
              onChange={(e) => {
                setSelectedBalagruha(e.target.value);
                if (error) setError('');
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                error ? 'border-red-500' : 'border-slate-300'
              }`}
              disabled={submitting}
              aria-label="Select Balagruha for reassignment"
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'edit-balagruha-error' : undefined}
            >
              <option value="">-- Select Balagruha --</option>
              {balagruhaOptions.map((bg) => (
                <option key={bg._id} value={bg._id}>
                  {bg.name}
                </option>
              ))}
            </select>
            {error && (
              <p id="edit-balagruha-error" className="mt-1 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
