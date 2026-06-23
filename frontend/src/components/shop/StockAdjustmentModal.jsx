import React, { useState } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

/**
 * StockAdjustmentModal Component - Sprint5-Story-06
 * Modal for adjusting product stock with reason tracking
 */

export default function StockAdjustmentModal({ product, onClose, onSuccess }) {
  const [mode, setMode] = useState('physical'); // 'physical' | 'adjustment'
  const [adjustment, setAdjustment] = useState('');
  const [newStock, setNewStock] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentStock = product?.stock ?? 0;
  const adjustmentNum = parseInt(adjustment, 10);
  const newStockNum = parseInt(newStock, 10);

  const resolvedAdjustment = mode === 'physical'
    ? (Number.isNaN(newStockNum) ? 0 : newStockNum - currentStock)
    : (Number.isNaN(adjustmentNum) ? 0 : adjustmentNum);

  const resolvedNewStock = mode === 'physical'
    ? (Number.isNaN(newStockNum) ? currentStock : newStockNum)
    : currentStock + resolvedAdjustment;

  const wouldBeNegative = resolvedNewStock < 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason) {
      toast.error('Please select a reason code');
      return;
    }

    if (mode === 'physical') {
      if (newStock === '') {
        toast.error('Please enter the physical count');
        return;
      }

      if (Number.isNaN(newStockNum) || newStockNum < 0) {
        toast.error('Physical count must be a non-negative number');
        return;
      }

      if (resolvedAdjustment === 0) {
        toast.error('No stock change detected');
        return;
      }
    } else {
      if (!adjustment || adjustment === '0') {
        toast.error('Please enter a valid adjustment amount');
        return;
      }

      if (Number.isNaN(adjustmentNum) || resolvedAdjustment === 0) {
        toast.error('Adjustment amount cannot be zero');
        return;
      }
    }

    if (wouldBeNegative) {
      toast.error('Stock cannot be negative');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        reason,
        notes: notes.trim() || undefined
      };

      if (mode === 'physical') {
        payload.newStock = newStockNum;
      } else {
        payload.adjustment = resolvedAdjustment;
      }

      await api.patch(`/api/v2/shop/admin/inventory/${product._id}/adjust`, payload);

      toast.success('Stock adjusted successfully');
      onClose();
      onSuccess();
    } catch (err) {
      console.error('Error adjusting stock:', err);
      toast.error(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-900">Adjust Stock</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={submitting}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Product Info */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={
                  product.imageUrl ||
                  product.primaryImageUrl ||
                  product.images?.find(img => img.isPrimary)?.url ||
                  product.images?.[0]?.url ||
                  '/placeholder-product.png'
                }
                alt={product.name}
                className="w-16 h-16 object-cover rounded border border-slate-200"
                onError={(e) => {
                  e.target.src = '/placeholder-product.png';
                }}
              />
              <div className="flex-1">
                <p className="font-medium text-slate-900">{product.name}</p>
                <p className="text-sm text-slate-600">SKU: {product.sku}</p>
              </div>
            </div>

            {/* Current Stock */}
            <div className="text-center py-3 bg-white rounded border border-slate-200">
              <p className="text-sm text-slate-600 mb-1">Current Stock</p>
              <p className="text-3xl font-bold text-slate-900">{currentStock}</p>
              <p className="text-xs text-slate-500 mt-1">units</p>
            </div>
          </div>

          {/* Adjustment Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Adjustment Method <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode('physical')}
                disabled={submitting}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  mode === 'physical'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Physical Count
              </button>
              <button
                type="button"
                onClick={() => setMode('adjustment')}
                disabled={submitting}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  mode === 'adjustment'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Adjustment Amount
              </button>
            </div>
          </div>

          {mode === 'physical' ? (
            <div>
              <label
                htmlFor="stock-adjustment-new-stock"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Physical Count (New Stock) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="stock-adjustment-new-stock"
                  type="number"
                  min={0}
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  placeholder="Enter physical count"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={submitting}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {resolvedAdjustment > 0 && <TrendingUp className="w-5 h-5 text-green-600" />}
                  {resolvedAdjustment < 0 && <TrendingDown className="w-5 h-5 text-red-600" />}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="stock-adjustment-adjustment"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Adjustment Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="stock-adjustment-adjustment"
                  type="number"
                  value={adjustment}
                  onChange={(e) => setAdjustment(e.target.value)}
                  placeholder="Enter positive or negative number"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={submitting}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {resolvedAdjustment > 0 && <TrendingUp className="w-5 h-5 text-green-600" />}
                  {resolvedAdjustment < 0 && <TrendingDown className="w-5 h-5 text-red-600" />}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Use positive numbers to increase stock, negative to decrease
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label
              htmlFor="stock-adjustment-reason"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              id="stock-adjustment-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={submitting}
            >
              <option value="" disabled>Select reason code</option>
              <option value="Purchase / Restock">Purchase / Restock</option>
              <option value="Inventory Adjustment">Inventory Adjustment</option>
              <option value="Student Return">Student Return</option>
              <option value="Stock Correction">Stock Correction</option>
              <option value="Damaged Items">Damaged Items</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="stock-adjustment-notes"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Notes (Optional)
            </label>
            <textarea
              id="stock-adjustment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any additional details..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={submitting}
            />
          </div>

          {/* Preview */}
          {((mode === 'physical' && newStock !== '' && resolvedAdjustment !== 0) || (mode === 'adjustment' && adjustment && resolvedAdjustment !== 0)) && (
            <div className={`rounded-lg p-4 border ${
              resolvedAdjustment > 0
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <p className="text-sm font-medium mb-2">
                {resolvedAdjustment > 0 ? 'Stock Increase Preview' : 'Stock Decrease Preview'}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600">Current</p>
                  <p className="text-xl font-bold text-slate-900">{currentStock}</p>
                </div>
                <div className={`text-2xl font-bold ${
                  resolvedAdjustment > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {resolvedAdjustment > 0 ? '+' : ''}{resolvedAdjustment}
                </div>
                <div>
                  <p className="text-xs text-slate-600">New Stock</p>
                  <p className={`text-xl font-bold ${
                    resolvedAdjustment > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {resolvedNewStock}
                  </p>
                </div>
              </div>
            </div>
          )}

          {wouldBeNegative && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                ⚠️ This adjustment would make stock negative (not allowed)
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
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
              disabled={
                submitting ||
                !reason ||
                wouldBeNegative ||
                (mode === 'physical'
                  ? (newStock === '' || resolvedAdjustment === 0 || Number.isNaN(newStockNum))
                  : (!adjustment || resolvedAdjustment === 0 || Number.isNaN(adjustmentNum)))
              }
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adjusting...' : 'Adjust Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
