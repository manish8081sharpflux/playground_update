// Sprint5-Story-16: Student Profile Page
// Displays comprehensive student profile with aggregated data from all systems

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Profile Components
import ProfileHeader from '../components/profile/ProfileHeader';
import CoinWalletCard from '../components/profile/CoinWalletCard';
import WTFActivityCard from '../components/profile/WTFActivityCard';
import ShoppingCard from '../components/profile/ShoppingCard';
import LearningCard from '../components/profile/LearningCard';
import WellnessCard from '../components/profile/WellnessCard';
import QuickActionsPanel from '../components/profile/QuickActionsPanel';

export default function StudentProfile() {
  const { userId: paramUserId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // If no userId in params, viewing own profile
  const targetUserId = paramUserId || user?._id || user?.id;
  const isOwnProfile = !paramUserId || paramUserId === user?._id;

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (targetUserId) {
      fetchProfileData();
    }
  }, [targetUserId]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/v1/users/${targetUserId}/profile`);

      if (response.data.success) {
        setProfileData(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to load profile');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load profile data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Unable to Load Profile</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={fetchProfileData}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No Data State
  if (!profileData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-slate-600">No profile data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back button — only shown when viewing someone else's profile (admin view) */}
      {!isOwnProfile && (
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-purple-600 transition-colors text-sm font-medium"
          >
            ← Back
          </button>
        </div>
      )}

      {/* Profile Header */}
      <ProfileHeader
        user={profileData.user}
        isOwnProfile={isOwnProfile}
      />

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Cards (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Coin Wallet Dashboard */}
            <CoinWalletCard coins={profileData.coins} />

            {/* Shopping Summary */}
            <ShoppingCard shop={profileData.shop} />

            {/* WTF Activity */}
            <WTFActivityCard wtf={profileData.wtf} />

            {/* Learning Progress */}
            <LearningCard learning={profileData.learning} />
          </div>

          {/* Right Column - Sidebar Cards (1/3 width on desktop) */}
          <div className="space-y-6">
            {/* Health & Wellness */}
            <WellnessCard
              wellness={profileData.wellness}
              guardianInfo={{
                guardianName1: profileData.user.guardianName1,
                guardianName2: profileData.user.guardianName2,
                guardianContact1: profileData.user.guardianContact1,
                guardianContact2: profileData.user.guardianContact2,
                parentalStatus: profileData.user.parentalStatus
              }}
            />

            {/* Quick Actions Panel (only for own profile) */}
            {isOwnProfile && user?.role?.toLowerCase() === 'student' && (
              <QuickActionsPanel />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
