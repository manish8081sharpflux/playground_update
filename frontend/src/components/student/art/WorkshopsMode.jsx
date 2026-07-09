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

  const workshops = data?.workshops || [];

  // Auto-select first workshop on load
  React.useEffect(() => {
    if (workshops.length > 0 && !selectedWorkshop) {
      setSelectedWorkshop(workshops[0]);
    }
  }, [workshops]);

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
      formData.append('taskTitle', metadata.title || selectedWorkshop?.title || 'Workshop artwork');

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
                <iframe
                  src={selectedWorkshop.videoUrl}
                  title={selectedWorkshop.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
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
          metadata={{ workshopId: selectedWorkshop?.id }}
          onClose={() => setShowSubmissionModal(false)}
          onSubmit={handleConfirmSubmission}
          file={selectedFile}
        />
      )}
    </div>
  );
}
