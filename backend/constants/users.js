exports.UserTypes = {
  ADMIN: "admin",
  COACH: "coach",
  IN_CHARGE: "balagruha-incharge",
  STUDENT: "student",
  PURCHASE_MANAGER: "purchase-manager",
  MEDICAL_IN_CHARGE: "medical-incharge",
  SPORTS_COACH: "sports-coach",
  MUSIC_COACH: "music-coach",
  AMMA: "amma",
};

// WTF Module Permissions
exports.WtfPermissions = {
  // Pin Management
  WTF_PIN_CREATE: "WTF Management",
  WTF_PIN_READ: "WTF Management",
  WTF_PIN_UPDATE: "WTF Management",
  WTF_PIN_DELETE: "WTF Management",

  // Interaction Management
  WTF_INTERACTION_CREATE: "WTF Interaction",
  WTF_INTERACTION_READ: "WTF Interaction",

  // Submission Management
  WTF_SUBMISSION_CREATE: "WTF Submission",
  WTF_SUBMISSION_READ: "WTF Submission",
  WTF_SUBMISSION_UPDATE: "WTF Submission",

  // Coach Suggestions
  WTF_COACH_SUGGESTION_CREATE: "WTF Coach Suggestion",
  WTF_COACH_SUGGESTION_READ: "WTF Coach Suggestion",

  // Analytics
  WTF_ANALYTICS_READ: "WTF Analytics",

  // Admin / Settings
  WTF_ADMIN: "WTF Management",
  WTF_READ: "WTF Management",
};

// User type hierarchy
exports.userTypeHierarchy = {
  admin: [
    this.UserTypes.ADMIN,
    this.UserTypes.COACH,
    this.UserTypes.IN_CHARGE,
    this.UserTypes.STUDENT,
    this.UserTypes.PURCHASE_MANAGER,
    this.UserTypes.MEDICAL_IN_CHARGE,
    this.UserTypes.SPORTS_COACH,
    this.UserTypes.MUSIC_COACH,
    this.UserTypes.AMMA,
  ],
  "balagruha-incharge": [
    this.UserTypes.COACH,
    this.UserTypes.IN_CHARGE,
    this.UserTypes.STUDENT,
    this.UserTypes.PURCHASE_MANAGER,
    this.UserTypes.MEDICAL_IN_CHARGE,
    this.UserTypes.SPORTS_COACH,
    this.UserTypes.MUSIC_COACH,
    this.UserTypes.AMMA,
  ],
  coach: [
    this.UserTypes.COACH,
    this.UserTypes.STUDENT,
    this.UserTypes.SPORTS_COACH,
    this.UserTypes.MUSIC_COACH,
    this.UserTypes.AMMA,
  ],
  student: [this.UserTypes.STUDENT],
  "purchase-manager": [this.UserTypes.PURCHASE_MANAGER],
  "medical-incharge": [
    this.UserTypes.MEDICAL_IN_CHARGE,
    this.UserTypes.STUDENT,
  ],
  "sports-coach": [this.UserTypes.SPORTS_COACH, this.UserTypes.STUDENT],
  "music-coach": [this.UserTypes.MUSIC_COACH, this.UserTypes.STUDENT],
  amma: [this.UserTypes.AMMA, this.UserTypes.STUDENT],
};
