import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
// import StudentLayout from '../../components/student/StudentLayout';
import WorkshopsMode from '../../components/student/art/WorkshopsMode';
import FreeSketchMode from '../../components/student/art/FreeSketchMode';
import ArtStoriesMode from '../../components/student/art/ArtStoriesMode';
import CompetitionMode from '../../components/student/art/CompetitionMode';
import { api } from '../../api';
import toast from 'react-hot-toast';
import LoadingState from '../../components/common/LoadingState';

/**
 * ArtCoursePage Component - Epic 01 Story 03
 * Art Course with 4 modes: Workshops, Free Sketch, Art Stories, Competition
 * Pink theme (#EC4899 pink-600)
 */
export default function ArtCoursePage() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState('workshops');
  const [artData, setArtData] = useState(null);
  const [loading, setLoading] = useState(true);

  const studentId = localStorage.getItem('userId') || 'student123';

  // Mode configuration
  const modes = [
    { id: 'workshops', label: 'Workshops', icon: '🎨' },
    { id: 'free_sketch', label: 'Free Sketch', icon: '✏️' },
    { id: 'art_stories', label: 'Art Stories', icon: '📖' },
    { id: 'competition', label: 'Competition', icon: '🏆' }
  ];

  // Load art course data on mount
  useEffect(() => {
    fetchArtCourseData();

    // Restore last active mode from localStorage
    const savedMode = localStorage.getItem('artCourseMode');
    if (savedMode && modes.find(m => m.id === savedMode)) {
      setActiveMode(savedMode);
    }
  }, []);

  // Save active mode to localStorage when it changes
  useEffect(() => {
    if (activeMode) {
      localStorage.setItem('artCourseMode', activeMode);
    }
  }, [activeMode]);

  const fetchArtCourseData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v2/lms/student/${studentId}/courses/art`);
      if (response.data.success) {
        setArtData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch art course data:', error);
      toast.error('Failed to load Art Course data');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (modeId) => {
    setActiveMode(modeId);
  };

  // Get data for active mode
  const getModeData = () => {
    if (!artData || !artData.modes) return null;

    const modeData = artData.modes.find(m => m.mode === activeMode);
    return modeData;
  };

  if (loading) {
    return <LoadingState message="Loading Art Course..." fullScreen />;
  }

  return (
    <>
      <div className="max-w-6xl mx-auto p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/student/dashboard')}
          className="text-sm text-pink-600 font-bold mb-4 hover:underline flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Back to Courses
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">ART COURSE</h1>
          <p className="text-gray-600 mt-2">Express your creativity through digital art</p>
        </div>

        {/* Mode Pills Navigation */}
        <div className="flex gap-2 mb-8">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleModeChange(mode.id)}
              className={`
                px-6 py-3 rounded-lg font-semibold text-base transition-all duration-200
                ${activeMode === mode.id
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border-2 border-pink-300 hover:bg-pink-100'
                }
              `}
              aria-label={`Switch to ${mode.label} mode`}
              aria-selected={activeMode === mode.id}
            >
              <span className="mr-2">{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>

        {/* Mode Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeMode === 'workshops' && (
            <WorkshopsMode
              data={getModeData()}
              studentId={studentId}
              onRefresh={fetchArtCourseData}
            />
          )}
          {activeMode === 'free_sketch' && (
            <FreeSketchMode
              data={getModeData()}
              studentId={studentId}
              onRefresh={fetchArtCourseData}
            />
          )}
          {activeMode === 'art_stories' && (
            <ArtStoriesMode
              data={getModeData()}
              studentId={studentId}
              onRefresh={fetchArtCourseData}
            />
          )}
          {activeMode === 'competition' && (
            <CompetitionMode
              data={getModeData()}
              studentId={studentId}
              onRefresh={fetchArtCourseData}
            />
          )}
        </div>

        {/* Info Message */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div>
              <h3 className="font-semibold text-blue-900">Upload Your Artwork</h3>
              <p className="text-sm text-blue-800 mt-1">
                Create your artwork using any drawing tool, then upload the image file here.
                Supported formats: JPEG, PNG, GIF, WebP (max 20MB).
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
