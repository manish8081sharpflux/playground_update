const mongoose = require('mongoose');
const User = require('../models/user');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';

async function resetPassword() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB\n');

        console.log('🔍 Finding Purchase Manager user...');
        const user = await User.findOne({ email: 'purchase@gmail.com' });

        if (!user) {
            console.log('❌ User purchase@gmail.com not found\n');
            return;
        }

        console.log(`✅ Found user: ${user.name} (${user.email})`);
        console.log(`   Role: ${user.role}\n`);

        // Reset password to password123 
        user.password = 'password123';
        await user.save();

        console.log('✅ Password reset successfully!');
        console.log('\n👤 Purchase Manager credentials:');
        console.log('   Email: purchase@gmail.com');
        console.log('   Password: password123\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

resetPassword();
