/**
 * Migration: Add Scope Field to Existing Permissions
 *
 * Purpose: Update all existing roles to include the new 'scope' field
 * - Admin roles: scope='all' (global access to all Balagruhs)
 * - Coach/Balagruh In-Charge: scope='balagruh' (assigned Balagruh only)
 * - Student: scope='own' (own data only)
 * - Other roles: scope='own' (safe default)
 *
 * Created: 2025-10-18 21:29:31
 * Sprint: 1.1 - RBAC Refactor
 * Story: epic-01-story-01
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/role');

// Migration configuration
const SCOPE_MAPPING = {
  'admin': 'all',                    // Admin sees all Balagruhs
  'coach': 'balagruh',               // Coach sees assigned Balagruh(s)
  'balagruha-incharge': 'balagruh',  // In-Charge sees assigned Balagruh
  'student': 'own',                  // Student sees own data only
  'purchase-manager': 'all',         // Purchase manager sees all
  'medical-incharge': 'balagruh',    // Medical sees assigned Balagruh
  'sports-coach': 'balagruh',        // Sports coach sees assigned Balagruh
  'music-coach': 'balagruh',         // Music coach sees assigned Balagruh
  'amma': 'all',                     // Amma sees all
};

async function runMigration() {
  try {
    console.log('🔄 Starting migration: Add scope to permissions...');

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');
    }

    // Fetch all roles
    const roles = await Role.find({});
    console.log(`📋 Found ${roles.length} roles to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const role of roles) {
      const roleName = role.roleName.toLowerCase();
      const defaultScope = SCOPE_MAPPING[roleName] || 'own'; // Safe default

      let permissionsUpdated = false;

      // Update each permission in the role
      role.permissions.forEach(permission => {
        if (!permission.scope) {
          permission.scope = defaultScope;
          permissionsUpdated = true;
        }
      });

      if (permissionsUpdated) {
        await role.save();
        migratedCount++;
        console.log(`✅ Migrated role: ${role.roleName} (scope: ${defaultScope})`);
      } else {
        skippedCount++;
        console.log(`⏭️  Skipped role: ${role.roleName} (already has scope)`);
      }
    }

    console.log('\n🎉 Migration complete!');
    console.log(`   Migrated: ${migratedCount} roles`);
    console.log(`   Skipped: ${skippedCount} roles`);

    return { success: true, migrated: migratedCount, skipped: skippedCount };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function rollback() {
  try {
    console.log('🔄 Starting rollback: Remove scope from permissions...');

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');
    }

    const roles = await Role.find({});
    console.log(`📋 Found ${roles.length} roles to rollback`);

    let rolledBackCount = 0;

    for (const role of roles) {
      role.permissions.forEach(permission => {
        if (permission.scope) {
          delete permission.scope;
        }
      });

      await role.save();
      rolledBackCount++;
      console.log(`✅ Rolled back role: ${role.roleName}`);
    }

    console.log('\n🎉 Rollback complete!');
    console.log(`   Rolled back: ${rolledBackCount} roles`);

    return { success: true, rolledBack: rolledBackCount };
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'rollback') {
    rollback()
      .then(() => {
        console.log('✅ Rollback completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Rollback failed:', error);
        process.exit(1);
      });
  } else {
    runMigration()
      .then(() => {
        console.log('✅ Migration completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { runMigration, rollback };
