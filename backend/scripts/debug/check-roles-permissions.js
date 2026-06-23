require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const RoleSchema = new mongoose.Schema({}, { strict: false });
const Role = mongoose.model('Role', RoleSchema, 'roles');

async function checkRolesPermissions() {
  try {
    console.log('=== Checking Roles & Permissions ===\n');

    // Get all roles
    const roles = await Role.find({}).lean();

    for (const role of roles) {
      console.log(`ROLE: ${role.roleName}`);
      console.log('-------------------------------------------');

      // Find Shop Management permissions
      const shopPermissions = role.permissions?.filter(p =>
        p.module === 'Shop Management'
      );

      if (shopPermissions && shopPermissions.length > 0) {
        console.log('Shop Management Permissions:');
        shopPermissions.forEach(p => {
          console.log(`  - Actions: ${p.actions.join(', ')}`);
          console.log(`    Scope: ${p.scope || 'NOT SET'}`);
        });
      } else {
        console.log('  No Shop Management permissions found');
      }

      console.log();
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRolesPermissions();
