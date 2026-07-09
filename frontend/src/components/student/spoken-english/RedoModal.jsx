import React from 'react';

/**
 * RedoModal Component
 * Confirmation dialog for re-recording video
 */
export default function RedoModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-orange-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold">Confirm Re-record</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="text-4xl">⚠️</div>
            <div>
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Are you sure you want to re-record?
              </p>
              <p className="text-gray-600">
                This will delete your current recording and you'll need to record again from the beginning.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Yes, Re-record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
