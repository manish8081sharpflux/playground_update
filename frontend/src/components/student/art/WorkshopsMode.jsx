import React, { useState } from 'react';
import CanvasPreview from './CanvasPreview';
import SubmissionModal from './SubmissionModal';
import toast from 'react-hot-toast';
import { apiWithoutContentType } from '../../../api';

/**
 * WorkshopsMode Component - Story 12.9 (FIX-014)
 * Guided art lessons with instructor videos.
 * Now wires real file upload via SubmissionModal.
 */
export default function WorkshopsMode({ data, studentId, onRefresh }) {
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const workshops = data?.workshops || [];
  const isDirectVideoFile = (url = '') =>
    /\.(mp4|webm|ogg|mov)(?:$|[?#])/i.test(url);

  // Auto-select first workshop on load
  React.useEffect(() => {
    setSelectedWorkshop(current =>
      workshops.find(workshop => String(workshop.id) === String(current?.id)) ||
      workshops[0] ||
      null
    );
  }, [workshops]);

  React.useEffect(() => {
    const tasks = selectedWorkshop?.tasks || [];
    setSelectedTask(tasks.find(task => !task.completed) || tasks[0] || null);
    setSelectedFile(null);
  }, [selectedWorkshop]);

  const handleSubmit = () => {
    if (!selectedFile) {
      toast.error('Please select an artwork file before submitting');
      return;
    }
    setShowSubmissionModal(true);
  };

  const handleConfirmSubmission = async (metadata) => {
    if (!selectedFile) {
      toast.error('No file selected');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('artwork', selectedFile);
      formData.append('type', 'art');
      formData.append('mode', 'workshop');
      formData.append('courseId', selectedWorkshop?.id || '');
      if (selectedTask?.id) {
        formData.append('taskId', selectedTask.id);
      }
      formData.append(
        'taskTitle',
        selectedTask?.title || metadata.title || selectedWorkshop?.title || 'Workshop artwork'
      );

      await apiWithoutContentType.post(
        `/api/v2/lms/student/${studentId}/courses/art/submissions`,
        formData
      );
      toast.success('Workshop artwork submitted successfully!');
      setShowSubmissionModal(false);
      setSelectedFile(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit artwork';
      toast.error(msg);
    }
  };

  if (workshops.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No workshops available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workshop Selector */}
      {workshops.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Workshop
          </label>
          <select
            value={selectedWorkshop?.id || ''}
            onChange={(e) => {
              const workshop = workshops.find(w => w.id === e.target.value);
              setSelectedWorkshop(workshop);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
          >
            {workshops.map((workshop) => (
              <option key={workshop.id} value={workshop.id}>
                {workshop.title} - {workshop.instructor} ({workshop.level})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Workshop Details */}
      {selectedWorkshop && (
        <>
          <div className="bg-pink-50 rounded-lg p-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {selectedWorkshop.title}
            </h2>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>Instructor: {selectedWorkshop.instructor}</span>
              <span>Duration: {selectedWorkshop.duration} mins</span>
              <span>Level: {selectedWorkshop.level}</span>
            </div>
          </div>

          {/* Video Player */}
          {selectedWorkshop.videoUrl && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Video Tutorial</h3>
              <div className="relative rounded-lg overflow-hidden shadow-lg" style={{ aspectRatio: '16/9' }}>
                {isDirectVideoFile(selectedWorkshop.videoUrl) ? (
                  <video
                    src={selectedWorkshop.videoUrl}
                    title={selectedWorkshop.title}
                    className="w-full h-full bg-black"
                    controls
                    preload="metadata"
                  >
                    Your browser does not support the video element.
                  </video>
                ) : (
                  <iframe
                    src={selectedWorkshop.videoUrl}
                    title={selectedWorkshop.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Instructions</h3>
            <div className="text-gray-700 whitespace-pre-line">
              {selectedWorkshop.instructions}
            </div>
          </div>

          {selectedWorkshop.tasks?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Tasks</h3>
              <div className="space-y-2">
                {selectedWorkshop.tasks.map((task, index) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      setSelectedTask(task);
                      setSelectedFile(null);
                    }}
                    className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                      selectedTask?.id === task.id
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-gray-900">
                        {index + 1}. {task.title}
                      </span>
                      {task.completed && (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Completed
                        </span>
                      )}
                    </div>
                    {(task.instructions || task.description) && (
                      <p className="mt-2 text-sm text-gray-600">
                        {task.instructions || task.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Canvas Preview & File Upload */}
          <CanvasPreview
            onSubmit={handleSubmit}
            file={selectedFile}
            onFileChange={setSelectedFile}
          />
        </>
      )}

      {/* Submission Modal */}
      {showSubmissionModal && (
        <SubmissionModal
          mode="workshop"
          metadata={{ workshopId: selectedWorkshop?.id, taskId: selectedTask?.id }}
          onClose={() => setShowSubmissionModal(false)}
          onSubmit={handleConfirmSubmission}
          file={selectedFile}
        />
      )}
    </div>
  );
}
