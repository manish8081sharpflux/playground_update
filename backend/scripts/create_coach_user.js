const mongoose = require('mongoose');
const User = require('../models/user');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/isfplayground';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('Connected to MongoDB');

        const email = 'coach@test.com';
        const password = 'password123';
        // const hashedPassword = await bcrypt.hash(password, 10);

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            console.log(`User ${email} already exists. Updating password...`);
            existingUser.password = password;
            // Ensure role is coach
            existingUser.role = 'coach';
            await existingUser.save();
            console.log('User updated successfully.');
        } else {
            console.log(`Creating user ${email}...`);
            const newUser = new User({
                name: 'Test Coach',
                email,
                password: password,
                role: 'coach',
                status: 'active'
            });
            await newUser.save();
            console.log('User created successfully.');
        }

        mongoose.disconnect();
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
