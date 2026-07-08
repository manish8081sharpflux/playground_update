// frontend/src/components/coach/grading/QuizGradingInterface.jsx
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../api";
import GradingPanel from "./GradingPanel";

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
  const [detailedSubmission, setDetailedSubmission] = useState(null);

  const activeSubmission = detailedSubmission || submission;

  const hasAnswers = (value) => {
    if (Array.isArray(value)) return value.length > 0;
    return !!value && typeof value === "object" && Object.keys(value).length > 0;
  };

  useEffect(() => {
    let cancelled = false;

    const loadSubmissionDetails = async () => {
      const existingAnswers =
        submission?.answers ||
        submission?.metadata?.breakdown ||
        submission?.metadata?.answers;

      if (!submission?.id || hasAnswers(existingAnswers)) {
        setDetailedSubmission(null);
        return;
      }

      try {
        const response = await api.get(
          `/api/v2/lms/coach/grading/submissions/${submission.id}`
        );
        if (!cancelled) {
          setDetailedSubmission(response.data.submission || null);
        }
      } catch (error) {
        if (!cancelled) {
          setDetailedSubmission(null);
        }
      }
    };

    loadSubmissionDetails();

    return () => {
      cancelled = true;
    };
  }, [submission?.id, submission?.answers, submission?.metadata]);
  const handleGrade = async (gradeData) => {
    try {
      await api.post(
        `/api/v2/lms/coach/grading/submissions/${activeSubmission.id}/grade`,
        {
          ...gradeData,
          submissionType: "quiz",
          gradedBy: coachId,
        }
      );

      toast.success(
        `Quiz grade submitted! ${activeSubmission.studentName} earned ${gradeData.coinsAwarded} ISF Coins!`
      );

      if (onNavigate && currentIndex < totalCount - 1) {
        onNavigate("next");
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to submit quiz grade");
      throw error;
    }
  };

  const answerPayload =
    activeSubmission?.answers ||
    activeSubmission?.quizAnswers ||
    activeSubmission?.studentAnswers ||
    activeSubmission?.responses ||
    activeSubmission?.submissionAnswers ||
    activeSubmission?.submissionData?.answers ||
    activeSubmission?.submissionData?.quizAnswers ||
    activeSubmission?.data?.answers ||
    activeSubmission?.metadata?.breakdown ||
    activeSubmission?.metadata?.answers ||
    [];

  const answers = Array.isArray(answerPayload)
    ? answerPayload
    : Object.values(answerPayload || {});

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US");
  };

  return (
    <div className="mt-12 min-h-screen bg-white">
      <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between border-b border-blue-700">
        <h2 className="text-xl font-bold">
          Grading: {activeSubmission?.taskTitle || activeSubmission?.quizTitle || "Quiz"} -{" "}
          {activeSubmission?.studentName}
        </h2>

        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 text-2xl font-bold px-4"
        >
          X Close
        </button>
      </div>

      <div className="flex">
        <div className="w-3/5 p-8 border-r border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Quiz Submission
          </h3>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6 space-y-2 text-sm text-gray-700">
            <div>
              <strong>Student:</strong> {activeSubmission?.studentName || "N/A"}
            </div>

            <div>
              <strong>Course:</strong> {activeSubmission?.courseTitle || "N/A"}
            </div>

            <div>
              <strong>Quiz:</strong>{" "}
              {activeSubmission?.quizTitle || activeSubmission?.taskTitle || "Quiz"}
            </div>

            <div>
              <strong>Submitted:</strong> {formatDate(activeSubmission?.submittedAt)}
            </div>
          </div>

          <div
            className="border border-gray-300 rounded-lg bg-gray-50 p-4 overflow-y-auto"
            style={{ height: "350px" }}
          >
            <h4 className="font-bold text-gray-900 mb-4">Student Answers</h4>

            {answers.length > 0 ? (
              <div className="space-y-4">
                {answers.map((item, index) => {
                  const studentAnswer =
                    item.answer ||
                    item.selectedAnswer ||
                    item.studentAnswer ||
                    item.response ||
                    item.answerText ||
                    item.selectedOptionText ||
                    item.value ||
                    "Not answered";

                  const qualityRating =
                    item.qualityRating ||
                    item.rating ||
                    item.answerQuality ||
                    item.quality ||
                    "N/A";

                  return (
                    <div
                      key={item.questionId || index}
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <p className="font-medium text-gray-900 mb-2">
                        Q{index + 1}. {item.question || item.questionText || "Question"}
                      </p>

                      <p className="text-sm text-gray-700">
                        <strong>Student Answer:</strong> {studentAnswer}
                      </p>

                      <p className="text-sm text-gray-700 mt-1">
                        <strong>Quality Rating:</strong> {qualityRating}
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

          {onNavigate && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate("previous")}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>

                <button
                  onClick={() => onNavigate("next")}
                  disabled={currentIndex === totalCount - 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
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
                    Skip
                  </button>
                )}

                {onFlag && (
                  <button
                    onClick={onFlag}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                  >
                    Flag
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className="w-2/5 bg-gray-50 overflow-y-auto"
          style={{ maxHeight: "100vh" }}
        >
          <GradingPanel
            submission={activeSubmission}
            onGrade={handleGrade}
            coachId={coachId}
          />
        </div>
      </div>
    </div>
  );
}
