const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Doctor = require('../models/doctor');

const testDB = async () => {
    try {
        console.log('--- DB Debug Script Started ---');
        const dbConnection = process.env.NODE_ENV === "local" ? process.env.MONGO_URI_LOCAL : process.env.MONGO_URI;
        console.log('URI Env Var:', dbConnection ? 'Defined' : 'Undefined');

        if (!dbConnection) {
            throw new Error("Database URI is not defined in .env (checked MONGO_URI and MONGO_URI_LOCAL)");
        }

        await mongoose.connect(dbConnection);
        console.log('MongoDB Connected Successfully');

        // 1. Check for 'Smith' (case insensitive)
        const existingSmith = await Doctor.find({ name: { $regex: /^smith$/i } });
        console.log(`Found ${existingSmith.length} doctors matching 'smith':`);
        existingSmith.forEach(d => console.log(` - ID: ${d._id}, Name: ${d.name}`));

        // 2. Try creating 'Smith' if not exists, or 'Smith_Test'
        const testName = "Smith_Test_" + Math.floor(Math.random() * 1000);
        console.log(`Attempting to create: ${testName}`);

        const newDoc = new Doctor({
            name: testName,
            specialty: "Debug",
            hospital: "Debug Hospital"
        });

        const savedDoc = await newDoc.save();
        console.log('Saved successfully:', savedDoc._id);

        // 3. Verify immediate read
        const verifyDoc = await Doctor.findById(savedDoc._id);
        console.log('Verification read:', verifyDoc ? 'Success' : 'Failed');

        console.log('--- DB Debug Script Finished ---');
        process.exit(0);
    } catch (err) {
        console.error('DB Debug Error:', err);
        process.exit(1);
    }
};

testDB();
