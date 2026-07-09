import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// StudentLayout removed (handled by App.js)

/**
 * Life Skills Quiz Results Page - Epic 01 Story 05
 * Displays quiz score, coins earned, and per-question breakdown
 * Delayed feedback pattern - shows results only after full quiz completion
 */
export default function LifeSkillsQuizResults() {
  const navigate = useNavigate();
  const location = useLocation();
  // Results are nested in "results" key within the response object
  const results = location.state?.results?.results;
  const quizId =
    location.state?.quizId ||
    location.state?.results?.quizId ||
    results?.quizId;

  // If no results data, redirect back to Life Skills page
  // If no results data, redirect back to Life Skills page
  React.useEffect(() => {
    if (!results) {
      navigate('/student/life-skills');
    }
  }, [results, navigate]);

  if (!results) return null;

  const {
    score: percentage, // Backend sends score as 0-100 percentage
    correctAnswers,
    totalQuestions,
    coinsEarned, // This is the total coins earned
    alreadyEarned, // True when this task is no longer eligible for another reward
    baseCoinsAvailable, // What they would have earned if it were a fresh attempt
    breakdown
  } = results;

  const bonusCoins = 0; // Backend doesn't calculate bonus yet
  const totalCoinsEarned = coinsEarned;

  const isPassing = percentage >= 80;
  const performanceLevel =
    percentage >= 90 ? { emoji: '🌟', text: 'Outstanding!', color: 'purple' } :
      percentage >= 80 ? { emoji: '🎉', text: 'Excellent!', color: 'green' } :
        percentage >= 60 ? { emoji: '👍', text: 'Good Job!', color: 'blue' } :
          percentage >= 40 ? { emoji: '💪', text: 'Keep Trying!', color: 'yellow' } :
            { emoji: '📚', text: 'Practice More!', color: 'orange' };

  // Determine context
  const isComputerApps = location.pathname.includes('computer-apps');
  const baseRoute = isComputerApps ? '/student/computer-apps' : '/student/life-skills';
  const returnLabel = isComputerApps ? 'Return to Computer Apps' : 'Return to Life Skills';

  // Try to find courseId if available in debugInfo (Computer Apps)
  const courseId = location.state?.results?.debugInfo?.courseId;
  const returnPath = courseId ? `${baseRoute}/${courseId}` : baseRoute;

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>
            Quiz Complete! {performanceLevel.emoji}
          </h1>
          <p className="text-xl text-gray-600">
            {performanceLevel.text}
          </p>
        </div>

        {/* Score Card */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl p-8 mb-6 text-center">
          <div className="mb-6">
            <div className="text-6xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>
              {percentage}%
            </div>
            <div className="text-xl text-gray-700">
              {correctAnswers} out of {totalQuestions} correct
            </div>
          </div>

          {/* Coins Earned */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl font-bold text-yellow-600 mb-3" style={{ fontFamily: 'Patrick Hand, cursive' }}>
              💰 {totalCoinsEarned} Coins Earned!
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              {alreadyEarned ? (
                <div className="text-blue-700 font-medium">
                  ℹ️ Coins are only awarded on the first submission, but you can keep practicing! 🌟
                </div>
              ) : (
                <>
                  <div>Base coins: {coinsEarned}</div>
                  {bonusCoins > 0 && (
                    <div className="text-green-600 font-medium">
                      🎁 Bonus coins: +{bonusCoins} (scored 80% or above!)
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Performance Message */}
        {isPassing && !alreadyEarned && (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 mb-6 text-center">
            <div className="text-2xl font-bold text-green-800 mb-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>
              🎊 Congratulations! 🎊
            </div>
            <p className="text-green-700">
              You scored 80% or above and earned the bonus coins! Amazing work!
            </p>
          </div>
        )}

        {isPassing && alreadyEarned && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 mb-6 text-center">
            <div className="text-2xl font-bold text-blue-800 mb-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>
              🌟 Great Practice! 🌟
            </div>
            <p className="text-blue-700">
              Nice work completing the quiz again! Coins are only available on the first submission.
            </p>
          </div>
        )}

        {!isPassing && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 mb-6 text-center">
            <div className="text-xl font-bold text-yellow-800 mb-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>
              💪 Keep Going!
            </div>
            <p className="text-yellow-700">
              You can retry the quiz to improve your score. This task is already counted as completed.
            </p>
          </div>
        )}

        {/* Question Breakdown */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Patrick Hand, cursive' }}>
            📊 Question Breakdown
          </h2>
          <div className="space-y-4">
            {breakdown && breakdown.map((item, index) => (
              <div
                key={item.questionId}
                className={`p-4 rounded-lg border-2 ${item.isCorrect
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
                  }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start flex-1">
                    <span className={`text-2xl mr-3 ${item.isCorrect ? '' : 'mt-1'}`}>
                      {item.isCorrect ? '✅' : '❌'}
                    </span>
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 mb-1">
                        Question {index + 1}
                      </div>
                      <div className="text-gray-700 mb-2">
                        {item.question}
                      </div>
                      <div className="text-sm space-y-1">
                        <div className={`${item.isCorrect ? 'text-green-700' : 'text-red-700'} font-medium`}>
                          Your answer: {item.studentAnswer}
                        </div>
                        {!item.isCorrect && (
                          <div className="text-green-700 font-medium">
                            Correct answer: {item.correctAnswer}
                          </div>
                        )}
                      </div>
                      {item.explanation && (
                        <div className="mt-2 text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                          <strong>💡 Explanation:</strong> {item.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${item.isCorrect
                    ? 'bg-green-200 text-green-800'
                    : 'bg-red-200 text-red-800'
                    }`}>
                    {item.isCorrect ? `+${item.points || 5} coins` : '0 coins'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate(`${baseRoute}/quiz/${quizId}`)}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg transition-all shadow-md hover:shadow-lg"
            style={{ fontFamily: 'Patrick Hand, cursive' }}
          >
            🔄 Retry Quiz
          </button>
          <button
            onClick={() => navigate(returnPath)}
            className="px-8 py-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-bold text-lg transition-all"
            style={{ fontFamily: 'Patrick Hand, cursive' }}
          >
            ← {returnLabel}
          </button>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-900" style={{ fontFamily: 'Patrick Hand, cursive' }}>
              {correctAnswers}
            </div>
            <div className="text-sm text-gray-600">Correct</div>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-900" style={{ fontFamily: 'Patrick Hand, cursive' }}>
              {totalQuestions - correctAnswers}
            </div>
            <div className="text-sm text-gray-600">Incorrect</div>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-900" style={{ fontFamily: 'Patrick Hand, cursive' }}>
              {totalCoinsEarned}
            </div>
            <div className="text-sm text-gray-600">Coins Earned</div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-purple-50 border-2 border-purple-300 rounded-xl p-6">
          <h3 className="text-lg font-bold text-purple-900 mb-3" style={{ fontFamily: 'Patrick Hand, cursive' }}>
            💡 Tips to Improve
          </h3>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">🎧</span>
              <span>Listen carefully to each audio question before answering</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">🤔</span>
              <span>Take your time to think about each answer before selecting</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">📖</span>
              <span>Review the explanations for questions you got wrong</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">🔄</span>
              <span>Practice makes perfect! You can retake the quiz anytime</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
