const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const MedicalCheckIn = require("../models/medicalCheckIns");

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Sprint6-Story-3: Migration script to convert doctorVisit → doctorVisits and followUp → followUps arrays

async function migrateMedicalCheckIns() {
  try {
    console.log("Starting medical check-ins migration...");
    console.log("Connecting to MongoDB...");

    const mongoUri = process.env.NODE_ENV === 'development'
      ? process.env.MONGO_URI_LOCAL
      : process.env.MONGO_URI;

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    // Find all check-ins that have doctorVisit or followUp (old format)
    const checkIns = await MedicalCheckIn.find({
      $or: [
        { "doctorVisit.doctorName": { $exists: true, $ne: "" } },
        { "followUp.followUpDate": { $exists: true, $ne: null } },
      ],
    });

    console.log(`\nFound ${checkIns.length} check-ins to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const checkIn of checkIns) {
      let needsUpdate = false;
      const updates = {};

      // Migrate doctorVisit → doctorVisits
      if (
        checkIn.doctorVisit &&
        (checkIn.doctorVisit.doctorName || checkIn.doctorVisit.hospitalName)
      ) {
        // Only migrate if doctorVisits array is empty or doesn't exist
        if (!checkIn.doctorVisits || checkIn.doctorVisits.length === 0) {
          updates.doctorVisits = [
            {
              doctorName: checkIn.doctorVisit.doctorName || "",
              hospitalName: checkIn.doctorVisit.hospitalName || "",
              visitDate: checkIn.doctorVisit.visitDate || null,
              prescriptionFiles: checkIn.doctorVisit.prescriptionFiles || [],
              testDetails: checkIn.doctorVisit.testDetails || "",
              testResultFiles: checkIn.doctorVisit.testResultFiles || [],
              conclusion: checkIn.doctorVisit.conclusion || "",
              createdAt: checkIn.createdAt || new Date(),
            },
          ];
          needsUpdate = true;
          console.log(`  - Converting doctorVisit for check-in ${checkIn._id}`);
        }
      }

      // Migrate followUp → followUps
      if (checkIn.followUp && checkIn.followUp.followUpDate) {
        // Only migrate if followUps array is empty or doesn't exist
        if (!checkIn.followUps || checkIn.followUps.length === 0) {
          updates.followUps = [
            {
              followUpDate: checkIn.followUp.followUpDate,
              hospital: checkIn.followUp.hospital || "",
              doctor: checkIn.followUp.doctor || "",
              assignedCoaches: checkIn.followUp.assignedCoaches || [],
              status: checkIn.followUp.status || "",
              descriptionFiles: [],
              testResultFiles: [],
              notes: "",
              createdAt: checkIn.createdAt || new Date(),
            },
          ];
          needsUpdate = true;
          console.log(`  - Converting followUp for check-in ${checkIn._id}`);
        }
      }

      if (needsUpdate) {
        await MedicalCheckIn.updateOne({ _id: checkIn._id }, { $set: updates });
        migratedCount++;
        console.log(`✅ Migrated check-in ${checkIn._id}`);
      } else {
        skippedCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("Migration completed!");
    console.log(`✅ Successfully migrated: ${migratedCount} check-ins`);
    console.log(`⏭️  Skipped (already migrated): ${skippedCount} check-ins`);
    console.log(`📊 Total processed: ${checkIns.length} check-ins`);
    console.log("=".repeat(60));

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrateMedicalCheckIns();
