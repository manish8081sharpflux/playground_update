/**
 * Temporary script to add Shop Management permissions for Coach and Student
 * This is for testing scope-based filtering only
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Role = require('./models/role');

async function addShopPermissions() {
  try {
    console.log('=== Adding Shop Management Permissions for Testing ===\n');

    // Add permission for Coach (scope: balagruha)
    const coachRole = await Role.findOne({ roleName: 'coach' });
    if (coachRole) {
      const hasShopPermission = coachRole.permissions.some(
        p => p.module === 'Shop Management'
      );

      if (!hasShopPermission) {
        coachRole.permissions.push({
          module: 'Shop Management',
          actions: ['Manage'],
          scope: 'balagruh'  // Coach sees only assigned Balagruha data
        });
        await coachRole.save();
        console.log('✓ Added Shop Management permission to Coach role');
        console.log('  Scope: balagruh (assigned Balagruhas only)');
      } else {
        console.log('⏭️  Coach already has Shop Management permission');
      }
    }

    // Add permission for Student (scope: own)
    const studentRole = await Role.findOne({ roleName: 'student' });
    if (studentRole) {
      const hasShopPermission = studentRole.permissions.some(
        p => p.module === 'Shop Management'
      );

      if (!hasShopPermission) {
        studentRole.permissions.push({
          module: 'Shop Management',
          actions: ['Manage'],
          scope: 'own'  // Student sees only own data
        });
        await studentRole.save();
        console.log('✓ Added Shop Management permission to Student role');
        console.log('  Scope: own (own data only)');
      } else {
        console.log('⏭️  Student already has Shop Management permission');
      }
    }

    console.log('\n✅ Permissions added successfully!');
    console.log('\nNOTE: This is for testing only. In production:');
    console.log('  - Coaches should access via /api/v2/shop/coach/ routes');
    console.log('  - Students should access via /api/v2/shop/student/ routes');
    console.log('  - Only admins should access /api/v2/shop/admin/ routes');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addShopPermissions();
