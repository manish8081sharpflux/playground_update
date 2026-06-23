const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const CourseSchema = new mongoose.Schema({
    title: String,
    category: String,
    status: String
}, { strict: false });

const Course = mongoose.model('Course', CourseSchema);

async function publishCourses() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const result = await Course.updateMany(
            { category: 'Computer Apps', status: 'draft' },
            { $set: { status: 'published' } }
        );

        console.log(`Updated ${result.modifiedCount} courses to 'published'`);

        // Verify
        const courses = await Course.find({ category: 'Computer Apps' }).select('title status');
        console.table(courses.map(c => ({ title: c.title, status: c.status })));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

publishCourses();
