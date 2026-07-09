
const mongoose = require('mongoose');
const StudentProgress = require('./backend/models/StudentProgress');
require('dotenv').config({ path: './backend/.env' });

async function checkProgress() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms_db');
        console.log('Connected.');

        const records = await StudentProgress.find().lean();
        console.log(`Found ${records.length} records.`);

        records.forEach(r => {
            console.log('------------------------------------------------');
            console.log(`Student: ${r.student}, Course: ${r.course}`);
            console.log(`Completed Items (${r.completedItems?.length}):`);
            r.completedItems?.forEach(i => {
                console.log(` - ID: ${i.itemId}, Type: ${i.itemType}, Date: ${i.completedAt}`);
            });
        });

        // Also verify Course names
        const Course = require('./backend/models/course');
        const courses = await Course.find({ category: 'Computer Apps' }).select('title _id').lean();
        console.log('\nComputer Apps Courses:');
        courses.forEach(c => console.log(`${c.title}: ${c._id}`));

        mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

checkProgress();
