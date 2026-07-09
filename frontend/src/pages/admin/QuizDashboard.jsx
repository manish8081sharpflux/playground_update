import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, Edit, Copy, Trash2, Eye, Archive, RotateCcw } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import LoadingState from '../../components/common/LoadingState';

/**
 * QuizDashboard - Sprint 2 Epic 02 Story 03
 * Quiz management dashboard with list view, filters, search, and CRUD operations
 */

export default function QuizDashboard() {
  const navigate = useNavigate();

  // State
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination
  const [hasMore, setHasMore] = useState(false);

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState(null);

  // Fetch quizzes
  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const params = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
        sort: sortBy,
        limit: 100,
        offset: 0
      };

      const response = await api.get('/api/v2/lms/admin/quizzes', { params });

      if (response.data.success) {
        setQuizzes(response.data.quizzes);
        setHasMore(response.data.pagination.hasMore);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await api.get('/api/v2/lms/admin/quizzes/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchQuizzes();
    fetchStats();
  }, [statusFilter, searchQuery, sortBy]);

  // Create new quiz
  const handleCreateQuiz = () => {
    navigate('/admin/quizzes/create');
  };

  // Edit quiz
  const handleEditQuiz = (quizId) => {
    navigate(`/admin/quizzes/${quizId}/edit`);
  };

  // Duplicate quiz
  const handleDuplicateQuiz = async (quizId) => {
    try {
      const response = await api.post(`/api/v2/lms/admin/quizzes/${quizId}/duplicate`);
      if (response.data.success) {
        toast.success('Quiz duplicated successfully');
        fetchQuizzes();
      }
    } catch (error) {
      console.error('Error duplicating quiz:', error);
      toast.error('Failed to duplicate quiz');
    }
    setOpenDropdown(null);
  };

  // Delete quiz
  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/v2/lms/admin/quizzes/${quizId}`);
      if (response.data.success) {
        toast.success('Quiz deleted successfully');
        fetchQuizzes();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
    }
    setOpenDropdown(null);
  };

  // Publish/Unpublish quiz
  const handleTogglePublish = async (quizId, currentStatus) => {
    try {
      const endpoint = currentStatus === 'published' ? 'unpublish' : 'publish';
      const response = await api.put(`/api/v2/lms/admin/quizzes/${quizId}/${endpoint}`);

      if (response.data.success) {
        toast.success(`Quiz ${currentStatus === 'published' ? 'unpublished' : 'published'} successfully`);
        fetchQuizzes();
        fetchStats();
      }
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast.error(error.response?.data?.message || 'Failed to update quiz status');
    }
    setOpenDropdown(null);
  };

  // Archive quiz
  const handleArchive = async (quizId) => {
    try {
      const response = await api.put(`/api/v2/lms/admin/quizzes/${quizId}/archive`);
      if (response.data.success) {
        toast.success('Quiz moved to archive');
        fetchQuizzes();
        fetchStats();
      }
    } catch (error) {
      console.error('Error archiving quiz:', error);
      toast.error('Failed to archive quiz');
    }
    setOpenDropdown(null);
  };

  // Restore quiz
  const handleRestore = async (quizId) => {
    try {
      const response = await api.put(`/api/v2/lms/admin/quizzes/${quizId}/restore`);
      if (response.data.success) {
        toast.success('Quiz restored to draft');
        fetchQuizzes();
        fetchStats();
      }
    } catch (error) {
      console.error('Error restoring quiz:', error);
      toast.error('Failed to restore quiz');
    }
    setOpenDropdown(null);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-red-100 text-red-800'
    };
    return badges[status] || badges.draft;
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full pb-12">
      <div className="bg-purple-600 text-white p-6 shadow-md">
        <div className="flex justify-between items-center py-6 px-6">
          <div>
            <h1 className="text-3xl font-bold">Quiz Management</h1>
            <p className="text-purple-100 mt-1">Create and manage quizzes for your courses</p>
          </div>
          <button
            onClick={handleCreateQuiz}
            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Create New Quiz</span>
          </button>
        </div>
      </div>

      <div className="px-6">

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total Quizzes</div>
              <div className="text-3xl font-bold text-gray-800 mt-2">{stats.totalQuizzes}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Published</div>
              <div className="text-3xl font-bold text-green-600 mt-2">{stats.publishedQuizzes}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Drafts</div>
              <div className="text-3xl font-bold text-gray-600 mt-2">{stats.draftQuizzes}</div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-lg shadow mt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Quizzes</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 md:mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title_az">Title A-Z</option>
                <option value="title_za">Title Z-A</option>
                <option value="most_questions">Most Questions</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quiz List */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <LoadingState message="Loading quizzes..." />
          ) : quizzes.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow text-center">
              <p className="text-gray-500 text-lg">No quizzes found</p>
              <button
                onClick={handleCreateQuiz}
                className="mt-4 text-purple-600 hover:text-purple-700 font-semibold"
              >
                Create your first quiz
              </button>
            </div>
          ) : (
            (quizzes || []).map((quiz) => (
              <div key={quiz._id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-gray-800">{quiz.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(quiz.status)}`}>
                        {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
                      </span>
                    </div>

                    <p className="text-gray-600 mt-2">{quiz.description || 'No description'}</p>

                    <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500">
                      <span>{quiz.questions.length} Questions</span>
                      {quiz.settings.timeLimit && !quiz.settings.noTimeLimit && (
                        <span>⏱️ {quiz.settings.timeLimit} min time limit</span>
                      )}
                      <span>📊 {quiz.settings.passingScore}% passing score</span>
                    </div>

                    {quiz.chapter && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-semibold">Course:</span> {quiz.course?.title} › {quiz.chapter?.title}
                      </div>
                    )}

                    <div className="flex items-center space-x-4 mt-3 text-xs text-gray-400">
                      <span>Created: {formatDate(quiz.createdAt)}</span>
                      {quiz.updatedAt !== quiz.createdAt && (
                        <span>Last Edited: {formatDate(quiz.updatedAt)}</span>
                      )}
                      <span>By: {quiz.createdBy?.name}</span>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === quiz._id ? null : quiz._id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical size={20} className="text-gray-600" />
                    </button>

                    {openDropdown === quiz._id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <button
                          onClick={() => handleEditQuiz(quiz._id)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-gray-700"
                        >
                          <Edit size={16} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDuplicateQuiz(quiz._id)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-gray-700"
                        >
                          <Copy size={16} />
                          <span>Duplicate</span>
                        </button>
                        <button
                          onClick={() => handleTogglePublish(quiz._id, quiz.status)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-gray-700"
                        >
                          <Eye size={16} />
                          <span>{quiz.status === 'published' ? 'Unpublish' : 'Publish'}</span>
                        </button>

                        {quiz.status === 'archived' ? (
                          <button
                            onClick={() => handleRestore(quiz._id)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-blue-600"
                          >
                            <RotateCcw size={16} />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchive(quiz._id)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-orange-600"
                          >
                            <Archive size={16} />
                            <span>Archive</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteQuiz(quiz._id)}
                          className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center space-x-2 text-red-600"
                        >
                          <Trash2 size={16} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={fetchQuizzes}
              className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
