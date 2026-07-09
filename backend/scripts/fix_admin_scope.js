require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Role = require('../models/role');

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!uri) {
  console.error('Error: MONGO_URI or MONGODB_URI environment variable is required');
  process.exit(1);
}

const fixScope = async () => {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const roles = await Role.find({});
        console.log('Available Roles:', roles.map(r => r.roleName));

        const adminRole = roles.find(r => r.roleName.toLowerCase() === 'admin');

        if (!adminRole) {
            console.log('Admin role not found (even case-insensitive)');
            process.exit(1);
        }

        console.log(`Found Admin Role: ${adminRole.roleName}`);

        let updated = false;

        adminRole.permissions.forEach(p => {
            if (p.scope !== 'all') {
                console.log(`Updating scope for ${p.module} from '${p.scope || 'undefined'}' to 'all'`);
                p.scope = 'all';
                updated = true;
            }
        });

        if (updated) {
            adminRole.markModified('permissions');
            await adminRole.save();
            console.log('Admin permissions updated successfully.');
        } else {
            console.log('Admin permissions already correct.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

fixScope();
