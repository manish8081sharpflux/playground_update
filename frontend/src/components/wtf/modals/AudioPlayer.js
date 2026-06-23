import React, { useRef, useState, useEffect } from "react";
import { X, Play, Pause, Volume2, Eye, Heart, ThumbsUp } from "lucide-react";
import { Dialog, DialogContent } from "../../ui/dialog.jsx";
import { Badge } from "../../ui/badge.jsx";

const AudioPlayer = ({
  isOpen,
  onClose,
  audioSrc,
  title,
  author,
  caption,
  durationSeconds, // optional persisted duration from backend
  likes,
  hearts,
  views,
  isOfficial,
  officialCategory,
  onLike,
  onHeart,
  isStudent = false,
  studentName,
  balagruha,
  metadata,
  createdAt,
}) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Helpers
  const isFiniteNumber = (val) =>
    typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val);

  const canFetchForDuration = (src) => {
    try {
      if (!src) return false;
      if (src.startsWith("blob:")) return true;
      if (src.startsWith("data:")) return true;
      const url = new URL(src, window.location.href);
      return url.origin === window.location.origin; // same-origin only
    } catch (_) {
      return false;
    }
  };

  const computeDurationFallback = async (src) => {
    try {
      if (!src || !canFetchForDuration(src)) return 0;
      const response = await fetch(src);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return Math.round(audioBuffer.duration);
    } catch (e) {
      // Swallow errors to avoid noisy logs for cross-origin or blocked fetches
      console.debug("AudioPlayer: duration fallback not available", e?.message || e);
      return 0;
    }
  };

  // Reset state when audioSrc changes and try to pre-compute duration
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    setDuration(
      isFiniteNumber(durationSeconds) && durationSeconds > 0
        ? durationSeconds
        : 0
    );
    const tryCompute = async () => {
      requestAnimationFrame(async () => {
        const d = audioRef.current?.duration;
        if (isFiniteNumber(d) && d > 0) {
          setDuration(d);
        } else if (
          (!durationSeconds || durationSeconds <= 0) &&
          audioSrc &&
          canFetchForDuration(audioSrc)
        ) {
          const fallback = await computeDurationFallback(audioSrc);
          if (fallback > 0) setDuration(fallback);
        }
      });
    };
    tryCompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc]);

  // Ensure handle moves to 100% when audio finishes
  useEffect(() => {
    if (
      !isPlaying &&
      currentTime > 0 &&
      Math.abs(currentTime - duration) < 0.1
    ) {

      setCurrentTime(duration);
    }
  }, [isPlaying, currentTime, duration]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = async () => {
    if (!audioRef.current) return;
    const metaDuration = audioRef.current.duration;
    if (isFiniteNumber(metaDuration) && metaDuration > 0) {
      setDuration(metaDuration);
    } else if (
      (!durationSeconds || durationSeconds <= 0) &&
      audioSrc &&
      canFetchForDuration(audioSrc)
    ) {
      const fallback = await computeDurationFallback(audioSrc);
      if (fallback > 0) setDuration(fallback);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleWaveformClick = (e) => {
    if (!audioRef.current || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handlePlaybackRateChange = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (time) => {
    if (!Number.isFinite(time) || Number.isNaN(time) || time < 0) {
      return "0:00";
    }

    // For durations less than 1 minute, show seconds with 's' suffix
    if (time < 60) {
      const seconds = Math.round(time * 10) / 10;
      return `${seconds}s`;
    }

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getDisplayInfo = () => {
    // Check if this is an admin post
    if (author?.role === 'admin' || !author || !author.name) {
      return {
        line1: 'Created by Admin',
        line2: ''
      };
    }
    
    // For coach suggestions or student posts, show student info if available
    if (studentName && balagruha) {
      return {
        line1: studentName,
        line2: balagruha
      };
    }
    
    // Fallback to author name
    return {
      line1: author?.name || 'Audio Creator',
      line2: 'Audio Pin'
    };
  };

  const getPostageStampStyle = () => ({
    backgroundImage: `
      radial-gradient(circle at 0% 50%, transparent 4px, white 4px),
      radial-gradient(circle at 100% 50%, transparent 4px, white 4px),
      radial-gradient(circle at 50% 0%, transparent 4px, white 4px),
      radial-gradient(circle at 50% 100%, transparent 4px, white 4px)
    `,
    backgroundSize: "12px 100%, 12px 100%, 100% 12px, 100% 12px",
    backgroundPosition: "left center, right center, center top, center bottom",
    backgroundRepeat: "repeat-y, repeat-y, repeat-x, repeat-x",
    border: "3px solid #d1d5db",
    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.15)",
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-6xl max-h-[95vh] p-0 overflow-hidden" 
        style={{ 
          backgroundImage: `
            linear-gradient(to right, 
              #A1EBC6 50%, 
              transparent 50%
            ),
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 50px,
              white 50px,
              white 54px
            ),
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 50px,
              white 50px,
              white 54px
            )
          `,
          backgroundColor: '#A1EBC6',
          backgroundPosition: '0 0, 50% 0, 50% 0'
        }}
      >
        <div className="relative min-h-[600px] p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 bg-white hover:bg-gray-100 rounded-full p-3 transition-colors shadow-lg border-2 border-gray-300"
          >
            <X className="w-6 h-6 text-purple-600" />
          </button>

          {/* Student Detail Pin */}
          <div className="absolute top-16 left-4 w-64">
            <img 
              src="/student-detail-pin.png" 
              alt="Student Detail Pin" 
              className="w-full h-auto"
            />
            {/* Student info text overlay */}
            <div 
              className="absolute text-center text-black font-bold text-sm"
              style={{
                transform: 'rotate(-28deg)',
                top: '35%',
                left: '25%',
                width: '50%',
                height: '40%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <div className="leading-tight">
                {(() => {
                  const displayInfo = getDisplayInfo();
                  return (
                    <>
                      <div>{displayInfo.line1}</div>
                      {displayInfo.line2 && (
                        <div className="text-xs">{displayInfo.line2}</div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Main audio player card */}
          <div
            className="absolute bg-white p-5 transform -rotate-1 shadow-lg"
            style={{
              width: "520px",
              height: "300px",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-1deg)",
              ...getPostageStampStyle(),
            }}
          >
            {isOfficial && (
              <div className="absolute -top-3 -left-3 flex flex-col gap-1">
                <Badge className="bg-purple-600 text-white text-xs px-2 py-1">
                  ISF Official
                </Badge>
                {officialCategory && (
                  <Badge
                    className={`text-white text-xs px-2 py-1 ${
                      officialCategory === "mann-ki-baat"
                        ? "bg-purple-700"
                        : officialCategory === "op-ed"
                        ? "bg-indigo-600"
                        : officialCategory === "isf-updates"
                        ? "bg-teal-600"
                        : "bg-gray-600"
                    }`}
                  >
                    {officialCategory === "mann-ki-baat"
                      ? "🎙️ Mann Ki Baat"
                      : officialCategory === "op-ed"
                      ? "📝 Op Ed"
                      : officialCategory === "isf-updates"
                      ? "📢 ISF Updates"
                      : "Official"}
                  </Badge>
                )}
              </div>
            )}
            <div className="flex items-center gap-6 mb-6">
              {/* Audio icon section */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <Volume2 className="w-10 h-10 text-green-600" />
                </div>
              </div>
              
              {/* Title and info section */}
              <div className="flex-1 text-left">
                <h3 className="font-handwriting text-xl text-gray-800 mb-2">
                  {title}
                </h3>
                {caption && (
                  <p className="text-sm text-gray-600 mb-2 italic">{caption}</p>
                )}
                {author && (
                  <p className="text-sm text-gray-600">
                    Speaker: {typeof author === "object" ? author.name : author}
                  </p>
                )}
              </div>
            </div>

            <audio
              ref={audioRef}
              src={audioSrc}
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onError={() => {
                setDuration(0);
                setCurrentTime(0);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {

                setIsPlaying(false);
                setCurrentTime(duration);
              }}
            />

            <div className="space-y-4">
              {/* ECG-style seek bar */}
              <div className="space-y-2">
                <div className="relative w-full h-16 bg-white border-2 border-gray-300 rounded-lg overflow-hidden cursor-pointer" onClick={handleWaveformClick}>
                  {/* Grid background */}
                  <div className="absolute inset-0 opacity-20">
                    {/* Horizontal grid lines */}
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={`h-${i}`} className="absolute w-full border-t border-gray-400" style={{ top: `${(i + 1) * 20}%` }} />
                    ))}
                    {/* Vertical grid lines */}
                    {Array.from({ length: 12 }, (_, i) => (
                      <div key={`v-${i}`} className="absolute h-full border-l border-gray-400" style={{ left: `${(i + 1) * 8.33}%` }} />
                    ))}
                  </div>
                  
                  {/* ECG waveform */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 480 64" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="black"
                      strokeWidth="1.5"
                      points={Array.from({ length: 240 }, (_, i) => {
                        const x = (i / 240) * 480;
                        let y = 32; // baseline
                        
                        // Create ECG-like pattern with sharp peaks and valleys
                        const cycle = i % 20;
                        if (cycle < 2) y = 32; // flat
                        else if (cycle === 2) y = 28; // small dip
                        else if (cycle === 3) y = 12; // sharp peak up
                        else if (cycle === 4) y = 52; // sharp valley down
                        else if (cycle === 5) y = 16; // recovery peak
                        else if (cycle < 8) y = 32; // flat
                        else if (cycle === 8) y = 36; // small bump
                        else if (cycle === 9) y = 28; // small dip
                        else y = 32; // flat
                        
                        // Add some randomness for variation
                        y += (Math.random() - 0.5) * 2;
                        
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    
                    {/* Progress indicator line */}
                    <line
                      x1={`${(duration > 0 ? (currentTime / duration) * 100 : 0)}%`}
                      y1="0"
                      x2={`${(duration > 0 ? (currentTime / duration) * 100 : 0)}%`}
                      y2="64"
                      stroke="red"
                      strokeWidth="2"
                      opacity="0.8"
                    />
                  </svg>
                  
                  {/* Progress overlay */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-green-500 bg-opacity-10 transition-all duration-100"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls row */}
              <div className="flex items-center justify-between mt-4">
                {/* Play button */}
                <div className="flex items-center">
                  <button
                    onClick={togglePlay}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full p-3 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Speed controls */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Speed:</span>
                  {[0.75, 1, 1.25, 1.5].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        playbackRate === rate
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Audio sticky note */}
          <div className="absolute top-16 right-8 w-64 h-64 bg-blue-200 p-6 transform rotate-3 shadow-lg">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full shadow-md"></div>
            <div className="h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-4">🎵</div>
              <h2
                className="text-blue-700 font-bold text-xl mb-2"
                style={{ fontFamily: "Comic Sans MS, cursive" }}
              >
                AUDIO
              </h2>
              <p className="text-blue-600 font-semibold text-sm mb-2">
                {title || "Audio Title"}
              </p>
              {caption && (
                <p className="text-gray-700 text-xs mb-2 italic">
                  {caption}
                </p>
              )}
              <p className="text-gray-700 text-sm">
                {createdAt 
                  ? new Date(createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                }
              </p>
            </div>
          </div>

          {/* Audio Player Image */}
          <div className="absolute bottom-16 left-16">
            <img 
              src="/audio-player.png" 
              alt="Audio Player" 
              className="w-56 h-auto"
            />
          </div>

          {/* Stats card */}
          <div className="absolute bottom-16 right-12 bg-white p-8 transform rotate-1 shadow-lg border-2 border-gray-200 rounded-lg">
            <div className="space-y-6 text-center min-w-[160px]">
              <div className="flex items-center justify-center gap-3 text-gray-600">
                <Eye className="w-8 h-8" />
                <span className="font-bold text-2xl">
                  {views.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onLike && onLike()}
                className="flex items-center justify-center gap-3 text-pink-500 hover:opacity-80 transition-opacity mx-auto"
                aria-label="Like"
              >
                <ThumbsUp className="w-8 h-8" />
                <span className="text-lg font-bold">
                  {likes.toLocaleString()}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onHeart && onHeart()}
                className="flex items-center justify-center gap-3 text-green-600 hover:opacity-80 transition-opacity mx-auto"
                aria-label="Love"
              >
                <Heart className="w-8 h-8" />
                <span className="text-lg font-bold">{hearts}</span>
              </button>
            </div>
          </div>


        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AudioPlayer;
