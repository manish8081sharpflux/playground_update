const mongoose = require('mongoose');
const dotenv = require('dotenv');
const StudentProgress = require('./models/StudentProgress');

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
    const studentId = '685be594abeded0850dd202d'; // User ID

    // Known Quiz IDs
    const quizzes = [
        '6980dc47bb6375355bf7a981', // Automation Test (Computer Apps)
        '697db197bef48c56989fc78c'  // How to use Fire Extinguisher (Life Skills - Estimated from Course List)
        // Note: Life Skills quiz ID might be different if it's inside a content item.
        // But let's try removing ALL quiz items from progress to be safe for this user?
        // User specifically asked for this.
    ];

    console.log(`Resetting progress for Student: ${studentId}`);

    // Find all progress for student
    const progressDocs = await StudentProgress.find({ student: studentId });
    console.log(`Found ${progressDocs.length} progress documents.`);

    for (const doc of progressDocs) {
        let modified = false;
        // Filter out the known quizzes
        const originalLen = doc.completedItems.length;

        // Remove ALL items of type 'quiz' to be safe? 
        // Or just the specific ones?
        // User said "clean the slate".
        // Let's remove ALL quizzes to be super clean for testing.
        doc.completedItems = doc.completedItems.filter(item => {
            if (item.itemType === 'quiz') return false; // Remove all quizzes
            return true;
        });

        if (doc.completedItems.length !== originalLen) {
            console.log(`Removed ${originalLen - doc.completedItems.length} quizzes from ${doc.course}`);
            await doc.save();
        }
    }

    console.log('Reset complete. You can now retake quizzes as if it is the first time.');
    process.exit();
};

run();
