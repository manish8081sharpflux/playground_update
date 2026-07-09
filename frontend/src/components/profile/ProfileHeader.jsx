// Sprint5-Story-16: Profile Header Component
// Displays student basic information and profile picture

import React from 'react';
import { User, Calendar, MapPin, Activity } from 'lucide-react';

export default function ProfileHeader({ user, isOwnProfile }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-6">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
              <User className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">
                {user.name}
              </h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.status)}`}>
                {user.status?.charAt(0).toUpperCase() + user.status?.slice(1)}
              </span>
              {isOwnProfile && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  Your Profile
                </span>
              )}
            </div>

            {user.email && (
              <p className="text-purple-100 text-lg mb-4">{user.email}</p>
            )}

            {/* Profile Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {user.age && (
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-200" />
                  <div>
                    <p className="text-xs text-purple-200">Age</p>
                    <p className="font-semibold">{user.age} years</p>
                  </div>
                </div>
              )}

              {user.gender && (
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-200" />
                  <div>
                    <p className="text-xs text-purple-200">Gender</p>
                    <p className="font-semibold">{user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}</p>
                  </div>
                </div>
              )}

              {user.balagruha && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-200" />
                  <div>
                    <p className="text-xs text-purple-200">Balagruha</p>
                    <p className="font-semibold">{user.balagruha}</p>
                  </div>
                </div>
              )}

              {user.lastLogin && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-200" />
                  <div>
                    <p className="text-xs text-purple-200">Last Login</p>
                    <p className="font-semibold">{formatDate(user.lastLogin)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
