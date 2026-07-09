import React, { useState } from 'react';
import CanvasPreview from './CanvasPreview';
import SubmissionModal from './SubmissionModal';
import toast from 'react-hot-toast';
// Use apiWithoutContentType so axios doesn't override multipart/form-data
// boundary with application/json (which makes multer drop the file).
import { apiWithoutContentType as api } from '../../../api';

/**
 * ArtStoriesMode Component - Story 12.9 (FIX-014)
 * Drawing based on story prompts with audio narration.
 * Now wires real file upload via SubmissionModal.
 */
export default function ArtStoriesMode({ data, studentId, onRefresh }) {
  const [selectedStory, setSelectedStory] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const stories = data?.stories || [];

  React.useEffect(() => {
    setSelectedStory(current =>
      stories.find(story => String(story.id) === String(current?.id)) ||
      stories[0] ||
      null
    );
  }, [stories]);

  React.useEffect(() => {
    const tasks = selectedStory?.tasks || [];
    setSelectedTask(tasks.find(task => !task.completed) || tasks[0] || null);
    setSelectedFile(null);
  }, [selectedStory]);

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
      formData.append('mode', 'art_story');
      formData.append('courseId', selectedStory?.id || '');
      if (selectedTask?.id) {
        formData.append('taskId', selectedTask.id);
      }
      formData.append(
        'taskTitle',
        selectedTask?.title || metadata.title || selectedStory?.title || 'Art story artwork'
      );

      await api.post(
        `/api/v2/lms/student/${studentId}/courses/art/submissions`,
        formData
      );
      toast.success('Story artwork submitted successfully!');
      setShowSubmissionModal(false);
      setSelectedFile(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit artwork';
      toast.error(msg);
    }
  };

  if (stories.length === 0) {
    return <div className="text-center py-12"><p className="text-gray-500">No stories available</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Story Selector */}
      {stories.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Story</label>
          <select
            value={selectedStory?.id || ''}
            onChange={(e) => setSelectedStory(stories.find(s => s.id === e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
          >
            {stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title} ({story.difficulty})
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedStory && (
        <>
          {/* Story Header */}
          <div className="bg-pink-50 rounded-lg p-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedStory.title}</h2>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>Difficulty: {selectedStory.difficulty}</span>
              <span>Estimated Time: {selectedStory.estimatedTime} mins</span>
            </div>
          </div>

          {/* Audio Player (if audioUrl exists) */}
          {selectedStory.audioUrl && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Listen to the Story</h3>
              <audio controls className="w-full">
                <source src={selectedStory.audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Story Text */}
          {selectedStory.storyText && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Story</h3>
              <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                {selectedStory.storyText}
              </div>
            </div>
          )}

          {/* Drawing Prompt */}
          {selectedStory.prompt && (
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Drawing Prompt</h3>
              <div className="text-blue-800 whitespace-pre-line">
                {selectedStory.prompt}
              </div>
            </div>
          )}

          {selectedStory.tasks?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Tasks</h3>
              <div className="space-y-2">
                {selectedStory.tasks.map((task, index) => (
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
          mode="art_story"
          metadata={{ storyId: selectedStory?.id, taskId: selectedTask?.id }}
          onClose={() => setShowSubmissionModal(false)}
          onSubmit={handleConfirmSubmission}
          file={selectedFile}
        />
      )}
    </div>
  );
}
