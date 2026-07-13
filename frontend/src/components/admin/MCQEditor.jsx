import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * MCQEditor - Sprint 2 Epic 02 Story 03
 * Editor for MCQ Single and Multiple Answer questions
 */

export default function MCQEditor({ question, onSave, onCancel }) {
  const [questionData, setQuestionData] = useState({
    type: question.type,
    questionText: question.questionText || '',
    points: question.points ?? 5,
    explanation: question.explanation || '',
    options: question.options || [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    partialCredit: question.partialCredit || false
  });

  const isSingle = questionData.type === 'mcq_single';

  const handlePointsChange = (value) => {
    if (value === '') {
      setQuestionData({ ...questionData, points: '' });
      return;
    }

    const parsedValue = Number(value);
    if (!Number.isNaN(parsedValue)) {
      setQuestionData({ ...questionData, points: parsedValue });
    }
  };

  // Update option text
  const handleOptionChange = (index, text) => {
    const newOptions = [...questionData.options];
    newOptions[index].text = text;
    setQuestionData({ ...questionData, options: newOptions });
  };

  // Toggle correct answer
  const handleToggleCorrect = (index) => {
    const newOptions = [...questionData.options];

    if (isSingle) {
      // Single answer: uncheck all others
      newOptions.forEach((opt, i) => {
        opt.isCorrect = i === index;
      });
    } else {
      // Multiple answers: toggle
      newOptions[index].isCorrect = !newOptions[index].isCorrect;
    }

    setQuestionData({ ...questionData, options: newOptions });
  };

  // Add option
  const handleAddOption = () => {
    if (questionData.options.length >= 6) {
      toast.error('Maximum 6 options allowed');
      return;
    }

    setQuestionData({
      ...questionData,
      options: [...questionData.options, { text: '', isCorrect: false }]
    });
  };

  // Remove option
  const handleRemoveOption = (index) => {
    if (questionData.options.length <= 2) {
      toast.error('Minimum 2 options required');
      return;
    }

    const newOptions = questionData.options.filter((_, i) => i !== index);
    setQuestionData({ ...questionData, options: newOptions });
  };

  // Save question
  const handleSave = () => {
    // Validation
    if (!questionData.questionText.trim()) {
      toast.error('Question text is required');
      return;
    }

    const hasEmptyOptions = questionData.options.some(opt => !opt.text.trim());
    if (hasEmptyOptions) {
      toast.error('All option texts are required');
      return;
    }

    const correctCount = questionData.options.filter(opt => opt.isCorrect).length;

    if (isSingle && correctCount !== 1) {
      toast.error('Exactly one option must be marked as correct');
      return;
    }

    if (!isSingle && correctCount < 2) {
      toast.error('At least 2 options must be marked as correct for multiple answer questions');
      return;
    }

    if (!Number.isInteger(questionData.points) || questionData.points < 1 || questionData.points > 100) {
      toast.error('Points must be between 1 and 100');
      return;
    }

    onSave(questionData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="mt-12 bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-purple-600 text-white p-6 rounded-t-lg flex flex-shrink-0 justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">
              {isSingle ? 'MCQ - Single Answer' : 'MCQ - Multiple Answers'}
            </h2>
            <p className="text-purple-100 text-sm mt-1">
              {isSingle ? 'Select one correct option' : 'Select multiple correct options'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-scroll custom-scrollbar p-6 space-y-6">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Question Text *
            </label>
            <textarea
              value={questionData.questionText}
              onChange={(e) => setQuestionData({ ...questionData, questionText: e.target.value })}
              placeholder="Enter your question..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Options * (Mark correct answer{!isSingle && 's'})
            </label>
            <div className="space-y-3">
              {questionData.options.map((option, index) => (
                <div key={index} className={`flex items-center space-x-3 p-3 rounded-lg border-2 ${option.isCorrect ? 'bg-green-50 border-green-300' : 'border-gray-200'}`}>
                  {/* Checkbox/Radio */}
                  <input
                    type={isSingle ? 'radio' : 'checkbox'}
                    checked={option.isCorrect}
                    onChange={() => handleToggleCorrect(index)}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />

                  {/* Option Label */}
                  <div className="font-semibold text-gray-700 w-8">
                    {String.fromCharCode(65 + index)})
                  </div>

                  {/* Option Text */}
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />

                  {/* Remove Button */}
                  {questionData.options.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Option Button */}
            {questionData.options.length < 6 && (
              <button
                onClick={handleAddOption}
                className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Option (Max 6)</span>
              </button>
            )}
          </div>

          {/* Partial Credit (Multiple Answer Only) */}
          {!isSingle && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={questionData.partialCredit}
                  onChange={(e) => setQuestionData({ ...questionData, partialCredit: e.target.checked })}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="font-semibold text-gray-800">Enable Partial Credit</span>
                  <p className="text-sm text-gray-600 mt-1">
                    {questionData.partialCredit
                      ? 'Students get points for each correct selection'
                      : 'Students must select ALL correct answers to get any points'
                    }
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Points */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Points *
            </label>
            <input
              type="number"
              value={questionData.points}
              onChange={(e) => handlePointsChange(e.target.value)}
              step="1"
              min="1"
              max="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Explanation (Optional)
              <span className="text-xs text-gray-500 ml-2">Shown to students after submission</span>
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

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex flex-shrink-0 justify-end space-x-3 border-t border-gray-200">
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
