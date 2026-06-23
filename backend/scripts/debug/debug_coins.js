const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Coin = require('./models/coin');
const User = require('./models/user');

dotenv.config();

const connectDB = async () => {
    try {
        const mongoURI = process.env.NODE_ENV === "local" ? process.env.MONGO_URI_LOCAL : process.env.MONGO_URI;
        await mongoose.connect(mongoURI);
        console.log('Connected.');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();
    const studentId = '685be594abeded0850dd202d';
    const amount = 5;

    try {
        const coinRecord = await Coin.findOrCreateForUser(studentId);
        console.log('Coin Record Balance:', coinRecord.balance);

        console.log('Attempting to add coins...');
        await coinRecord.addCoins(
            amount,
            'earned',
            'Debug Coin Award',
            'task',
            { debug: true }
        );
        console.log('Coins added to Coin Model.');

        console.log('Attempting to update User model...');
        await User.findByIdAndUpdate(studentId, { $inc: { coins: amount } });
        console.log('User model updated.');

    } catch (e) {
        console.error('ERROR AWARDING COINS:', e);
    }

    process.exit();
};

run();
