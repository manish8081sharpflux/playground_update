import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import LoadingState from '../../components/common/LoadingState';

/**
 * TranslationDashboard - Epic 02 Story 04
 * Course selection and translation progress overview
 */
const TranslationDashboard = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch published courses on mount
  useEffect(() => {
    fetchPublishedCourses();
  }, []);

  // Fetch progress when course is selected
  useEffect(() => {
    if (selectedCourse) {
      fetchTranslationProgress(selectedCourse);
    }
  }, [selectedCourse]);

  const fetchPublishedCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v2/lms/admin/courses', {
        params: { status: 'published' }
      });
      setCourses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchTranslationProgress = async (courseId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/v2/lms/admin/translations/courses/${courseId}/progress`);
      setProgress(response.data.progress);
    } catch (err) {
      console.error('Error fetching translation progress:', err);
      setError('Failed to load translation progress');
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (e) => {
    setSelectedCourse(e.target.value);
  };

  const handleStartTranslating = () => {
    if (selectedCourse) {
      navigate(`/admin/translations/${selectedCourse}/editor`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Header */}
      <div className="bg-purple-600 text-white shadow-lg">
        <div className="flex justify-between items-center py-6 px-6">
          <div>
            <h1 className="text-3xl font-bold">Translation Management</h1>
            <p className="text-purple-100 mt-2">English → తెలుగు (Telugu)</p>
          </div>
          <button
            onClick={() => selectedCourse && navigate(`/admin/translations/${selectedCourse}/queue`)}
            disabled={!selectedCourse}
            className={`font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md ${selectedCourse
              ? 'bg-white text-purple-600 hover:bg-purple-50 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
          >
            📋 Browse All Items
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Course Selection */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <label className="block text-gray-700 text-lg font-semibold mb-3">
            Select Course to Translate:
          </label>
          <select
            value={selectedCourse}
            onChange={handleCourseChange}
            className="w-full px-4 h-16 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-lg"
            disabled={loading}
          >
            <option value="">-- Choose a published course --</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600 font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* Translation Progress Card */}
        {progress && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Translation Progress
            </h2>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 font-medium">Overall Progress</span>
                <span className="text-purple-600 font-bold text-lg">
                  {progress.translatedItems} / {progress.totalItems} items ({progress.percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div
                  className="bg-purple-600 h-6 rounded-full transition-all duration-500 flex items-center justify-center text-white text-sm font-medium"
                  style={{ width: `${progress.percentage}%` }}
                >
                  {progress.percentage > 10 && `${progress.percentage}%`}
                </div>
              </div>
            </div>

            {/* Breakdown Checklist */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Progress Breakdown:</h3>

              {/* Course Metadata */}
              <div className="flex items-center">
                {progress.breakdown.course.translated === progress.breakdown.course.total ? (
                  <span className="text-green-500 mr-2">✓</span>
                ) : (
                  <span className="text-yellow-500 mr-2">⏳</span>
                )}
                <span className="text-gray-700">
                  <strong>Course Title & Description:</strong> {progress.breakdown.course.translated} / {progress.breakdown.course.total} translated
                </span>
              </div>

              {/* Modules */}
              <div className="flex items-center">
                {progress.breakdown.modules.translated === progress.breakdown.modules.total ? (
                  <span className="text-green-500 mr-2">✓</span>
                ) : (
                  <span className="text-yellow-500 mr-2">⏳</span>
                )}
                <span className="text-gray-700">
                  <strong>Module Titles:</strong> {progress.breakdown.modules.translated} / {progress.breakdown.modules.total} translated
                </span>
              </div>

              {/* Chapters */}
              <div className="flex items-center">
                {progress.breakdown.chapters.translated === progress.breakdown.chapters.total ? (
                  <span className="text-green-500 mr-2">✓</span>
                ) : (
                  <span className="text-yellow-500 mr-2">⏳</span>
                )}
                <span className="text-gray-700">
                  <strong>Chapter Titles:</strong> {progress.breakdown.chapters.translated} / {progress.breakdown.chapters.total} translated
                </span>
              </div>

              {/* Content Items */}
              <div className="flex items-center">
                {progress.breakdown.contentItems.translated === progress.breakdown.contentItems.total ? (
                  <span className="text-green-500 mr-2">✓</span>
                ) : (
                  <span className="text-yellow-500 mr-2">⏳</span>
                )}
                <span className="text-gray-700">
                  <strong>Content Items:</strong> {progress.breakdown.contentItems.translated} / {progress.breakdown.contentItems.total} translated
                </span>
              </div>
            </div>

            {/* Start Translating Button */}
            <div className="mt-8">
              <button
                onClick={handleStartTranslating}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md text-lg"
              >
                Start Translating →
              </button>
            </div>
          </div>
        )}

        {/* Instructions when no course selected */}
        {!selectedCourse && !loading && (
          <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">🌐</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Course Selected
            </h3>
            <p className="text-gray-600">
              Select a published course from the dropdown above to view translation progress and start translating.
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <LoadingState message="Loading translation progress..." />
        )}
      </div>
    </div>
  );
};

export default TranslationDashboard;
