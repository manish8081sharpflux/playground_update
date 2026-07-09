const mongoose = require("mongoose");
const Role = require("../models/role");
const User = require("../models/user");

async function debugRoles() {
  try {
    console.log("🔍 Debugging roles and permissions...\n");

    // Check all roles
    const roles = await Role.find();
    console.log(`📊 Found ${roles.length} roles in database:`);

    if (roles.length === 0) {
      console.log("❌ No roles found! This is why you're getting 403 errors.");
      console.log("💡 Run 'npm run setup:roles' to create default roles.");
      return;
    }

    roles.forEach((role) => {
      console.log(`\n🔑 Role: ${role.roleName}`);
      if (role.permissions && role.permissions.length > 0) {
        role.permissions.forEach((perm) => {
          console.log(`   📁 ${perm.module}: ${perm.actions.join(", ")}`);
        });
      } else {
        console.log(`   ⚠️  No permissions defined for this role!`);
      }
    });

    // Check for WTF Management permissions specifically
    console.log("\n🎯 Checking WTF Management permissions:");
    const wtfRoles = roles.filter(
      (role) =>
        role.permissions &&
        role.permissions.some((perm) => perm.module === "WTF Management")
    );

    if (wtfRoles.length === 0) {
      console.log("❌ No roles have WTF Management permissions!");
      console.log("💡 This is why you can't create pins.");
    } else {
      console.log("✅ Roles with WTF Management permissions:");
      wtfRoles.forEach((role) => {
        const wtfPerm = role.permissions.find(
          (perm) => perm.module === "WTF Management"
        );
        console.log(`   🔑 ${role.roleName}: ${wtfPerm.actions.join(", ")}`);
      });
    }

    // Check users and their roles
    console.log("\n👥 Checking users and their roles:");
    const users = await User.find().select("name email role status");
    console.log(`📊 Found ${users.length} users:`);

    users.forEach((user) => {
      console.log(
        `   👤 ${user.name} (${user.email}) - Role: ${user.role} - Status: ${user.status}`
      );
    });

    // Check if admin user exists and has proper role
    const adminUsers = users.filter((user) => user.role === "admin");
    if (adminUsers.length === 0) {
      console.log("\n❌ No admin users found!");
    } else {
      console.log(`\n✅ Found ${adminUsers.length} admin user(s):`);
      adminUsers.forEach((user) => {
        console.log(`   👑 ${user.name} (${user.email})`);
      });
    }
  } catch (error) {
    console.error("❌ Error debugging roles:", error);
  }
}

// Export for use in other scripts
module.exports = { debugRoles };

// Run if this script is executed directly
if (require.main === module) {
  // Connect to MongoDB
  const mongoUri =
    process.env.MONGO_URI || "mongodb://localhost:27017/isfplayground";

  mongoose
    .connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      console.log("✅ Connected to MongoDB");
      return debugRoles();
    })
    .then(() => {
      console.log("\n✅ Debug completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Debug failed:", error);
      process.exit(1);
    });
}
