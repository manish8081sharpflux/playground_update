import React, { useRef, useEffect } from 'react';

/**
 * WaveformVisualizer Component - Epic 01 Story 05
 * Real-time audio waveform visualization using Canvas API and Web Audio API
 * Displays animated waveform bars during recording and playback
 */
export default function WaveformVisualizer({
  audioStream = null,
  isRecording = false,
  isPlaying = false,
  color = 'blue',
  height = 80
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const dataArrayRef = useRef(null);

  // Color mapping
  const colorMap = {
    green: '#10b981',
    red: '#ef4444',
    blue: '#3b82f6',
    yellow: '#eab308',
    purple: '#a855f7'
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup audio context and analyser when recording starts
    if (audioStream && isRecording) {
      try {
        // Create AudioContext and connect stream
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContextRef.current.createMediaStreamSource(audioStream);

        // Create analyser node
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;

        // Connect source to analyser
        source.connect(analyserRef.current);

        // Setup data array
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);

        // Start visualization
        visualize(ctx, canvas);
      } catch (error) {
        console.error('Error setting up audio visualization:', error);
      }
    } else if (!isRecording && !isPlaying) {
      // Stop visualization and cleanup
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Cleanup audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawIdleState(ctx, canvas);
    }

    return () => {
      // Cleanup on unmount
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [audioStream, isRecording, isPlaying]);

  // Visualize audio data
  const visualize = (ctx, canvas) => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      // Get frequency data
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate bar dimensions
      const barCount = 40;
      const barWidth = canvas.width / barCount;
      const barSpacing = 2;
      const maxBarHeight = canvas.height - 10;

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        // Sample frequency data at intervals
        const dataIndex = Math.floor((i * dataArrayRef.current.length) / barCount);
        const value = dataArrayRef.current[dataIndex];

        // Normalize height (0-1)
        const normalizedHeight = value / 255;

        // Calculate bar height with minimum height
        const barHeight = Math.max(normalizedHeight * maxBarHeight, 4);

        // Calculate x and y positions
        const x = i * barWidth;
        const y = (canvas.height - barHeight) / 2;

        // Draw bar with gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, colorMap[color] || colorMap.blue);
        gradient.addColorStop(1, colorMap[color] ? `${colorMap[color]}80` : `${colorMap.blue}80`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x + barSpacing / 2, y, barWidth - barSpacing, barHeight);
      }
    };

    draw();
  };

  // Draw idle state (flat line)
  const drawIdleState = (ctx, canvas) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw center line
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Initialize canvas with idle state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawIdleState(ctx, canvas);
  }, []);

  return (
    <div className="w-full bg-gray-900 rounded-lg p-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        className="w-full h-full"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
}
