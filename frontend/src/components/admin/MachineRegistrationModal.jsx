import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const MAC_ADDRESS_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

export default function MachineRegistrationModal({ balagruhaOptions, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    machineId: '',
    macAddress: '',
    serialNumber: '',
    assignedBalagruha: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Focus management: focus first input on mount
  const firstInputRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    // Store the element that had focus before modal opened
    previousFocusRef.current = document.activeElement;

    // Focus the first input
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }

    // Return focus on unmount
    return () => {
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  const validate = () => {
    const nextErrors = {};

    if (!formData.machineId.trim()) {
      nextErrors.machineId = 'Machine ID is required';
    }

    if (!formData.macAddress.trim()) {
      nextErrors.macAddress = 'MAC address is required';
    } else if (!MAC_ADDRESS_REGEX.test(formData.macAddress.trim())) {
      nextErrors.macAddress = 'Please enter a valid MAC address (e.g., AA:BB:CC:DD:EE:FF)';
    }

    if (!formData.serialNumber.trim()) {
      nextErrors.serialNumber = 'Serial number is required';
    }

    if (!formData.assignedBalagruha) {
      nextErrors.assignedBalagruha = 'Balagruha selection is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (e) => {
  const { name, value } = e.target;

  let updatedValue = value;

  if (name === "macAddress") {
    updatedValue = value
      .replace(/[^a-fA-F0-9]/g, "")
      .toUpperCase()
      .match(/.{1,2}/g)
      ?.join(":")
      .substring(0, 17) || "";
  }

  setFormData((prev) => ({
    ...prev,
    [name]: updatedValue,
  }));

  if (errors[name]) {
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        machineId: formData.machineId.trim(),
        macAddress: formData.macAddress.trim(),
        serialNumber: formData.serialNumber.trim(),
        assignedBalagruha: formData.assignedBalagruha,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-machine-title"
    >
      <div className="bg-white rounded-lg max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 id="register-machine-title" className="text-xl font-bold text-slate-900">
            Register Machine
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={submitting}
            aria-label="Close registration form"
          >
            <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Machine ID */}
          <div>
            <label
              htmlFor="reg-machineId"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Machine ID <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="reg-machineId"
              name="machineId"
              type="text"
              value={formData.machineId}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.machineId ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder="e.g., MACH-001"
              disabled={submitting}
              aria-label="Machine ID"
              aria-invalid={errors.machineId ? 'true' : 'false'}
              aria-describedby={errors.machineId ? 'machineId-error' : undefined}
            />
            {errors.machineId && (
              <p id="machineId-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.machineId}
              </p>
            )}
          </div>

          {/* MAC Address */}
          <div>
            <label
              htmlFor="reg-macAddress"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              MAC Address <span className="text-red-500">*</span>
            </label>
            <input
              id="reg-macAddress"
              name="macAddress"
              type="text"
              value={formData.macAddress}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.macAddress ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder="e.g., AA:BB:CC:DD:EE:FF"
              disabled={submitting}
              aria-label="MAC Address"
              aria-invalid={errors.macAddress ? 'true' : 'false'}
              aria-describedby={errors.macAddress ? 'macAddress-error' : undefined}
            />
            {errors.macAddress && (
              <p id="macAddress-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.macAddress}
              </p>
            )}
          </div>

          {/* Serial Number */}
          <div>
            <label
              htmlFor="reg-serialNumber"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Serial Number <span className="text-red-500">*</span>
            </label>
            <input
              id="reg-serialNumber"
              name="serialNumber"
              type="text"
              value={formData.serialNumber}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.serialNumber ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder="e.g., SN-20260316-001"
              disabled={submitting}
              aria-label="Serial Number"
              aria-invalid={errors.serialNumber ? 'true' : 'false'}
              aria-describedby={errors.serialNumber ? 'serialNumber-error' : undefined}
            />
            {errors.serialNumber && (
              <p id="serialNumber-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.serialNumber}
              </p>
            )}
          </div>

          {/* Balagruha Dropdown */}
          <div>
            <label
              htmlFor="reg-assignedBalagruha"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Balagruha <span className="text-red-500">*</span>
            </label>
            <select
              id="reg-assignedBalagruha"
              name="assignedBalagruha"
              value={formData.assignedBalagruha}
              onChange={handleChange}
              
              disabled={submitting}
              aria-label="Select Balagruha"
              aria-invalid={errors.assignedBalagruha ? 'true' : 'false'}
              aria-describedby={errors.assignedBalagruha ? 'assignedBalagruha-error' : undefined}
            >
              <option value="">-- Select Balagruha --</option>
              {balagruhaOptions.map((bg) => (
                <option key={bg._id} value={bg._id}>
                  {bg.name}
                </option>
              ))}
            </select>
            {errors.assignedBalagruha && (
              <p id="assignedBalagruha-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.assignedBalagruha}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Register Machine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
