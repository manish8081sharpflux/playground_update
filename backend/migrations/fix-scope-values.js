/**
 * Migration: Fix Scope Values (Force Update)
 *
 * Purpose: Correct existing scope values that are wrong
 * - Admin should be 'all' (currently 'own')
 * - Coach roles should be 'balagruh'
 * - Student should be 'own'
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/role');

// Correct scope mapping
const SCOPE_MAPPING = {
  'admin': 'all',
  'coach': 'balagruh',
  'balagruha-incharge': 'balagruh',
  'student': 'own',
  'purchase-manager': 'all',
  'medical-incharge': 'balagruh',
  'sports-coach': 'balagruh',
  'music-coach': 'balagruh',
  'amma': 'all',
};

async function fixScopeValues() {
  try {
    console.log('🔄 Starting scope value correction...');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const roles = await Role.find({});
    console.log(`📋 Found ${roles.length} roles to fix`);

    let fixedCount = 0;

    for (const role of roles) {
      const roleName = role.roleName.toLowerCase();
      const correctScope = SCOPE_MAPPING[roleName] || 'own';

      let needsUpdate = false;

      role.permissions.forEach(permission => {
        if (permission.scope !== correctScope) {
          permission.scope = correctScope;
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        await role.save();
        fixedCount++;
        console.log(`✅ Fixed role: ${role.roleName} → scope='${correctScope}'`);
      } else {
        console.log(`✓  Already correct: ${role.roleName} (scope='${correctScope}')`);
      }
    }

    console.log('\n🎉 Scope correction complete!');
    console.log(`   Fixed: ${fixedCount} roles`);

    return { success: true, fixed: fixedCount };
  } catch (error) {
    console.error('❌ Scope correction failed:', error);
    throw error;
  }
}

// Run it
if (require.main === module) {
  fixScopeValues()
    .then(() => {
      console.log('✅ Scope values corrected successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = { fixScopeValues };
