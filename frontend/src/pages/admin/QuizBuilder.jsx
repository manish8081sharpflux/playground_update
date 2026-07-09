import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Eye, ArrowLeft, Plus, GripVertical } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../utils/dialogs';
import MCQEditor from '../../components/admin/MCQEditor';
import TrueFalseEditor from '../../components/admin/TrueFalseEditor';
import FillBlankEditor from '../../components/admin/FillBlankEditor';
import QuestionBankModal from '../../components/admin/QuestionBankModal';
import QuizPreview from '../../components/admin/QuizPreview';
import LoadingState from '../../components/common/LoadingState';

const QUIZ_ENABLED_COURSE_CATEGORIES = ['Computer Apps', 'Life Skills'];

const getCourseType = (course) => course?.category || course?.title;

const getUnsupportedQuizCourseMessage = (course) => {
  if (!course) {
    return '';
  }

  if (QUIZ_ENABLED_COURSE_CATEGORIES.includes(getCourseType(course))) {
    return '';
  }

  return `Quizzes can be published only for ${QUIZ_ENABLED_COURSE_CATEGORIES.join(' or ')} courses.`;
};

/**
 * QuizBuilder - Sprint 2 Epic 02 Story 03
 * Main quiz creation/editing interface with question editors
 */

export default function QuizBuilder() {
  const navigate = useNavigate();
  const { quizId, courseId } = useParams();
  const isEditMode = !!quizId;

  // Quiz State
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    course: courseId || '',
    module: '',
    chapter: '',
    questions: [],
    settings: {
      timeLimit: 15,
      noTimeLimit: false,
      passingScore: 70,
      randomizeQuestions: false,
      randomizeOptions: false,
      showQuestionsOneAtTime: false,
      showResults: 'immediate',
      showScore: true,
      showCorrectness: true,
      showAnswers: true,
      showExplanations: true,
      maxAttempts: null,
      unlimitedAttempts: true,
      waitBetweenAttempts: 0
    },
    tags: []
  });

  // UI State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [chapters, setChapters] = useState([]);

  // Modal State
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionType, setQuestionType] = useState(null);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);



  const loadQuiz = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v2/lms/admin/quizzes/${quizId}`);
      if (response.data.success) {
        const loadedQuiz = response.data.quiz;

        // Normalize location data (handle populated objects)
        const normalizeId = (field) => {
          if (!field) return '';
          return typeof field === 'object' ? field._id : field;
        };

        setQuiz({
          ...loadedQuiz,
          course: normalizeId(loadedQuiz.course),
          module: normalizeId(loadedQuiz.module),
          chapter: normalizeId(loadedQuiz.chapter)
        });
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  const loadCourses = useCallback(async () => {
    try {
      const response = await api.get('/api/v2/lms/admin/courses');
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  }, []);

  const loadModules = useCallback(async (courseId) => {
    try {
      const response = await api.get(`/api/v2/lms/admin/courses/${courseId}/modules`);
      if (response.data.success) {
        setModules(response.data.modules);
      }
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  }, []);

  const loadChapters = useCallback(async (moduleId) => {
    try {
      const response = await api.get(`/api/v2/lms/admin/modules/${moduleId}/chapters`);
      if (response.data.success) {
        setChapters(response.data.chapters);
      }
    } catch (error) {
      console.error('Error loading chapters:', error);
    }
  }, []);

  // Load quiz if editing
  useEffect(() => {
    if (isEditMode) {
      loadQuiz();
    }
    loadCourses();
  }, [quizId, isEditMode, loadQuiz, loadCourses]);

  // Load modules when course changes
  useEffect(() => {
    if (quiz.course) {
      loadModules(quiz.course);
    } else {
      setModules([]);
    }
  }, [quiz.course, loadModules]);

  // Load chapters when module changes
  useEffect(() => {
    if (quiz.module) {
      loadChapters(quiz.module);
    } else {
      setChapters([]);
    }
  }, [quiz.module, loadChapters]);

  const selectedCourse = courses.find((course) => course._id === quiz.course);
  const unsupportedCourseMessage = getUnsupportedQuizCourseMessage(selectedCourse);

  // Save quiz
  const handleSave = async (publish = false) => {
    // Validation
    if (!quiz.title || quiz.title.trim().length < 3) {
      toast.error('Quiz title must be at least 3 characters');
      return;
    }

    if (publish && quiz.questions.length === 0) {
      toast.error('Cannot publish quiz without questions');
      return;
    }

    if (publish && !quiz.chapter) {
      toast.error('Cannot publish quiz without associating to a chapter');
      return;
    }

    if (publish) {
      if (unsupportedCourseMessage) {
        toast.error(unsupportedCourseMessage);
        return;
      }
    }

    try {
      setSaving(true);

      const quizData = {
        ...quiz,
        questions: quiz.questions.map((q, index) => ({ ...q, order: index }))
      };

      let response;
      if (isEditMode) {
        response = await api.put(`/api/v2/lms/admin/quizzes/${quizId}`, quizData);
      } else {
        response = await api.post('/api/v2/lms/admin/quizzes', quizData);
      }

      if (response.data.success) {
        toast.success(`Quiz ${isEditMode ? 'updated' : 'created'} successfully`);

        // Publish if requested
        if (publish && response.data.quiz.status !== 'published') {
          await api.put(`/api/v2/lms/admin/quizzes/${response.data.quiz._id}/publish`);
          toast.success('Quiz published successfully');
        }

        navigate('/admin/quizzes');
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error(error.response?.data?.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  // Add question
  const handleAddQuestion = (type) => {
    setQuestionType(type);
    setEditingQuestion({
      type,
      questionText: '',
      points: 5,
      explanation: '',
      options: type.startsWith('mcq') ? [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ] : [],
      correctAnswer: type === 'true_false' ? true : undefined,
      acceptedAnswers: type === 'fill_blank' ? [] : undefined,
      caseInsensitive: true,
      ignoreExtraSpaces: true,
      partialCredit: false
    });
    setShowAddMenu(false);
  };

  // Save question
  const handleSaveQuestion = (questionData) => {
    if (editingQuestion.index !== undefined) {
      // Update existing question
      const updatedQuestions = [...quiz.questions];
      updatedQuestions[editingQuestion.index] = questionData;
      setQuiz({ ...quiz, questions: updatedQuestions });
    } else {
      // Add new question
      setQuiz({ ...quiz, questions: [...quiz.questions, questionData] });
    }

    setEditingQuestion(null);
    setQuestionType(null);
    toast.success('Question saved');
  };

  // Edit question
  const handleEditQuestion = (index) => {
    setEditingQuestion({ ...quiz.questions[index], index });
    setQuestionType(quiz.questions[index].type);
  };

  // Delete question
  const handleDeleteQuestion = async (index) => {
    if (!(await confirmDialog('Delete this question?', { danger: true, confirmText: 'Delete' }))) return;

    const updatedQuestions = quiz.questions.filter((_, i) => i !== index);
    setQuiz({ ...quiz, questions: updatedQuestions });
    toast.success('Question deleted');
  };

  // Add questions from bank
  const handleAddFromBank = (questions) => {
    const newQuestions = questions.map((q, index) => ({
      type: q.type,
      questionText: q.questionText,
      points: q.points,
      explanation: q.explanation,
      options: q.options,
      correctAnswer: q.correctAnswer,
      acceptedAnswers: q.acceptedAnswers,
      caseInsensitive: q.caseInsensitive,
      ignoreExtraSpaces: q.ignoreExtraSpaces,
      partialCredit: q.partialCredit,
      questionBankId: q._id,
      order: quiz.questions.length + index
    }));

    setQuiz({ ...quiz, questions: [...quiz.questions, ...newQuestions] });
    toast.success(`${questions.length} question(s) added from bank`);
    setShowQuestionBank(false);
  };

  // Get question type label
  const getQuestionTypeLabel = (type) => {
    const labels = {
      mcq_single: 'MCQ - Single Answer',
      mcq_multiple: 'MCQ - Multiple Answers',
      true_false: 'True / False',
      fill_blank: 'Fill in the Blank'
    };
    return labels[type] || type;
  };

  if (loading) {
    return <LoadingState message="Loading quiz..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full pb-12">
      {/* Header */}
      <div className="bg-purple-600 text-white p-6 shadow-md mb-6">
        <div className="flex justify-between items-center py-6 px-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/quizzes')}
              className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold">
                {isEditMode ? 'Edit Quiz' : 'Create New Quiz'}
              </h1>
              <p className="text-purple-100 mt-1">Build your quiz with multiple question types</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${quiz.status === 'published' ? 'bg-green-100 text-green-800' :
              quiz.status === 'archived' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
              {quiz.status ? quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1) : 'Draft'}
            </div>

            <button
              onClick={() => setShowPreview(true)}
              disabled={quiz.questions.length === 0}
              className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye size={20} />
              <span>Preview</span>
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-800 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <Save size={20} />
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || quiz.questions.length === 0}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Publish Quiz
            </button>
          </div>
        </div>
      </div>

      <div className="px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column - Quiz Metadata & Questions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quiz Metadata */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Quiz Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quiz Title *
                  </label>
                  <input
                    type="text"
                    value={quiz.title}
                    onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                    placeholder="Enter quiz title"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={quiz.description}
                    onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
                    placeholder="Enter quiz description"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Course
                    </label>
                    <select
                      value={quiz.course}
                      onChange={(e) => setQuiz({ ...quiz, course: e.target.value, module: '', chapter: '' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select Course</option>
                      {(courses || []).map(course => (
                        <option key={course._id} value={course._id}>{course.title}</option>
                      ))}
                    </select>
                    {unsupportedCourseMessage && (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        {unsupportedCourseMessage}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Module
                    </label>
                    <select
                      value={quiz.module}
                      onChange={(e) => setQuiz({ ...quiz, module: e.target.value, chapter: '' })}
                      disabled={!quiz.course}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select Module</option>
                      {(modules || []).map(module => (
                        <option key={module._id} value={module._id}>{module.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Chapter
                    </label>
                    <select
                      value={quiz.chapter}
                      onChange={(e) => setQuiz({ ...quiz, chapter: e.target.value })}
                      disabled={!quiz.module}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select Chapter</option>
                      {(chapters || []).map(chapter => (
                        <option key={chapter._id} value={chapter._id}>{chapter.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions Section */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Questions ({quiz.questions.length})</h2>
                <div className="relative">
                  <button
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus size={20} />
                    <span>Add Question</span>
                  </button>

                  {showAddMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <button
                        onClick={() => handleAddQuestion('mcq_single')}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100"
                      >
                        <div className="font-semibold">MCQ - Single Answer</div>
                        <div className="text-xs text-gray-500">One correct option</div>
                      </button>
                      <button
                        onClick={() => handleAddQuestion('mcq_multiple')}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100"
                      >
                        <div className="font-semibold">MCQ - Multiple Answers</div>
                        <div className="text-xs text-gray-500">Multiple correct options</div>
                      </button>
                      <button
                        onClick={() => handleAddQuestion('true_false')}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100"
                      >
                        <div className="font-semibold">True / False</div>
                        <div className="text-xs text-gray-500">Statement verification</div>
                      </button>
                      <button
                        onClick={() => handleAddQuestion('fill_blank')}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100"
                      >
                        <div className="font-semibold">Fill in the Blank</div>
                        <div className="text-xs text-gray-500">Text input matching</div>
                      </button>
                      <button
                        onClick={() => {
                          setShowQuestionBank(true);
                          setShowAddMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-purple-50 text-purple-600 font-semibold"
                      >
                        Browse Question Bank
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {quiz.questions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No questions added yet</p>
                  <p className="text-sm mt-2">Click "Add Question" to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(quiz.questions || []).map((question, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className="cursor-move text-gray-400 hover:text-gray-600">
                          <GripVertical size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-800">
                                Q{index + 1}. {question.questionText}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {getQuestionTypeLabel(question.type)} • {question.points} points
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEditQuestion(index)}
                                className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded hover:bg-blue-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(index)}
                                className="text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Settings Column */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow sticky top-6">
              <h2 className="text-xl font-bold mb-4">Quiz Settings</h2>

              <div className="space-y-4">
                {/* Time Limit */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    value={quiz.settings.timeLimit}
                    onChange={(e) => setQuiz({
                      ...quiz,
                      settings: { ...quiz.settings, timeLimit: parseInt(e.target.value) || 0 }
                    })}
                    disabled={quiz.settings.noTimeLimit}
                    min="1"
                    max="180"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                  />
                  <label className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={quiz.settings.noTimeLimit}
                      onChange={(e) => setQuiz({
                        ...quiz,
                        settings: { ...quiz.settings, noTimeLimit: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">No time limit</span>
                  </label>
                </div>

                {/* Passing Score */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    value={quiz.settings.passingScore}
                    onChange={(e) => setQuiz({
                      ...quiz,
                      settings: { ...quiz.settings, passingScore: parseInt(e.target.value) || 0 }
                    })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Randomization */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Randomization
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={quiz.settings.randomizeQuestions}
                        onChange={(e) => setQuiz({
                          ...quiz,
                          settings: { ...quiz.settings, randomizeQuestions: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Randomize question order</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={quiz.settings.randomizeOptions}
                        onChange={(e) => setQuiz({
                          ...quiz,
                          settings: { ...quiz.settings, randomizeOptions: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Randomize option order (MCQ)</span>
                    </label>
                  </div>
                </div>

                {/* Show Results */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Show Results
                  </label>
                  <select
                    value={quiz.settings.showResults}
                    onChange={(e) => setQuiz({
                      ...quiz,
                      settings: { ...quiz.settings, showResults: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="immediate">Immediately after submission</option>
                    <option value="after_all_complete">After all students complete</option>
                    <option value="manual">Manual release</option>
                  </select>
                </div>

                {/* Results Display */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Display to Students
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={quiz.settings.showScore}
                        onChange={(e) => setQuiz({
                          ...quiz,
                          settings: { ...quiz.settings, showScore: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Score</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={quiz.settings.showCorrectness}
                        onChange={(e) => setQuiz({
                          ...quiz,
                          settings: { ...quiz.settings, showCorrectness: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Correct/Incorrect</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={quiz.settings.showAnswers}
                        onChange={(e) => setQuiz({
                          ...quiz,
                          settings: { ...quiz.settings, showAnswers: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Correct answers</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={quiz.settings.showExplanations}
                        onChange={(e) => setQuiz({
                          ...quiz,
                          settings: { ...quiz.settings, showExplanations: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Explanations</span>
                    </label>
                  </div>
                </div>

                {/* Attempts */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Attempts
                  </label>
                  <input
                    type="number"
                    value={quiz.settings.maxAttempts}
                    onChange={(e) => setQuiz({
                      ...quiz,
                      settings: { ...quiz.settings, maxAttempts: parseInt(e.target.value) || 1 }
                    })}
                    disabled={quiz.settings.unlimitedAttempts}
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                  />
                  <label className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={quiz.settings.unlimitedAttempts}
                      onChange={(e) => setQuiz({
                        ...quiz,
                        settings: { ...quiz.settings, unlimitedAttempts: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Unlimited attempts</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Question Editor Modals */}
        {questionType === 'mcq_single' || questionType === 'mcq_multiple' ? (
          <MCQEditor
            question={editingQuestion}
            onSave={handleSaveQuestion}
            onCancel={() => {
              setEditingQuestion(null);
              setQuestionType(null);
            }}
          />
        ) : null}

        {questionType === 'true_false' && (
          <TrueFalseEditor
            question={editingQuestion}
            onSave={handleSaveQuestion}
            onCancel={() => {
              setEditingQuestion(null);
              setQuestionType(null);
            }}
          />
        )}

        {questionType === 'fill_blank' && (
          <FillBlankEditor
            question={editingQuestion}
            onSave={handleSaveQuestion}
            onCancel={() => {
              setEditingQuestion(null);
              setQuestionType(null);
            }}
          />
        )}

        {/* Question Bank Modal */}
        {showQuestionBank && (
          <QuestionBankModal
            onClose={() => setShowQuestionBank(false)}
            onAddQuestions={handleAddFromBank}
          />
        )}

        {/* Quiz Preview */}
        {showPreview && (
          <QuizPreview
            quiz={quiz}
            onClose={() => setShowPreview(false)}
          />
        )}
      </div>
    </div>
  );
}
