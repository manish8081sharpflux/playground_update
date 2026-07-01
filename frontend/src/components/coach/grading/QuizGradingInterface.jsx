// frontend/src/components/coach/grading/QuizGradingInterface.jsx
import React, { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../api";

export default function QuizGradingInterface({
  submission,
  onClose,
  coachId,
  onNavigate,
  onSkip,
  onFlag,
  currentIndex = 0,
  totalCount = 1,
}) {
  const [score, setScore] = useState(submission?.score ?? "");
  const [coinsAwarded, setCoinsAwarded] = useState(
    submission?.grade?.coinsAwarded ?? 0
  );
  const [feedback, setFeedback] = useState(submission?.grade?.feedback ?? "");
  const [loading, setLoading] = useState(false);

  const answers = submission?.answers || submission?.quizAnswers || [];

  const getErrorMessage = (error) => {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.response?.data?.errors?.[0]?.message ||
      error.message ||
      "Failed to submit quiz grade"
    );
  };

  const handleSubmitGrade = async () => {
    if (score === "" || score === null || score === undefined) {
      toast.error("Please enter score");
      return;
    }

    if (Number(score) < 0) {
      toast.error("Score cannot be negative");
      return;
    }

    if (Number(coinsAwarded) < 0 || Number(coinsAwarded) > 100) {
      toast.error("Coins must be between 0 and 100");
      return;
    }

    try {
      setLoading(true);

      await api.post(
        `/api/v2/lms/coach/grading/submissions/${submission.id}/grade`,
        {
          score: Number(score),
          coinsAwarded: Number(coinsAwarded),
          feedback: feedback || null,
          gradedBy: coachId,
          submissionType: "quiz",
        }
      );

      toast.success(
        `✅ Quiz grade submitted! ${submission.studentName} earned ${coinsAwarded} ISF Coins!`
      );

      if (onNavigate && currentIndex < totalCount - 1) {
        onNavigate("next");
      } else {
        onClose?.();
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US");
  };

  return (
    <div className="mt-12 min-h-screen bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between border-b border-blue-700">
        <h2 className="text-xl font-bold">
          Grading:{" "}
          {submission?.quizTitle ||
            submission?.taskTitle ||
            submission?.title ||
            "Quiz Submission"}{" "}
          - {submission?.studentName}
        </h2>

        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 text-2xl font-bold px-4"
        >
          ✕ Close
        </button>
      </div>

      {/* 2 Column Layout */}
      <div className="flex">
        {/* Left Column - Quiz Preview */}
        <div className="w-3/5 p-8 border-r border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Quiz Submission
          </h3>

          {/* Student / Quiz Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6 space-y-2 text-sm text-gray-700">
            <div>
              <strong>Student:</strong> {submission?.studentName || "N/A"}
            </div>

            {submission?.studentClass && (
              <div>
                <strong>Class:</strong> {submission.studentClass}
              </div>
            )}

            <div>
              <strong>Course:</strong> {submission?.courseTitle || "N/A"}
            </div>

            <div>
              <strong>Quiz:</strong>{" "}
              {submission?.quizTitle ||
                submission?.taskTitle ||
                submission?.title ||
                "Quiz Submission"}
            </div>

            <div>
              <strong>Submitted:</strong> {formatDate(submission?.submittedAt)}
            </div>

            {submission?.timeSpent > 0 && (
              <div>
                <strong>Time Spent:</strong> {submission.timeSpent} minutes
              </div>
            )}
          </div>

          {/* Answers */}
          <div className="border border-gray-300 rounded-lg bg-gray-50 p-4 overflow-y-auto">
            <h4 className="font-bold text-gray-900 mb-4">Student Answers</h4>

            {answers.length > 0 ? (
              <div className="space-y-4">
                {answers.map((item, index) => {
                  const isCorrect =
                    item.isCorrect === true ||
                    item.answer === item.correctAnswer;

                  return (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="font-medium text-gray-900">
                          Q{index + 1}.{" "}
                          {item.question || item.questionText || "Question"}
                        </p>

                        {item.correctAnswer && (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isCorrect
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {isCorrect ? "Correct" : "Incorrect"}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-700">
                        <strong>Student Answer:</strong>{" "}
                        {item.answer || item.selectedAnswer || "Not answered"}
                      </p>

                      {item.correctAnswer && (
                        <p className="text-sm text-gray-700 mt-1">
                          <strong>Correct Answer:</strong> {item.correctAnswer}
                        </p>
                      )}

                      {item.marks !== undefined && (
                        <p className="text-sm text-gray-700 mt-1">
                          <strong>Marks:</strong> {item.marks}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                No quiz answers found.
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          {onNavigate && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate("previous")}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  ← Previous
                </button>

                <button
                  onClick={() => onNavigate("next")}
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
                {onSkip && (
                  <button
                    onClick={onSkip}
                    className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition"
                  >
                    ⏭️ Skip
                  </button>
                )}

                {onFlag && (
                  <button
                    onClick={onFlag}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                  >
                    🚩 Flag
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Quiz Grading Panel */}
        <div
          className="w-2/5 bg-gray-50 overflow-y-auto"
          style={{ maxHeight: "100vh" }}
        >
          <div className="p-8 space-y-6">
            <h3 className="text-lg font-bold text-gray-900">Grade Quiz</h3>

            <div className="border-t border-gray-200 pt-6"></div>

            {/* Score */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Score <span className="text-red-500">*</span>
              </label>

              <input
                type="number"
                min="0"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter score"
              />
            </div>

            <div className="border-t border-gray-200 pt-6"></div>

            {/* Coins */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                ISF Coins to Award <span className="text-red-500">*</span>
              </label>

              <input
                type="range"
                min="0"
                max="100"
                value={coinsAwarded}
                onChange={(e) => setCoinsAwarded(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #2563eb 0%, #2563eb ${coinsAwarded}%, #e5e7eb ${coinsAwarded}%, #e5e7eb 100%)`,
                }}
              />

              <div className="flex items-center gap-2 mt-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={coinsAwarded}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= 0 && value <= 100) {
                      setCoinsAwarded(value);
                    }
                  }}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center font-bold text-lg"
                />
                <span className="text-gray-600">coins</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6"></div>

            {/* Feedback */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Feedback for Student
              </label>

              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                maxLength={500}
                rows={5}
                placeholder="Write feedback for the student..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />

              <div className="text-xs text-gray-500 mt-1 text-right">
                {feedback.length} / 500 characters
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t">
              <button
                onClick={handleSubmitGrade}
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg transition"
              >
                {loading ? "Submitting Grade..." : "Submit Grade →"}
              </button>

              <button
                onClick={onClose}
                disabled={loading}
                className="w-full mt-3 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}