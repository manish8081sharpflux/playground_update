
const mongoose = require('mongoose');
const StudentProgress = require('./models/StudentProgress');
require('dotenv').config();

const STUDENT_ID = '685be594abeded0850dd202d';
const COURSE_ID = '696e2f919a62cb73b229e422'; // Test Automation
const VIDEO_ID = '696e335d9a62cb73b229e50d';

async function fix() {
    try {
        console.log('Connecting...');
        await mongoose.connect(process.env.MONGO_URI); // Use standard URI

        // Find all matching
        const records = await StudentProgress.find({ student: STUDENT_ID, course: COURSE_ID });
        console.log(`Found ${records.length} records for Student+Course.`);

        for (const r of records) {
            console.log(`Record ID: ${r._id}`);
            console.log(`Current Items: ${r.completedItems.length}`);

            const exists = r.completedItems.some(i => String(i.itemId) === VIDEO_ID);
            if (exists) {
                console.log('Video already marked.');
            } else {
                console.log('Pushing Video Item...');
                r.completedItems.push({
                    itemId: new mongoose.Types.ObjectId(VIDEO_ID),
                    itemType: 'video',
                    completedAt: new Date()
                });
                await r.save();
                console.log('Saved.');
            }
        }

        mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

fix();
