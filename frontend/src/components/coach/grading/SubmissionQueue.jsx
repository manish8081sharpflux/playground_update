// frontend/src/components/coach/grading/SubmissionQueue.jsx
import React, { useEffect, useState } from 'react';

export default function SubmissionQueue({
  submissions,
  loading,
  filters,
  onFilterChange,
  onOpenGrading,
  onBulkGrade,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const GRADABLE_TYPES = ['art', 'audio', 'video'];

  const isGradableSubmission = (submission) =>
    GRADABLE_TYPES.includes(submission.submissionType);

  const pendingSubmissions = submissions.filter(
    s => s.status === 'pending' && isGradableSubmission(s)
  );
  const gradableSubmissions = submissions.filter(isGradableSubmission);
  const allPendingSelected = pendingSubmissions.length > 0 && pendingSubmissions.every(s => selectedIds.has(s.id));

  useEffect(() => {
    const visibleIds = new Set(pendingSubmissions.map((submission) => submission.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [pendingSubmissions]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingSubmissions.map(s => s.id)));
    }
  };

  const getBorderColorClass = (type) => {
    switch (type) {
      case 'art':
        return 'border-l-4 border-orange-500';
      case 'video':
        return 'border-l-4 border-blue-500';
      case 'audio':
        return 'border-l-4 border-green-500';
      default:
        return 'border-l-4 border-gray-500';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-600">Loading submissions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {/* Search Bar */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search by Student Name or Course
          </label>
          <input
            type="text"
            placeholder="Type student name or course title..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Type
            </label>
            <select
              value={filters.courseType}
              onChange={(e) => onFilterChange('courseType', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="art">Art</option>
              <option value="video">Spoken English (Video)</option>
              <option value="audio">Life Skills (Audio)</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="graded">Graded</option>
              <option value="flagged">Flagged</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange('sortBy', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="oldest_first">Oldest First</option>
              <option value="newest_first">Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submission Count + Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {gradableSubmissions.length} submission
          {gradableSubmissions.length !== 1 ? 's' : ''} found
        </div>
        {pendingSubmissions.length > 0 && onBulkGrade && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allPendingSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Select All Pending ({pendingSubmissions.length})
            </label>
            {selectedIds.size > 0 && (
              <button
                onClick={() => {
                  onBulkGrade([...selectedIds]);
                  setSelectedIds(new Set());
                }}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
              >
                Bulk Grade ({selectedIds.size})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Submission Cards */}
      {gradableSubmissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No submissions found</h3>
          <p className="text-gray-600">
            There are no submissions matching your current filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {gradableSubmissions.map((submission) => (
            <div
              key={submission.id}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition ${getBorderColorClass(
                submission.submissionType
              )} ${selectedIds.has(submission.id) ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                {/* Checkbox for pending items */}
                {submission.status === 'pending' && onBulkGrade && (
                  <div className="mr-4 pt-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(submission.id)}
                      onChange={() => toggleSelect(submission.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                      aria-label={`Select ${submission.taskTitle}`}
                    />
                  </div>
                )}

                <div className="flex-1">
                  {/* Task Title */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {submission.taskTitle}
                    </h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${submission.status === 'graded' ? 'bg-green-100 text-green-800' :
                      submission.status === 'flagged' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                      {submission.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Student & Course Info */}
                  <div className="text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>
                        👤 Student: {submission.studentName}
                      </span>
                      {submission.balagruhaName && submission.balagruhaName !== "N/A" && (
                        <span>• Balagruha: {submission.balagruhaName}</span>
                      )}
                    </div>
                    <div className="mt-1">
                      📊 Course: {submission.courseTitle} ({submission.courseCategory})
                    </div>
                    <div className="mt-1">
                      📅 Submitted: {formatDate(submission.submittedAt)}
                      {submission.timeSpent > 0 && (
                        <span> • ⏱️ Time Spent: {submission.timeSpent} min</span>
                      )}
                    </div>
                  </div>

                  {/* Type Badge */}
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {submission.submissionType === 'art' && '🎨 Art Submission'}
                    {submission.submissionType === 'video' && '🎥 Video Submission'}
                    {submission.submissionType === 'audio' && '🎙️ Audio Submission'}
                  </div>

                  {/* Grade info for graded submissions */}
                  {submission.grade && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                      {submission.submissionType === 'quiz' ? (
                        <>
                          Score: <strong>{submission.grade.score ?? 0}%</strong> • Coins:{' '}
                          <strong>{submission.grade.points ?? submission.grade.coinsAwarded ?? 0}</strong>
                        </>
                      ) : (
                        <>
                          Quality: <strong>{submission.grade.quality || '-'}</strong> • Coins:{' '}
                          <strong>{submission.grade.coinsAwarded ?? 0}</strong>
                          {submission.grade.feedback && <span> • "{submission.grade.feedback}"</span>}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="ml-4">
                  {submission.status === 'pending' && (
                    <button
                      onClick={() => onOpenGrading(submission)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                    >
                      👁️ Preview & Grade
                    </button>
                  )}
                  {submission.status === 'graded' && (
                    <button
                      onClick={() => onOpenGrading(submission)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition"
                    >
                      📋 View Grade
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
