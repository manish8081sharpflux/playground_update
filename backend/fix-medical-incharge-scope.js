const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/isf_playground';

async function fixMedicalInchargeScope() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const rolesCollection = db.collection('roles');

  const role = await rolesCollection.findOne({ roleName: 'medical-incharge' });
  if (!role) {
    console.log('Role not found!'); 
    process.exit(1);
  }

  console.log('Current permissions:');
  role.permissions.forEach(p => {
    console.log(`  ${p.module}: actions=${p.actions.join(',')} | scope=${p.scope}`);
  });

  let updatedPermissions = role.permissions.map(p => ({
    ...p,
    scope: p.scope === 'own' ? 'balagruh' : p.scope
  }));

  // Modules to add if missing
  const requiredModules = [
    { module: 'User Management', actions: ['Read'], scope: 'balagruh' },
    { module: 'Task Management', actions: ['Read'], scope: 'balagruh' },
    { module: 'Machine Management', actions: ['Read'], scope: 'balagruh' },
    { module: 'Purchase Management', actions: ['Create', 'Read'], scope: 'balagruh' },
  ];

  for (const req of requiredModules) {
    const exists = updatedPermissions.some(p => p.module === req.module);
    if (!exists) {
      updatedPermissions.push(req);
      console.log(`Added ${req.module} with scope ${req.scope}`);
    } else {
      console.log(`${req.module} already exists`);
    }
  }

  const result = await rolesCollection.updateOne(
    { roleName: 'medical-incharge' },
    { $set: { permissions: updatedPermissions } }
  );

  console.log('\nUpdate result:', result.modifiedCount, 'document(s) modified');
  
  const updated = await rolesCollection.findOne({ roleName: 'medical-incharge' });
  console.log('\nUpdated permissions:');
  updated.permissions.forEach(p => {
    console.log(`  ${p.module}: actions=${p.actions.join(',')} | scope=${p.scope}`);
  });

  await mongoose.disconnect();
  console.log('\nDone!');
}

fixMedicalInchargeScope().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
