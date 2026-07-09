import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function QuizPreview({ quiz, onClose }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const question = quiz.questions[currentQuestion];

  if (!question) {
    return null;
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Quiz Preview: {quiz.title}</h2>
              <p className="text-purple-100 text-sm mt-1">⚠️ PREVIEW MODE: This is how students will see the quiz</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-purple-700 rounded-lg transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="mt-4 flex justify-between items-center text-sm">
            {quiz.settings.timeLimit && !quiz.settings.noTimeLimit && (
              <div>⏱️ Time Remaining: {quiz.settings.timeLimit}:00</div>
            )}
            <div>Question {currentQuestion + 1} of {quiz.questions.length}</div>
          </div>
        </div>

        {/* Question */}
        <div className="p-8">
          <div className="mb-6">
            <div className="text-lg font-bold text-gray-800 mb-2">
              Question {currentQuestion + 1} ({question.points} points)
            </div>
            <div className="text-xl text-gray-800">{question.questionText}</div>
          </div>

          {/* MCQ Options */}
          {(question.type === 'mcq_single' || question.type === 'mcq_multiple') && (
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <div
                  key={index}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type={question.type === 'mcq_single' ? 'radio' : 'checkbox'}
                      name="answer"
                      className="h-5 w-5 text-purple-600"
                    />
                    <span className="text-gray-800">{String.fromCharCode(65 + index)}) {option.text}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* True/False */}
          {question.type === 'true_false' && (
            <div className="space-y-3">
              <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <input type="radio" name="answer" className="h-5 w-5 text-purple-600" />
                  <span className="text-gray-800 font-semibold">True</span>
                </div>
              </div>
              <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <input type="radio" name="answer" className="h-5 w-5 text-purple-600" />
                  <span className="text-gray-800 font-semibold">False</span>
                </div>
              </div>
            </div>
          )}

          {/* Fill in Blank */}
          {question.type === 'fill_blank' && (
            <div>
              <input
                type="text"
                placeholder="Type your answer..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg flex justify-between items-center border-t border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <ChevronLeft size={20} />
            <span>Previous</span>
          </button>

          {currentQuestion === quiz.questions.length - 1 ? (
            <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Submit Quiz (Preview Only)
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <span>Next</span>
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
