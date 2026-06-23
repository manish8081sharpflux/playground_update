const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models
const ShopItem = require('../models/shopItem');

async function checkProducts() {
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

    // Count products
    const productCount = await ShopItem.countDocuments();
    console.log(`\n📦 Total products in database: ${productCount}`);

    if (productCount === 0) {
      console.log('\n⚠️  No products found! Database is empty.');
      console.log('💡 Run the seed script to add products:');
      console.log('   node backend/scripts/seedShopData.js');
    } else {
      // Show sample products
      const products = await ShopItem.find().limit(5).select('name price stock category isActive');
      console.log('\n📋 Sample products:');
      products.forEach(product => {
        console.log(`  - ${product.name} | ₹${product.price} | Stock: ${product.stock} | Active: ${product.isActive}`);
      });

      // Show category distribution
      const categories = await ShopItem.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);
      console.log('\n📊 Products by category:');
      categories.forEach(cat => {
        console.log(`  - ${cat._id}: ${cat.count} products`);
      });

      // Show active vs inactive
      const activeCount = await ShopItem.countDocuments({ isActive: true });
      const inactiveCount = await ShopItem.countDocuments({ isActive: false });
      console.log('\n🔍 Product status:');
      console.log(`  - Active: ${activeCount}`);
      console.log(`  - Inactive: ${inactiveCount}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkProducts();
