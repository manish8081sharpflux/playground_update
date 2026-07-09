const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/isf_playground';

async function fixCoachUpdatePermission() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const rolesCollection = db.collection('roles');

  const role = await rolesCollection.findOne({ roleName: 'coach' });
  if (!role) {
    console.log('coach role not found!');
    process.exit(1);
  }

  console.log('Current coach User Management permission:');
  const before = role.permissions.find((p) => p.module === 'User Management');
  console.log(' ', before ? JSON.stringify(before) : '(none)');

  let updated = false;
  const updatedPermissions = role.permissions.map((p) => {
    if (p.module !== 'User Management') return p;
    if (p.actions.includes('Update')) return p;
    updated = true;
    return { ...p, actions: [...p.actions, 'Update'] };
  });

  // If User Management isn't on the role at all (it should be), add it.
  if (!updatedPermissions.some((p) => p.module === 'User Management')) {
    updatedPermissions.push({
      module: 'User Management',
      actions: ['Create', 'Read', 'Update'],
      scope: 'balagruh',
    });
    updated = true;
  }

  if (!updated) {
    console.log('No change needed (Update already present).');
    process.exit(0);
  }

  const result = await rolesCollection.updateOne(
    { roleName: 'coach' },
    { $set: { permissions: updatedPermissions } }
  );

  console.log(`Matched ${result.matchedCount}, modified ${result.modifiedCount}`);

  const after = (await rolesCollection.findOne({ roleName: 'coach' })).permissions.find(
    (p) => p.module === 'User Management'
  );
  console.log('After: ', JSON.stringify(after));

  await mongoose.disconnect();
}

fixCoachUpdatePermission().catch((err) => {
  console.error(err);
  process.exit(1);
});
