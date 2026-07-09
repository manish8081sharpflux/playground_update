require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/role');

async function fixAdminPermissions() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      console.log('❌ ERROR: MONGO_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find admin role
    const adminRole = await Role.findOne({ roleName: 'admin' });

    if (!adminRole) {
      console.log('❌ ERROR: Admin role not found');
      process.exit(1);
    }

    console.log('\n📋 Current admin permissions:');
    adminRole.permissions.forEach(p => {
      console.log(`   - ${p.module}: [${p.actions.join(', ')}]`);
    });

    // Check if Purchase Management permission exists
    const hasPurchaseManagement = adminRole.permissions.some(p => p.module === 'Purchase Management');

    if (hasPurchaseManagement) {
      console.log('\n✅ Admin already has Purchase Management permission');
    } else {
      console.log('\n❌ Admin is missing Purchase Management permission');
      console.log('➕ Adding Purchase Management:Manage permission...');

      adminRole.permissions.push({
        module: 'Purchase Management',
        actions: ['Manage']
      });

      await adminRole.save();
      console.log('✅ Purchase Management permission added successfully!');

      console.log('\n📋 Updated admin permissions:');
      adminRole.permissions.forEach(p => {
        console.log(`   - ${p.module}: [${p.actions.join(', ')}]`);
      });
    }

    console.log('\n🔄 IMPORTANT: Restart the backend server to clear role cache!');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAdminPermissions();
