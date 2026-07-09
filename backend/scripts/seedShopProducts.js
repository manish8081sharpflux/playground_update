/**
 * Seed Script for ISF Shop Products
 *
 * Purpose: Populate the database with realistic test data for Story-01 testing
 *
 * Usage:
 *   node backend/scripts/seedShopProducts.js
 *
 * Categories: stationery, sports, books, uniforms, digital, other
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ShopItem = require('../models/shopItem');

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';

// Placeholder image (can be replaced with real images)
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/300';

// Seed data: 30+ products across all categories
const seedProducts = [
  // ========== STATIONERY (10 products) ==========
  {
    sku: 'STAT-001',
    name: 'Blue Ballpoint Pen',
    description: 'Smooth writing blue ink ballpoint pen, perfect for everyday writing tasks',
    category: 'stationery',
    price: 5,
    stock: 100,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['writing', 'essential'],
    availableFor: ['student']
  },
  {
    sku: 'STAT-002',
    name: 'HB Pencils (Pack of 10)',
    description: 'High-quality HB graphite pencils, ideal for drawing and writing',
    category: 'stationery',
    price: 20,
    stock: 50,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['writing', 'drawing'],
    availableFor: ['student']
  },
  {
    sku: 'STAT-003',
    name: 'A4 Ruled Notebook (200 pages)',
    description: 'Durable ruled notebook with 200 pages, perfect for class notes',
    category: 'stationery',
    price: 35,
    stock: 75,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['notebook', 'essential'],
    availableFor: ['student']
  },
  {
    sku: 'STAT-004',
    name: 'Eraser (Large)',
    description: 'Large white eraser for clean corrections without smudging',
    category: 'stationery',
    price: 3,
    stock: 150,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['essential'],
    availableFor: ['student']
  },
  {
    sku: 'STAT-005',
    name: 'Geometry Set',
    description: 'Complete geometry set with compass, protractor, set squares, and ruler',
    category: 'stationery',
    price: 45,
    stock: 30,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['mathematics', 'geometry'],
    availableFor: ['student']
  },
  {
    sku: 'STAT-006',
    name: 'Colored Markers (Set of 12)',
    description: 'Vibrant colored markers for art projects and presentations',
    category: 'stationery',
    price: 40,
    stock: 8,
    lowStockThreshold: 10,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['art', 'colors'],
    availableFor: ['student']
  },
  {
    sku: 'STAT-007',
    name: 'Scientific Calculator',
    description: 'Advanced scientific calculator with 240+ functions for mathematics and science',
    category: 'stationery',
    price: 150,
    discountPrice: 120,
    stock: 20,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['mathematics', 'calculator'],
    availableFor: ['student']
  },
  {
    sku: 'STAT-008',
    name: 'Art Sketch Pad (A4)',
    description: 'Premium quality sketch pad with 50 sheets for drawing and sketching',
    category: 'stationery',
    price: 50,
    stock: 40,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['art', 'drawing'],
    availableFor: ['student']
  },
  {
    sku: 'STAT-009',
    name: 'Glue Stick (40g)',
    description: 'Non-toxic glue stick for paper crafts and school projects',
    category: 'stationery',
    price: 10,
    stock: 60,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['crafts', 'essential'],
    availableFor: ['student']
  },
  {
    sku: 'STAT-010',
    name: 'Stapler with Staples',
    description: 'Durable stapler with 1000 staples included',
    category: 'stationery',
    price: 25,
    stock: 35,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['office', 'essential'],
    availableFor: ['student']
  },

  // ========== BOOKS (8 products) ==========
  {
    sku: 'BOOK-001',
    name: 'Mathematics Workbook Grade 5',
    description: 'Comprehensive mathematics practice workbook for grade 5 students with 200+ exercises',
    category: 'books',
    price: 80,
    stock: 25,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['mathematics', 'workbook', 'grade5'],
    availableFor: ['student']
  },
  {
    sku: 'BOOK-002',
    name: 'English Grammar Guide',
    description: 'Complete English grammar guide with examples and practice exercises',
    category: 'books',
    price: 70,
    stock: 30,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['english', 'grammar', 'reference'],
    availableFor: ['student']
  },
  {
    sku: 'BOOK-003',
    name: 'Science Textbook Grade 6',
    description: 'Illustrated science textbook covering physics, chemistry, and biology topics',
    category: 'books',
    price: 120,
    stock: 18,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['science', 'textbook', 'grade6'],
    availableFor: ['student']
  },
  {
    sku: 'BOOK-004',
    name: 'World Atlas',
    description: 'Colorful world atlas with maps, country facts, and geographical information',
    category: 'books',
    price: 95,
    stock: 15,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['geography', 'atlas', 'reference'],
    availableFor: ['student']
  },
  {
    sku: 'BOOK-005',
    name: 'Hindi Vocabulary Builder',
    description: 'Build your Hindi vocabulary with 1000+ words and example sentences',
    category: 'books',
    price: 60,
    stock: 22,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['hindi', 'language', 'vocabulary'],
    availableFor: ['student']
  },
  {
    sku: 'BOOK-006',
    name: 'The Adventures of Tom Sawyer',
    description: 'Classic adventure novel by Mark Twain, perfect for young readers',
    category: 'books',
    price: 50,
    discountPrice: 40,
    stock: 12,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['fiction', 'classic', 'adventure'],
    availableFor: ['student']
  },
  {
    sku: 'BOOK-007',
    name: 'History of India',
    description: 'Comprehensive history of India from ancient times to modern day',
    category: 'books',
    price: 110,
    stock: 0,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['history', 'india', 'reference'],
    availableFor: ['student']
  },
  {
    sku: 'BOOK-008',
    name: 'Environmental Science Guide',
    description: 'Learn about ecology, conservation, and environmental issues',
    category: 'books',
    price: 75,
    stock: 28,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['science', 'environment', 'ecology'],
    availableFor: ['student']
  },

  // ========== SPORTS (7 products) ==========
  {
    sku: 'SPORT-001',
    name: 'Football Size 5',
    description: 'Professional size 5 football for outdoor play, durable synthetic leather',
    category: 'sports',
    price: 150,
    discountPrice: 120,
    stock: 8,
    lowStockThreshold: 10,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['football', 'outdoor', 'team-sport'],
    availableFor: ['student']
  },
  {
    sku: 'SPORT-002',
    name: 'Cricket Bat (Size 6)',
    description: 'Willow cricket bat for junior players, lightweight and balanced',
    category: 'sports',
    price: 200,
    stock: 10,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['cricket', 'outdoor', 'bat'],
    availableFor: ['student']
  },
  {
    sku: 'SPORT-003',
    name: 'Badminton Racket',
    description: 'Lightweight aluminum badminton racket with cover',
    category: 'sports',
    price: 180,
    stock: 15,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['badminton', 'indoor', 'racket'],
    availableFor: ['student']
  },
  {
    sku: 'SPORT-004',
    name: 'Skipping Rope',
    description: 'Adjustable length skipping rope for fitness and exercise',
    category: 'sports',
    price: 30,
    stock: 50,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['fitness', 'exercise', 'indoor'],
    availableFor: ['student']
  },
  {
    sku: 'SPORT-005',
    name: 'Basketball Size 6',
    description: 'Indoor/outdoor basketball with excellent grip and bounce',
    category: 'sports',
    price: 140,
    stock: 12,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['basketball', 'outdoor', 'team-sport'],
    availableFor: ['student']
  },
  {
    sku: 'SPORT-006',
    name: 'Chess Set',
    description: 'Complete chess set with folding board and wooden pieces',
    category: 'sports',
    price: 90,
    stock: 20,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['chess', 'indoor', 'strategy'],
    availableFor: ['student']
  },
  {
    sku: 'SPORT-007',
    name: 'Table Tennis Bat Pair',
    description: 'Professional table tennis bat pair with 3 balls included',
    category: 'sports',
    price: 100,
    stock: 0,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['table-tennis', 'indoor', 'racket'],
    availableFor: ['student']
  },

  // ========== UNIFORMS (5 products) ==========
  {
    sku: 'UNI-001',
    name: 'School Uniform Shirt (White)',
    description: 'Official ISF school uniform white shirt, breathable cotton fabric',
    category: 'uniforms',
    price: 200,
    stock: 0,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['uniform', 'shirt', 'white'],
    availableFor: ['student']
  },
  {
    sku: 'UNI-002',
    name: 'School Uniform Trousers (Blue)',
    description: 'Official ISF school uniform blue trousers, comfortable fit',
    category: 'uniforms',
    price: 250,
    stock: 35,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['uniform', 'trousers', 'blue'],
    availableFor: ['student']
  },
  {
    sku: 'UNI-003',
    name: 'Sports Uniform T-Shirt (Red)',
    description: 'ISF sports uniform t-shirt, moisture-wicking fabric',
    category: 'uniforms',
    price: 150,
    stock: 40,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['uniform', 'sports', 'tshirt'],
    availableFor: ['student']
  },
  {
    sku: 'UNI-004',
    name: 'School Tie (Blue & White)',
    description: 'Official ISF school tie with blue and white stripes',
    category: 'uniforms',
    price: 80,
    stock: 25,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['uniform', 'tie', 'accessories'],
    availableFor: ['student']
  },
  {
    sku: 'UNI-005',
    name: 'School Blazer',
    description: 'Official ISF school blazer with embroidered badge',
    category: 'uniforms',
    price: 450,
    discountPrice: 400,
    stock: 15,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['uniform', 'blazer', 'formal'],
    availableFor: ['student']
  },

  // ========== DIGITAL (4 products) ==========
  {
    sku: 'DIG-001',
    name: 'Educational Software License (Mathematics)',
    description: 'One-year license for interactive mathematics learning software',
    category: 'digital',
    price: 300,
    stock: 100,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['software', 'mathematics', 'digital'],
    availableFor: ['student']
  },
  {
    sku: 'DIG-002',
    name: 'E-Book: Complete Science Series',
    description: 'Digital access to complete science e-book series (Grades 5-8)',
    category: 'digital',
    price: 250,
    stock: 100,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['ebook', 'science', 'digital'],
    availableFor: ['student']
  },
  {
    sku: 'DIG-003',
    name: 'Online Coding Course Access',
    description: '6-month access to beginner-friendly coding course (Python basics)',
    category: 'digital',
    price: 500,
    discountPrice: 400,
    stock: 50,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['coding', 'programming', 'online-course'],
    availableFor: ['student']
  },
  {
    sku: 'DIG-004',
    name: 'Digital Art Software License',
    description: 'One-year license for digital art and design software',
    category: 'digital',
    price: 350,
    stock: 30,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['art', 'software', 'digital'],
    availableFor: ['student']
  },

  // ========== OTHER (6 products) ==========
  {
    sku: 'OTH-001',
    name: 'Water Bottle (1L)',
    description: 'Stainless steel insulated water bottle, keeps water cold for 24 hours',
    category: 'other',
    price: 120,
    stock: 45,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['water-bottle', 'hydration', 'accessories'],
    availableFor: ['student']
  },
  {
    sku: 'OTH-002',
    name: 'School Backpack (Medium)',
    description: 'Durable school backpack with multiple compartments and padded straps',
    category: 'other',
    price: 350,
    stock: 18,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['backpack', 'bag', 'accessories'],
    availableFor: ['student']
  },
  {
    sku: 'OTH-003',
    name: 'Lunch Box (2-Tier)',
    description: 'Stainless steel 2-tier lunch box, leak-proof and easy to clean',
    category: 'other',
    price: 80,
    stock: 30,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['lunch-box', 'food', 'accessories'],
    availableFor: ['student']
  },
  {
    sku: 'OTH-004',
    name: 'Pencil Case (Fabric)',
    description: 'Spacious fabric pencil case with zipper, multiple compartments',
    category: 'other',
    price: 40,
    stock: 55,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['pencil-case', 'stationery', 'accessories'],
    availableFor: ['student']
  },
  {
    sku: 'OTH-005',
    name: 'Umbrella (Compact)',
    description: 'Compact foldable umbrella, windproof and lightweight',
    category: 'other',
    price: 100,
    stock: 7,
    lowStockThreshold: 10,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['umbrella', 'weather', 'accessories'],
    availableFor: ['student']
  },
  {
    sku: 'OTH-006',
    name: 'ISF School Badge',
    description: 'Official ISF school badge with safety pin attachment',
    category: 'other',
    price: 20,
    stock: 100,
    imageUrl: PLACEHOLDER_IMAGE,
    tags: ['badge', 'accessories', 'uniform'],
    availableFor: ['student']
  }
];

// Seed function
async function seedDatabase() {
  try {
    console.log('🌱 Starting ISF Shop seed process...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully\n');

    // Clear existing shop items
    console.log('🗑️  Clearing existing shop items...');
    const deleteResult = await ShopItem.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing items\n`);

    // Insert seed data
    console.log('📦 Inserting seed products...');
    const insertedProducts = await ShopItem.insertMany(seedProducts);
    console.log(`✅ Inserted ${insertedProducts.length} products successfully\n`);

    // Summary statistics
    console.log('📊 Database Summary:');
    const categoryStats = await ShopItem.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          inStock: {
            $sum: {
              $cond: [{ $gt: ['$stock', 0] }, 1, 0]
            }
          },
          outOfStock: {
            $sum: {
              $cond: [{ $eq: ['$stock', 0] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.table(categoryStats.map(stat => ({
      Category: stat._id,
      'Total Products': stat.count,
      'In Stock': stat.inStock,
      'Out of Stock': stat.outOfStock,
      'Total Quantity': stat.totalStock
    })));

    // Price range
    const priceStats = await ShopItem.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          avgPrice: { $avg: '$price' }
        }
      }
    ]);

    console.log('\n💰 Price Range:');
    console.log(`  Min: ${priceStats[0].minPrice} coins`);
    console.log(`  Max: ${priceStats[0].maxPrice} coins`);
    console.log(`  Avg: ${Math.round(priceStats[0].avgPrice)} coins`);

    // Discount products
    const discountProducts = await ShopItem.countDocuments({ discountPrice: { $ne: null } });
    console.log(`\n🎁 Products with discounts: ${discountProducts}`);

    // Out of stock products
    const outOfStockProducts = await ShopItem.countDocuments({ stock: 0 });
    console.log(`❌ Out of stock products: ${outOfStockProducts}`);

    // Low stock products
    const lowStockProducts = await ShopItem.countDocuments({
      $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }
    });
    console.log(`⚠️  Low stock products: ${lowStockProducts}`);

    console.log('\n✅ Seed process completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start backend server: cd backend && npm start');
    console.log('   2. Start frontend server: cd frontend && npm start');
    console.log('   3. Navigate to http://localhost:3000/shop');
    console.log('   4. Run E2E tests: npx playwright test frontend/tests/e2e/sprint5-story-01.spec.js');

  } catch (error) {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run seed function
seedDatabase();
