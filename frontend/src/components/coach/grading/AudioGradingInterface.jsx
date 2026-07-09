// frontend/src/components/coach/grading/AudioGradingInterface.jsx
import React from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../api';
import GradingPanel from './GradingPanel';

export default function AudioGradingInterface({ submission, onClose, coachId, onNavigate, onSkip, onFlag, currentIndex, totalCount }) {
  const handleGrade = async (gradeData) => {
    try {
      await api.post(
        `/api/v2/lms/coach/grading/submissions/${submission.id}/grade`,
        gradeData
      );

      toast.success(
        `✅ Grade submitted! ${submission.studentName} earned ${gradeData.coinsAwarded} ISF Coins!`
      );

      // Auto-navigate to next or close if last
      if (onNavigate && currentIndex < totalCount - 1) {
        onNavigate('next');
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error submitting grade:', error);
      toast.error(error.response?.data?.error || 'Failed to submit grade');
      throw error;
    }
  };

  return (
    <div className="mt-12 min-h-screen bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between border-b border-blue-700">
        <h2 className="text-xl font-bold">
          Grading: {submission.taskTitle} - {submission.studentName}
        </h2>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 text-2xl font-bold px-4"
        >
          ✕ Close
        </button>
      </div>

      {/* 2-Column Layout */}
      <div className="flex">
        {/* Left Column - Audio Player (60%) */}
        <div className="w-3/5 p-8 border-r border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Audio Submission</h3>

          {/* HTML5 Audio Player */}
          <div className="bg-gray-100 rounded-lg p-8 border border-gray-300">
            <div className="text-6xl text-center mb-4">🎙️</div>
            <audio
              src={submission.fileUrl}
              controls
              className="w-full"
            >
              Your browser does not support the audio tag.
            </audio>
          </div>

          {/* File Info */}
          <div className="mt-4 text-sm text-gray-600">
            {submission.metadata?.duration && (
              <div>
                <strong>Duration:</strong>{' '}
                {Math.floor(submission.metadata.duration / 60)}:
                {(submission.metadata.duration % 60).toString().padStart(2, '0')}
              </div>
            )}
            {submission.metadata?.fileSize && (
              <div>
                <strong>File Size:</strong>{' '}
                {(submission.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          {onNavigate && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('previous')}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => onNavigate('next')}
                  disabled={currentIndex === totalCount - 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next →
                </button>
              </div>
              <div className="text-sm text-gray-600">
                Submission {currentIndex + 1} of {totalCount}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onSkip}
                  className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition"
                >
                  ⏭️ Skip
                </button>
                <button
                  onClick={onFlag}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                >
                  🚩 Flag
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Grading Panel (40%) */}
        <div className="w-2/5 bg-gray-50 overflow-y-auto" style={{ maxHeight: '100vh' }}>
          <GradingPanel
            submission={submission}
            onGrade={handleGrade}
            coachId={coachId}
          />
        </div>
      </div>
    </div>
  );
}
