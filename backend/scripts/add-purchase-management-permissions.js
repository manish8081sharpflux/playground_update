/**
 * Script to add Purchase Management permissions to purchase-manager role
 * Sprint5-Story-17: Purchase Request Creation & Management
 *
 * Run: node backend/scripts/add-purchase-management-permissions.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Role = require('../models/role');

const MONGO_URI = process.env.MONGO_URI;

async function addPurchaseManagementPermissions() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find purchase-manager role
    const purchaseManagerRole = await Role.findOne({ roleName: 'purchase-manager' });

    if (!purchaseManagerRole) {
      console.error('❌ purchase-manager role not found in database');
      console.log('Available roles:');
      const allRoles = await Role.find({}, 'roleName');
      allRoles.forEach(role => console.log(`  - ${role.roleName}`));
      process.exit(1);
    }

    console.log(`\n📋 Found role: ${purchaseManagerRole.roleName}`);
    console.log(`Current permissions modules: ${purchaseManagerRole.permissions.map(p => p.module).join(', ')}`);

    // Check if Purchase Management already exists
    const existingPermission = purchaseManagerRole.permissions.find(
      p => p.module === 'Purchase Management'
    );

    if (existingPermission) {
      console.log('\n⚠️  Purchase Management permissions already exist:');
      console.log(`   Actions: ${existingPermission.actions.join(', ')}`);
      console.log('\nℹ️  No changes needed. Exiting...');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Add Purchase Management permissions
    const newPermission = {
      module: 'Purchase Management',
      actions: ['Create', 'Read', 'Update', 'Delete']
    };

    purchaseManagerRole.permissions.push(newPermission);
    await purchaseManagerRole.save();

    console.log('\n✅ Successfully added Purchase Management permissions!');
    console.log(`   Module: ${newPermission.module}`);
    console.log(`   Actions: ${newPermission.actions.join(', ')}`);

    console.log('\n📋 Updated permissions for purchase-manager role:');
    purchaseManagerRole.permissions.forEach(perm => {
      console.log(`   - ${perm.module}: ${perm.actions.join(', ')}`);
    });

    console.log('\n🔄 Please restart the backend server to clear role cache.');

    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed. Script completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error adding permissions:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
addPurchaseManagementPermissions();
