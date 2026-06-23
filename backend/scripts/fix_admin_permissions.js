require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/role');

async function fixPermissions() {
    try {
        // Attempt to load proper mongo URI from env, fallback to default local
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';
        console.log('Connecting to MongoDB:', mongoUri);
        await mongoose.connect(mongoUri);

        const adminRole = await Role.findOne({ roleName: 'admin' });
        if (!adminRole) {
            console.log('Admin role not found! Trying "Admin" (capitalized)...');
            // Try capitalized just in case
            const adminRoleCap = await Role.findOne({ roleName: 'Admin' });
            if (!adminRoleCap) {
                console.error('Admin role not found in either case!');
                process.exit(1);
            }
            // Proceed with capitalized
            console.log('Found Admin Role (Capitalized). Current permissions:', adminRoleCap.permissions.length);
            await updateRole(adminRoleCap);
            return;
        }

        console.log('Found Admin Role. Current permissions:', adminRole.permissions.length);
        await updateRole(adminRole);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

async function updateRole(roleDoc) {
    const lmsPermission = roleDoc.permissions.find(p => p.module === 'LMS Management');

    if (lmsPermission) {
        console.log('LMS Management permission already exists.');
        // Ensure "Manage" action is present
        if (!lmsPermission.actions.includes('Manage')) {
            console.log('Adding "Manage" action to LMS Management permission...');
            lmsPermission.actions.push('Manage');
            await roleDoc.save();
            console.log('Updated "Manage" action.');
        } else {
            console.log('Manage action already exists. No changes needed.');
        }
    } else {
        console.log('Adding "LMS Management" permission module...');
        roleDoc.permissions.push({
            module: 'LMS Management',
            actions: ['Manage', 'Read', 'Update', 'Create', 'Delete'],
            scope: 'all'
        });
        await roleDoc.save();
        console.log('LMS Management permission added successfully.');
    }
}

fixPermissions();
