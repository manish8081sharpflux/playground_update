const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Role = require('../models/role');

const checkRoles = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const adminRole = await Role.findOne({ roleName: 'Admin' });
        if (!adminRole) {
            console.log('Admin role not found');
        } else {
            console.log('Admin Role Permissions:');
            const relevantModules = ['User Management', 'Balagruha Management', 'LMS Management'];

            adminRole.permissions.forEach(p => {
                if (relevantModules.includes(p.module)) {
                    console.log(`Module: ${p.module}`);
                    console.log(`  Actions: ${p.actions}`);
                    console.log(`  Scope: ${p.scope || 'UNDEFINED (Will default to "own")'}`);
                }
            });
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkRoles();
