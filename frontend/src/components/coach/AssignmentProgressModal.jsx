// Assignment Progress Report modal — wired up to the "View Progress Report"
// button on /coach/assignments. Fetches per-student breakdown from
// GET /api/v2/lms/coach/assignments/:assignmentId/progress-report.
import React, { useEffect, useState } from 'react';
import { api } from '../../api';

export default function AssignmentProgressModal({ assignmentId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/api/v2/lms/coach/assignments/${assignmentId}/progress-report`);
        if (cancelled) return;
        if (res.data?.success) {
          setData(res.data.data);
        } else {
          setError(res.data?.error || 'Failed to load progress report');
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.error || err.message || 'Failed to load progress report');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [assignmentId]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const statusBadge = (status) => {
    const map = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: '✓ Completed' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Progress' },
      not_started: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Not Started' },
    };
    const m = map[status] || map.not_started;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-thin ${m.bg} ${m.text}`}>{m.label}</span>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="mt-12 bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Progress Report</h2>
            {data?.assignment?.course?.title && (
              <p className="text-sm text-slate-600 mt-1">
                {data.assignment.course.title} • {data.assignment.course.category}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none" aria-label="Close">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {loading && <div className="text-center py-12 text-slate-500">Loading progress report...</div>}
          {error && (
            <div className="text-center py-12 text-red-600 bg-red-50 rounded border border-red-200 p-4">
              {error}
            </div>
          )}
          {!loading && !error && data && (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="text-xs text-blue-700">Total Students</div>
                  <div className="text-2xl font-bold text-blue-900">{data.summary.totalStudents}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-3">
                  <div className="text-xs text-amber-700">Started</div>
                  <div className="text-2xl font-bold text-amber-900">{data.summary.studentsStarted}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="text-xs text-green-700">Completed</div>
                  <div className="text-2xl font-bold text-green-900">{data.summary.studentsCompleted}</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded p-3">
                  <div className="text-xs text-purple-700">Avg Completion</div>
                  <div className="text-2xl font-bold text-purple-900">{data.summary.averageCompletionPercentage}%</div>
                </div>
              </div>

              {/* Student breakdown */}
              {data.students.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No students assigned to this course.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-slate-700">Student</th>
                        <th className="text-left px-4 py-2 font-semibold text-slate-700">Email</th>
                        <th className="text-center px-4 py-2 font-semibold text-slate-700">Progress</th>
                        <th className="text-center px-4 py-2 font-semibold text-slate-700">Items</th>
                        <th className="text-center px-4 py-2 font-semibold text-slate-700">Last Active</th>
                        <th className="text-center px-4 py-2 font-semibold text-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.students.map((s) => (
                        <tr key={s.studentId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-900">{s.name || '—'}</td>
                          <td className="px-4 py-2 text-slate-600 text-xs">{s.email || '—'}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-200 rounded-full h-2 min-w-[80px]">
                                <div
                                  className={`h-2 rounded-full ${
                                    s.status === 'completed' ? 'bg-green-500' :
                                    s.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${s.percent}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-700 w-10 text-right">{s.percent}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center text-slate-700">{s.completedItems}/{s.totalItems}</td>
                          <td className="px-4 py-2 text-center text-slate-500 text-xs">{formatDate(s.lastActive)}</td>
                          <td className="px-4 py-2 text-center">{statusBadge(s.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
