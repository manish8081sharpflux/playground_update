import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import toast from 'react-hot-toast';
// import StudentLayout from '../../components/student/StudentLayout';

/**
 * Life Skills Course Page - Epic 01 Story 05
 * Main landing page showing voice tasks and MCQ quiz
 */
export default function LifeSkillsCoursePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]); // [{ courseId, courseName, modules }]
  const [error, setError] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null); // For playing video modal
  const [activePdf, setActivePdf] = useState(null); // For viewing PDF modal

  useEffect(() => {
    fetchLifeSkillsTasks();
  }, []);

  const fetchLifeSkillsTasks = async () => {
    try {
      setLoading(true);
      const studentId = localStorage.getItem('userId') || 'student1';
      const response = await api.get(`/api/v2/lms/student/${studentId}/courses/life-skills`);

      if (response.data.success) {
        // Multi-course shape; fall back to legacy single-course shape
        const list = Array.isArray(response.data.courses) && response.data.courses.length > 0
          ? response.data.courses
          : (response.data.modules
            ? [{ courseId: response.data.courseId, courseName: response.data.courseName, modules: response.data.modules }]
            : []);
        setCourses(list);
      } else {
        setError('Failed to load Life Skills tasks');
        toast.error('Failed to load tasks');
      }
    } catch (err) {
      console.error('Error fetching Life Skills tasks:', err);
      setError('Failed to load Life Skills tasks');
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceTaskClick = (taskId) => {
    navigate(`/student/life-skills/voice/${taskId}`);
  };

  const handleQuizClick = (quizId) => {
    // Assuming quizId is needed or fixed routes for now
    navigate(`/student/life-skills/quiz/${quizId}`);
  };

  const markContentComplete = async (item, parentCourseId) => {
    try {
      const studentId = localStorage.getItem('userId') || 'student1';
      if (!parentCourseId) return;

      await api.post(`/api/v2/lms/student/${studentId}/courses/life-skills/mark-complete`, {
        itemId: item.id,
        itemType: item.type,
        courseId: parentCourseId
      });
    } catch (e) {
      console.error("Failed to mark complete", e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-600">Loading Life Skills tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>
            Life Skills 🌱
          </h1>
          <p className="text-lg text-gray-600">Learn about hygiene, emotions, and social skills!</p>
        </div>

        {/* Courses */}
        <div className="space-y-16">
          {courses.map((course) => (
          <section key={course.courseId} className="course-section">
            <h2 className="text-3xl font-extrabold text-blue-800 mb-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>
              📚 {course.courseName}
            </h2>
            <div className="space-y-12">
              {(course.modules || []).map((module) => (
            <div key={module.id} className="module-section">
              <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-green-200 pb-2">
                {module.title}
              </h2>

              <div className="space-y-8">
                {module.chapters.map((chapter) => (
                  <div key={chapter.id} className="chapter-section pl-4">
                    <h3 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
                      <span className="mr-2">📖</span> {chapter.title}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {chapter.contentItems.map((item) => {
                        // Render based on Type
                        if (item.type === 'video') {
                          return (
                            <div key={item.id} className="bg-white border-2 border-indigo-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                              <div className="bg-indigo-50 p-4 flex justify-center items-center h-48">
                                <span className="text-6xl">🎬</span>
                              </div>
                              <div className="p-4">
                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full font-medium mb-2 inline-block">
                                  Video
                                </span>
                                <h4 className="text-lg font-bold text-gray-800 mb-2 leading-tight">{item.title}</h4>
                                <button
                                  onClick={() => {
                                    setActiveVideo(item);
                                    markContentComplete(item, course.courseId);
                                  }}
                                  className="w-full mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                                >
                                  <span>▶️</span> Watch
                                </button>
                              </div>
                            </div>
                          );
                        } else if (item.type === 'pdf') {
                          return (
                            <div key={item.id} className="bg-white border-2 border-red-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                              <div className="bg-red-50 p-4 flex justify-center items-center h-48">
                                <span className="text-6xl">📄</span>
                              </div>
                              <div className="p-4">
                                <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium mb-2 inline-block">
                                  PDF
                                </span>
                                <h4 className="text-lg font-bold text-gray-800 mb-2 leading-tight">{item.title}</h4>
                                <button
                                  onClick={() => {
                                    setActivePdf(item);
                                    markContentComplete(item, course.courseId);
                                  }}
                                  className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 block text-center"
                                >
                                  <span>👁️</span> View PDF
                                </button>
                              </div>
                            </div>
                          );
                        } else if (item.type === 'quiz') {
                          return (
                            <div
                              key={item.id}
                              className="bg-white border-2 border-purple-300 rounded-xl p-6 hover:shadow-lg transition-shadow relative overflow-hidden"
                            >
                              <div className="absolute top-0 right-0 p-2 opacity-10">
                                <span className="text-8xl">📝</span>
                              </div>
                              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full font-medium mb-3 inline-block">
                                Quiz
                              </span>
                              <h4 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h4>
                              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>
                              <div className="flex items-center text-sm text-gray-500 mb-4">
                                <span>{item.totalQuestions} Questions</span>
                              </div>
                              <button
                                onClick={() => handleQuizClick(item.id)}
                                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                              >
                                <span>🚀</span> Start Quiz
                              </button>
                            </div>
                          );
                        } else {
                          // Default to Voice/Task
                          return (
                            <div
                              key={item.id}
                              className="bg-white border-2 border-green-300 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
                              onClick={() => handleVoiceTaskClick(item.id)}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                                  {item.category}
                                </span>
                                <span className="text-2xl">🎤</span>
                              </div>
                              <h4 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h4>
                              <p className="text-gray-600 mb-4 text-sm line-clamp-2">
                                {item.instructions || item.description}
                              </p>
                              <div className="flex items-center justify-between text-sm text-gray-500">
                                <span className="text-yellow-600 font-medium">+{item.coinsForSubmission} coins</span>
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
              ))}
            </div>
          </section>
          ))}
        </div>

        {/* Video Viewer Modal */}
        {activeVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-bold">{activeVideo.title}</h3>
                <button onClick={() => setActiveVideo(null)} className="text-gray-500 hover:text-red-500 text-2xl">&times;</button>
              </div>
              <div className="aspect-video bg-black">
                <video
                  src={activeVideo.fileUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        )}



        {/* PDF Viewer Modal */}
        {activePdf && (
          <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] overflow-hidden shadow-2xl flex flex-col">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-bold">{activePdf.title}</h3>
                <button onClick={() => setActivePdf(null)} className="text-gray-500 hover:text-red-500 text-2xl">&times;</button>
              </div>
              <div className="flex-1 bg-gray-100 p-0">
                <iframe
                  src={activePdf.fileUrl}
                  className="w-full h-full"
                  title={activePdf.title}
                />
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-3" style={{ fontFamily: 'Patrick Hand, cursive' }}>
            💡 How it Works
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-yellow-600 mr-3 mt-1">🎤</span>
              <span><strong>Voice Tasks:</strong> Listen to the question, then record your voice answer (up to 60 seconds). Your coach will grade it!</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3 mt-1">📝</span>
              <span><strong>Quiz:</strong> Answer all 10 multiple choice questions. Get instant results and earn coins based on your score!</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-3 mt-1">💰</span>
              <span><strong>Earn Coins:</strong> Each correct quiz answer earns 12 coins. Score 80%+ to get a 24-coin bonus!</span>
            </li>
          </ul>
        </div>
      </div >
    </>
  );
}
