const mongoose = require('mongoose');
const dotenv = require('dotenv');
const MedicalRecord = require('./models/medical');

dotenv.config();

const dbConnection = process.env.NODE_ENV === 'local' 
  ? process.env.MONGO_URI_LOCAL 
  : process.env.MONGO_URI;

async function checkMedicalFileUrls() {
  try {
    await mongoose.connect(dbConnection);
    console.log('✅ Connected to database');
    
    console.log('\n🔍 CHECKING MEDICAL RECORD FILE URLs');
    console.log('====================================');
    
    // Find the user with ID 123 first
    const User = require('./models/user');
    const user = await User.findOne({ userId: 123 });
    
    if (!user) {
      console.log('❌ User with userId 123 not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.name} (ID: ${user._id})`);
    
    // Find medical records for this user
    const medicalRecords = await MedicalRecord.find({ studentId: user._id });
    
    console.log(`📊 Medical records found: ${medicalRecords.length}`);
    
    medicalRecords.forEach((record, recordIndex) => {
      console.log(`\n📋 Medical Record ${recordIndex + 1}:`);
      console.log(`   Record ID: ${record._id}`);
      console.log(`   Created: ${record.createdAt}`);
      console.log(`   Medical History Items: ${record.medicalHistory.length}`);
      
      record.medicalHistory.forEach((history, historyIndex) => {
        console.log(`\n   📄 History Item ${historyIndex + 1}:`);
        console.log(`      Name: ${history.name || 'No name'}`);
        console.log(`      Description: ${history.description || 'No description'}`);
        
        if (history.prescriptions && history.prescriptions.length > 0) {
          console.log(`      📋 Prescriptions (${history.prescriptions.length}):`);
          history.prescriptions.forEach((prescription, prescIndex) => {
            console.log(`         ${prescIndex + 1}. Name: ${prescription.name || 'No name'}`);
            console.log(`            URL: ${prescription.url || 'No URL'}`);
            console.log(`            Date: ${prescription.date || 'No date'}`);
            
            // Check if URL is accessible
            if (prescription.url) {
              console.log(`            🔍 URL Analysis:`);
              console.log(`               - Protocol: ${prescription.url.startsWith('https') ? 'HTTPS ✅' : 'HTTP/Other ⚠️'}`);
              console.log(`               - Contains S3: ${prescription.url.includes('s3') ? 'Yes ✅' : 'No ⚠️'}`);
              console.log(`               - Contains folder: ${prescription.url.includes(process.env.AWS_S3_FOLDER_MEDICAL_RECORDS || 'student-medical-records') ? 'Yes ✅' : 'No ⚠️'}`);
            }
          });
        }
        
        if (history.otherAttachments && history.otherAttachments.length > 0) {
          console.log(`      📎 Other Attachments (${history.otherAttachments.length}):`);
          history.otherAttachments.forEach((attachment, attachIndex) => {
            console.log(`         ${attachIndex + 1}. Name: ${attachment.name || 'No name'}`);
            console.log(`            URL: ${attachment.url || 'No URL'}`);
            console.log(`            Date: ${attachment.date || 'No date'}`);
            
            // Check if URL is accessible
            if (attachment.url) {
              console.log(`            🔍 URL Analysis:`);
              console.log(`               - Protocol: ${attachment.url.startsWith('https') ? 'HTTPS ✅' : 'HTTP/Other ⚠️'}`);
              console.log(`               - Contains S3: ${attachment.url.includes('s3') ? 'Yes ✅' : 'No ⚠️'}`);
              console.log(`               - Contains folder: ${attachment.url.includes(process.env.AWS_S3_FOLDER_MEDICAL_RECORDS || 'student-medical-records') ? 'Yes ✅' : 'No ⚠️'}`);
            }
          });
        }
      });
    });
    
    console.log('\n🔧 S3 CONFIGURATION CHECK:');
    console.log('===========================');
    console.log(`AWS_S3_BUCKET_NAME: ${process.env.AWS_S3_BUCKET_NAME || 'NOT SET ❌'}`);
    console.log(`AWS_S3_FOLDER_MEDICAL_RECORDS: ${process.env.AWS_S3_FOLDER_MEDICAL_RECORDS || 'NOT SET ❌'}`);
    console.log(`AWS_S3_REGION: ${process.env.AWS_S3_REGION || 'NOT SET ❌'}`);
    console.log(`AWS_S3_ACCESS_KEY_ID: ${process.env.AWS_S3_ACCESS_KEY_ID ? 'SET ✅' : 'NOT SET ❌'}`);
    console.log(`AWS_S3_SECRET_KEY: ${process.env.AWS_S3_SECRET_KEY ? 'SET ✅' : 'NOT SET ❌'}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    
  } catch (error) {
    console.error('❌ Error during medical file URL check:', error);
    process.exit(1);
  }
}

checkMedicalFileUrls();
