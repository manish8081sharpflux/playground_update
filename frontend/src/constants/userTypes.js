export const UserTypes = {
  ADMIN: 'admin',
  COACH: 'coach',
  IN_CHARGE: 'balagruha-incharge',
  STUDENT: 'student',
  PURCHASE_MANAGER: 'purchase-manager',
  MEDICAL_IN_CHARGE: 'medical-incharge',
  SPORTS_COACH: 'sports-coach',
  MUSIC_COACH: 'music-coach',
  AMMA: 'amma'
};

export const normalizeUserRole = (role) => {
  const rawRole = typeof role === 'string' ? role : role?.roleName;
  return typeof rawRole === 'string' ? rawRole.toLowerCase() : undefined;
};
