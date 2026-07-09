const mongoose = require("mongoose");
const Role = require("../models/role");

// Default roles and permissions configuration
const defaultRoles = [
  {
    roleName: "admin",
    permissions: [
      {
        module: "User Management",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "Role Management",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "Task Management",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "Machine Management",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "WTF Management",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "WTF Interaction",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "WTF Submission",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "WTF Coach Suggestion",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "WTF Analytics",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "Attendance Management",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "Balagruha Management",
        actions: ["Create", "Read", "Update", "Delete"],
      },
    ],
  },
];

async function forceSetupRoles() {
  try {
    console.log("🔧 FORCE SETTING UP ROLES AND PERMISSIONS...");

    for (const roleData of defaultRoles) {
      console.log(`\n🔄 Processing role: ${roleData.roleName}`);

      // Try to find existing role
      let existingRole = await Role.findOne({ roleName: roleData.roleName });

      if (existingRole) {
        console.log(
          `📝 Found existing role '${roleData.roleName}', updating...`
        );

        // Force update all permissions
        existingRole.permissions = roleData.permissions;
        existingRole.updatedAt = new Date();

        try {
          await existingRole.save();
          console.log(`✅ Role '${roleData.roleName}' updated successfully`);
        } catch (saveError) {
          console.log(`⚠️  Save failed, trying to delete and recreate...`);

          // If save fails, delete and recreate
          await Role.findByIdAndDelete(existingRole._id);
          existingRole = null;
        }
      }

      if (!existingRole) {
        console.log(`➕ Creating new role '${roleData.roleName}'...`);

        try {
          const newRole = new Role(roleData);
          await newRole.save();
          console.log(`✅ Role '${roleData.roleName}' created successfully`);
        } catch (createError) {
          console.error(
            `❌ Failed to create role '${roleData.roleName}':`,
            createError.message
          );

          // Try one more time with upsert
          try {
            await Role.findOneAndUpdate(
              { roleName: roleData.roleName },
              roleData,
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`✅ Role '${roleData.roleName}' created via upsert`);
          } catch (upsertError) {
            console.error(
              `❌ Upsert also failed for '${roleData.roleName}':`,
              upsertError.message
            );
          }
        }
      }
    }

    console.log("\n🎉 Force setup completed!");

    // Verify the setup
    console.log("\n🔍 Verifying setup...");
    const allRoles = await Role.find();
    console.log(`📊 Found ${allRoles.length} roles in database:`);

    allRoles.forEach((role) => {
      console.log(`\n🔑 Role: ${role.roleName}`);
      if (role.permissions && role.permissions.length > 0) {
        role.permissions.forEach((perm) => {
          console.log(`   📁 ${perm.module}: ${perm.actions.join(", ")}`);
        });
      } else {
        console.log(`   ⚠️  No permissions defined for this role!`);
      }
    });

    // Check specifically for WTF Management
    const adminRole = await Role.findOne({ roleName: "admin" });
    if (adminRole) {
      const wtfPerm = adminRole.permissions.find(
        (p) => p.module === "WTF Management"
      );
      if (wtfPerm && wtfPerm.actions.includes("Create")) {
        console.log(
          "\n✅ SUCCESS: Admin role now has WTF Management:Create permission!"
        );
      } else {
        console.log(
          "\n❌ FAILED: Admin role still missing WTF Management:Create permission!"
        );
      }
    }
  } catch (error) {
    console.error("❌ Error in force setup:", error);
  }
}

// Export for use in other scripts
module.exports = { forceSetupRoles };

// Run if this script is executed directly
if (require.main === module) {
  // Connect to MongoDB
  const mongoUri =
    process.env.MONGO_URI || "mongodb://localhost:27017/isfplayground";

  mongoose
    .connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      console.log("✅ Connected to MongoDB");
      return forceSetupRoles();
    })
    .then(() => {
      console.log("\n✅ Force setup script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Force setup script failed:", error);
      process.exit(1);
    });
}
