import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

/**
 * AuditTrailModal Component - Sprint5-Story-06
 * Modal displaying inventory audit history in timeline format
 */

export default function AuditTrailModal({ productId, productName, onClose }) {
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reasonFilter, setReasonFilter] = useState('all');

  useEffect(() => {
    fetchAuditLog();
  }, [productId, reasonFilter]);

  const fetchAuditLog = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (reasonFilter && reasonFilter !== 'all') {
        params.reason = reasonFilter;
      }

      const response = await api.get(`/api/v2/shop/admin/inventory/${productId}/audit`, {
        params
      });
      setAuditLog(response.data.transactions || []);
    } catch (err) {
      console.error('Error fetching audit log:', err);
      setError(err.response?.data?.message || 'Failed to load audit history');
      toast.error('Failed to load audit history');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (change) => {
    if (change > 0) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (change < 0) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return <AlertCircle className="w-4 h-4 text-slate-600" />;
  };

  const getActionColor = (change) => {
    if (change > 0) return 'bg-green-500';
    if (change < 0) return 'bg-red-500';
    return 'bg-slate-500';
  };

  const formatReason = (reason) => {
    return reason || 'N/A';
  };

  const formatPerformedBy = (performedBy) => {
    if (!performedBy) return 'System';
    if (typeof performedBy === 'string') return performedBy;
    return performedBy.name || performedBy.email || performedBy.userId || performedBy._id || 'System';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Inventory Audit Trail</h2>
            <p className="text-sm text-slate-600 mt-1">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Filter Section */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <label htmlFor="reason-filter" className="text-sm font-medium text-slate-700">
              Filter by Reason:
            </label>
            <select
              id="reason-filter"
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            >
              <option value="all">All Reasons</option>
              <option value="Purchase / Restock">Purchase / Restock</option>
              <option value="Inventory Adjustment">Inventory Adjustment</option>
              <option value="Student Return">Student Return</option>
              <option value="Stock Correction">Stock Correction</option>
              <option value="Damaged Items">Damaged Items</option>
              <option value="Other">Other</option>
            </select>
            {reasonFilter !== 'all' && (
              <button
                onClick={() => setReasonFilter('all')}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-600">Loading audit history...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
              <button
                onClick={fetchAuditLog}
                className="mt-2 text-red-600 hover:text-red-700 font-medium"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && auditLog.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 text-lg">No audit history found</p>
              <p className="text-slate-500 text-sm mt-2">
                Stock adjustments will appear here
              </p>
            </div>
          )}

          {!loading && !error && auditLog.length > 0 && (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200"></div>

              {/* Timeline Items */}
              <div className="space-y-6">
                {auditLog.map((entry, index) => (
                  <div key={entry._id || index} className="relative flex items-start gap-4">
                    {/* Timeline Dot */}
                    <div
                      className={`w-6 h-6 rounded-full ${getActionColor(
                        entry.quantity
                      )} border-4 border-white z-10 flex items-center justify-center flex-shrink-0`}
                    >
                      <span className="text-xs text-white">•</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getActionIcon(entry.quantity)}
                          <p className="font-semibold text-slate-900">
                            {entry.quantity > 0
                              ? 'Stock Increased'
                              : entry.quantity < 0
                                ? 'Stock Decreased'
                                : 'No Stock Change'}
                          </p>
                        </div>
                        <span
                          className={`text-lg font-bold ${
                            entry.quantity > 0
                              ? 'text-green-600'
                              : entry.quantity < 0
                                ? 'text-red-600'
                                : 'text-slate-600'
                          }`}
                        >
                          {entry.quantity > 0 ? '+' : ''}
                          {entry.quantity}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Previous Stock:</span>
                          <span className="font-medium text-slate-900">
                            {entry.previousStock}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">New Stock:</span>
                          <span className="font-medium text-slate-900">
                            {entry.newStock}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Reason:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {formatReason(entry.reason)}
                          </span>
                        </div>
                        {entry.notes && (
                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-slate-600 italic">"{entry.notes}"</p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          By:{' '}
                          <span className="font-medium text-slate-700">
                            {formatPerformedBy(entry.performedBy)}
                          </span>
                        </span>
                        <span>{formatDateTime(entry.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {auditLog.length} {auditLog.length === 1 ? 'entry' : 'entries'} found
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
