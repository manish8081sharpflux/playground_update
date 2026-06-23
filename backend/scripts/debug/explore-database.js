const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const dbConnection = process.env.NODE_ENV === 'local' 
  ? process.env.MONGO_URI_LOCAL 
  : process.env.MONGO_URI;

async function exploreDatabase() {
  try {
    await mongoose.connect(dbConnection);
    console.log('✅ Connected to database');
    
    console.log('\n🔍 DATABASE EXPLORATION');
    console.log('========================');
    
    // Get database info
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log(`📊 Database Name: ${dbName}`);
    console.log(`🔗 Connection String: ${dbConnection.includes('localhost') ? 'LOCAL' : 'REMOTE'}`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📁 Collections found: ${collections.length}`);
    
    collections.forEach((collection, index) => {
      console.log(`   ${index + 1}. ${collection.name}`);
    });
    
    // Check if there are any documents in the database
    let totalDocuments = 0;
    for (const collection of collections) {
      try {
        const count = await db.collection(collection.name).countDocuments();
        totalDocuments += count;
        console.log(`   📊 ${collection.name}: ${count} documents`);
      } catch (error) {
        console.log(`   ❌ ${collection.name}: Error counting - ${error.message}`);
      }
    }
    
    console.log(`\n📈 Total documents across all collections: ${totalDocuments}`);
    
    // If we found a collection that might contain pins, let's explore it
    const possiblePinCollections = collections.filter(c => 
      c.name.toLowerCase().includes('pin') || 
      c.name.toLowerCase().includes('wtf') ||
      c.name.toLowerCase().includes('post')
    );
    
    if (possiblePinCollections.length > 0) {
      console.log(`\n🔍 POTENTIAL PIN COLLECTIONS:`);
      possiblePinCollections.forEach(collection => {
        console.log(`   📁 ${collection.name}`);
      });
      
      // Let's check the first potential collection
      const firstCollection = possiblePinCollections[0];
      console.log(`\n🔍 EXPLORING: ${firstCollection.name}`);
      
      try {
        const sampleDocs = await db.collection(firstCollection.name).find({}).limit(3).toArray();
        console.log(`   Found ${sampleDocs.length} sample documents`);
        
        if (sampleDocs.length > 0) {
          console.log(`   Sample document structure:`);
          console.log(`   ${JSON.stringify(sampleDocs[0], null, 2)}`);
        }
      } catch (error) {
        console.log(`   ❌ Error exploring collection: ${error.message}`);
      }
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    
    console.log('\n📋 ANALYSIS:');
    console.log('=============');
    
    if (totalDocuments === 0) {
      console.log('❌ Database appears to be completely empty');
      console.log('   This suggests either:');
      console.log('   1. Wrong database connection');
      console.log('   2. Database was cleared/reset');
      console.log('   3. Environment variable pointing to wrong database');
    } else if (possiblePinCollections.length === 0) {
      console.log('⚠️ No obvious pin collections found');
      console.log('   Pins might be stored under a different name');
    } else {
      console.log('✅ Found potential pin collections');
      console.log('   Need to investigate the actual collection structure');
    }
    
  } catch (error) {
    console.error('❌ Error during database exploration:', error);
    process.exit(1);
  }
}

exploreDatabase();
