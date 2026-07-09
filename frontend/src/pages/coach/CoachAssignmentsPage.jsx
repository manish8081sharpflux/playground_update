import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import CoachAssignmentsView from '../../components/coach/CoachAssignmentsView';
import LoadingState from '../../components/common/LoadingState';

export default function CoachAssignmentsPage() {
  const { user } = useAuth();

  if (!user) {
    return <LoadingState fullScreen />;
  }

  return (
    <CoachAssignmentsView
      coachId={user.id}
      coachName={user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'}
      balagruhaName={user.balagruha?.name}
    />
  );
}
