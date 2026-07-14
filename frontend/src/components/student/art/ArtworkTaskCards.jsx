import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import CanvasPreview from './CanvasPreview';
import SubmissionModal from './SubmissionModal';
import { apiWithoutContentType } from '../../../api';

const getStatusInfo = (task, activeTaskId, selectedFile) => {
  if (String(activeTaskId) === String(task.id) && selectedFile) {
    return { label: 'Ready to Submit', className: 'bg-blue-100 text-blue-700' };
  }

  const status = task.submission?.status;
  if (status === 'graded') return { label: 'Graded', className: 'bg-green-100 text-green-700' };
  if (status === 'pending') return { label: 'Under Review', className: 'bg-yellow-100 text-yellow-700' };
  if (status === 'flagged') return { label: 'Revision Requested', className: 'bg-red-100 text-red-700' };
  if (status === 'skipped') return { label: 'Revision Requested', className: 'bg-red-100 text-red-700' };

  return { label: 'Not Started', className: 'bg-gray-100 text-gray-700' };
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString();
};

const groupTasksByChapter = (tasks) => {
  const groups = [];
  tasks.forEach((task) => {
    const chapterKey = String(task.chapterId || task.chapterTitle || 'chapter');
    let group = groups.find(item => item.key === chapterKey);
    if (!group) {
      group = {
        key: chapterKey,
        chapterId: task.chapterId,
        chapterTitle: task.chapterTitle || 'Chapter',
        tasks: [],
      };
      groups.push(group);
    }
    group.tasks.push(task);
  });
  return groups;
};

export default function ArtworkTaskCards({
  tasks = [],
  courseId,
  mode,
  studentId,
  onRefresh,
  onTaskSelect,
}) {
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  const activeTask = tasks.find(task => String(task.id) === String(activeTaskId)) || null;
  const chapterGroups = useMemo(() => groupTasksByChapter(tasks), [tasks]);

  const openTask = (task) => {
    setActiveTaskId(task.id);
    setSelectedFile(null);
    if (onTaskSelect) onTaskSelect(task);
  };

  const closeUpload = () => {
    setActiveTaskId(null);
    setSelectedFile(null);
  };

  const handleSubmit = () => {
    if (!activeTask) {
      toast.error('Please select a task first');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select an artwork file before submitting');
      return;
    }
    setShowSubmissionModal(true);
  };

  const handleConfirmSubmission = async (metadata) => {
    if (!activeTask || !selectedFile) {
      toast.error('Task or file missing');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('artwork', selectedFile);
      formData.append('type', 'art');
      formData.append('mode', mode);
      formData.append('courseId', courseId || '');
      formData.append('chapterId', activeTask.chapterId || '');
      formData.append('taskId', activeTask.id);
      formData.append('taskTitle', activeTask.title || metadata.title || 'Artwork task');

      await apiWithoutContentType.post(
        `/api/v2/lms/student/${studentId}/courses/art/submissions`,
        formData
      );

      toast.success('Artwork submitted for this task!');
      setShowSubmissionModal(false);
      closeUpload();
      if (onRefresh) onRefresh();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit artwork';
      toast.error(msg);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-500">
        No artwork tasks available yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-bold text-gray-900">Artwork Tasks</h3>
        <p className="mt-1 text-sm text-gray-500">Choose one task, upload artwork, and submit it to your coach.</p>
      </div>

      {chapterGroups.map(group => (
        <section key={group.key} className="rounded-lg border border-pink-100 bg-pink-50/40 p-4">
          <h4 className="mb-3 text-lg font-bold text-gray-900">{group.chapterTitle}</h4>
          <div className="space-y-3">
            {group.tasks.map((task, index) => {
              const isActive = String(activeTaskId) === String(task.id);
              const statusInfo = getStatusInfo(task, activeTaskId, selectedFile);
              const submission = task.submission;

              return (
                <article
                  key={task.id}
                  className={`rounded-lg border-2 bg-white p-4 shadow-sm transition-colors ${
                    isActive ? 'border-pink-500' : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-700">
                          Task {index + 1} of {group.tasks.length}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <h5 className="break-words text-lg font-bold text-gray-900">{task.title}</h5>
                      {(task.instructions || task.description) && (
                        <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                          {task.instructions || task.description}
                        </p>
                      )}
                      {!submission && (
                        <p className="mt-3 text-sm font-semibold text-gray-500">
                          No artwork submitted for this task yet.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {submission?.fileUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(submission.fileUrl, '_blank', 'noopener,noreferrer')}
                          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          View Submission
                        </button>
                      )}
                      {submission?.status !== 'pending' && (
                        <button
                          type="button"
                          onClick={() => openTask(task)}
                          className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
                        >
                          {submission ? 'Resubmit' : 'Start Task'}
                        </button>
                      )}
                    </div>
                  </div>

                  {submission && (
                    <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="grid gap-3 md:grid-cols-[120px_1fr]">
                        {submission.fileUrl && (
                          <button
                            type="button"
                            onClick={() => window.open(submission.fileUrl, '_blank', 'noopener,noreferrer')}
                            className="overflow-hidden rounded-md border border-gray-200 bg-white"
                          >
                            <img
                              src={submission.thumbnailUrl || submission.fileUrl}
                              alt={`${task.title} submission`}
                              className="h-24 w-full object-contain"
                              onError={(event) => {
                                event.currentTarget.style.display = 'none';
                              }}
                            />
                          </button>
                        )}
                        <div className="space-y-1 text-sm text-gray-700">
                          <p><span className="font-semibold">Submitted:</span> {formatDate(submission.submittedAt)}</p>
                          <p><span className="font-semibold">Status:</span> {statusInfo.label}</p>
                          {submission.grade?.quality && (
                            <p>
                              <span className="font-semibold">Grade:</span>{' '}
                              {submission.grade.quality === 'needs_improvement'
                                ? 'Needs Improvement'
                                : submission.grade.quality.charAt(0).toUpperCase() + submission.grade.quality.slice(1)}
                            </p>
                          )}
                          {submission.grade?.coinsAwarded !== null && submission.grade?.coinsAwarded !== undefined && (
                            <p><span className="font-semibold">Coins:</span> {submission.grade.coinsAwarded}</p>
                          )}
                          {submission.grade?.feedback && (
                            <p className="whitespace-pre-line"><span className="font-semibold">Feedback:</span> {submission.grade.feedback}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {isActive && (
                    <div className="mt-4 rounded-lg border border-pink-200 bg-pink-50 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-pink-800">Submitting for:</p>
                          <p className="text-base font-bold text-gray-900">Task {index + 1} — {task.title}</p>
                        </div>
                        <button
                          type="button"
                          onClick={closeUpload}
                          className="rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-pink-50"
                        >
                          Back to chapter tasks
                        </button>
                      </div>
                      <CanvasPreview
                        onSubmit={handleSubmit}
                        file={selectedFile}
                        onFileChange={setSelectedFile}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {showSubmissionModal && activeTask && (
        <SubmissionModal
          mode={mode}
          metadata={{
            courseId,
            chapterId: activeTask.chapterId,
            taskId: activeTask.id,
            taskTitle: activeTask.title,
          }}
          task={activeTask}
          onClose={() => setShowSubmissionModal(false)}
          onSubmit={handleConfirmSubmission}
          file={selectedFile}
        />
      )}
    </div>
  );
}
