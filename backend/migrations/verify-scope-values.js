require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/role');

async function verify() {
  await mongoose.connect(process.env.MONGO_URI);

  const roles = await Role.find({});

  console.log('\n=== SCOPE VALUES VERIFICATION ===\n');

  for (const role of roles) {
    console.log(`\n${role.roleName.toUpperCase()}:`);
    role.permissions.forEach(p => {
      console.log(`  ${p.module}: scope='${p.scope}'`);
    });
  }

  process.exit(0);
}

verify();
