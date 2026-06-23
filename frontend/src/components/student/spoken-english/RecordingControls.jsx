import React from 'react';

/**
 * RecordingControls Component
 * 5 control buttons: Record, Stop, Play, Redo, Submit
 */
export default function RecordingControls({
  recordingState,
  onRecord,
  onStop,
  onPlay,
  onRedo,
  onSubmit,
  isWebcamReady,
  hasRecording
}) {
  return (
    <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
      {/* Record Button */}
      <button
        onClick={onRecord}
        disabled={!isWebcamReady || recordingState === 'recording' || recordingState === 'uploading' || hasRecording}
        className={`px-6 py-3 rounded-lg font-bold transition-colors ${
          !isWebcamReady || recordingState === 'recording' || recordingState === 'uploading' || hasRecording
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
            : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
        }`}
      >
        ● Record
      </button>

      {/* Stop Button */}
      <button
        onClick={onStop}
        disabled={recordingState !== 'recording'}
        className={`px-6 py-3 rounded-lg font-bold transition-colors ${
          recordingState !== 'recording'
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
            : 'bg-gray-600 text-white hover:bg-gray-700 cursor-pointer animate-pulse'
        }`}
      >
        ■ Stop
      </button>

      {/* Play Button */}
      <button
        onClick={onPlay}
        disabled={!hasRecording || recordingState === 'uploading'}
        className={`px-6 py-3 rounded-lg font-bold transition-colors ${
          !hasRecording || recordingState === 'uploading'
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
            : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
        }`}
      >
        ▶️ Play
      </button>

      {/* Redo Button */}
      <button
        onClick={onRedo}
        disabled={!hasRecording || recordingState === 'uploading'}
        className={`px-6 py-3 rounded-lg font-bold transition-colors ${
          !hasRecording || recordingState === 'uploading'
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
            : 'bg-orange-600 text-white hover:bg-orange-700 cursor-pointer'
        }`}
      >
        ↻ Re-record
      </button>

      {/* Submit Button */}
      <button
        onClick={onSubmit}
        disabled={!hasRecording || recordingState === 'uploading'}
        className={`px-8 py-4 rounded-lg font-bold transition-colors ${
          !hasRecording || recordingState === 'uploading'
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
            : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer shadow-lg'
        }`}
      >
        {recordingState === 'uploading' ? '⏳ Uploading...' : '✓ Submit Video'}
      </button>
    </div>
  );
}
