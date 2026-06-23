import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import toast from 'react-hot-toast';

/**
 * Toolbar Component - Epic 01 Story 01
 * Student toolbar with:
 * - 5-mood emotion tracking (aligned with StudentMoodTracker schema)
 * - Voice Chat with Amma button
 * - Homework button with count badge
 * - Help button
 */
const EMOTIONS = [
  { value: 'happy', emoji: '😊', label: "I'm feeling happy" },
  { value: 'excited', emoji: '🤩', label: "I'm feeling excited" },
  { value: 'neutral', emoji: '😐', label: "I'm feeling okay" },
  { value: 'sad', emoji: '😢', label: "I'm feeling sad" },
  { value: 'very_sad', emoji: '😭', label: "I'm feeling very sad" },
];

export default function Toolbar() {
  const navigate = useNavigate();

  // State
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [homeworkCount, setHomeworkCount] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Fetch homework count
  const fetchHomeworkCount = async () => {
    try {
      const studentId = localStorage.getItem('userId') || 'student123';
      const response = await api.get(`/api/v2/lms/student/${studentId}/homework/pending`);
      if (response.data.success) {
        setHomeworkCount(response.data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch homework count:', error);
    }
  };

  // Handle emotion button click
  const handleEmotionClick = async (emotion) => {
    setSelectedEmotion(emotion);

    const emojiMap = EMOTIONS.reduce((acc, e) => ({ ...acc, [e.value]: e.emoji }), {});

    // Check if offline using state (tracks offline event, not just navigator.onLine)
    if (isOffline) {
      // Save to localStorage for later sync
      const offlineEmotions = JSON.parse(localStorage.getItem('offlineEmotions') || '[]');
      offlineEmotions.push({
        emotion,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('offlineEmotions', JSON.stringify(offlineEmotions));
      toast('Saved offline - will sync when online', { icon: '📴' });
      return;
    }

    // Save emotion to API (only when online)
    try {
      const studentId = localStorage.getItem('userId') || 'student123';
      await api.post(`/api/v2/lms/student/${studentId}/emotion`, {
        emotion,
        timestamp: new Date().toISOString()
      });

      // Show feedback
      toast.success(`Recorded: ${emojiMap[emotion]}`);
    } catch (error) {
      console.error('Failed to save emotion:', error);

      // If API call fails, save to localStorage as fallback
      const offlineEmotions = JSON.parse(localStorage.getItem('offlineEmotions') || '[]');
      offlineEmotions.push({
        emotion,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('offlineEmotions', JSON.stringify(offlineEmotions));
      toast('Saved offline - will sync when online', { icon: '📴' });
    }
  };

  // Handle Voice Chat button click
  const handleVoiceChatClick = () => {
    // Amma communication modal not yet implemented (Sprint 2 Epic 4 backlog)
    toast('Voice chat coming soon!', { icon: '🎤' });
  };

  // Handle Help button click
  const handleHelpClick = () => {
    // Contextual help modal not yet implemented
    toast('Help is on the way!', { icon: '❓' });
  };

  // Handle Homework button click
  const handleHomeworkClick = () => {
    navigate('/student/homework');
  };

  // Sync offline emotions when online
  const syncOfflineEmotions = async () => {
    const offlineEmotions = JSON.parse(localStorage.getItem('offlineEmotions') || '[]');

    if (offlineEmotions.length > 0) {
      try {
        const studentId = localStorage.getItem('userId') || 'student123';
        await api.post(`/api/v2/lms/student/${studentId}/emotions/batch`, {
          emotions: offlineEmotions
        });

        localStorage.removeItem('offlineEmotions');
        toast.success(`Synced ${offlineEmotions.length} emotions`);
      } catch (error) {
        console.error('Failed to sync offline emotions:', error);
      }
    }
  };

  // Handle online/offline events
  const handleOnline = () => {
    setIsOffline(false);
    syncOfflineEmotions();
    fetchHomeworkCount();
  };

  const handleOffline = () => {
    setIsOffline(true);
  };

  // Effects
  useEffect(() => {
    fetchHomeworkCount();

    // Poll homework count every 60 seconds
    const homeworkInterval = setInterval(fetchHomeworkCount, 60000);

    // Offline/Online listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(homeworkInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-center gap-4 max-w-7xl mx-auto flex-wrap">
        {/* Emotion Tracking Buttons — 5-mood scale */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
          {EMOTIONS.map(({ value, emoji, label }) => (
            <button
              key={value}
              onClick={() => handleEmotionClick(value)}
              className={`text-3xl p-2 rounded-lg transition-colors ${
                selectedEmotion === value
                  ? 'bg-blue-100 ring-2 ring-blue-500'
                  : 'hover:bg-gray-100'
              }`}
              aria-label={label}
              title={label}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Voice Chat Button */}
        <button
          onClick={handleVoiceChatClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <span className="text-xl">🎤</span>
          <span className="hidden sm:inline">Chat with Amma</span>
        </button>

        {/* Homework Button */}
        <button
          onClick={handleHomeworkClick}
          className="relative flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span className="text-xl">📚</span>
          <span className="hidden sm:inline">Homework</span>
          {homeworkCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {homeworkCount > 9 ? '9+' : homeworkCount}
            </span>
          )}
        </button>

        {/* Help Button */}
        <button
          onClick={handleHelpClick}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span className="text-xl">❓</span>
          <span className="hidden sm:inline">Help</span>
        </button>
      </div>
    </div>
  );
}
