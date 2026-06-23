import React, { useEffect, useRef } from 'react';

/**
 * WebcamPreview Component
 * Displays live webcam feed or recorded video
 */
export default function WebcamPreview({
  mediaStream,
  recordedBlob,
  recordingState,
  recordingDuration
}) {
  const videoRef = useRef(null);

  // Update video source based on state
  useEffect(() => {
    if (videoRef.current) {
      if (recordedBlob) {
        // Show recorded video
        const videoUrl = URL.createObjectURL(recordedBlob);
        videoRef.current.srcObject = null;
        videoRef.current.src = videoUrl;
        videoRef.current.controls = true;

        return () => {
          URL.revokeObjectURL(videoUrl);
        };
      } else if (mediaStream) {
        // Show live webcam feed
        videoRef.current.src = '';
        videoRef.current.srcObject = mediaStream;
        videoRef.current.controls = false;
      }
    }
  }, [mediaStream, recordedBlob]);

  // Auto-play webcam feed
  useEffect(() => {
    if (videoRef.current && mediaStream && !recordedBlob) {
      videoRef.current.play().catch(err => {
        console.error('Video play error:', err);
      });
    }
  }, [mediaStream, recordedBlob]);

  // Format time (seconds to MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="my-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        {recordedBlob ? '📹 Recorded Video' : '📷 Webcam Preview'}
      </h3>

      {/* Video Display Area */}
      <div className={`relative w-full aspect-video bg-black rounded-lg overflow-hidden border-2 ${
        recordingState === 'recording' ? 'border-red-500' : 'border-blue-300'
      }`}>
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted={!recordedBlob}
          playsInline
        />

        {/* Recording Indicator */}
        {recordingState === 'recording' && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-md animate-pulse">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <span className="font-bold">REC</span>
            <span className="ml-2">{formatTime(recordingDuration)}</span>
          </div>
        )}

        {/* Empty State (No Webcam) */}
        {!mediaStream && !recordedBlob && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">📹</div>
              <p className="text-xl font-semibold mb-2">Webcam not detected</p>
              <p className="text-sm text-gray-300">
                Please connect a webcam to continue
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Webcam Instructions */}
      {!recordedBlob && mediaStream && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800 flex items-start">
            <span className="mr-2">⚠️</span>
            <span>
              Make sure you're in a well-lit area and the camera can see your face clearly.
              You can see yourself in the preview above.
            </span>
          </p>
        </div>
      )}

      {/* Recording Complete Info */}
      {recordedBlob && recordingState === 'recorded' && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800 flex items-start">
            <span className="mr-2">✓</span>
            <span>
              Recording complete! You can preview your video using the controls above, or re-record if needed.
              Duration: {formatTime(recordingDuration)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
