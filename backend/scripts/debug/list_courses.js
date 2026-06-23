const mongoose = require('mongoose');
const dotenv = require('dotenv');
// Adjust paths as script is in backend root
const Course = require('./models/course');

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
    const courses = await Course.find({}, 'title slug category');
    console.log('Courses:', courses);
    process.exit();
};

run();
