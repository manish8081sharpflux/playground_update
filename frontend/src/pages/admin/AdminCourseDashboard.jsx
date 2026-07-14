import React, { useState, useEffect } from 'react';
import { Plus, Search, FileQuestion, Users, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { useRBAC } from '../../contexts/RBACContext';
import CourseListView from '../../components/admin/CourseListView';
import CourseCreationModal from '../../components/admin/CourseCreationModal';
import SuggestedCoinLimitModal from '../../components/admin/SuggestedCoinLimitModal';
import LoadingState from '../../components/common/LoadingState';

/**
 * AdminCourseDashboard - Sprint 2 Epic 02 Story 01
 * Admin dashboard for managing LMS courses with CRUD operations
 * SECURITY: Requires 'lms' module 'manage' permission
 */

export default function AdminCourseDashboard() {
  const navigate = useNavigate();
  const { hasPermission, isLoading: rbacLoading, permissions, user } = useRBAC();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [isCoinLimitModalOpen, setIsCoinLimitModalOpen] = useState(false);

  // SECURITY CHECK: Redirect unauthorized users
  useEffect(() => {
    if (rbacLoading) {
      return;
    }

    const permissionsLoaded = Object.keys(permissions).length > 0;
    if (!permissionsLoaded) {
      return;
    }

    const hasPerm = hasPermission('LMS Management', 'Manage');

    if (!hasPerm) {
      console.warn('Unauthorized access attempt to Course Management');
      navigate('/access-denied');
    } else {
    }
  }, [hasPermission, navigate, rbacLoading, permissions]);

  // Fetch courses from backend
  useEffect(() => {
    if (!rbacLoading && hasPermission('LMS Management', 'Manage')) {
      fetchCourses();
    }
  }, [searchTerm, categoryFilter, statusFilter, rbacLoading]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await api.get('/api/v2/lms/admin/courses', { params });

      setCourses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses. Please try again.');
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = () => {
    setIsCreationModalOpen(true);
  };

  const handleCourseCreated = (newCourse) => {
    setCourses((prev) => [newCourse, ...prev]);
    setIsCreationModalOpen(false);
    toast.success('Course created successfully!');
  };

  const handleCourseUpdated = (updatedCourse) => {
    setCourses((prev) =>
      prev.map((course) =>
        course._id === updatedCourse._id ? updatedCourse : course
      )
    );
    toast.success('Course updated successfully!');
  };

  const handleCourseDeleted = (courseId) => {
    setCourses((prev) => prev.filter((course) => course._id !== courseId));
    toast.success('Course deleted successfully!');
  };

  // Navigate to the admin assignment management page
  const handleAssignCourse = () => {
    navigate('/admin/courses/assignments');
  };

  // Show loading while RBAC initializes
  if (rbacLoading) {
    return <LoadingState message="Loading permissions..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Admin Header - Purple Theme */}
      <div className="bg-purple-600 shadow-md">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Course Management
              </h1>
              <p className="text-purple-100 text-sm mt-1">
                Create and manage LMS courses for students
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsCoinLimitModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold shadow-md hover:shadow-lg"
              >
                <Coins size={20} />
                Suggest Coin Limit
              </button>
              <button
                onClick={handleAssignCourse}
                className=" flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold shadow-md hover:shadow-lg"
              >
                <Users size={20} />
                Assign Courses
              </button>
              <button
                onClick={() => navigate('/admin/quizzes')}
                className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold shadow-md hover:shadow-lg"
              >
                <FileQuestion size={20} />
                Quiz Management
              </button>
              <button
                onClick={handleCreateCourse}
                className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold shadow-md hover:shadow-lg"
              >
                <Plus size={20} />
                Create New Course
              </button>
              {/* Admin info removed */}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-[220px_220px_1fr] gap-4 items-center">

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            >
              <option value="all">All Categories</option>
              <option value="Computer Apps">Computer Apps</option>
              <option value="Art">Art</option>
              <option value="Spoken English">Spoken English</option>
              <option value="Life Skills">Life Skills</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            {/* Search Bar */}
            {/* Search Bar */}
            <div className="flex-1 flex items-center h-11 border border-gray-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-purple-500">
              <div className="w-12 h-full flex items-center justify-center bg-gray-50 border-r border-gray-200">
                <Search size={18} className="text-gray-400" />
              </div>

              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-full px-4 bg-transparent !border-0 !outline-none !ring-0 !shadow-none focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Course List */}
      <div className="px-6 py-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchCourses}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <CourseListView
            courses={courses}
            loading={loading}
            onCourseUpdated={handleCourseUpdated}
            onCourseDeleted={handleCourseDeleted}
            onRefresh={fetchCourses}
          />
        )}
      </div>

      {/* Course Creation Modal */}
      {isCreationModalOpen && (
        <CourseCreationModal
          isOpen={isCreationModalOpen}
          onClose={() => setIsCreationModalOpen(false)}
          onCourseCreated={handleCourseCreated}
        />
      )}

      <SuggestedCoinLimitModal
        isOpen={isCoinLimitModalOpen}
        onClose={() => setIsCoinLimitModalOpen(false)}
      />
    </div>
  );
}


