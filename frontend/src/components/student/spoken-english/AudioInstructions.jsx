import React, { useState, useRef } from 'react';

/**
 * AudioInstructions Component
 * HTML5 audio player for task instructions
 */
export default function AudioInstructions({ audioUrl, instructionsText }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  // Handle play/pause
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle ended
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Format time (seconds to MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-semibold text-blue-900 mb-3">🎧 Audio Instructions</h3>

      {/* Audio Player */}
      {audioUrl ? (
        <div className="space-y-3">
          <button
            onClick={handlePlayPause}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
          >
            {isPlaying ? '⏸️ Pause Audio' : '▶️ Play Audio Instructions'}
          </button>

          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
            <div className="flex-1 bg-gray-300 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="text-sm text-gray-600">{formatTime(duration)}</span>
          </div>

          {/* Hidden Audio Element */}
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            className="hidden"
          />
        </div>
      ) : (
        <p className="text-sm text-gray-600">Audio instructions not available for this task.</p>
      )}

      {/* Instructions Text */}
      {instructionsText && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-sm text-gray-700 leading-relaxed">
            {instructionsText}
          </p>
        </div>
      )}
    </div>
  );
}
