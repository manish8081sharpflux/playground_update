import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FillBlankEditor({ question, onSave, onCancel }) {
  const [questionData, setQuestionData] = useState({
    type: 'fill_blank',
    questionText: question.questionText || '',
    points: question.points || 4,
    explanation: question.explanation || '',
    acceptedAnswers: question.acceptedAnswers || [''],
    caseInsensitive: question.caseInsensitive !== undefined ? question.caseInsensitive : true,
    ignoreExtraSpaces: question.ignoreExtraSpaces !== undefined ? question.ignoreExtraSpaces : true
  });

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...questionData.acceptedAnswers];
    newAnswers[index] = value;
    setQuestionData({ ...questionData, acceptedAnswers: newAnswers });
  };

  const handleAddAnswer = () => {
    if (questionData.acceptedAnswers.length >= 5) {
      toast.error('Maximum 5 accepted answer variants allowed');
      return;
    }
    setQuestionData({
      ...questionData,
      acceptedAnswers: [...questionData.acceptedAnswers, '']
    });
  };

  const handleRemoveAnswer = (index) => {
    if (questionData.acceptedAnswers.length <= 1) {
      toast.error('At least one accepted answer is required');
      return;
    }
    const newAnswers = questionData.acceptedAnswers.filter((_, i) => i !== index);
    setQuestionData({ ...questionData, acceptedAnswers: newAnswers });
  };

  const handleSave = () => {
    if (!questionData.questionText.trim()) {
      toast.error('Question text is required');
      return;
    }

    if (!questionData.questionText.includes('_____')) {
      toast.error('Question must contain at least one blank (_____))');
      return;
    }

    const hasEmptyAnswers = questionData.acceptedAnswers.some(ans => !ans.trim());
    if (hasEmptyAnswers) {
      toast.error('All accepted answers must have text');
      return;
    }

    if (questionData.points < 1 || questionData.points > 100) {
      toast.error('Points must be between 1 and 100');
      return;
    }

    // Filter out empty answers
    const cleanedData = {
      ...questionData,
      acceptedAnswers: questionData.acceptedAnswers.filter(ans => ans.trim())
    };

    onSave(cleanedData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-purple-600 text-white p-6 rounded-t-lg flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Fill in the Blank</h2>
            <p className="text-purple-100 text-sm mt-1">Use _____ for blanks to fill</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-purple-700 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Question Text * <span className="text-xs text-gray-500">(Use _____ for blank)</span>
            </label>
            <textarea
              value={questionData.questionText}
              onChange={(e) => setQuestionData({ ...questionData, questionText: e.target.value })}
              placeholder="Example: The keyboard shortcut _____ + S saves a file in Windows."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Accepted Answers * <span className="text-xs text-gray-500">(Add variants like Ctrl, CTRL, ctrl)</span>
            </label>
            <div className="space-y-2">
              {questionData.acceptedAnswers.map((answer, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="flex-1 flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-green-600 font-semibold">✓</span>
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      placeholder={`Answer variant ${index + 1}`}
                      className="flex-1 px-3 py-2 border-0 bg-transparent focus:ring-0"
                    />
                  </div>
                  {questionData.acceptedAnswers.length > 1 && (
                    <button
                      onClick={() => handleRemoveAnswer(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {questionData.acceptedAnswers.length < 5 && (
              <button
                onClick={handleAddAnswer}
                className="mt-2 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Answer Variant (Max 5)</span>
              </button>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={questionData.caseInsensitive}
                onChange={(e) => setQuestionData({ ...questionData, caseInsensitive: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="font-semibold text-gray-800">Case-insensitive matching</span>
                <p className="text-xs text-gray-600">Accept Ctrl, CTRL, ctrl, etc.</p>
              </div>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={questionData.ignoreExtraSpaces}
                onChange={(e) => setQuestionData({ ...questionData, ignoreExtraSpaces: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="font-semibold text-gray-800">Ignore extra spaces</span>
                <p className="text-xs text-gray-600">Trim whitespace before matching</p>
              </div>
            </label>
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
              placeholder="Explain the correct answer..."
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
