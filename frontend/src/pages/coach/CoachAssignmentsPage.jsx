import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import CoachAssignmentsView from '../../components/coach/CoachAssignmentsView';

export default function CoachAssignmentsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <CoachAssignmentsView
      coachId={user.id}
      coachName={user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'}
      balagruhaName={user.balagruha?.name}
    />
  );
}
