import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, apiWithoutContentType } from '../../api';
import toast from 'react-hot-toast';
// import StudentLayout from '../../components/student/StudentLayout';
import AudioQuestionCard from '../../components/student/lifeskills/AudioQuestionCard';
import WaveformVisualizer from '../../components/student/lifeskills/WaveformVisualizer';
import LoadingState from '../../components/common/LoadingState';

/**
 * Life Skills Voice Recording Task Page - Epic 01 Story 05
 * WhatsApp-style press-and-hold voice recording with waveform visualization
 */
export default function LifeSkillsVoiceTaskPage() {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioPlayerRef = useRef(null);

  useEffect(() => {
    fetchVoiceTask();
    return () => {
      // Cleanup on unmount
      stopRecording();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [taskId]);

  const fetchVoiceTask = async () => {
    try {
      setLoading(true);
      const studentId = localStorage.getItem('userId') || 'student1';
      const response = await api.get(
        `/api/v2/lms/student/${studentId}/courses/life-skills/voice/${taskId}`
      );

      if (response.data.success) {
        setTask(response.data.task);
      } else {
        setError('Failed to load voice task');
        toast.error('Failed to load task');
      }
    } catch (err) {
      console.error('Error fetching voice task:', err);
      setError('Failed to load voice task');
      toast.error('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      toast.error('Microphone permission is required to record your voice');
      throw err;
    }
  };

  const startRecording = async () => {
    try {
      // Reset previous recording
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await requestMicrophonePermission();

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
      };

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // Auto-stop at max duration
          if (newTime >= task.maxRecordingDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setIsRecording(false);
    setIsPaused(false);

    // Stop all audio tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
  };

  const handlePlayRecording = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePausePlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleReRecord = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const handleSubmit = async () => {
    if (!audioBlob) {
      toast.error('Please record your voice first');
      return;
    }

    if (recordingTime < 3) {
      toast.error('Recording is too short. Please record at least 3 seconds.');
      return;
    }

    try {
      setSubmitting(true);
      const studentId = localStorage.getItem('userId') || 'student1';

      // Create FormData
      const formData = new FormData();
      formData.append('studentId', studentId);
      formData.append('taskId', taskId);
      formData.append('voiceRecording', audioBlob, `voice_${taskId}_${Date.now()}.webm`);

      // Submit to backend
      const response = await apiWithoutContentType.post(
        `/api/v2/lms/student/${studentId}/courses/life-skills/voice/submit`,
        formData
      );

      if (response.data.success) {
        toast.success(`Great job! You earned ${response.data.coinsEarned} coins! 🎉`);
        // Navigate back to Life Skills page
        setTimeout(() => {
          navigate('/student/life-skills');
        }, 1500);
      } else {
        toast.error('Failed to submit recording');
      }
    } catch (err) {
      console.error('Error submitting recording:', err);
      toast.error('Failed to submit recording');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <LoadingState message="Loading voice task..." fullScreen />;
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-xl text-red-600 mb-4">{error || 'Task not found'}</p>
            <button
              onClick={() => navigate('/student/life-skills')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Return to Life Skills
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = (recordingTime / task.maxRecordingDuration) * 100;
  const canSubmit = audioBlob && !isRecording && recordingTime >= 3;

  return (
    <div className="bg-gray-100 min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-blue-900 mb-1" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                {task.title} 🎤
              </h1>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                {task.category}
              </span>
            </div>
            <button
              onClick={() => navigate('/student/life-skills')}
              className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Audio Question Card */}
        <AudioQuestionCard
          audioUrl={task.audioUrl}
          questionText={task.question}
          autoPlay={true}
        />

        {/* Question Display */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-3" style={{ fontFamily: 'Patrick Hand, cursive' }}>
            {task.question}
          </h2>
          <p className="text-gray-600 text-sm">
            Record your voice answer to this question. Speak clearly and take your time!
          </p>
        </div>

        {/* Recording Interface */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl p-8 mb-6">
          {/* Waveform Visualizer */}
          {(isRecording || isPlaying) && (
            <div className="mb-6">
              <WaveformVisualizer
                audioStream={isRecording ? audioStreamRef.current : null}
                isRecording={isRecording}
                isPlaying={isPlaying}
                color={isRecording ? 'red' : 'blue'}
                height={100}
              />
            </div>
          )}

          {/* Timer Display */}
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>
              {formatTime(recordingTime)} / {formatTime(task.maxRecordingDuration)}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${progress >= 90 ? 'bg-red-500' : 'bg-blue-600'
                  }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              {isRecording
                ? 'Recording in progress...'
                : audioBlob
                  ? 'Recording complete!'
                  : 'Press and hold to start recording'}
            </p>
          </div>

          {/* Recording Controls */}
          {!audioBlob && (
            <div className="flex flex-col items-center gap-4">
              {!isRecording ? (
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className="w-24 h-24 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl hover:shadow-2xl transition-all active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-24 h-24 rounded-full bg-gray-800 hover:bg-gray-900 text-white flex items-center justify-center shadow-xl hover:shadow-2xl transition-all animate-pulse"
                >
                  <div className="w-8 h-8 bg-white rounded"></div>
                </button>
              )}
              <p className="text-sm text-gray-600 text-center max-w-md">
                {isRecording
                  ? 'Release to stop recording'
                  : 'Press and hold the red button to record your voice. Release to stop.'}
              </p>
            </div>
          )}

          {/* Playback Controls */}
          {audioBlob && (
            <div className="flex flex-col items-center gap-4">
              <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              <div className="flex items-center gap-4">
                <button
                  onClick={isPlaying ? handlePausePlayback : handlePlayRecording}
                  className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all"
                >
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleReRecord}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                  style={{ fontFamily: 'Patrick Hand, cursive' }}
                >
                  🔄 Re-record
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className={`w-full py-4 rounded-lg font-bold text-xl transition-all ${canSubmit && !submitting
            ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          style={{ fontFamily: 'Patrick Hand, cursive' }}
        >
          {submitting ? 'Submitting...' : `Submit & Earn ${task.coinsForSubmission} Coins! 🎉`}
        </button>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-3" style={{ fontFamily: 'Patrick Hand, cursive' }}>
            💡 Recording Tips
          </h3>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li className="flex items-start">
              <span className="text-yellow-600 mr-2">🎧</span>
              <span>Listen to the audio question carefully before recording</span>
            </li>
            <li className="flex items-start">
              <span className="text-yellow-600 mr-2">🎤</span>
              <span>Speak clearly and at a comfortable pace</span>
            </li>
            <li className="flex items-start">
              <span className="text-yellow-600 mr-2">⏱️</span>
              <span>You have up to {task.maxRecordingDuration} seconds to answer</span>
            </li>
            <li className="flex items-start">
              <span className="text-yellow-600 mr-2">🔄</span>
              <span>You can re-record as many times as you want before submitting</span>
            </li>
            <li className="flex items-start">
              <span className="text-yellow-600 mr-2">👂</span>
              <span>Play back your recording to make sure you're happy with it</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
