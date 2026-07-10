import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, apiWithoutContentType } from '../../api';
import toast from 'react-hot-toast';
// import StudentLayout from '../../components/student/StudentLayout';
import AudioInstructions from '../../components/student/spoken-english/AudioInstructions';
import WebcamPreview from '../../components/student/spoken-english/WebcamPreview';
import RecordingControls from '../../components/student/spoken-english/RecordingControls';
import RedoModal from '../../components/student/spoken-english/RedoModal';
import { CheckCircle } from 'lucide-react';
import LoadingState from '../../components/common/LoadingState';
import useLmsContentFileUrl from '../../hooks/useLmsContentFileUrl';

/**
 * Spoken English Page - Epic 01 Story 04
 * Main page for video recording of poetry recitation and speeches
 */
export default function SpokenEnglishPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const isListMode = !taskId;

  // State Management
  const [task, setTask] = useState(null);
  const [taskList, setTaskList] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { url: instructionsAudioUrl } = useLmsContentFileUrl(
    'spoken-english',
    task?.instructionsAudioUrl ? { id: task.id, fileUrl: task.instructionsAudioUrl } : null
  );

  // Recording State
  const [recordingState, setRecordingState] = useState('initial'); // initial, recording, recorded, playing, uploading
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showRedoModal, setShowRedoModal] = useState(false);

  // WebRTC References
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Load data on mount — list when no taskId, single task otherwise
  useEffect(() => {
    if (isListMode) {
      fetchTaskList();
      fetchSubmissions();
    } else {
      fetchTaskData();
      requestWebcamAccess();
    }

    // Cleanup on unmount
    return () => {
      stopWebcam();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [taskId]);

  /**
   * Fetch all available Spoken English tasks (list mode)
   */
  const fetchTaskList = async () => {
    try {
      setLoading(true);
      const studentId = localStorage.getItem('userId') || 'student1';
      const response = await api.get(`/api/v2/lms/student/${studentId}/courses/spoken-english`);

      if (response.data.success) {
        setTaskList(response.data.tasks || []);
      } else {
        setError('Failed to load tasks');
        toast.error('Failed to load tasks');
      }
    } catch (err) {
      console.error('Error fetching task list:', err);
      setError('Failed to load tasks');
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch the student's submission history (list mode)
   */
  const fetchSubmissions = async () => {
    try {
      const studentId = localStorage.getItem('userId') || 'student1';
      const response = await api.get(
        `/api/v2/lms/student/${studentId}/courses/spoken-english/submissions/history`
      );
      if (response.data.success) {
        setSubmissions(response.data.submissions || []);
      }
    } catch (err) {
      // Non-fatal: the picker still works without history.
      console.error('Error fetching submissions:', err);
    }
  };

  /**
   * Fetch task data from API
   */
  const fetchTaskData = async () => {
    try {
      setLoading(true);
      const studentId = localStorage.getItem('userId') || 'student1';
      const response = await api.get(`/api/v2/lms/student/${studentId}/courses/spoken-english/${taskId}`);

      if (response.data.success) {
        setTask(response.data.task);
      } else {
        setError('Failed to load task data');
        toast.error('Failed to load task');
      }
    } catch (err) {
      console.error('Error fetching task:', err);
      setError('Failed to load task data');
      toast.error('Failed to load task data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Request webcam access using WebRTC
   */
  const requestWebcamAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });

      mediaStreamRef.current = stream;
      toast.success('Webcam connected successfully!');
    } catch (err) {
      console.error('Webcam access error:', err);

      if (err.name === 'NotAllowedError') {
        toast.error('Camera access denied. Please allow camera permissions.');
      } else if (err.name === 'NotFoundError') {
        toast.error('Webcam not detected. Please connect a webcam.');
      } else {
        toast.error('Failed to access webcam');
      }

      setError('Webcam access failed');
    }
  };

  /**
   * Stop webcam stream
   */
  const stopWebcam = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  /**
   * Start recording video
   */
  const startRecording = () => {
    if (!mediaStreamRef.current) {
      toast.error('Webcam not available. Please refresh the page.');
      return;
    }

    try {
      // Reset previous recording
      recordedChunksRef.current = [];
      setRecordingDuration(0);

      // Create MediaRecorder
      const options = { mimeType: 'video/webm;codecs=vp9' };

      // Fallback if vp9 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setRecordingState('recorded');
        toast.success('Recording complete! Preview or submit your video.');
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecordingState('recording');

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      toast.success('Recording started!');
    } catch (err) {
      console.error('Recording error:', err);
      toast.error('Failed to start recording');
    }
  };

  /**
   * Stop recording video
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();

      // Stop timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  /**
   * Handle re-record confirmation
   */
  const handleRedoConfirm = () => {
    setRecordedBlob(null);
    setRecordingDuration(0);
    setRecordingState('initial');
    recordedChunksRef.current = [];
    setShowRedoModal(false);
    toast.success('Ready to record again');
  };

  /**
   * Submit video recording
   */
  const handleSubmit = async () => {
    if (!recordedBlob) {
      toast.error('No recording to submit');
      return;
    }

    try {
      setRecordingState('uploading');

      // Create form data
      const formData = new FormData();
      formData.append('file', recordedBlob, `spoken-english-${taskId}-${Date.now()}.webm`);
      formData.append('taskId', taskId);
      formData.append('duration', recordingDuration);
      formData.append('fileSize', recordedBlob.size);

      const studentId = localStorage.getItem('userId') || 'student1';

      const response = await apiWithoutContentType.post(
        `/api/v2/lms/student/${studentId}/courses/spoken-english/submissions`,
        formData
      );

      if (response.data.success) {
        toast.success('Video submitted successfully! Coach will grade it soon.');

        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/student/dashboard');
        }, 3000);
      } else {
        toast.error('Failed to submit video');
        setRecordingState('recorded');
      }
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Failed to submit video');
      setRecordingState('recorded');
    }
  };

  // Loading State
  if (loading) {
    return <LoadingState message={isListMode ? 'Loading tasks...' : 'Loading task...'} fullScreen />;
  }

  // List mode — render task picker when no taskId in URL
  if (isListMode) {
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">SPOKEN ENGLISH</h1>
          <p className="text-lg text-gray-600">Pick a task to record your video.</p>
        </div>

        {taskList.length === 0 ? (
          <div className="text-center py-12 bg-white border-2 border-dashed border-gray-300 rounded-xl">
            <p className="text-lg text-gray-600">No Spoken English tasks available yet.</p>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {taskList.map((t) => {
              const locked = t.status === 'locked';
              const graded = t.status === 'graded';
              const underReview = t.status === 'under_review';
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && navigate(`/student/spoken-english/${t.id}`)}
                  className={`text-left bg-white border-2 rounded-xl p-5 transition-shadow relative ${
                    locked
                      ? 'border-gray-200 opacity-60 cursor-not-allowed'
                      : 'border-blue-200 hover:shadow-lg cursor-pointer'
                  }`}
                >
                  {graded && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-full shadow-sm" aria-hidden="true">
                      <CheckCircle size={16} />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3 pr-10">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                      {t.difficulty || 'Beginner'}
                    </span>
                    <span className="text-2xl">{locked ? '🔒' : graded ? '✅' : underReview ? '⏳' : '🎤'}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{t.title}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{t.estimatedTime || 10} min</span>
                    <span className="capitalize">{(t.status || 'available').replace('_', ' ')}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* My Submissions — history of recordings with status + coach feedback */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">📼 My Submissions</h2>
          {submissions.length === 0 ? (
            <p className="text-gray-500 bg-white border border-gray-200 rounded-lg p-4">
              You haven't submitted any recordings yet. Pick a task above to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {submissions.map((s) => {
                const statusStyle = s.status === 'graded'
                  ? 'bg-green-100 text-green-700'
                  : s.status === 'flagged'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700';
                const statusLabel = s.status === 'graded'
                  ? 'Graded'
                  : s.status === 'flagged'
                    ? 'Needs Re-do'
                    : 'Under Review';
                return (
                  <div key={s.submissionId} className="bg-white border border-gray-200 rounded-lg p-4 relative">
                    {s.status === 'graded' && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-full shadow-sm" aria-hidden="true">
                        <CheckCircle size={16} />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3 flex-wrap pr-10">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-800">{s.taskTitle || 'Spoken English Task'}</h3>
                        <p className="text-sm text-gray-500">
                          Submitted {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}
                          {s.duration ? ` · ${Math.floor(s.duration / 60)}:${String(s.duration % 60).padStart(2, '0')}` : ''}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusStyle}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {s.fileUrl && (
                      <video src={s.fileUrl} controls className="mt-3 w-full max-w-md rounded-lg border border-gray-200" />
                    )}

                    {s.status === 'graded' && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-sm">
                        {s.score != null && <p className="font-semibold text-green-800">Score: {s.score}</p>}
                        {s.grade && <p className="text-green-800 capitalize">Rating: {String(s.grade).replace('_', ' ')}</p>}
                        {s.feedback && <p className="text-gray-700 mt-1">Coach feedback: {s.feedback}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error State (single task mode)
  if (error || !task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">{error || 'Task not found'}</p>
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            SPOKEN ENGLISH COURSE
          </h1>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Task: {task.title}
          </h2>
          <p className="text-gray-600">{task.description}</p>
        </div>

        {/* Audio Instructions */}
        {task.instructionsAudioUrl && (
          <AudioInstructions
            audioUrl={instructionsAudioUrl || task.instructionsAudioUrl}
            instructionsText={task.instructionsText}
          />
        )}

        {/* Instructions Text (if no audio) */}
        {!task.instructionsAudioUrl && task.instructionsText && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">📋 Instructions</h3>
            <p className="text-gray-700 whitespace-pre-line">{task.instructionsText}</p>
          </div>
        )}

        {/* Poem Text */}
        {task.poemText && (
          <div className="mb-6 p-6 bg-gray-50 border-2 border-gray-300 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">📖 Poem to Recite:</h3>
            <div className="text-gray-800 whitespace-pre-line italic text-lg leading-relaxed">
              {task.poemText}
            </div>
          </div>
        )}

        {/* Webcam Preview / Recorded Video */}
        <WebcamPreview
          mediaStream={mediaStreamRef.current}
          recordedBlob={recordedBlob}
          recordingState={recordingState}
          recordingDuration={recordingDuration}
        />

        {/* Recording Controls */}
        <RecordingControls
          recordingState={recordingState}
          onRecord={startRecording}
          onStop={stopRecording}
          onPlay={() => setRecordingState('playing')}
          onRedo={() => setShowRedoModal(true)}
          onSubmit={handleSubmit}
          isWebcamReady={!!mediaStreamRef.current}
          hasRecording={!!recordedBlob}
        />

        {/* Status Message */}
        <div className="mt-4 text-center">
          <p className={`text-base font-medium ${recordingState === 'recording' ? 'text-red-600' :
            recordingState === 'playing' ? 'text-blue-600' :
              recordingState === 'uploading' ? 'text-orange-600' :
                recordingState === 'recorded' ? 'text-green-600' :
                  'text-gray-600'
            }`}>
            {recordingState === 'initial' && 'Ready to record. Click the red button when you\'re ready.'}
            {recordingState === 'recording' && `Recording... ${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')}`}
            {recordingState === 'recorded' && 'Recording complete. Preview or submit your video.'}
            {recordingState === 'playing' && 'Playing...'}
            {recordingState === 'uploading' && 'Uploading video... Please wait.'}
          </p>
        </div>

        {/* Requirements */}
        {task.requirements && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">✓ Requirements:</h3>
            <ul className="space-y-1">
              {task.requirements.map((req, idx) => (
                <li key={idx} className="text-gray-700 flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Redo Modal */}
        {showRedoModal && (
          <RedoModal
            onConfirm={handleRedoConfirm}
            onCancel={() => setShowRedoModal(false)}
          />
        )}
      </div>
    </>
  );
}
