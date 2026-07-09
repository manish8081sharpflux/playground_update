const mongoose = require('mongoose');
const Role = require('./models/role');
const dotenv = require('dotenv');
dotenv.config();

async function updateShopModuleName() {
  try {
    const mongoURI = process.env.NODE_ENV === 'local'
      ? process.env.MONGO_URI_LOCAL
      : process.env.MONGO_URI;

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find admin role
    const adminRole = await Role.findOne({ roleName: 'admin' });
    if (!adminRole) {
      console.log('❌ Admin role not found');
      process.exit(1);
    }

    console.log('\n📋 Current admin permissions:');
    adminRole.permissions.forEach((p, i) => {
      console.log(`  ${i + 1}. "${p.module}": [${p.actions.join(', ')}]`);
    });

    // Find the shop permission
    const shopPermissionIndex = adminRole.permissions.findIndex(p =>
      p.module === 'shop' || p.module === 'Shop' || p.module === 'Shop Management'
    );

    if (shopPermissionIndex === -1) {
      console.log('\n❌ Shop permission not found');
      process.exit(1);
    }

    console.log(`\n🔧 Found shop permission at index ${shopPermissionIndex}: "${adminRole.permissions[shopPermissionIndex].module}"`);

    // Update the module name from "shop" to "Shop Management"
    adminRole.permissions[shopPermissionIndex].module = 'Shop Management';

    await adminRole.save();
    console.log('✅ Successfully updated module name from "shop" to "Shop Management"');

    console.log('\n📋 Updated admin permissions:');
    adminRole.permissions.forEach((p, i) => {
      console.log(`  ${i + 1}. "${p.module}": [${p.actions.join(', ')}]`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

updateShopModuleName();
