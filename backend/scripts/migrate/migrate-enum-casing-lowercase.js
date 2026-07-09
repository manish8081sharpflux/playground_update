/**
 * Story 6.3: Enum Casing Standardization Migration
 *
 * Migrates gender and parentalStatus enum values from mixed-case (Student model style)
 * to lowercase (User model standard) across User and Student collections.
 *
 * This script is IDEMPOTENT - safe to run multiple times.
 *
 * Usage:
 *   cd backend && node scripts/migrate/migrate-enum-casing-lowercase.js
 *
 * What it does:
 *   - User.gender: already lowercase ("male","female","other") - verified, no changes needed
 *   - Student.gender: "Male" -> "male", "Female" -> "female", "Other" -> "other"
 *   - User.parentalStatus: "Has Both" -> "has both", etc. (already lowercase in schema)
 *   - Student.parentalStatus: "Has Both" -> "has both", "Has One" -> "has one",
 *                             "Has None" -> "has none", "Has Guardian" -> "has guardian"
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function migrate() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/isf_playground';
  console.log(`Connecting to: ${uri}`);

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // --- Student collection: gender casing ---
  const genderMappings = [
    { from: 'Male', to: 'male' },
    { from: 'Female', to: 'female' },
    { from: 'Other', to: 'other' },
  ];

  console.log('\n--- Student collection: gender ---');
  for (const { from, to } of genderMappings) {
    const result = await db.collection('students').updateMany(
      { gender: from },
      { $set: { gender: to } }
    );
    console.log(`  "${from}" -> "${to}": ${result.modifiedCount} documents updated`);
  }

  // --- Student collection: parentalStatus casing ---
  const parentalStatusMappings = [
    { from: 'Has Both', to: 'has both' },
    { from: 'Has One', to: 'has one' },
    { from: 'Has None', to: 'has none' },
    { from: 'Has Guardian', to: 'has guardian' },
  ];

  console.log('\n--- Student collection: parentalStatus ---');
  for (const { from, to } of parentalStatusMappings) {
    const result = await db.collection('students').updateMany(
      { parentalStatus: from },
      { $set: { parentalStatus: to } }
    );
    console.log(`  "${from}" -> "${to}": ${result.modifiedCount} documents updated`);
  }

  // --- User collection: verify gender is already lowercase ---
  console.log('\n--- User collection: gender verification ---');
  for (const { from, to } of genderMappings) {
    const count = await db.collection('users').countDocuments({ gender: from });
    if (count > 0) {
      const result = await db.collection('users').updateMany(
        { gender: from },
        { $set: { gender: to } }
      );
      console.log(`  "${from}" -> "${to}": ${result.modifiedCount} documents updated`);
    } else {
      console.log(`  "${from}": 0 documents found (already lowercase)`);
    }
  }

  // --- User collection: verify parentalStatus is already lowercase ---
  console.log('\n--- User collection: parentalStatus verification ---');
  for (const { from, to } of parentalStatusMappings) {
    const count = await db.collection('users').countDocuments({ parentalStatus: from });
    if (count > 0) {
      const result = await db.collection('users').updateMany(
        { parentalStatus: from },
        { $set: { parentalStatus: to } }
      );
      console.log(`  "${from}" -> "${to}": ${result.modifiedCount} documents updated`);
    } else {
      console.log(`  "${from}": 0 documents found (already lowercase)`);
    }
  }

  console.log('\nMigration complete.');
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
