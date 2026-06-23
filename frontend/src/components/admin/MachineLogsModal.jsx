import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

import { getMachineLogs } from '../../api/machines';

const PAGE_SIZE = 20;

/**
 * Format seconds into a human-readable duration string (e.g. "1h 23m 45s")
 */
function formatDuration(seconds) {
  if (seconds == null || seconds <= 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

/**
 * Get display name for a user object, falling back gracefully.
 */
function getUserDisplay(user) {
  if (!user) return 'Unknown';
  if (typeof user === 'string') return user;
  return user.name || user.email || 'Unknown';
}

export default function MachineLogsModal({ machine, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
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
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch logs
  const fetchLogs = useCallback(async (pageNum) => {
    try {
      setLoading(true);
      setError(null);

      const result = await getMachineLogs(machine._id, {
        page: pageNum,
        limit: PAGE_SIZE,
      });

      if (result && result.success) {
        setLogs(result.data?.logs || []);
        setTotalPages(result.data?.totalPages || 0);
        setTotal(result.data?.total || 0);
      } else {
        throw new Error(result?.message || 'Failed to fetch logs');
      }
    } catch (err) {
      console.error('Error fetching machine logs:', err);
      const message =
        err.response?.data?.message || err.message || 'Failed to fetch logs';
      setError(message);
      toast.error(message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [machine._id]);

  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  const goToPreviousPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="machine-logs-title"
    >
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" aria-hidden="true" />
            <div>
              <h2
                id="machine-logs-title"
                className="text-xl font-bold text-slate-900"
              >
                Usage Logs
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Machine: {machine.machineId} ({machine.serialNumber})
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors focus:ring-2 focus:ring-purple-500 focus:outline-none"
            aria-label="Close usage logs dialog"
          >
            <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-600">Loading logs...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-600" role="alert">
                {error}
              </p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center">
              <FileText
                className="w-12 h-12 text-slate-300 mx-auto mb-3"
                aria-hidden="true"
              />
              <p className="text-slate-600 font-medium">No usage logs found</p>
              <p className="text-sm text-slate-400 mt-1">
                This machine has no recorded activity yet.
              </p>
            </div>
          ) : (
            <>
              <div className="text-sm text-slate-500 mb-3">
                Showing {(page - 1) * PAGE_SIZE + 1}
                {' - '}
                {Math.min(page * PAGE_SIZE, total)} of {total} log
                {total !== 1 ? 's' : ''}
              </div>

              <div className="overflow-x-auto">
                <table
                  className="w-full"
                  role="table"
                  aria-label="Machine usage log entries"
                >
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                      >
                        Login Time
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                      >
                        Logout Time
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                      >
                        User
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                      >
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {logs.map((log) => (
                      <tr
                        key={log._id || log.LogID}
                        className="hover:bg-slate-50 transition-colors"
                        tabIndex={0}
                        aria-label={`Log entry from ${new Date(log.LoginTimestamp).toLocaleString()}`}
                      >
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {log.LoginTimestamp
                            ? new Date(log.LoginTimestamp).toLocaleString()
                            : '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {log.LogoutTimestamp
                            ? new Date(log.LogoutTimestamp).toLocaleString()
                            : 'Active'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {getUserDisplay(log.UserID)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatDuration(log.SessionDuration)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Pagination footer */}
        {!loading && !error && totalPages > 1 && (
          <div
            className="flex items-center justify-between p-4 border-t border-slate-200 flex-shrink-0"
            role="navigation"
            aria-label="Usage logs pagination"
          >
            <button
              onClick={goToPreviousPage}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-purple-500 focus:outline-none"
              aria-label="Go to previous page"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              Previous
            </button>

            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={goToNextPage}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-purple-500 focus:outline-none"
              aria-label="Go to next page"
            >
              Next
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
