const mongoose = require('mongoose');
const dotenv = require('dotenv');
// Adjust paths as script is in backend root
const StudentProgress = require('./models/StudentProgress');

dotenv.config();

const connectDB = async () => {
    try {
        const mongoURI = process.env.NODE_ENV === "local" ? process.env.MONGO_URI_LOCAL : process.env.MONGO_URI;
        console.log('Connecting to:', mongoURI);
        await mongoose.connect(mongoURI);
        console.log('Connected.');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();
    const studentId = '685be594abeded0850dd202d'; // User ID from logs
    const quizId = '6980dc47bb6375355bf7a981'; // Quiz ID from logs

    // Find any progress containing this quiz
    const progressDocs = await StudentProgress.find({ student: studentId, 'completedItems.itemId': quizId });

    if (progressDocs.length > 0) {
        console.log(`Found ${progressDocs.length} progress docs. Resetting...`);
        for (const doc of progressDocs) {
            const originalLength = doc.completedItems.length;
            doc.completedItems = doc.completedItems.filter(i => i.itemId.toString() !== quizId);
            const newLength = doc.completedItems.length;
            if (originalLength !== newLength) {
                await doc.save();
                console.log(`Removed quiz from doc ${doc._id}. Items: ${originalLength} -> ${newLength}`);
            }
        }
    } else {
        console.log('No progress found for this quiz.');
    }

    // Also check if we should reset User Coin Balance? No, transactions are log.

    process.exit();
};

run();
