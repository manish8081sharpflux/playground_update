const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    roleName: { type: String, required: true, unique: true },
    permissions: [
      {
        module: { type: String, required: true }, // Module name (e.g., User Management, shop)
        actions: [
          { type: String, enum: ["Create", "Read", "Update", "Delete", "Manage"] }, // Allowed actions (Manage added for shop module)
        ],
        scope: {
          type: String,
          enum: ["own", "balagruh", "all"],
          default: "own"
        }, // Scope: own (user's own data), balagruh (assigned Balagruh), all (global access)
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Safe model definition to prevent OverwriteModelError
const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);

module.exports = Role;
