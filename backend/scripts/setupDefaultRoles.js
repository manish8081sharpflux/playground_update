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
        module: "Coin Analytics",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "Shop Management",
        actions: ["Manage"],
      },
      {
        module: "notifications",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "LMS Management",
        actions: ["Create", "Read", "Update", "Delete", "Manage"],
      },
      {
        module: "Purchase Management",
        actions: ["Create", "Read", "Update", "Delete", "Manage"],
      },
      {
        module: "Medical Check-in",
        actions: ["Create", "Read"],
      },
      {
        module: "Medical Management",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "Schedule Management",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "Daily Schedule",
        actions: ["Read"],
      },
      {
        module: "Course Management",
        actions: ["Create"],
      },
    ],
  },
  {
    roleName: "purchase-manager",
    permissions: [
      {
        module: "User Management",
        actions: ["Read"],
      },
      {
        module: "Shop Management",
        actions: ["Manage"],
      },
      {
        module: "Purchase Management",
        actions: ["Create", "Read", "Update", "Manage"],
      },
      {
        module: "Machine Management",
        actions: ["Read"],
      },
    ],
  },
  {
    roleName: "coach",
    permissions: [
      {
        module: "User Management",
        actions: ["Create", "Read"],
      },
      {
        module: "Task Management",
        actions: ["Create", "Read", "Update"],
      },
      {
        module: "WTF Management",
        actions: ["Read"],
      },
      {
        module: "WTF Interaction",
        actions: ["Create", "Read"],
      },
      {
        module: "WTF Submission",
        actions: ["Read", "Update"],
      },
      {
        module: "WTF Coach Suggestion",
        actions: ["Create", "Read"],
      },
      {
        module: "LMS Management",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "Purchase Management",
        actions: ["Create", "Read"],
      },
      {
        module: "Schedule Management",
        actions: ["Read"],
      },
      {
        module: "Daily Schedule",
        actions: ["Read"],
      },
      {
        module: "Course Management",
        actions: ["Create"],
      },
      {
        module: "Machine Management",
        actions: ["Read"],
      },
    ],
  },
  {
    roleName: "student",
    permissions: [
      {
        module: "WTF Interaction",
        actions: ["Create", "Read"],
      },
      {
        module: "WTF Submission",
        actions: ["Create", "Read"],
      },
      {
        module: "Daily Schedule",
        actions: ["Read"],
      },
    ],
  },
  {
    roleName: "balagruha-incharge",
    permissions: [
      {
        module: "Task Management",
        actions: ["Create", "Read", "Update"],
      },
      {
        module: "WTF Management",
        actions: ["Read"],
      },
      {
        module: "WTF Interaction",
        actions: ["Read"],
      },
      {
        module: "WTF Submission",
        actions: ["Read"],
      },
      {
        module: "Purchase Management",
        actions: ["Create", "Read"],
      },
      {
        module: "Machine Management",
        actions: ["Read"],
      },
      {
        module: "Schedule Management",
        actions: ["Read"],
      },
      {
        module: "Daily Schedule",
        actions: ["Read"],
      },
    ],
  },
  {
    roleName: "medical-incharge",
    permissions: [
      {
        module: "Medical Check-in",
        actions: ["Create", "Read"],
      },
      {
        module: "Medical Management",
        actions: ["Create", "Read", "Update", "Delete"],
      },
      {
        module: "Schedule Management",
        actions: ["Read"],
      },
      {
        module: "Daily Schedule",
        actions: ["Read"],
      },
    ],
  },
  {
    roleName: "sports-coach",
    permissions: [
      {
        module: "LMS Management",
        actions: ["Create", "Read", "Update"],
      },
      {
        module: "Machine Management",
        actions: ["Read"],
      },
      {
        module: "Schedule Management",
        actions: ["Read"],
      },
      {
        module: "Daily Schedule",
        actions: ["Read"],
      },
      {
        module: "Course Management",
        actions: ["Create"],
      },
    ],
  },
  {
    roleName: "music-coach",
    permissions: [
      {
        module: "LMS Management",
        actions: ["Create", "Read", "Update"],
      },
      {
        module: "Machine Management",
        actions: ["Read"],
      },
      {
        module: "Schedule Management",
        actions: ["Read"],
      },
      {
        module: "Daily Schedule",
        actions: ["Read"],
      },
      {
        module: "Course Management",
        actions: ["Create"],
      },
    ],
  },
  {
    roleName: "amma",
    permissions: [
      {
        module: "Daily Schedule",
        actions: ["Read"],
      },
    ],
  },
];

async function setupDefaultRoles() {
  try {
    console.log("🔧 Setting up default roles and permissions...");

    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ roleName: roleData.roleName });

      if (existingRole) {
        console.log(
          `✅ Role '${roleData.roleName}' already exists, updating permissions...`
        );

        // Update existing role with new permissions
        existingRole.permissions = roleData.permissions;
        await existingRole.save();

        console.log(`✅ Role '${roleData.roleName}' updated successfully`);
      } else {
        console.log(`➕ Creating new role '${roleData.roleName}'...`);

        const newRole = new Role(roleData);
        await newRole.save();

        console.log(`✅ Role '${roleData.roleName}' created successfully`);
      }
    }

    console.log(
      "🎉 All default roles and permissions have been set up successfully!"
    );

    // Display all roles
    const allRoles = await Role.find();
    console.log("\n📋 Current roles in database:");
    allRoles.forEach((role) => {
      console.log(`\n🔑 Role: ${role.roleName}`);
      role.permissions.forEach((perm) => {
        console.log(`   📁 ${perm.module}: ${perm.actions.join(", ")}`);
      });
    });
  } catch (error) {
    console.error("❌ Error setting up default roles:", error);
  }
}

// Export for use in other scripts
module.exports = { setupDefaultRoles };

// Run if this script is executed directly
if (require.main === module) {
  // Connect to MongoDB
  const mongoUri =
    process.env.MONGO_URI || "mongodb://localhost:27017/isfplayground";

  mongoose
    .connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      console.log("✅ Connected to MongoDB");
      return setupDefaultRoles();
    })
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}
