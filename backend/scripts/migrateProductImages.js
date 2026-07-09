const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models
const ShopItem = require('../models/shopItem');

async function migrateProductImages() {
  try {
    // Connect to database
    const dbConnection = process.env.NODE_ENV === 'local'
      ? process.env.MONGO_URI_LOCAL
      : process.env.MONGO_URI;

    await mongoose.connect(dbConnection, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');
    console.log('🔄 Starting product image migration...\n');

    // Find products with imageUrl but no images array (or empty images array)
    const products = await ShopItem.find({
      imageUrl: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { images: { $exists: false } },
        { images: { $size: 0 } }
      ]
    });

    console.log(`📦 Found ${products.length} products to migrate`);

    if (products.length === 0) {
      console.log('\n✅ No products need migration. All products already have images array.');
      await mongoose.disconnect();
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const product of products) {
      try {
        // Skip if images array already has content
        if (product.images && product.images.length > 0) {
          console.log(`⏭️  Skipped: ${product.name} (already has images array)`);
          skippedCount++;
          continue;
        }

        // Create images array from imageUrl
        product.images = [{
          url: product.imageUrl,
          isPrimary: true,
          uploadedAt: product.createdAt || new Date()
        }];

        await product.save();
        migratedCount++;

        console.log(`✅ Migrated: ${product.name}`);
      } catch (error) {
        console.error(`❌ Failed to migrate: ${product.name} - ${error.message}`);
        errors.push({
          productId: product._id,
          productName: product.name,
          error: error.message
        });
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migratedCount} products`);
    console.log(`   ⏭️  Skipped: ${skippedCount} products`);
    console.log(`   ❌ Failed: ${errors.length} products`);

    if (errors.length > 0) {
      console.log('\n❌ Migration Errors:');
      errors.forEach(err => {
        console.log(`   - ${err.productName} (${err.productId}): ${err.error}`);
      });
    }

    if (migratedCount > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log(`📸 ${migratedCount} products now have images array`);
    }

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verifyQuery = await ShopItem.find({
      images: { $exists: true, $not: { $size: 0 } }
    }).countDocuments();
    console.log(`✅ Products with images array: ${verifyQuery}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrateProductImages();
}

module.exports = migrateProductImages;
