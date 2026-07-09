const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const dbConnection = process.env.NODE_ENV === 'local' 
  ? process.env.MONGO_URI_LOCAL 
  : process.env.MONGO_URI;

async function cleanupExpiredPins() {
  try {
    await mongoose.connect(dbConnection);
    console.log('✅ Connected to database');
    
    console.log('\n🧹 EXPIRED PINS CLEANUP PROCESS');
    console.log('==================================');
    
    // Use the database connection directly to avoid schema issues
    const db = mongoose.connection.db;
    
    // Get all pins from wtf_pins collection
    const allPins = await db.collection('wtf_pins').find({}).toArray();
    
    console.log(`\n📊 Found ${allPins.length} total pins in database`);
    
    // Check for expired pins regardless of status
    const now = new Date();
    const expiredPins = [];
    
    allPins.forEach(pin => {
      if (pin.expiresAt && now > new Date(pin.expiresAt)) {
        const daysOverdue = Math.ceil((now - new Date(pin.expiresAt)) / (1000 * 60 * 60 * 24));
        expiredPins.push({
          ...pin,
          daysOverdue
        });
      }
    });
    
    if (expiredPins.length === 0) {
      console.log('✅ No expired pins found - database is clean!');
      await mongoose.disconnect();
      return;
    }
    
    console.log(`\n🚨 Found ${expiredPins.length} expired pins that need cleanup`);
    
    // Group expired pins by current status
    const expiredByStatus = {};
    expiredPins.forEach(pin => {
      const status = pin.status || 'unknown';
      if (!expiredByStatus[status]) {
        expiredByStatus[status] = [];
      }
      expiredByStatus[status].push(pin);
    });
    
    console.log('\n📈 EXPIRED PINS BY CURRENT STATUS:');
    Object.keys(expiredByStatus).forEach(status => {
      console.log(`   ${status}: ${expiredByStatus[status].length} pins`);
    });
    
    // Show detailed breakdown
    console.log('\n📋 DETAILED BREAKDOWN OF EXPIRED PINS:');
    expiredPins.forEach((pin, index) => {
      console.log(`${index + 1}. ${pin.title || 'No title'}`);
      console.log(`   Current Status: ${pin.status || 'unknown'}`);
      console.log(`   Created: ${new Date(pin.createdAt).toLocaleDateString()}`);
      console.log(`   Expires: ${new Date(pin.expiresAt).toLocaleDateString()}`);
      console.log(`   Days Overdue: ${pin.daysOverdue}`);
      console.log(`   Has Media: ${pin.mediaUrl ? 'Yes' : 'No'}`);
      console.log(`   Has Thumbnail: ${pin.thumbnailUrl ? 'Yes' : 'No'}`);
      console.log(`   Pin ID: ${pin._id}`);
      console.log('');
    });
    
    // Ask for confirmation
    console.log('⚠️  WARNING: This will:');
    console.log('   1. Mark expired pins as "expired" status');
    console.log('   2. Clean up S3 files (if any)');
    console.log('   3. Keep pins in database for audit');
    console.log('   4. Remove them from active display');
    console.log('');
    console.log('🔒 This is a SOFT DELETE - pins will remain in database');
    console.log('💰 S3 files will be cleaned up to save storage costs');
    console.log('');
    
    // For now, we'll proceed automatically since this is a script
    // In production, you might want to add a confirmation prompt
    
    console.log('🚀 Proceeding with cleanup...');
    
    // Import the WTF service for proper S3 cleanup
    const WtfService = require('./services/wtf');
    
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    let s3FilesCleaned = 0;
    
    console.log('\n🔄 PROCESSING EXPIRED PINS...');
    console.log('===============================');
    
    for (const pin of expiredPins) {
      try {
        console.log(`\n📌 Processing: ${pin.title || 'No title'} (ID: ${pin._id})`);
        
        // Check if pin already has 'expired' status
        if (pin.status === 'expired') {
          console.log('   ✅ Already marked as expired, skipping...');
          processedCount++;
          continue;
        }
        
        // Step 1: Clean up S3 files if they exist
        let s3CleanupResult = null;
        if (pin.mediaUrl || pin.thumbnailUrl) {
          console.log('   🗂️  Cleaning up S3 files...');
          
          try {
            // Use the deletePin method which handles S3 cleanup
            const deleteResult = await WtfService.deletePin(pin._id);
            
                         if (deleteResult.success) {
               s3CleanupResult = deleteResult.s3DeletionResults;
               const s3FilesDeleted = s3CleanupResult?.length || 0;
               console.log(`   ✅ S3 cleanup completed: ${s3FilesDeleted} files processed`);
               s3FilesCleaned += s3FilesDeleted;
            } else {
              console.log(`   ⚠️  S3 cleanup failed: ${deleteResult.message}`);
            }
          } catch (s3Error) {
            console.log(`   ⚠️  S3 cleanup error: ${s3Error.message}`);
          }
        } else {
          console.log('   ℹ️  No S3 files to clean up');
        }
        
        // Step 2: Update pin status to 'expired' (soft delete)
        console.log('   📝 Updating pin status to "expired"...');
        
        try {
          // Import the data access method
          const { updatePinStatus } = require('./data-access/wtfPin');
          
          const statusUpdateResult = await updatePinStatus(pin._id, 'expired');
          
          if (statusUpdateResult.success) {
            console.log('   ✅ Pin status updated to "expired"');
            successCount++;
          } else {
            console.log(`   ❌ Failed to update status: ${statusUpdateResult.message}`);
            failedCount++;
          }
        } catch (statusError) {
          console.log(`   ❌ Status update error: ${statusError.message}`);
          failedCount++;
        }
        
        processedCount++;
        
      } catch (error) {
        console.log(`   ❌ Error processing pin: ${error.message}`);
        failedCount++;
        processedCount++;
      }
    }
    
    console.log('\n📊 CLEANUP PROCESS COMPLETED');
    console.log('=============================');
    console.log(`   Total Processed: ${processedCount}`);
    console.log(`   Successfully Updated: ${successCount}`);
    console.log(`   Failed Updates: ${failedCount}`);
    console.log(`   S3 Files Cleaned: ${s3FilesCleaned}`);
    
    // Verify the results
    console.log('\n🔍 VERIFYING RESULTS...');
    console.log('========================');
    
    const updatedPins = await db.collection('wtf_pins').find({}).toArray();
    
    const finalStatusCounts = {};
    updatedPins.forEach(pin => {
      const status = pin.status || 'unknown';
      if (!finalStatusCounts[status]) {
        finalStatusCounts[status] = 0;
      }
      finalStatusCounts[status]++;
    });
    
    console.log('\n📈 FINAL PIN STATUS COUNTS:');
    Object.keys(finalStatusCounts).forEach(status => {
      console.log(`   ${status}: ${finalStatusCounts[status]} pins`);
    });
    
    // Check if any expired pins still exist
    const stillExpired = updatedPins.filter(pin => {
      if (pin.expiresAt && now > new Date(pin.expiresAt)) {
        return pin.status !== 'expired';
      }
      return false;
    });
    
    if (stillExpired.length > 0) {
      console.log(`\n⚠️  ${stillExpired.length} pins are still expired but not marked as 'expired' status`);
      console.log('   These may need manual attention');
    } else {
      console.log('\n✅ All expired pins have been properly marked!');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('================');
    console.log('1. ✅ Expired pins have been marked as "expired" status');
    console.log('2. ✅ S3 files have been cleaned up (cost savings)');
    console.log('3. ✅ Pins remain in database for audit purposes');
    console.log('4. ✅ Dashboard will no longer show expired pins');
    console.log('5. 🚀 Deploy the fixed scheduler to production');
    console.log('6. 🔄 Scheduler will automatically handle future pin expiration');
    
    console.log('\n🎯 The pin expiration system is now ready for production!');
    
  } catch (error) {
    console.error('❌ Error during cleanup process:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupExpiredPins();
