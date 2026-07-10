import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Check, Minus, Sprout, Star, X } from 'lucide-react';
import { api, getStudentWeeklyAttendance } from '../../api';
import toast from 'react-hot-toast';
import ResumeActivityCard from '../../components/student/ResumeActivityCard';
import CourseCategoryCard from '../../components/student/CourseCategoryCard';
import LoadingState from '../../components/common/LoadingState';

const toLocalDateString = (dateValue = new Date()) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonday = (dateValue = new Date()) => {
  const date = dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
};

const addDays = (dateValue, days) => {
  const date = dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date;
};

function DailyAttendanceCard({ attendance, onPreviousWeek, onNextWeek, isCurrentWeek, weekLabel }) {
  const fallbackStart = getMonday();

  const fallbackDays = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(fallbackStart, index);
    return {
      date: toLocalDateString(day),
      dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: day.getDate(),
      monthName: day.toLocaleDateString('en-US', { month: 'short' }),
      status: 'not_marked',
    };
  });

  const days = attendance?.days?.length ? attendance.days : fallbackDays;
  const percentage = attendance?.percentage || 0;

  const statusConfig = {
    present: {
      label: 'Present',
      Icon: Check,
      circle: 'bg-green-500 text-white shadow-green-100',
      dot: 'bg-green-500',
    },
    absent: {
      label: 'Absent',
      Icon: X,
      circle: 'bg-red-500 text-white shadow-red-100',
      dot: 'bg-red-500',
    },
    not_marked: {
      label: 'Not Marked',
      Icon: Minus,
      circle: 'bg-gray-200 text-gray-600 shadow-gray-100',
      dot: 'bg-gray-300',
    },
  };

  return (
    <aside className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-purple-600">
            <CalendarDays size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-950">Daily Attendance</h3>
            <p className="mt-1 text-xs font-medium text-gray-500">Your attendance for this week</p>
          </div>
        </div>
        <div className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
          {percentage}% Present
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
        <button
          type="button"
          onClick={onPreviousWeek}
          className="rounded-full px-3 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:text-purple-700"
        >
          Prev
        </button>
        <span className="text-center text-xs font-bold text-gray-700">{weekLabel}</span>
        <button
          type="button"
          onClick={onNextWeek}
          disabled={isCurrentWeek}
          className="rounded-full px-3 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:text-purple-700 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
        >
          Next
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 border-y border-gray-100">
        {days.map((day) => {
          const config = statusConfig[day.status] || statusConfig.not_marked;
          const StatusIcon = config.Icon;

          return (
            <div key={day.date} className="min-w-0 border-r border-gray-100 py-3 text-center last:border-r-0">
              <div className="text-xs font-bold text-gray-950">{day.dayName}</div>
              <div className="mt-1 text-[11px] font-medium text-gray-500">{day.dayNumber} {day.monthName}</div>
              <div className={`mx-auto mt-5 flex h-9 w-9 items-center justify-center rounded-full shadow-lg ${config.circle}`}>
                <StatusIcon size={18} strokeWidth={3} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-5 border-b border-gray-100 pb-5 text-xs font-medium text-gray-600">
        {['present', 'absent', 'not_marked'].map((status) => (
          <div key={status} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusConfig[status].dot}`} />
            <span>{statusConfig[status].label}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-lg border border-purple-100 bg-purple-50/50 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
            <Star size={24} fill="currentColor" />
          </div>
          <p className="text-sm font-medium leading-6 text-gray-700">
            Good things happen<br />when you show up!
          </p>
        </div>
        <Sprout className="text-green-500" size={30} />
      </div>
    </aside>
  );
}

function StudentStats({ stats }) {
  const statItems = [
    {
      label: 'Progress',
      value: stats?.totalTasksCompleted || 0,
      helper: 'Tasks Completed',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      icon: '\uD83D\uDCC8',
    },
    {
      label: 'Streak',
      value: stats?.currentStreak || 0,
      helper: 'Day Streak',
      color: 'text-green-600',
      bg: 'bg-green-50',
      icon: '\uD83D\uDD25',
    },
    {
      label: 'Coins',
      value: stats?.coinsEarnedToday || 0,
      helper: 'Earned Today',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      icon: '\uD83D\uDCB0',
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {statItems.map((item) => (
        <div key={item.label} className={`${item.bg} rounded-xl border border-white p-4 shadow-sm`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-600">{item.label}</p>
              <p className={`mt-1 text-3xl font-bold ${item.color}`}>{item.value}</p>
              <p className="mt-1 text-xs font-medium text-gray-500">{item.helper}</p>
            </div>
            <span className="text-3xl" aria-hidden="true">{item.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [weeklyAttendance, setWeeklyAttendance] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(() => toLocalDateString(new Date()));

  const fetchWeeklyAttendance = async (date = attendanceDate) => {
    try {
      const studentId = localStorage.getItem('userId');
      if (!studentId) return;

      const response = await getStudentWeeklyAttendance(studentId, date);
      if (response.success) {
        setWeeklyAttendance(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch weekly attendance:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const studentId = localStorage.getItem('userId');
      if (!studentId) return;
      const response = await api.get(`/api/v2/lms/student/${studentId}/dashboard`);

      if (response.data.success) {
        setDashboardData(response.data.data);

        try {
          localStorage.setItem('cachedDashboardData', JSON.stringify(response.data.data));
        } catch (cacheError) {
          if (cacheError.name === 'QuotaExceededError') {
            console.warn('Dashboard cache skipped: localStorage quota exceeded');
            try {
              localStorage.removeItem('cachedDashboardData');
            } catch (_) {
              // Ignore secondary failure
            }
          } else {
            console.warn('Failed to cache dashboard data:', cacheError);
          }
        }

        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);

      if (!navigator.onLine) {
        const cachedData = localStorage.getItem('cachedDashboardData');
        if (cachedData) {
          setDashboardData(JSON.parse(cachedData));
          toast('Using offline data');
        } else {
          toast.error('No offline data available');
        }
      } else {
        toast.error('Failed to load dashboard');
      }

      setLoading(false);
    }
  };

  const handleCourseClick = (courseType) => {
    const courseRoutes = {
      'Computer Apps': '/student/computer-apps',
      Art: '/student/art',
      'Spoken English': '/student/spoken-english',
      'Life Skills': '/student/life-skills',
    };

    const route = courseRoutes[courseType];
    if (route) {
      navigate(route);
    } else {
      toast('Course page coming soon!');
    }
  };

  const handleContinue = () => {
    if (dashboardData?.lastActivity) {
      const { courseType, taskId } = dashboardData.lastActivity;
      const taskRoutes = {
        'Computer Apps': `/student/computer-apps/task/${taskId}`,
        Art: `/student/art/task/${taskId}`,
        'Spoken English': `/student/spoken-english/task/${taskId}`,
        'Life Skills': `/student/life-skills/task/${taskId}`,
      };

      const route = taskRoutes[courseType];
      if (route) {
        navigate(route);
      } else {
        toast('Task page coming soon!');
      }
    }
  };

  const handleOnline = () => {
    setIsOffline(false);
    fetchDashboardData();
    fetchWeeklyAttendance(attendanceDate);
  };

  const handleOffline = () => {
    setIsOffline(true);
  };

  useEffect(() => {
    const studentId = localStorage.getItem('userId');
    if (!studentId) {
      setLoading(false);
      return undefined;
    }

    fetchDashboardData();

    const pollInterval = setInterval(fetchDashboardData, 30000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchWeeklyAttendance(attendanceDate);
  }, [attendanceDate]);

  const courseCategories = [
    { courseType: 'Computer Apps', icon: '\uD83D\uDCBB', color: 'orange' },
    { courseType: 'Art', icon: '\uD83C\uDFA8', color: 'pink' },
    { courseType: 'Spoken English', icon: '\uD83D\uDDE3\uFE0F', color: 'blue' },
    { courseType: 'Life Skills', icon: '\uD83C\uDF1F', color: 'green' },
  ];

  const selectedWeekStart = getMonday(attendanceDate);
  const currentWeekStart = getMonday(new Date());
  const selectedWeekEnd = addDays(selectedWeekStart, 6);
  const isCurrentWeek = toLocalDateString(selectedWeekStart) >= toLocalDateString(currentWeekStart);
  const weekLabel = `${selectedWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${selectedWeekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const goToPreviousWeek = () => {
    setAttendanceDate(toLocalDateString(addDays(selectedWeekStart, -7)));
  };

  const goToNextWeek = () => {
    if (!isCurrentWeek) {
      setAttendanceDate(toLocalDateString(addDays(selectedWeekStart, 7)));
    }
  };

  if (loading) {
    return <LoadingState message="Loading your dashboard..." />;
  }

  if (!dashboardData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-medium text-gray-600">No data available</p>
          <button
            onClick={() => {
              fetchDashboardData();
              fetchWeeklyAttendance(attendanceDate);
            }}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
      <DailyAttendanceCard
        attendance={weeklyAttendance}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        isCurrentWeek={isCurrentWeek}
        weekLabel={weekLabel}
      />

      <section className="min-w-0">
        {isOffline && (
          <p className="mb-3 text-sm text-amber-600">You are viewing cached dashboard data.</p>
        )}

        <div className="mb-5">
          <h2 className="mb-2 text-3xl font-bold text-gray-900">
            Welcome back, {dashboardData.studentName || localStorage.getItem('name') || 'Student'}! {'\uD83D\uDC4B'}
          </h2>
          <p className="text-lg text-gray-600">
            Ready to continue your learning journey?
          </p>
        </div>

        <StudentStats stats={dashboardData.stats} />

        {dashboardData.lastActivity && (
          <ResumeActivityCard
            courseType={dashboardData.lastActivity.courseType}
            taskTitle={dashboardData.lastActivity.taskTitle}
            progress={dashboardData.lastActivity.progress}
            taskId={dashboardData.lastActivity.taskId}
            onContinue={handleContinue}
          />
        )}

        <h2 className="mb-4 text-2xl font-bold text-gray-900">Your Courses</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {courseCategories.map((category) => {
            const categoryCourses = dashboardData.courses?.filter(
              (course) => course.courseType === category.courseType
            ) || [];

            const courseData = categoryCourses.reduce((acc, curr) => ({
              totalTasks: acc.totalTasks + (curr.totalTasks || 0),
              completedTasks: acc.completedTasks + (curr.completedTasks || 0),
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
      </section>
    </div>
  );
}
