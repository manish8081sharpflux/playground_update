const mongoose = require('mongoose');
require('dotenv').config();
const Doctor = require('../models/doctor');

const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const testDoctorName = "TestDr_" + Date.now();
        console.log(`Attempting to create doctor: ${testDoctorName}`);

        const newDoc = new Doctor({
            name: testDoctorName,
            specialty: "General",
            hospital: "Test Hospital"
        });

        await newDoc.save();
        console.log('Doctor saved successfully.');

        const fetchedDoc = await Doctor.findOne({ name: testDoctorName });
        if (fetchedDoc) {
            console.log('Verified: Doctor found in DB:', fetchedDoc.name);
        } else {
            console.error('FAILED: Doctor not found after save!');
        }

        const count = await Doctor.countDocuments();
        console.log(`Total doctors in DB: ${count}`);

        mongoose.connection.close();
    } catch (err) {
        console.error('DB Connection Error:', err);
        process.exit(1);
    }
};

connectDB();
