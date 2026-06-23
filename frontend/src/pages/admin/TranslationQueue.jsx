import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';

/**
 * TranslationQueue - Epic 02 Story 04
 * List view with filters for navigating translation items
 */
const TranslationQueue = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTranslatableItems();
  }, [courseId]);

  useEffect(() => {
    applyFilters();
  }, [items, statusFilter, typeFilter, searchQuery]);

  const fetchTranslatableItems = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v2/lms/admin/translations/courses/${courseId}/items`);
      setItems(response.data.items || []);
    } catch (err) {
      console.error('Error fetching translatable items:', err);
      setError('Failed to load translatable items');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.translationStatus === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (typeFilter === 'quizzes') {
          return item.type === 'quiz' || item.type === 'quiz_question';
        }
        return item.type === typeFilter;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.english.title?.toLowerCase().includes(searchLower) ||
        item.telugu.title?.toLowerCase().includes(searchLower) ||
        item.breadcrumb?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredItems(filtered);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'translated':
        return '✓';
      case 'in_progress':
        return '⚠️';
      case 'untranslated':
      default:
        return '⏳';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'translated':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'untranslated':
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'translated':
        return 'Translated';
      case 'in_progress':
        return 'In Progress';
      case 'untranslated':
      default:
        return 'Not Started';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      course: 'Course',
      module: 'Module',
      chapter: 'Chapter',
      content: 'Content',
      quiz: 'Quiz',
      quiz_question: 'Quiz Question'
    };
    return labels[type] || type;
  };

  const handleItemClick = (item, index) => {
    // Navigate to translation editor with the specific item
    const actualIndex = items.findIndex(i => i.id === item.id);
    navigate(`/admin/translations/${courseId}/editor?itemIndex=${actualIndex}`);
  };

  const handleBackToDashboard = () => {
    navigate('/admin/translations');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Header */}
      <div className="bg-purple-600 text-white shadow-lg">
        <div className="py-6 px-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Translation Queue</h1>
            <p className="text-purple-100 mt-2">Browse and manage all translatable items</p>
          </div>
          <button
            onClick={handleBackToDashboard}
            className="bg-purple-500 hover:bg-purple-400 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Status Filter:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Items</option>
                <option value="untranslated">Untranslated</option>
                <option value="in_progress">In Progress</option>
                <option value="translated">Translated</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Type Filter:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Types</option>
                <option value="module">Modules</option>
                <option value="chapter">Chapters</option>
                <option value="content">Content Items</option>
                <option value="quizzes">Quizzes</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Search:</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or breadcrumb..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="mt-4 text-gray-600">
            Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong> items
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600 font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No Items Found
              </h3>
              <p className="text-gray-600">
                Try adjusting your filters or search query.
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item, index)}
                className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-purple-500 hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Status Icon and Type Badge */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-2xl ${getStatusIcon(item.translationStatus) === '✓' ? 'text-green-500' : getStatusIcon(item.translationStatus) === '⚠️' ? 'text-orange-500' : 'text-yellow-500'}`}>
                        {getStatusIcon(item.translationStatus)}
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                        {getTypeLabel(item.type)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${getStatusColor(item.translationStatus)}`}>
                        {getStatusLabel(item.translationStatus)}
                      </span>
                    </div>

                    {/* Breadcrumb */}
                    <p className="text-gray-500 text-sm mb-2">{item.breadcrumb}</p>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      {item.english.title}
                    </h3>

                    {/* Telugu Translation (if exists) */}
                    {item.telugu.title && (
                      <p className="text-gray-600 mb-2">
                        <span className="font-semibold">తెలుగు:</span> {item.telugu.title}
                      </p>
                    )}

                    {/* Description Preview */}
                    {item.english.description && (
                      <p className="text-gray-500 text-sm line-clamp-2">
                        {item.english.description}
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="ml-4">
                    <button
                      className={`px-6 py-3 rounded-lg font-bold transition-colors ${item.translationStatus === 'translated'
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : item.translationStatus === 'in_progress'
                          ? 'bg-orange-500 text-white hover:bg-orange-600'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                    >
                      {item.translationStatus === 'translated' ? 'Review' : item.translationStatus === 'in_progress' ? 'Continue' : 'Translate'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TranslationQueue;
