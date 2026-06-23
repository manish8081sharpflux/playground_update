const mongoose = require('mongoose');
const dotenv = require('dotenv');
// Adjust paths as script is in backend root
const Quiz = require('./models/Quiz');

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
    const quizId = '6980dc47bb6375355bf7a981'; // Automation Test
    const quiz = await Quiz.findById(quizId).lean();
    console.log(JSON.stringify(quiz, null, 2));
    process.exit();
};

run();
