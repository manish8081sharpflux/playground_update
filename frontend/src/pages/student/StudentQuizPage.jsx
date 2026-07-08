import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '../../api';
import toast from 'react-hot-toast';
import AudioQuestionCard from '../../components/student/lifeskills/AudioQuestionCard';
import { useCoinBalance } from '../../contexts/CoinBalanceContext';

/**
 * Generic Student MCQ Quiz Page
 * Reused for Life Skills, Computer Apps, etc.
 * Detects context based on URL path.
 */
export default function StudentQuizPage() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const location = useLocation();
  const { refreshBalance } = useCoinBalance();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [courseId, setCourseId] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [audioCompleted, setAudioCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Determine Context (Life Skills vs Computer Apps)
  const isComputerApps = location.pathname.includes('computer-apps');
  const courseSlug = isComputerApps ? 'computer-apps' : 'life-skills';
  const baseRoute = `/student/${courseSlug}`;

  useEffect(() => {
    fetchQuizQuestions();
  }, [quizId]);

  useEffect(() => {
    // Reset audio completion when question changes
    const question = questions[currentQuestionIndex];
    if (question && !question.audioUrl) {
      setAudioCompleted(true);
    } else {
      setAudioCompleted(false);
    }
  }, [currentQuestionIndex, questions]);

  const fetchQuizQuestions = async () => {
    try {
      setLoading(true);
      const studentId = localStorage.getItem('userId') || 'student1';
      const response = await api.get(
        `/api/v2/lms/student/${studentId}/courses/${courseSlug}/quiz/${quizId}`
      );

      if (response.data.success && response.data.quiz && response.data.quiz.questions) {
        setQuestions(response.data.quiz.questions);
        setQuizTitle(response.data.quiz.title);

        // Prioritize passed courseId from navigation state (Context Awareness)
        const passedCourseId = location.state?.courseId;
        if (passedCourseId) {
          setCourseId(passedCourseId);
        } else if (response.data.quiz.course) {
          // Fallback to internal quiz course
          const cId = response.data.quiz.course._id || response.data.quiz.course;
          setCourseId(cId);
        }
      } else {
        const errorMsg = response.data.error || response.data.message || 'Failed to load quiz questions';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Error fetching quiz:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to load quiz questions';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionKey) => {
    // Determine if question._id or question.id is used (backend consistency)
    // Life Skills uses .id, Computer Apps uses ._id (MongoDB)
    // We'll normalize or check both.
    const question = questions[currentQuestionIndex];
    const qId = question.id || question._id;

    setAnswers({
      ...answers,
      [qId]: optionKey
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    // Check if all questions are answered
    // const unansweredCount = questions.length - Object.keys(answers).length;
    // if (unansweredCount > 0) {
    //   toast.error(`Please answer all questions (${unansweredCount} remaining)`);
    //   return;
    // }

    const unansweredQuestions = questions.filter(q => {
      const qId = q.id || q._id;
      const answer = answers[qId];

      if (q.type === "fill_blank") {
        return !answer || answer.trim() === "";
      }

      return !answer;
    });

    if (unansweredQuestions.length > 0) {
      toast.error(`Please answer all questions (${unansweredQuestions.length} remaining)`);
      return;
    }

    try {
      setSubmitting(true);
      const studentId = localStorage.getItem('userId') || 'student1';

      // Format answers
      const formattedAnswers = questions.map(q => {
        const questionId = q.id || q._id;
        const answer = answers[questionId];

        return {
          questionId,
          selectedOptionId: q.type === 'fill_blank' ? null : answer,
          answerText: q.type === 'fill_blank' ? answer : null
        };
      });

      const response = await api.post(
        `/api/v2/lms/student/${studentId}/courses/${courseSlug}/quiz/submit`,
        {
          quizId: quizId,
          courseId: courseId, // Pass explicitly from URL/State
          answers: formattedAnswers
        }
      );

      if (response.data.success) {
        toast.success('Quiz submitted successfully!');
        if (!isComputerApps) {
          await refreshBalance(); // Only for Life Skills for now? Or both?
        }

        // Navigate to results page
        navigate(`${baseRoute}/quiz/results`, {
          state: {
            results: response.data,
            quizId: quizId,
            courseId: courseId
          }
        });
      } else {
        const errorMsg = response.data.error || response.data.message || 'Failed to submit quiz';
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to submit quiz';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-xl text-red-600 mb-4">{error || 'No questions found'}</p>
            <button
              onClick={() => navigate(baseRoute)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Return to Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const qId = currentQuestion.id || currentQuestion._id;
  const currentAnswer = answers[qId];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const canSubmit =
    questions.every(q => {
      const qId = q.id || q._id;
      const answer = answers[qId];

      if (q.type === "fill_blank") {
        return answer && answer.trim() !== "";
      }

      return !!answer;
    }) && !submitting;

  return (
    <div className="bg-gray-100 min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-blue-900" style={{ fontFamily: 'Patrick Hand, cursive' }}>
              {quizTitle || 'Quiz Time 📝'}
            </h1>
            <button
              onClick={() => navigate(baseRoute)}
              className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Exit Quiz
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{Object.keys(answers).length} / {questions.length} answered</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Audio Question Card */}
        {currentQuestion.audioUrl && (
          <AudioQuestionCard
            audioUrl={currentQuestion.audioUrl}
            questionText={currentQuestion.questionText || currentQuestion.question || currentQuestion.text}
            onAudioComplete={() => setAudioCompleted(true)}
            autoPlay={true}
          />
        )}

        {/* Question Text */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Patrick Hand, cursive' }}>
            {currentQuestion.questionText || currentQuestion.question || currentQuestion.text}
          </h2>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.type === 'fill_blank' ? (
              <>
                <input
                  type="text"
                  placeholder="Type your answer here..."
                  value={currentAnswer || ""}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                  onBlur={(e) => handleAnswerSelect(e.target.value.trim())}
                  disabled={!audioCompleted && !!currentQuestion.audioUrl}
                  className={`w-full px-4 py-3 rounded-lg border-2 ${currentAnswer?.trim()
                    ? "border-gray-300 focus:border-blue-500"
                    : "border-red-400 focus:border-red-500"
                    } focus:outline-none`}
                />

                {(!currentAnswer || currentAnswer.trim() === "") && (
                  <p className="mt-2 text-sm text-red-500">
                    Answer is required.
                  </p>
                )}
              </>
            ) : (
              (() => {
                let displayOptions = currentQuestion.options || [];

                if (currentQuestion.type === 'true_false' && displayOptions.length === 0) {
                  displayOptions = [
                    { id: 'True', text: 'True' },
                    { id: 'False', text: 'False' }
                  ];
                }

                return displayOptions.map((option, idx) => {
                  const optId = option.id || option._id;

                  return (
                    <label
                      key={optId}
                      className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${currentAnswer === optId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                        } ${!audioCompleted && currentQuestion.audioUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id || currentQuestion._id}`}
                        value={optId}
                        checked={currentAnswer === optId}
                        onChange={() => handleAnswerSelect(optId)}
                        disabled={!audioCompleted && !!currentQuestion.audioUrl}
                        className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                      />

                      <span className="ml-3 text-gray-800 font-medium">
                        {String.fromCharCode(65 + idx)}. {option.text}
                      </span>
                    </label>
                  );
                });
              })()
            )}
          </div>

          {/* Audio Enforcement Message */}
          {!audioCompleted && currentQuestion.audioUrl && (
            <div className="mt-4 flex items-center text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Please listen to the complete audio before selecting an answer
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            style={{ fontFamily: 'Patrick Hand, cursive' }}
          >
            ← Previous
          </button>

          <div className="flex-1 text-center">
            {currentAnswer && (
              <span className="text-green-600 font-medium">
                ✓ Answer saved
              </span>
            )}
          </div>

          {!isLastQuestion && (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              style={{ fontFamily: 'Patrick Hand, cursive' }}
            >
              Next →
            </button>
          )}

          {isLastQuestion && (
            <button
              onClick={handleSubmitQuiz}
              disabled={!canSubmit}
              className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${canSubmit
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              style={{ fontFamily: 'Patrick Hand, cursive' }}
            >
              {submitting ? 'Submitting...' : 'Submit Quiz 🎉'}
            </button>
          )}
        </div>

        {/* Answer Summary (Bottom) */}
        <div className="mt-8 bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'Patrick Hand, cursive' }}>
            Answer Summary
          </h3>
          <div className="grid grid-cols-10 gap-2">
            {questions.map((q, idx) => {
              const qId = q.id || q._id;
              const isAnswered =
                q.type === "fill_blank"
                  ? !!answers[qId]?.trim()
                  : !!answers[qId];
              const isCurrent = idx === currentQuestionIndex;
              return (
                <button
                  key={qId}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${isCurrent
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : isAnswered
                      ? 'bg-green-100 text-green-700 border-2 border-green-400'
                      : 'bg-gray-200 text-gray-500 border-2 border-gray-300'
                    }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Click on a question number to jump to it
          </p>
        </div>
      </div>
    </div>
  );
}
