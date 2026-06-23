import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * DeleteConfirmModal Component - Sprint5-Story-05
 * Confirmation modal for soft-deleting products
 */

export default function DeleteConfirmModal({ product, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Delete Product</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-700 mb-4">
            Are you sure you want to delete this product?
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              {(product.imageUrl || product.primaryImageUrl || product.images?.length > 0) ? (
                <img
                  src={
                    product.imageUrl ||
                    product.primaryImageUrl ||
                    product.images?.find(img => img.isPrimary)?.url ||
                    product.images?.[0]?.url ||
                    'https://via.placeholder.com/64'
                  }
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center">
                  <span className="text-2xl text-slate-400">📦</span>
                </div>
              )}
              <div>
                <div className="font-medium text-slate-900">{product.name}</div>
                <div className="text-sm text-slate-600">SKU: {product.sku}</div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> This is a soft delete. The product will be hidden from students but retained in the database.
            </p>
          </div>

          <p className="text-sm text-slate-600">
            You can restore deleted products later if needed.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Product
          </button>
        </div>
      </div>
    </div>
  );
}
