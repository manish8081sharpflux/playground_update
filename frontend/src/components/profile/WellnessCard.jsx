// Sprint5-Story-16: Health & Wellness Card
// Displays student mood tracking and guardian contact information

import React from 'react';
import { Heart, Smile, Phone, User } from 'lucide-react';

export default function WellnessCard({ wellness, guardianInfo }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMoodEmoji = (mood) => {
    const moodEmojis = {
      'very-happy': '😄',
      'happy': '😊',
      'neutral': '😐',
      'sad': '😢',
      'very-sad': '😭'
    };
    return moodEmojis[mood] || '😊';
  };

  const getMoodColor = (mood) => {
    const colors = {
      'very-happy': 'bg-green-100 text-green-800',
      'happy': 'bg-blue-100 text-blue-800',
      'neutral': 'bg-yellow-100 text-yellow-800',
      'sad': 'bg-orange-100 text-orange-800',
      'very-sad': 'bg-red-100 text-red-800'
    };
    return colors[mood] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-pink-100 rounded-lg">
          <Heart className="w-6 h-6 text-pink-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Health & Wellness</h2>
          <p className="text-sm text-slate-600">Mood and wellbeing</p>
        </div>
      </div>

      {/* Today's Mood */}
      <div className="bg-pink-50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Smile className="w-5 h-5 text-pink-600" />
          <p className="text-sm font-semibold text-pink-900">Today's Mood</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{getMoodEmoji(wellness.todayMood)}</span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getMoodColor(wellness.todayMood)}`}>
            {wellness.todayMood === 'Not recorded' ? wellness.todayMood : wellness.todayMood?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        </div>
      </div>

      {/* Week Mood History */}
      {wellness.weekMoodHistory && wellness.weekMoodHistory.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">This Week</h3>
          <div className="flex items-center justify-between gap-1">
            {wellness.weekMoodHistory.slice(0, 7).map((entry, index) => (
              <div key={index} className="flex flex-col items-center">
                <span className="text-2xl mb-1">{getMoodEmoji(entry.mood)}</span>
                <span className="text-xs text-slate-600">{formatDate(entry.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guardian Contact */}
      {guardianInfo && (guardianInfo.guardianName1 || guardianInfo.guardianName2) && (
        <div className="pt-6 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Guardian Contacts
          </h3>
          <div className="space-y-3">
            {guardianInfo.guardianName1 && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="font-medium text-slate-900">{guardianInfo.guardianName1}</p>
                {guardianInfo.guardianContact1 && (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-3 h-3 text-slate-600" />
                    <p className="text-sm text-slate-600">{guardianInfo.guardianContact1}</p>
                  </div>
                )}
              </div>
            )}
            {guardianInfo.guardianName2 && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="font-medium text-slate-900">{guardianInfo.guardianName2}</p>
                {guardianInfo.guardianContact2 && (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-3 h-3 text-slate-600" />
                    <p className="text-sm text-slate-600">{guardianInfo.guardianContact2}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          {guardianInfo.parentalStatus && (
            <div className="mt-3 text-xs text-slate-600">
              Parental Status: {guardianInfo.parentalStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
