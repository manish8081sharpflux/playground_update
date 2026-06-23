const mongoose = require('mongoose');
const StudentProgress = require('../models/StudentProgress');
require('dotenv').config();

const STUDENT_ID = '685be594abeded0850dd202d';
const COURSE_ID = '696e2f919a62cb73b229e422'; // Test Automation

async function merge() {
    try {
        console.log('Connecting...');
        await mongoose.connect(process.env.MONGO_URI);

        // Explicit lookup with ObjectId
        const studentObj = new mongoose.Types.ObjectId(STUDENT_ID);
        const courseObj = new mongoose.Types.ObjectId(COURSE_ID);

        const records = await StudentProgress.find({
            student: studentObj,
            course: courseObj
        }).sort({ createdAt: 1 });

        console.log(`Found ${records.length} records.`);

        if (records.length <= 1) {
            console.log('No duplicates to merge.');
            process.exit(0);
        }

        // Merge Items
        const masterRecord = records[0];
        const itemsMap = new Map();

        // Add master items
        masterRecord.completedItems.forEach(i => itemsMap.set(String(i.itemId), i));

        // Add other records items
        for (let i = 1; i < records.length; i++) {
            const rec = records[i];
            console.log(`Merging record ${rec._id} (${rec.completedItems.length} items)...`);
            rec.completedItems.forEach(item => {
                if (!itemsMap.has(String(item.itemId))) {
                    console.log(`  Adding item: ${item.itemType} (${item.itemId})`);
                    itemsMap.set(String(item.itemId), item);
                }
            });

            // Delete the duplicate
            await StudentProgress.findByIdAndDelete(rec._id);
            console.log(`  Deleted duplicate record ${rec._id}`);
        }

        // Save Master
        masterRecord.completedItems = Array.from(itemsMap.values());
        await masterRecord.save();
        console.log(`Master record saved with ${masterRecord.completedItems.length} items.`);

        mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

merge();
