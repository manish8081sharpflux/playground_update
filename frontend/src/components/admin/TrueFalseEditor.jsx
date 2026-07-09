import React, { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TrueFalseEditor({ question, onSave, onCancel }) {
  const [questionData, setQuestionData] = useState({
    type: 'true_false',
    questionText: question.questionText || '',
    points: question.points || 3,
    explanation: question.explanation || '',
    correctAnswer: question.correctAnswer !== undefined ? question.correctAnswer : true
  });

  const handleSave = () => {
    if (!questionData.questionText.trim()) {
      toast.error('Question text is required');
      return;
    }

    if (questionData.points < 1 || questionData.points > 100) {
      toast.error('Points must be between 1 and 100');
      return;
    }

    onSave(questionData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-purple-600 text-white p-6 rounded-t-lg flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">True / False</h2>
            <p className="text-purple-100 text-sm mt-1">Statement verification question</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-purple-700 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Statement *</label>
            <textarea
              value={questionData.questionText}
              onChange={(e) => setQuestionData({ ...questionData, questionText: e.target.value })}
              placeholder="Enter a true or false statement..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Correct Answer *</label>
            <div className="space-y-3">
              <div
                onClick={() => setQuestionData({ ...questionData, correctAnswer: true })}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  questionData.correctAnswer
                    ? 'bg-green-50 border-green-300'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    checked={questionData.correctAnswer === true}
                    readOnly
                    className="h-5 w-5 text-green-600"
                  />
                  <span className="font-semibold text-lg">True</span>
                </div>
              </div>

              <div
                onClick={() => setQuestionData({ ...questionData, correctAnswer: false })}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  !questionData.correctAnswer
                    ? 'bg-green-50 border-green-300'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    checked={questionData.correctAnswer === false}
                    readOnly
                    className="h-5 w-5 text-green-600"
                  />
                  <span className="font-semibold text-lg">False</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Points *</label>
            <input
              type="number"
              value={questionData.points}
              onChange={(e) => setQuestionData({ ...questionData, points: parseInt(e.target.value) || 0 })}
              min="1"
              max="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Explanation (Optional)
            </label>
            <textarea
              value={questionData.explanation}
              onChange={(e) => setQuestionData({ ...questionData, explanation: e.target.value })}
              placeholder="Explain why the statement is true or false..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Save Question
          </button>
        </div>
      </div>
    </div>
  );
}
