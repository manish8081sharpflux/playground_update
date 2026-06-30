// frontend/src/pages/coach/GradingDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { api } from '../../api';
import SubmissionQueue from '../../components/coach/grading/SubmissionQueue';
import ArtGradingInterface from '../../components/coach/grading/ArtGradingInterface';
import VideoGradingInterface from '../../components/coach/grading/VideoGradingInterface';
import AudioGradingInterface from '../../components/coach/grading/AudioGradingInterface';
import QuizGradingInterface from "../../components/coach/grading/QuizGradingInterface";

export default function GradingDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pending: 0, graded: 0, flagged: 0, thisWeek: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSubmission, setCurrentSubmission] = useState(null);
  const [showGradingInterface, setShowGradingInterface] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    courseType: 'all',
    status: 'all',
    sortBy: 'newest_first',
    search: '',
  });
  const [allSubmissions, setAllSubmissions] = useState([]);

  useEffect(() => {
    if (user && user.id) {
      fetchSubmissions();
    }
  }, [user, filters.courseType, filters.status, filters.sortBy]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        sortBy: filters.sortBy,
        limit: 20,
        offset: 0,
      });

      if (filters.courseType !== 'all') {
        queryParams.append('courseType', filters.courseType);
      }

      if (filters.status !== 'all') {
        queryParams.append('status', filters.status);
      }

      const response = await api.get(
        `/api/v2/lms/coach/grading/${user.id}/submissions?${queryParams}`
      );



      setAllSubmissions(response.data.submissions || []);
      setStats(response.data.stats || { pending: 0, graded: 0, flagged: 0, thisWeek: 0 });
    } catch (error) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering for search
  const filteredSubmissions = allSubmissions.filter((submission) => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    const studentName = submission.studentName?.toLowerCase() || '';
    const courseTitle = submission.courseTitle?.toLowerCase() || '';
    const taskTitle = submission.taskTitle?.toLowerCase() || '';
    return studentName.includes(searchLower) || courseTitle.includes(searchLower) || taskTitle.includes(searchLower);
  });

  const handleOpenGrading = (submission) => {
    console.log("Clicked submission:", submission);
    console.log("Submission Type:", submission?.submissionType);

    if (!submission) {
      toast.error("Submission not found");
      return;
    }

    if (!submission.submissionType) {
      toast.error("Submission type missing");
      return;
    }

    setCurrentSubmission(submission);
    setShowGradingInterface(true);
  };

  const handleCloseGrading = () => {
    setCurrentSubmission(null);
    setShowGradingInterface(false);
    // Refresh submissions after grading
    fetchSubmissions();
  };

  // Navigation controls
  const handleNavigate = (direction) => {
    const currentIndex = filteredSubmissions.findIndex(
      (sub) => sub.id === currentSubmission.id
    );
    if (direction === 'previous' && currentIndex > 0) {
      setCurrentSubmission(filteredSubmissions[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < filteredSubmissions.length - 1) {
      setCurrentSubmission(filteredSubmissions[currentIndex + 1]);
    }
  };

  const handleSkip = async () => {
    try {
      await api.put(
        `/api/v2/lms/coach/grading/submissions/${currentSubmission.id}/skip`,
        {}
      );
      toast.success('Submission skipped');
      handleNavigate('next');
    } catch (error) {
      console.error('Error skipping submission:', error);
      toast.error('Failed to skip submission');
    }
  };

  const handleFlag = async () => {
    try {
      const reason = prompt('Enter reason for flagging this submission:');
      if (!reason) return;

      await api.put(
        `/api/v2/lms/coach/grading/submissions/${currentSubmission.id}/flag`,
        { reason, flaggedBy: user.id }
      );
      toast.success('Submission flagged for admin review');
      handleNavigate('next');
    } catch (error) {
      console.error('Error flagging submission:', error);
      toast.error('Failed to flag submission');
    }
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters((prev) => ({ ...prev, [filterKey]: value }));
  };

  // Bulk grade: apply same quality + coins to multiple submissions at once
  const handleBulkGrade = async (submissionIds) => {
    const quality = window.prompt('Enter quality for all selected (excellent / good / needs_improvement):');
    if (!quality || !['excellent', 'good', 'needs_improvement'].includes(quality)) {
      toast.error('Invalid quality. Use: excellent, good, or needs_improvement');
      return;
    }
    try {
      const response = await api.post(
        `/api/v2/lms/coach/grading/submissions/bulk-grade`,
        { submissionIds, quality, feedback: `Bulk graded as ${quality}`, gradedBy: user.id }
      );
      if (response.data.success) {
        toast.success(`${response.data.results?.length || submissionIds.length} submissions graded!`);
        fetchSubmissions();
      } else {
        toast.error(response.data.error || 'Bulk grade failed');
      }
    } catch (error) {
      console.error('Bulk grade error:', error);
      toast.error(error.response?.data?.error || 'Bulk grade failed');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 w-full">
      {/* Header */}
      <div className="bg-blue-600 text-white px-6 py-4 border-b border-blue-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Syllabus Tracker & Grading</h1>
            <div className="text-sm mt-1">
              Coach: {user.name || user.firstName || ''}
              {user.balagruha?.name && ` • Balagruha: ${user.balagruha.name}`}
            </div>
          </div>
          <button
            onClick={() => navigate('/coach/assignments')}
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition"
          >
            Assign Courses
          </button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="w-full px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-3xl mb-2">📝</div>
            <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending Submissions</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-gray-900">{stats.graded}</div>
            <div className="text-sm text-gray-600">Graded Submissions</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-3xl mb-2">⚠️</div>
            <div className="text-2xl font-bold text-gray-900">{stats.flagged}</div>
            <div className="text-sm text-gray-600">Flagged for Review</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-2xl font-bold text-gray-900">{stats.thisWeek}</div>
            <div className="text-sm text-gray-600">This Week</div>
          </div>
        </div>

        {/* Submission Queue */}
        <SubmissionQueue
          submissions={filteredSubmissions}
          loading={loading}
          filters={filters}
          onFilterChange={handleFilterChange}
          onOpenGrading={handleOpenGrading}
          onBulkGrade={handleBulkGrade}
        />
      </div>

      {/* Grading Interface (Full Screen Modal) */}
      {showGradingInterface && currentSubmission && (
        <div className="fixed inset-0 bg-gray-900 z-50 overflow-y-auto">
          {currentSubmission.submissionType === 'art' && (
            <ArtGradingInterface
              submission={currentSubmission}
              onClose={handleCloseGrading}
              coachId={user.id}
              onNavigate={handleNavigate}
              onSkip={handleSkip}
              onFlag={handleFlag}
              currentIndex={filteredSubmissions.findIndex((sub) => sub.id === currentSubmission.id)}
              totalCount={filteredSubmissions.length}
            />
          )}
          {currentSubmission.submissionType === 'video' && (
            <VideoGradingInterface
              submission={currentSubmission}
              onClose={handleCloseGrading}
              coachId={user.id}
              onNavigate={handleNavigate}
              onSkip={handleSkip}
              onFlag={handleFlag}
              currentIndex={filteredSubmissions.findIndex((sub) => sub.id === currentSubmission.id)}
              totalCount={filteredSubmissions.length}
            />
          )}

          {currentSubmission.submissionType === "quiz" && (
            <QuizGradingInterface
              submission={currentSubmission}
              onClose={handleCloseGrading}
              coachId={user.id}
              onNavigate={handleNavigate}
              onSkip={handleSkip}
              onFlag={handleFlag}
              currentIndex={filteredSubmissions.findIndex(
                (sub) => sub.id === currentSubmission.id
              )}
              totalCount={filteredSubmissions.length}
            />
          )}
          {currentSubmission.submissionType === 'audio' && (
            <AudioGradingInterface
              submission={currentSubmission}
              onClose={handleCloseGrading}
              coachId={user.id}
              onNavigate={handleNavigate}
              onSkip={handleSkip}
              onFlag={handleFlag}
              currentIndex={filteredSubmissions.findIndex((sub) => sub.id === currentSubmission.id)}
              totalCount={filteredSubmissions.length}
            />
          )}
        </div>
      )}
    </div>
  );
}
