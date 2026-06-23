const mongoose = require('mongoose');
const dotenv = require('dotenv');
const controller = require('./controllers/lms/student/computerAppsController');
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

    // 1. Reset Progress First
    const studentId = '685be594abeded0850dd202d';
    const quizId = '6980dc47bb6375355bf7a981';
    await StudentProgress.updateMany(
        { student: studentId },
        { $pull: { completedItems: { itemId: quizId } } }
    );
    console.log('Progress Reset.');

    // 2. Mock Req/Res
    const req = {
        params: { studentId },
        body: {
            quizId,
            answers: [
                {
                    questionId: '6980dc47bb6375355bf7a982',
                    selectedOptionId: '6980dc47bb6375355bf7a984'
                }
            ]
        }
    };

    const res = {
        json: (data) => console.log('RESPONSE JSON:', JSON.stringify(data, null, 2)),
        status: (code) => ({
            json: (data) => console.log(`RESPONSE STATUS ${code}:`, JSON.stringify(data, null, 2))
        })
    };

    // 3. Run Controller
    console.log('Running submitQuiz...');
    await controller.submitQuiz(req, res);

    process.exit();
};

run();
