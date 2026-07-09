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
  if (typeof rawRole !== 'string') {
    return undefined;
  }

  const normalized = rawRole.trim().toLowerCase().replace(/[\s_]+/g, '-');

  const roleAliases = {
    'balagruha-in-charge': UserTypes.IN_CHARGE,
    'medical-in-charge': UserTypes.MEDICAL_IN_CHARGE,
    'medical-manager': UserTypes.MEDICAL_IN_CHARGE,
    'sports-coach': UserTypes.SPORTS_COACH,
    'sport-coach': UserTypes.SPORTS_COACH,
    'music-coach': UserTypes.MUSIC_COACH,
  };

  return roleAliases[normalized] || normalized;
};
