const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // This allows multiple null values by indexing only non-null values
      required: [
        function () {
          return this.role !== "student";
        },
        "Email is required for non-student users",
      ],
      trim: true,
      lowercase: true,
      set: (value) => {
        if (typeof value !== "string") {
          return value;
        }
        const trimmed = value.trim();
        return trimmed ? trimmed.toLowerCase() : undefined;
      },
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    userId: {
      type: Number,
      unique: true,
      sparse: true, // This allows multiple null values by indexing only non-null values
      required: false, // Makes the field optional
    },
    password: {
      type: String,
      required: false, // Changed from true to false to make it optional
      // minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
      type: String,
      enum: [
        "admin",
        "coach",
        "balagruha-incharge",
        "student",
        "purchase-manager",
        "medical-incharge",
        "sports-coach",
        "music-coach",
        "amma",
      ],
      required: [true, "Role is required"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    lastLogin: {
      type: Date,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    age: {
      type: Number,
      required: function () {
        return this.role === "student";
      },
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: function () {
        return this.role === "student";
      },
    },
    balagruhaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Balagruha" }],
    parentalStatus: {
      type: String,
      enum: ["has both", "has one", "has none", "has guardian", ""],
      default: "",
    },
    guardianName1: { type: String },
    guardianName2: { type: String },
    guardianContact1: { type: String },
    guardianContact2: { type: String },
    // guardianContact: { type: String },
    attendanceRecords: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Attendance" },
    ],
    medicalRecords: [
      { type: mongoose.Schema.Types.ObjectId, ref: "MedicalRecord" },
    ],
    assignedMachines: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Machine" },
    ],
    // facialData: {
    //   faceDescriptor: Array, // Store face descriptor array
    //   createdAt: { type: Date, default: Date.now },
    // },
    facialDataUrl: {
      type: String, // S3 URL or local path to the actual photo for display
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// hashing passwords
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    if (this.password && this.password !== "") {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Account-level lockout disabled. IP-based rate limiter in routes/auth.js
// still protects against brute-force. Methods kept as no-ops so existing
// call sites (authController, services/student.js, unlockUserByEmail script)
// continue to work without changes.
userSchema.methods.isLocked = function () {
  return false;
};

// Method to increment login attempts — no-op (lockout disabled)
userSchema.methods.incrementLoginAttempts = async function () {
  return;
};

userSchema.methods.resetLoginAttempts = async function () {
  return await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// Sprint5-Story-24: Check if user can create purchase requests
userSchema.methods.canCreatePurchaseRequest = function () {
  const allowedRoles = ['coach', 'medical_incharge', 'admin', 'purchase_manager'];
  // Normalize role: replace hyphens with underscores to handle both formats
  const normalizedRole = this.role.toLowerCase().replace(/-/g, '_');
  return allowedRoles.includes(normalizedRole);
};

// RBAC Refactor: Helper methods for Balagruh access control
userSchema.methods.hasBalagruhaAccess = function (balagruhaId) {
  if (!this.balagruhaIds || this.balagruhaIds.length === 0) {
    return false;
  }
  return this.balagruhaIds.some(
    (id) => id.toString() === balagruhaId.toString()
  );
};

userSchema.methods.getAllBalagruhaIds = function () {
  return this.balagruhaIds || [];
};

userSchema.methods.getBalagruhaIdsAsStrings = function () {
  return (this.balagruhaIds || []).map((id) => id.toString());
};

// RBAC Refactor: Add index on balagruhaIds for performance
userSchema.index({ balagruhaIds: 1 });

// Safe model definition to prevent OverwriteModelError
const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;
