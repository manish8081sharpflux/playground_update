// frontend/src/components/coach/grading/GradingPanel.jsx
import React, { useState, useEffect } from 'react';

export default function GradingPanel({
  submission,
  onGrade,
  coachId,
}) {
  const [quality, setQuality] = useState('');
  const [coinsAwarded, setCoinsAwarded] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-adjust coin amount based on quality rating
  useEffect(() => {
    if (quality === 'excellent') {
      setCoinsAwarded(85);
    } else if (quality === 'good') {
      setCoinsAwarded(65);
    } else if (quality === 'needs_improvement') {
      setCoinsAwarded(25);
    }
  }, [quality]);

  const handleSubmit = async () => {
    // Validation
    if (!quality) {
      alert('Please select a quality rating');
      return;
    }


    setIsSubmitting(true);

    try {
      await onGrade({
        quality,
        coinsAwarded,
        feedback: feedback || null,
        gradedBy: coachId,
      });
    } catch (error) {
      console.error('Error submitting grade:', error);
      // alert('Failed to submit grade. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQualityBorderClass = (qualityType) => {
    if (quality === qualityType) {
      switch (qualityType) {
        case 'excellent':
          return 'border-2 border-green-500 bg-green-50';
        case 'good':
          return 'border-2 border-yellow-500 bg-yellow-50';
        case 'needs_improvement':
          return 'border-2 border-red-500 bg-red-50';
        default:
          return 'border-2 border-gray-300';
      }
    }
    return 'border-2 border-gray-300 hover:border-gray-400';
  };

  return (
    <div className="p-8 space-y-6">
      {/* Student Info */}
      <div className="space-y-1">
        <div className="text-sm text-gray-600">
          <strong>Student:</strong> {submission.studentName}
        </div>
        {submission.studentClass && (
          <div className="text-sm text-gray-600">
            <strong>Class:</strong> {submission.studentClass}
          </div>
        )}
        <div className="text-sm text-gray-600">
          <strong>Course:</strong> {submission.courseTitle}
        </div>
        <div className="text-sm text-gray-600">
          <strong>Task:</strong> {submission.taskTitle}
        </div>
        <div className="text-sm text-gray-600">
          <strong>Submitted:</strong>{' '}
          {new Date(submission.submittedAt).toLocaleString('en-US')}
        </div>
        {submission.timeSpent > 0 && (
          <div className="text-sm text-gray-600">
            <strong>Time Spent:</strong> {submission.timeSpent} minutes
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-6"></div>

      {/* Quality Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Quality Rating <span className="text-red-500">*</span>
        </label>

        <div className="space-y-3">
          {/* Excellent */}
          <div
            onClick={() => setQuality('excellent')}
            className={`rounded-lg p-4 cursor-pointer transition ${getQualityBorderClass(
              'excellent'
            )}`}
          >
            <div className="flex items-center">
              <input
                type="radio"
                checked={quality === 'excellent'}
                onChange={() => setQuality('excellent')}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">Excellent</div>
                <div className="text-sm text-gray-600">
                  Shows creativity, good technique
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Award: 85 ISF Coins
                </div>
              </div>
            </div>
          </div>

          {/* Good */}
          <div
            onClick={() => setQuality('good')}
            className={`rounded-lg p-4 cursor-pointer transition ${getQualityBorderClass(
              'good'
            )}`}
          >
            <div className="flex items-center">
              <input
                type="radio"
                checked={quality === 'good'}
                onChange={() => setQuality('good')}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">Good</div>
                <div className="text-sm text-gray-600">
                  Meets requirements, some effort
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Award: 65 ISF Coins
                </div>
              </div>
            </div>
          </div>

          {/* Needs Improvement */}
          <div
            onClick={() => setQuality('needs_improvement')}
            className={`rounded-lg p-4 cursor-pointer transition ${getQualityBorderClass(
              'needs_improvement'
            )}`}
          >
            <div className="flex items-center">
              <input
                type="radio"
                checked={quality === 'needs_improvement'}
                onChange={() => setQuality('needs_improvement')}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">Needs Improvement</div>
                <div className="text-sm text-gray-600">
                  Incomplete or minimal effort
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Award: 25 ISF Coins
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6"></div>

      {/* ISF Coins to Award */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          ISF Coins to Award <span className="text-red-500">*</span>
        </label>

        <p className="text-sm text-gray-600 mb-3">
          This amount is set automatically from the selected quality rating.
        </p>

        <input
          type="range"
          min="0"
          max="100"
          value={coinsAwarded}
          readOnly
          aria-label="ISF coins determined by quality rating"
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${coinsAwarded}%, #e5e7eb ${coinsAwarded}%, #e5e7eb 100%)`,
          }}
        />

        {/* Number Input */}
        <div className="flex items-center gap-2 mt-3">
          <input
            type="number"
            min="0"
            max="100"
            value={coinsAwarded}
            readOnly
            aria-label="ISF coins determined by quality rating"
            className="w-20 border border-gray-300 bg-gray-100 rounded-lg px-3 py-2 text-center font-bold text-lg"
          />
          <span className="text-gray-600">coins</span>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6"></div>

      {/* Feedback for Student */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Feedback for Student (Optional)
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          maxLength={500}
          placeholder="Provide constructive feedback to help the student improve..."
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={5}
        />
        <div className="text-xs text-gray-500 mt-1 text-right">
          {feedback.length} / 500 characters
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !quality}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg transition"
        >
          {isSubmitting ? 'Submitting Grade...' : 'Submit Grade'}
        </button>
      </div>
    </div>
  );
}
