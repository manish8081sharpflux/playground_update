const mongoose = require('mongoose');
const Role = require('./models/role');
const dotenv = require('dotenv');
dotenv.config();

async function addShopPermission() {
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
      console.log(`  ${i + 1}. ${p.module}: [${p.actions.join(', ')}]`);
    });

    // Check if shop permission already exists
    const hasShopPermission = adminRole.permissions.some(p =>
      (p.module === 'shop' || p.module === 'Shop Management') && p.actions.includes('Manage')
    );

    if (hasShopPermission) {
      console.log('\n✅ Admin already has shop:Manage permission');
    } else {
      // Add shop:Manage permission
      adminRole.permissions.push({
        module: 'shop',
        actions: ['Manage']
      });
      await adminRole.save();
      console.log('\n✅ Successfully added shop:manage permission to admin role');
      console.log('\n📋 Updated admin permissions:');
      adminRole.permissions.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.module}: [${p.actions.join(', ')}]`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

addShopPermission();
