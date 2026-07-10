/**
 * Ensure purchase-manager has the permissions required by purchase manager pages.
 * This script preserves any other modules already assigned to the role.
 *
 * Run: node backend/scripts/add-purchase-management-permissions.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Role = require('../models/role');

const MONGO_URI = process.env.MONGO_URI;

const requiredPermissions = [
  {
    module: 'Shop Management',
    actions: ['Manage'],
    scope: 'balagruh',
  },
  {
    module: 'Purchase Management',
    actions: ['Create', 'Read', 'Update', 'Delete', 'Manage'],
    scope: 'balagruh',
  },
];

function mergeActions(currentActions = [], requiredActions = []) {
  return Array.from(new Set([...currentActions, ...requiredActions]));
}

async function addPurchaseManagementPermissions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const purchaseManagerRole = await Role.findOne({ roleName: 'purchase-manager' });

    if (!purchaseManagerRole) {
      console.error('purchase-manager role not found in database');
      const allRoles = await Role.find({}, 'roleName');
      console.log('Available roles:');
      allRoles.forEach((role) => console.log(`  - ${role.roleName}`));
      process.exit(1);
    }

    console.log(`Found role: ${purchaseManagerRole.roleName}`);
    console.log(`Current permission modules: ${purchaseManagerRole.permissions.map((p) => p.module).join(', ')}`);

    requiredPermissions.forEach((requiredPermission) => {
      const existingPermission = purchaseManagerRole.permissions.find(
        (permission) => permission.module === requiredPermission.module
      );

      if (existingPermission) {
        existingPermission.actions = mergeActions(
          existingPermission.actions,
          requiredPermission.actions
        );
        existingPermission.scope = requiredPermission.scope;
      } else {
        purchaseManagerRole.permissions.push(requiredPermission);
      }
    });

    await purchaseManagerRole.save();

    console.log('Purchase manager permissions synced without removing other modules.');
    purchaseManagerRole.permissions.forEach((permission) => {
      console.log(`  - ${permission.module}: ${permission.actions.join(', ')} (${permission.scope || 'own'})`);
    });

    await mongoose.connection.close();
    console.log('MongoDB connection closed. Script completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing purchase-manager permissions:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

addPurchaseManagementPermissions();
