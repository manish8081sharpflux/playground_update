// frontend/src/components/coach/grading/GradingPanel.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

const DEFAULT_TASK_COIN_LIMITS = {
  story: {
    label: 'Stories',
    keywords: ['story', 'stories'],
    excellent: { min: 40, max: 50, default: 45 },
    good: { min: 25, max: 39, default: 30 },
    needs_improvement: { min: 0, max: 24, default: 10 },
  },
};

const QUALITY_LABELS = {
  outstanding: 'Outstanding',
  excellent: 'Excellent',
  good: 'Good',
  needs_improvement: 'Needs Improvement',
};

const resolveTaskCoinLimit = (submission, taskTypes) => {
  const searchableText = [
    submission?.taskTitle,
    submission?.courseTitle,
    submission?.metadata?.taskType,
    submission?.metadata?.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const entries = Object.entries(taskTypes || {});
  return entries.find(([, config]) =>
    (config.keywords || []).some((keyword) => searchableText.includes(keyword.toLowerCase()))
  )?.[1] || taskTypes?.story || DEFAULT_TASK_COIN_LIMITS.story;
};

const getQualityForCoins = (coins, taskLimit) => {
  if (coins >= taskLimit.excellent.min) return 'excellent';
  if (coins >= taskLimit.good.min) return 'good';
  return 'needs_improvement';
};

const toWholeNumber = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function GradingPanel({
  submission,
  onGrade,
  coachId,
}) {
  const [quality, setQuality] = useState('');
  const [coinsAwarded, setCoinsAwarded] = useState(0);
  const [suggestedCoins, setSuggestedCoins] = useState(0);
  const [suggestedCoinsInput, setSuggestedCoinsInput] = useState('0');
  const [customCoinsInput, setCustomCoinsInput] = useState('0');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coinLimitSettings, setCoinLimitSettings] = useState(DEFAULT_TASK_COIN_LIMITS);
  const isAlreadyGraded = submission?.status === 'graded';
  const taskCoinLimit = resolveTaskCoinLimit(submission, coinLimitSettings);
  const maxCoins = taskCoinLimit.excellent.max;
  const selectedCoinRange = quality ? taskCoinLimit[quality] : null;
  const effectiveQuality = coinsAwarded > maxCoins ? 'outstanding' : quality;
  const sliderValue = Math.min(suggestedCoins, maxCoins);
  const sliderPercent = maxCoins > 0 ? Math.round((sliderValue / maxCoins) * 100) : 0;

  // When a quality rating is picked directly, snap coins to that rating's default
  const handleQualitySelect = (selectedQuality) => {
    setQuality(selectedQuality);
    const defaultCoins = taskCoinLimit[selectedQuality].default;
    setSuggestedCoins(defaultCoins);
    setCoinsAwarded(defaultCoins);
    setSuggestedCoinsInput(String(Math.min(defaultCoins, maxCoins)));
    setCustomCoinsInput(String(defaultCoins));
  };

  // When coins are adjusted directly, switch the quality rating to match the range
  const handleCoinsChange = (value) => {
    const boundedValue = Math.min(Math.max(value, 0), maxCoins);
    setSuggestedCoins(boundedValue);
    setSuggestedCoinsInput(String(boundedValue));
    setQuality(getQualityForCoins(boundedValue, taskCoinLimit));
  };

  const handleSuggestedCoinsChange = (value) => {
    if (value === '') {
      setSuggestedCoinsInput('');
      setSuggestedCoins(0);
      return;
    }

    const sanitizedValue = value.replace(/[^\d]/g, '');
    const boundedValue = Math.min(Math.max(toWholeNumber(sanitizedValue), 0), maxCoins);
    setSuggestedCoinsInput(String(boundedValue));
    setSuggestedCoins(boundedValue);
    setQuality(getQualityForCoins(boundedValue, taskCoinLimit));
  };

  const handleCustomCoinsChange = (value) => {
    if (value === '') {
      setCustomCoinsInput('');
      setCoinsAwarded(0);
      return;
    }

    const sanitizedValue = value.replace(/[^\d]/g, '');
    const boundedValue = Math.max(toWholeNumber(sanitizedValue), 0);
    setCustomCoinsInput(sanitizedValue);
    setCoinsAwarded(boundedValue);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchCoinLimits = async () => {
      try {
        const response = await api.get('/api/v2/lms/coach/grading/coin-limits');
        if (!cancelled && response.data?.success) {
          setCoinLimitSettings(response.data.data?.taskTypes || DEFAULT_TASK_COIN_LIMITS);
        }
      } catch (error) {
        if (!cancelled) {
          setCoinLimitSettings(DEFAULT_TASK_COIN_LIMITS);
        }
      }
    };

    fetchCoinLimits();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setQuality(submission?.grade?.quality || '');
    const initialCoins = submission?.grade?.coinsAwarded ?? 0;
    setCoinsAwarded(initialCoins);
    setSuggestedCoins(Math.min(initialCoins, maxCoins));
    setSuggestedCoinsInput(String(Math.min(initialCoins, maxCoins)));
    setCustomCoinsInput(String(initialCoins));
    setFeedback(submission?.grade?.feedback || '');
    setIsSubmitting(false);
  }, [submission?.id, submission?.grade?.coinsAwarded, submission?.grade?.feedback, submission?.grade?.quality]);

  const handleSubmit = async () => {
    if (isAlreadyGraded) {
      return;
    }

    // Validation
    if (!effectiveQuality) {
      alert('Please select a quality rating');
      return;
    }

    if (
      !Number.isInteger(coinsAwarded) ||
      coinsAwarded < 0
    ) {
      alert('Coin amount must be a non-negative whole number');
      return;
    }

    setIsSubmitting(true);

    try {
      await onGrade({
        quality: effectiveQuality,
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
        case 'outstanding':
          return 'border-2 border-purple-500 bg-purple-50';
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
            onClick={() => handleQualitySelect('excellent')}
            className={`rounded-lg p-4 cursor-pointer transition ${getQualityBorderClass(
              'excellent'
            )}`}
          >
            <div className="flex items-center">
              <input
                type="radio"
                checked={quality === 'excellent'}
                onChange={() => handleQualitySelect('excellent')}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">🟢 Excellent</div>
                <div className="text-sm text-gray-600">
                  Shows creativity, good technique
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Suggested Coins: {taskCoinLimit.excellent.min}-{taskCoinLimit.excellent.max}
                </div>
              </div>
            </div>
          </div>

          {/* Good */}
          <div
            onClick={() => handleQualitySelect('good')}
            className={`rounded-lg p-4 cursor-pointer transition ${getQualityBorderClass(
              'good'
            )}`}
          >
            <div className="flex items-center">
              <input
                type="radio"
                checked={quality === 'good'}
                onChange={() => handleQualitySelect('good')}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">🟡 Good</div>
                <div className="text-sm text-gray-600">
                  Meets requirements, some effort
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Suggested Coins: {taskCoinLimit.good.min}-{taskCoinLimit.good.max}
                </div>
              </div>
            </div>
          </div>

          {/* Needs Improvement */}
          <div
            onClick={() => handleQualitySelect('needs_improvement')}
            className={`rounded-lg p-4 cursor-pointer transition ${getQualityBorderClass(
              'needs_improvement'
            )}`}
          >
            <div className="flex items-center">
              <input
                type="radio"
                checked={quality === 'needs_improvement'}
                onChange={() => handleQualitySelect('needs_improvement')}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">🔴 Needs Improvement</div>
                <div className="text-sm text-gray-600">
                  Incomplete or minimal effort
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Suggested Coins: {taskCoinLimit.needs_improvement.min}-{taskCoinLimit.needs_improvement.max}
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

        {/* Slider */}
        <input
          type="range"
          min="0"
          max={maxCoins}
          value={sliderValue}
          onChange={(e) => handleCoinsChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${sliderPercent}%, #e5e7eb ${sliderPercent}%, #e5e7eb 100%)`,
          }}
        />

        {/* Number Input */}
        <div className="flex items-center gap-2 mt-3">
          <input
            type="number"
            min="0"
            max={maxCoins}
            value={suggestedCoinsInput}
            onChange={(e) => handleSuggestedCoinsChange(e.target.value)}
            onFocus={() => {
              if (suggestedCoinsInput === '0') {
                setSuggestedCoinsInput('');
              }
            }}
            onBlur={() => {
              if (suggestedCoinsInput === '') {
                setSuggestedCoinsInput('0');
              }
            }}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center font-bold text-lg"
          />
          <span className="text-gray-600">coins</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Task type: {taskCoinLimit.label}. Suggested range: {selectedCoinRange?.min ?? 0}-{selectedCoinRange?.max ?? maxCoins} coins.
        </p>

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Coach Custom Coins
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={customCoinsInput}
              onChange={(e) => handleCustomCoinsChange(e.target.value)}
              onFocus={() => {
                if (customCoinsInput === '0') {
                  setCustomCoinsInput('');
                }
              }}
              onBlur={() => {
                if (customCoinsInput === '') {
                  setCustomCoinsInput('0');
                }
              }}
              className="w-full border border-blue-300 rounded-lg px-3 py-2 text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-600">coins</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            This is the final coin amount awarded by the coach.
          </p>
          {coinsAwarded > maxCoins && (
            <p className="mt-2 rounded-md bg-purple-100 px-3 py-2 text-sm font-semibold text-purple-800">
              Grade will be shown as Outstanding.
            </p>
          )}
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
        {isAlreadyGraded && (
          <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            This submission has already been graded.
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !effectiveQuality || isAlreadyGraded}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg transition"
        >
          {isSubmitting ? 'Submitting Grade...' : 'Submit Grade →'}
        </button>
      </div>
    </div>
  );
}
