import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppCard from '../../components/student/computer-apps/AppCard';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { BookOpen, CheckCircle, ChevronRight, PlayCircle, FileText, HelpCircle, X, Music, Image as ImageIcon, ArrowLeft } from 'lucide-react'; // Added Icons
import CourseAudioPlayer from '../../components/student/computer-apps/CourseAudioPlayer';
import CourseImageViewer from '../../components/student/computer-apps/CourseImageViewer';
import GComprisLauncher from '../../components/student/computer-apps/GComprisLauncher';
import LoadingState from '../../components/common/LoadingState';
import useLmsContentFileUrl from '../../hooks/useLmsContentFileUrl';

/**
 * ComputerAppsPage Component - Epic 01 Story 02
 * Redesigned to match "Life Skills" aesthetics.
 * - Sidebar: Chapter Navigation
 * - Main Area: Grid of Content Cards (Video, PDF, Quiz)
 * - Click -> Modal (Video/PDF) or Navigation (Quiz)
 */
function isExternalVideoEmbed(url = '') {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

function ComputerAppsVideoModal({ item, onClose }) {
  const { url, loading } = useLmsContentFileUrl('computer-apps', item, { preferSignedUrl: true });
  const directUrl = url || item.fileUrl;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-black rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col max-h-[90vh]">
        <div className="p-4 flex justify-between items-center bg-gray-900 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white">{item.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="aspect-video bg-black flex-1 relative">
          {loading && (
            <div className="flex items-center justify-center h-full text-white">Loading video...</div>
          )}
          {!loading && directUrl && isExternalVideoEmbed(directUrl) && (
            <iframe
              src={directUrl.replace('watch?v=', 'embed/')}
              title={item.title}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
            />
          )}
          {!loading && directUrl && !isExternalVideoEmbed(directUrl) && (
            <video
              src={directUrl}
              title={item.title}
              controls
              autoPlay
              className="absolute inset-0 w-full h-full"
            />
          )}
          {!loading && !directUrl && (
            <div className="flex items-center justify-center h-full text-white">Video unavailable</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComputerAppsPdfModal({ item, onClose }) {
  const { url, loading } = useLmsContentFileUrl('computer-apps', item);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
            <p className="text-sm text-gray-500">Reading Material</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          {loading && (
            <div className="flex h-full items-center justify-center text-gray-600">Loading material...</div>
          )}
          {!loading && url && (
            <iframe
              src={url}
              title={item.title}
              className="w-full h-full"
            />
          )}
          {!loading && !url && (
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: item.description || 'No content available.' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComputerAppsAudioModal({ item, onClose, onComplete }) {
  const { url, loading } = useLmsContentFileUrl('computer-apps', item);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="rounded-2xl bg-white px-8 py-6 text-gray-700 shadow-2xl">Loading audio...</div>
      </div>
    );
  }

  return (
    <CourseAudioPlayer
      audioUrl={url || item.fileUrl}
      title={item.title}
      onClose={onClose}
      onComplete={onComplete}
    />
  );
}

function ComputerAppsImageModal({ item, onClose }) {
  const { url, loading } = useLmsContentFileUrl('computer-apps', item);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="rounded-2xl bg-white px-8 py-6 text-gray-700 shadow-2xl">Loading image...</div>
      </div>
    );
  }

  return (
    <CourseImageViewer
      imageUrl={url || item.fileUrl}
      title={item.title}
      onClose={onClose}
    />
  );
}

function ComputerAppsImageThumbnail({ item }) {
  const { url } = useLmsContentFileUrl('computer-apps', item);

  return url ? (
    <img src={url} alt={item.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
  ) : (
    <span className="text-6xl filter drop-shadow-sm">ðŸ–¼ï¸</span>
  );
}

export default function ComputerAppsPage() {
  const params = useParams();
  const { courseId } = params;
  const studentId = params.studentId || localStorage.getItem('userId') || 'student123';
  const navigate = useNavigate();

  // State
  const [apps, setApps] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null); // Full hierarchy
  const [selectedChapter, setSelectedChapter] = useState(null);

  // Modals
  const [activeVideo, setActiveVideo] = useState(null);
  const [activePdf, setActivePdf] = useState(null);
  const [activeAudio, setActiveAudio] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [showGCompris, setShowGCompris] = useState(false);

  const [loading, setLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    fetchApps();
  }, [studentId]);

  useEffect(() => {
    if (courseId) {
      fetchCourseHierarchy();
    } else {
      setSelectedCourse(null);
      setSelectedChapter(null);
    }
  }, [courseId]);

  const fetchApps = async () => {
    try {
      // setLoading(true); // Removed, handled by main useEffect or fetchCourseHierarchy
      const response = await api.get(`/api/v2/lms/student/${studentId}/courses/computer-apps`);
      if (response.data.success) {
        setApps(response.data.apps || []);
      }
    } catch (error) {
      console.error('Fetch Apps Error:', error);
      toast.error('Failed to load apps');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseHierarchy = async () => {
    try {
      // Don't set loading true here if we want seamless update?
      // setLoading(true); 
      const response = await api.get(`/api/v2/lms/student/${studentId}/courses/computer-apps/${courseId}/hierarchy`);
      if (response.data.success) {
        const newModules = response.data.modules || [];
        setSelectedCourse(response.data);

        // Preserve Selection Logic
        let foundChapter = null;
        if (selectedChapter) {
          // Find currently selected chapter in new data
          for (const m of newModules) {
            const match = m.chapters?.find(c => c.id === selectedChapter.id);
            if (match) {
              foundChapter = match;
              break;
            }
          }
        }

        if (foundChapter) {
          setSelectedChapter(foundChapter);
        } else if (!selectedChapter && newModules?.[0]?.chapters?.[0]) {
          // Initial load only
          setSelectedChapter(newModules[0].chapters[0]);
        }
      }
    } catch (error) {
      console.error('Fetch Hierarchy Error:', error);
      toast.error('Failed to load course content');
    } finally {
      setLoading(false);
    }
  };

  const markContentComplete = async (item) => {
    try {
      // if (!courseId) { // Removed, courseId is always present in this view
      //   console.error('No courseId, cannot mark complete');
      //   return;
      // }
      const response = await api.post(`/api/v2/lms/student/${studentId}/courses/computer-apps/mark-complete`, {
        itemId: item.id,
        itemType: item.type,
        courseId: courseId,
        quizId: item.quizId // Pass quizId if it exists (for robustness)
      });
      if (response.data.success) {
        // Refresh hierarchy to update checkmarks
        fetchCourseHierarchy();
        // Also re-fetch apps list in background to update progress bar?
        fetchApps();
      }
    } catch (e) {
      console.error("Failed to mark complete", e);
    }
  };

  const handleAppClick = (appId) => {
    navigate(`/student/computer-apps/${appId}`);
  };

  const handleLaunchContent = (item) => {
    if (item.type === 'gcompris') {
      setShowGCompris(true);
      markContentComplete(item);
    } else if (item.type === 'video') {
      setActiveVideo(item);
      markContentComplete(item);
    } else if (item.type === 'text' || item.type === 'pdf') { // assuming text is pdf-like for now or generic viewer
      // For now, treat text as PDF/Doc viewer if url exists, else text modal?
      // Life Skills used 'pdf' type. Our backend says 'text'.
      // If fileUrl is present, open specific viewer.
      if (item.fileUrl) {
        // Identify if it's a PDF or Doc
        setActivePdf(item);
      } else {
        // Just text content?
        setActivePdf(item); // Reusing PDF modal for generic text content for now
      }
      markContentComplete(item);
    } else if (item.type === 'quiz') {
      // Navigate to Quiz Page
      toast.success('Starting Quiz...');
      // Use quizId (generic ID) or fallback to item.id if missing
      navigate(`/student/computer-apps/quiz/${item.quizId || item.id}`, {
        state: { courseId, contentItemId: item.id }
      });
      // Quiz marks complete upon SUBMISSION, not click.
    } else if (item.type === 'audio') {
      setActiveAudio(item);
      // Mark complete happens on END of audio or now?
      // Usually on END, but for UX let's mark on open too/or pass callback
    } else if (item.type === 'image') {
      setActiveImage(item);
      markContentComplete(item);
    } else if (item.type === 'link') {
      const targetUrl = item.externalUrl || item.fileUrl;
      if (targetUrl) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        markContentComplete(item);
      } else {
        toast.error('Link unavailable');
      }
    } else {
      // Fallback for unknown types (renders as Read & Learn)
      setActivePdf(item);
      markContentComplete(item);
    }
  };

  const isTaskCompleted = (item) => (
    item?.isCompleted || item?.completed || item?.status === 'completed'
  );

  // Render List View
  if (!courseId) {
    if (loading) return (
      <LoadingState message="Loading computer apps..." fullScreen />
    );

    if (showGCompris) {
      return (
        <GComprisLauncher onBack={() => setShowGCompris(false)} />
      );
    }

    return (
      <div className="p-6 h-full overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="text-sm text-indigo-600 font-bold mb-4 hover:underline flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Back to Courses
          </button>
          <div className="bg-orange-100 rounded-2xl p-8 mb-8 shadow-sm">
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>Computer Applications 💻</h1>
            <p className="text-lg text-gray-700">Select a course to start mastering digital skills!</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <button
              type="button"
              onClick={() => setShowGCompris(true)}
              className="text-left bg-gradient-to-br from-indigo-600 to-cyan-500 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-white min-h-[240px] flex flex-col"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black mb-5">
                GC
              </div>
              <h2 className="text-2xl font-black mb-2">GCompris Games</h2>
              <p className="text-sm text-blue-50 leading-6 flex-1">
                Practice math, reading, science, memory, and strategy activities.
              </p>
              <span className="mt-5 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-black text-indigo-700">
                Open Games
              </span>
            </button>
            {apps.map(app => (
              <AppCard
                key={app.id}
                app={app}
                isSelected={false}
                onClick={() => handleAppClick(app.id)}
              />
            ))}
            {apps.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No courses available yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Player View (Life Skills Style)
  if (showGCompris) {
    return (
      <GComprisLauncher onBack={() => setShowGCompris(false)} />
    );
  }

  // Render Player View (Life Skills Style)
  return (
    <div className="flex bg-gray-50 font-sans">
      {/* Sidebar: Chapters */}
      <div className="w-80 border-r border-gray-200 bg-white flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <button
            onClick={() => navigate(`/student/computer-apps`)}
            className="text-sm text-indigo-600 font-bold mb-4 hover:underline flex items-center"
          >
            ← Back to Courses
          </button>
          <h2 className="text-2xl font-bold text-gray-800 leading-tight">
            {selectedCourse?.courseTitle || 'Course Content'}
          </h2>
        </div>

        <div className="flex-1 p-4 space-y-6">
          {selectedCourse?.modules?.map((module, mIdx) => (
            <div key={module.id}>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">
                Module {mIdx + 1}: {module.title}
              </h3>
              <div className="space-y-1">
                {module.chapters?.map((chapter, cIdx) => (
                  <button
                    key={chapter.id}
                    onClick={() => setSelectedChapter(chapter)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${selectedChapter?.id === chapter.id
                      ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                      : 'hover:bg-indigo-50 text-gray-700'
                      }`}
                  >
                    <span className="font-medium truncate text-sm">{cIdx + 1}. {chapter.title}</span>
                    {selectedChapter?.id === chapter.id && <ChevronRight size={16} />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Card Grid */}
      <div className="flex-1 bg-gray-50 p-8">
        {loading ? (
          <LoadingState message="Loading content..." />
        ) : selectedChapter ? (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-2">
                Current Chapter
              </span>
              <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                {selectedChapter.title}
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Select a learning activity below.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedChapter.contentItems?.map(item => {
                // Style based on type
                if (item.type === 'video') {
                  return (
                    <div key={item.id} className="bg-white border-2 border-indigo-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group flex flex-col h-full">
                      <div className="bg-indigo-50 h-40 flex items-center justify-center group-hover:bg-indigo-100 transition-colors relative">
                        <span className="text-6xl filter drop-shadow-sm">🎬</span>
                        {isTaskCompleted(item) && (
                          <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-full shadow-sm">
                            <CheckCircle size={16} />
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full mb-2 uppercase tracking-wide">Video Lesson</span>
                        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">{item.title}</h3>
                        <button
                          onClick={() => handleLaunchContent(item)}
                          className="w-full mt-auto py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <PlayCircle size={18} /> Watch Now
                        </button>
                      </div>
                    </div>
                  );
                } else if (item.type === 'quiz') {
                  return (
                    <div key={item.id} className="bg-white border-2 border-purple-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group flex flex-col h-full">
                      <div className="bg-purple-50 h-40 flex items-center justify-center group-hover:bg-purple-100 transition-colors relative">
                        <span className="text-6xl filter drop-shadow-sm">📝</span>
                        {isTaskCompleted(item) && (
                          <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-full shadow-sm">
                            <CheckCircle size={16} />
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full mb-2 uppercase tracking-wide">Quiz Challenge</span>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">{item.title}</h3>
                        <p className="text-sm text-gray-500 mb-4">{item.difficulty || 'Beginner'} Level</p>
                        <button
                          onClick={() => handleLaunchContent(item)}
                          className="w-full mt-auto py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <HelpCircle size={18} /> Start Quiz
                        </button>
                      </div>
                    </div>
                  );
                } else if (item.type === 'gcompris') {
                  return (
                    <div key={item.id} className="bg-white border-2 border-indigo-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group flex flex-col h-full">
                      <div className="bg-indigo-50 h-40 flex items-center justify-center group-hover:bg-indigo-100 transition-colors relative">
                        <span className="text-5xl font-black text-indigo-600">GC</span>
                        {isTaskCompleted(item) && (
                          <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-full shadow-sm">
                            <CheckCircle size={16} />
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full mb-2 uppercase tracking-wide">GCompris</span>
                        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">{item.title}</h3>
                        <button
                          onClick={() => handleLaunchContent(item)}
                          className="w-full mt-auto py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <PlayCircle size={18} /> Open Games
                        </button>
                      </div>
                    </div>
                  );
                } else if (item.type === 'audio') {
                  // AUDIO CARD
                  return (
                    <div key={item.id} className="bg-white border-2 border-amber-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
                      <div className="bg-amber-50 h-40 flex items-center justify-center group-hover:bg-amber-100 transition-colors relative">
                        <span className="text-6xl filter drop-shadow-sm">🎧</span>
                        {isTaskCompleted(item) && (
                          <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-full shadow-sm">
                            <CheckCircle size={16} />
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full mb-2 uppercase tracking-wide">Audio Lesson</span>
                        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">{item.title}</h3>
                        <button
                          onClick={() => handleLaunchContent(item)}
                          className="w-full py-2.5 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Music size={18} /> Listen Now
                        </button>
                      </div>
                    </div>
                  );
                } else if (item.type === 'image') {
                  // IMAGE CARD
                  return (
                    <div key={item.id} className="bg-white border-2 border-pink-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
                      <div className="bg-pink-50 h-40 flex items-center justify-center group-hover:bg-pink-100 transition-colors relative">
                        {item.fileUrl ? (
                          <ComputerAppsImageThumbnail item={item} />
                        ) : (
                          <span className="text-6xl filter drop-shadow-sm">🖼️</span>
                        )}
                        {isTaskCompleted(item) && (
                          <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-full shadow-sm">
                            <CheckCircle size={16} />
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <span className="inline-block px-2 py-1 bg-pink-100 text-pink-700 text-xs font-bold rounded-full mb-2 uppercase tracking-wide">Visual Aid</span>
                        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">{item.title}</h3>
                        <button
                          onClick={() => handleLaunchContent(item)}
                          className="w-full py-2.5 bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <ImageIcon size={18} /> View Image
                        </button>
                      </div>
                    </div>
                  );
                } else if (item.type === 'link') {
                  return (
                    <div key={item.id} className="bg-white border-2 border-cyan-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
                      <div className="bg-cyan-50 h-40 flex items-center justify-center group-hover:bg-cyan-100 transition-colors relative">
                        <span className="text-6xl filter drop-shadow-sm">ðŸ”—</span>
                        {isTaskCompleted(item) && (
                          <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-full shadow-sm">
                            <CheckCircle size={16} />
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <span className="inline-block px-2 py-1 bg-cyan-100 text-cyan-700 text-xs font-bold rounded-full mb-2 uppercase tracking-wide">Link</span>
                        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">{item.title}</h3>
                        <button
                          onClick={() => handleLaunchContent(item)}
                          className="w-full py-2.5 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors flex items-center justify-center gap-2"
                        >
                          Open Link
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  // Text/PDF (Default)
                  return (
                    <div key={item.id} className="bg-white border-2 border-red-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
                      <div className="bg-red-50 h-40 flex items-center justify-center group-hover:bg-red-100 transition-colors relative">
                        <span className="text-6xl filter drop-shadow-sm">📄</span>
                        {isTaskCompleted(item) && (
                          <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-full shadow-sm">
                            <CheckCircle size={16} />
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full mb-2 uppercase tracking-wide">Read & Learn</span>
                        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">{item.title}</h3>
                        <button
                          onClick={() => handleLaunchContent(item)}
                          className="w-full py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <FileText size={18} /> View Material
                        </button>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <BookOpen size={80} className="mb-4 text-gray-200" />
            <p className="text-xl font-medium">Select a chapter from the sidebar</p>
          </div>
        )}
      </div>

      {/* Video Modal */}
      {activeVideo && (
        <ComputerAppsVideoModal item={activeVideo} onClose={() => setActiveVideo(null)} />
      )}

      {/* PDF/Text Modal */}
      {activePdf && (
        <ComputerAppsPdfModal item={activePdf} onClose={() => setActivePdf(null)} />
      )}

      {/* Audio Player Modal */}
      {activeAudio && (
        <ComputerAppsAudioModal
          item={activeAudio}
          onClose={() => setActiveAudio(null)}
          onComplete={() => markContentComplete(activeAudio)}
        />
      )}

      {/* Image Viewer Modal */}
      {activeImage && (
        <ComputerAppsImageModal item={activeImage} onClose={() => setActiveImage(null)} />
      )}
    </div>
  );
}
