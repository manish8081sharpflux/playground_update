import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import toast from 'react-hot-toast';
// import StudentLayout from '../../components/student/StudentLayout';
import ResumeActivityCard from '../../components/student/ResumeActivityCard';
import CourseCategoryCard from '../../components/student/CourseCategoryCard';

/**
 * StudentDashboardPage Component - Epic 01 Story 01
 * Main student homepage showing:
 * - Last incomplete task (Resume Activity Card)
 * - 4 Course category cards (Computer Apps, Art, Spoken English, Life Skills)
 * - Click-to-navigate to course pages
 * - Offline data caching
 */
export default function StudentDashboardPage() {
  const navigate = useNavigate();

  // State management
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    try {
      const studentId = localStorage.getItem('userId');
      if (!studentId) return;
      const response = await api.get(`/api/v2/lms/student/${studentId}/dashboard`);

      if (response.data.success) {
        setDashboardData(response.data.data);

        // Cache data for offline use
        localStorage.setItem('cachedDashboardData', JSON.stringify(response.data.data));

        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);

      // Try to load cached data if offline
      if (!navigator.onLine) {
        const cachedData = localStorage.getItem('cachedDashboardData');
        if (cachedData) {
          setDashboardData(JSON.parse(cachedData));
          toast('Using offline data', { icon: '📴' });
        } else {
          toast.error('No offline data available');
        }
      } else {
        toast.error('Failed to load dashboard');
      }

      setLoading(false);
    }
  };

  // Handle course card click
  const handleCourseClick = (courseType) => {
    // Navigate to course page based on type
    const courseRoutes = {
      'Computer Apps': '/student/computer-apps',
      'Art': '/student/art',
      'Spoken English': '/student/spoken-english',
      'Life Skills': '/student/life-skills'
    };

    const route = courseRoutes[courseType];
    if (route) {
      navigate(route);
    } else {
      toast('Course page coming soon!', { icon: '🚧' });
    }
  };

  // Handle continue button click on Resume Activity Card
  const handleContinue = () => {
    if (dashboardData?.lastActivity) {
      const { courseType, taskId } = dashboardData.lastActivity;

      // Navigate to task page based on course type
      const taskRoutes = {
        'Computer Apps': `/student/computer-apps/task/${taskId}`,
        'Art': `/student/art/task/${taskId}`,
        'Spoken English': `/student/spoken-english/task/${taskId}`,
        'Life Skills': `/student/life-skills/task/${taskId}`
      };

      const route = taskRoutes[courseType];
      if (route) {
        navigate(route);
      } else {
        toast('Task page coming soon!', { icon: '🚧' });
      }
    }
  };

  // Handle online/offline events
  const handleOnline = () => {
    setIsOffline(false);
    fetchDashboardData();
  };

  const handleOffline = () => {
    setIsOffline(true);
  };

  // Effects
  useEffect(() => {
    const studentId = localStorage.getItem('userId');
    if (!studentId) {
      // Don't fetch with a wrong fallback ID; wait for login to populate this.
      setLoading(false);
      return;
    }

    // Fetch dashboard data on mount
    fetchDashboardData();

    // Set up polling (every 30 seconds)
    const pollInterval = setInterval(fetchDashboardData, 30000);

    // Offline/Online listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Course data with icons and colors
  const courseCategories = [
    {
      courseType: 'Computer Apps',
      icon: '💻',
      color: 'orange'
    },
    {
      courseType: 'Art',
      icon: '🎨',
      color: 'pink'
    },
    {
      courseType: 'Spoken English',
      icon: '🗣️',
      color: 'blue'
    },
    {
      courseType: 'Life Skills',
      icon: '🌟',
      color: 'green'
    }
  ];

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <p className="text-xl text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-xl text-gray-600 font-medium">No data available</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {dashboardData.studentName || localStorage.getItem('name') || 'Student'}! 👋
        </h2>
        <p className="text-lg text-gray-600">
          Ready to continue your learning journey?
        </p>
      </div>

      {/* Resume Activity Card (conditional) */}
      {dashboardData.lastActivity && (
        <ResumeActivityCard
          courseType={dashboardData.lastActivity.courseType}
          taskTitle={dashboardData.lastActivity.taskTitle}
          progress={dashboardData.lastActivity.progress}
          taskId={dashboardData.lastActivity.taskId}
          onContinue={handleContinue}
        />
      )}

      {/* Course Categories Grid */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Your Courses
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {courseCategories.map((category) => {
            // Find ALL courses matching this category
            const categoryCourses = dashboardData.courses?.filter(
              c => c.courseType === category.courseType
            ) || [];

            // Aggregate progress
            const courseData = categoryCourses.reduce((acc, curr) => ({
              totalTasks: acc.totalTasks + (curr.totalTasks || 0),
              completedTasks: acc.completedTasks + (curr.completedTasks || 0)
            }), { totalTasks: 0, completedTasks: 0 });

            return (
              <CourseCategoryCard
                key={category.courseType}
                courseType={category.courseType}
                icon={category.icon}
                color={category.color}
                totalTasks={courseData.totalTasks}
                completedTasks={courseData.completedTasks}
                onClick={() => handleCourseClick(category.courseType)}
              />
            );
          })}
        </div>
      </div>

      {/* Quick Stats Section */}
      {dashboardData.stats && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Your Progress
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {dashboardData.stats.totalTasksCompleted || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">Tasks Completed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {dashboardData.stats.currentStreak || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">Day Streak 🔥</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {dashboardData.stats.coinsEarnedToday || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">Coins Earned Today</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
