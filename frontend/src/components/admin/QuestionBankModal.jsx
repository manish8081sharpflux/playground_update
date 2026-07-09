import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

export default function QuestionBankModal({ onClose, onAddQuestions }) {
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, [typeFilter, searchQuery]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        search: searchQuery || undefined,
        sort: 'most_used',
        limit: 50
      };

      const response = await api.get('/api/v2/lms/admin/question-bank', { params });
      if (response.data.success) {
        setQuestions(response.data.questions);
      }
    } catch (error) {
      console.error('Error fetching question bank:', error);
      toast.error('Failed to load question bank');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (question) => {
    const isSelected = selectedQuestions.find(q => q._id === question._id);
    if (isSelected) {
      setSelectedQuestions(selectedQuestions.filter(q => q._id !== question._id));
    } else {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };

  const handleAdd = () => {
    if (selectedQuestions.length === 0) {
      toast.error('Please select at least one question');
      return;
    }
    onAddQuestions(selectedQuestions);
  };

  const getTypeLabel = (type) => {
    const labels = {
      mcq_single: 'MCQ',
      mcq_multiple: 'MCQ-M',
      true_false: 'T/F',
      fill_blank: 'Fill'
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-purple-600 text-white p-6 rounded-t-lg flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Question Bank</h2>
            <p className="text-purple-100 text-sm mt-1">Browse and add questions from your library</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-purple-700 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="flex items-center space-x-3 mb-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Types</option>
              <option value="mcq_single">MCQ Single</option>
              <option value="mcq_multiple">MCQ Multiple</option>
              <option value="true_false">True/False</option>
              <option value="fill_blank">Fill Blank</option>
            </select>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Questions List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading questions...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No questions found in bank</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {questions.map((question) => {
                const isSelected = selectedQuestions.find(q => q._id === question._id);
                return (
                  <div
                    key={question._id}
                    onClick={() => toggleSelect(question)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-purple-50 border-purple-300' : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="mt-1 h-5 w-5 text-purple-600"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{question.questionText}</div>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span className="px-2 py-1 bg-gray-100 rounded">{getTypeLabel(question.type)}</span>
                          <span>{question.points} pts</span>
                          <span>Used in {question.usageCount} quizzes</span>
                          {question.tags && question.tags.length > 0 && (
                            <span className="text-purple-600">Tags: {question.tags.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg flex justify-between items-center border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedQuestions.length} question(s) selected
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedQuestions.length === 0}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Selected to Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
