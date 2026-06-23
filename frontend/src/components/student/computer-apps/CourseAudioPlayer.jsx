import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, X, Volume2 } from 'lucide-react';

export default function CourseAudioPlayer({ audioUrl, title, onClose, onComplete }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const audioRef = useRef(null);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Handle auto-play prevention
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.play().catch(() => {});
            setIsPlaying(true);
        }
    }, []);

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

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e) => {
        const time = (e.target.value / 100) * duration;
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        if (onComplete) onComplete();
    };

    const formatTime = (time) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative border-4 border-yellow-300">

                {/* Header */}
                <div className="bg-yellow-50 p-4 border-b border-yellow-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        🎵 Now Playing
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-yellow-200 rounded-full transition-colors text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center">
                    {/* Visualizer / Icon */}
                    <div className="w-32 h-32 bg-yellow-100 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse-slow">
                        <span className="text-6xl">🎧</span>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 text-center mb-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                        {title || 'Audio Track'}
                    </h2>

                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={handleEnded}
                    />

                    {/* Controls */}
                    <div className="w-full mt-6 space-y-4">
                        {/* Progress Bar */}
                        <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
                            <span>{formatTime(currentTime)}</span>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={progress}
                                onChange={handleSeek}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />
                            <span>{formatTime(duration)}</span>
                        </div>

                        {/* Main Buttons */}
                        <div className="flex items-center justify-center gap-8">
                            <button
                                onClick={togglePlay}
                                className="w-16 h-16 bg-yellow-400 hover:bg-yellow-500 text-white rounded-full flex items-center justify-center shadow-lg transform active:scale-95 transition-all"
                            >
                                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
