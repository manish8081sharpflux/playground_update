const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Coin = require('../models/coin');
const StudentProgress = require('../models/StudentProgress');
const User = require('../models/user');

async function debugModels() {
    try {
        const mongoUri = process.env.MONGO_URI;
        console.log('Connecting to:', mongoUri);
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // 1. Test Coin Model
        console.log('Testing Coin Model...');
        try {
            const coinCount = await Coin.countDocuments();
            console.log('Coin count:', coinCount);

            // Test Aggregate (used in Awards History)
            const history = await Coin.aggregate([
                { $limit: 1 }
            ]);
            console.log('Coin Aggregate result:', history);
        } catch (e) {
            console.error('❌ Coin Model Error:', e);
        }

        // 2. Test StudentProgress Model
        console.log('Testing StudentProgress Model...');
        try {
            const spCount = await StudentProgress.countDocuments();
            console.log('StudentProgress count:', spCount);

            const completions = await StudentProgress.aggregate([
                { $limit: 1 }
            ]);
            console.log('StudentProgress Aggregate result:', completions);
        } catch (e) {
            console.error('❌ StudentProgress Model Error:', e);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ General Error:', err);
    }
}

debugModels();
