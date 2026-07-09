import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import CourseListView from '../../components/admin/CourseListView';

/**
 * CoachCoursesPage - Sprint 2 Story 05
 *
 * Read-only browser for courses currently assigned to the coach's
 * balagruhas. Fetches from GET /api/v2/lms/coach/:coachId/balagruha-courses
 * and renders the same <CourseListView> used by the admin dashboard with
 * `readOnly={true}` so all mutation UI is hidden and a "View Content"
 * primary CTA navigates to the read-only detail page.
 */
export default function CoachCoursesPage() {
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    if (user?.id) {
      fetchCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/api/v2/lms/coach/${user.id}/balagruha-courses`
      );
      setCourses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching balagruha courses:', err);
      toast.error('Failed to load your balagruha courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering by category + search (LIST-11, LIST-12)
  const filteredCourses = useMemo(() => {
    let result = courses;
    if (categoryFilter !== 'all') {
      result = result.filter((c) => c.category === categoryFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter((c) =>
        [c.title, c.description, c.category]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      );
    }
    return result;
  }, [courses, categoryFilter, searchTerm]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <div className="w-full px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Courses in Your Balagruhas
          </h1>
          <p className="text-gray-600 mt-1">
            Read-only view of courses currently assigned to your Balagruhas
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All categories</option>
              <option value="Computer Apps">Computer Apps</option>
              <option value="Art">Art</option>
              <option value="Life Skills">Life Skills</option>
              <option value="Spoken English">Spoken English</option>
            </select>
          </div>
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Search
            </label>
            <div className="relative">
              {/* <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              /> */}
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search courses..."
                className=" w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Count */}
        {!loading && (
          <div className="mb-4 text-sm text-gray-600">
            {filteredCourses.length}{' '}
            {filteredCourses.length === 1 ? 'course' : 'courses'} assigned to
            your Balagruhas
          </div>
        )}

        {/* List — reuse admin component in read-only mode */}
        <CourseListView
          courses={filteredCourses}
          loading={loading}
          readOnly
          onRefresh={fetchCourses}
          // Admin-only callbacks left as no-ops; none of them fire in read-only mode
          onCourseUpdated={() => {}}
          onCourseDeleted={() => {}}
        />
      </div>
    </div>
  );
}
