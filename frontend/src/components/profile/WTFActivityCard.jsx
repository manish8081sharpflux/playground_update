// Sprint5-Story-16: WTF Activity Card
// Displays student WTF system engagement and content

import React from 'react';
import { Lightbulb, FileText, MessageCircle, TrendingUp } from 'lucide-react';

export default function WTFActivityCard({ wtf }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-yellow-100 rounded-lg">
          <Lightbulb className="w-6 h-6 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">WTF Activity</h2>
          <p className="text-sm text-slate-600">Your engagement with Wonder, Think, Find</p>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="flex justify-center mb-2">
            <FileText className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-900">
            {wtf.featuredContent?.length || 0}
          </p>
          <p className="text-xs text-yellow-700 mt-1">Pins Created</p>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="flex justify-center mb-2">
            <MessageCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-900">{wtf.totalInteractions || 0}</p>
          <p className="text-xs text-orange-700 mt-1">Interactions</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="flex justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">{wtf.totalWtfEarnings || 0}</p>
          <p className="text-xs text-green-700 mt-1">Coins Earned</p>
        </div>
      </div>

      {/* Featured Content */}
      {wtf.featuredContent && wtf.featuredContent.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Pins</h3>
          <div className="space-y-2">
            {wtf.featuredContent.map((content, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{content.title}</p>
                  <p className="text-xs text-slate-600">
                    {content.type} • {formatDate(content.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-600">No WTF pins created yet</p>
          <p className="text-sm text-slate-500">Start creating pins to earn coins!</p>
        </div>
      )}

      {/* Pending Submissions */}
      {wtf.pendingSubmissions > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">{wtf.pendingSubmissions}</span> submission
            {wtf.pendingSubmissions !== 1 ? 's' : ''} pending review
          </p>
        </div>
      )}
    </div>
  );
}
