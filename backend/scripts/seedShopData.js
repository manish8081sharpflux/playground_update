const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models
const ShopItem = require('../models/shopItem');

// Sample shop products
const shopProducts = [
  // Books & Stationery
  {
    name: 'Notebook Set (Pack of 5)',
    description: 'Premium quality ruled notebooks perfect for taking notes and journaling. Each pack contains 5 notebooks with 200 pages each.',
    price: 50,
    category: 'Books & Stationery',
    stock: 100,
    lowStockThreshold: 20,
    imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400',
    isActive: true
  },
  {
    name: 'Pen Set (Pack of 10)',
    description: 'Smooth writing ballpoint pens in assorted colors. Perfect for everyday writing needs.',
    price: 25,
    category: 'Books & Stationery',
    stock: 150,
    lowStockThreshold: 30,
    imageUrl: 'https://images.unsplash.com/photo-1586951459817-f3b6f7922c62?w=400',
    isActive: true
  },
  {
    name: 'Art Supplies Kit',
    description: 'Complete art kit with colored pencils, crayons, markers, and a sketchbook.',
    price: 120,
    category: 'Books & Stationery',
    stock: 50,
    lowStockThreshold: 10,
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
    isActive: true
  },
  {
    name: 'Dictionary - English',
    description: 'Comprehensive English dictionary perfect for students to improve vocabulary.',
    price: 80,
    category: 'Books & Stationery',
    stock: 40,
    lowStockThreshold: 10,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
    isActive: true
  },

  // Sports & Fitness
  {
    name: 'Cricket Bat',
    description: 'High-quality wooden cricket bat suitable for practice and matches.',
    price: 250,
    category: 'Sports & Fitness',
    stock: 30,
    lowStockThreshold: 5,
    imageUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400',
    isActive: true
  },
  {
    name: 'Football',
    description: 'Standard size 5 football perfect for outdoor games and practice.',
    price: 180,
    category: 'Sports & Fitness',
    stock: 40,
    lowStockThreshold: 10,
    imageUrl: 'https://images.unsplash.com/photo-1552318965-6e6be7484ada?w=400',
    isActive: true
  },
  {
    name: 'Badminton Racket',
    description: 'Lightweight badminton racket ideal for beginners and intermediate players.',
    price: 150,
    category: 'Sports & Fitness',
    stock: 35,
    lowStockThreshold: 8,
    imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400',
    isActive: true
  },
  {
    name: 'Skipping Rope',
    description: 'Adjustable skipping rope for fitness and cardio exercises.',
    price: 30,
    category: 'Sports & Fitness',
    stock: 80,
    lowStockThreshold: 15,
    imageUrl: 'https://images.unsplash.com/photo-1517836477839-7072aaa8b121?w=400',
    isActive: true
  },

  // Musical Instruments
  {
    name: 'Acoustic Guitar',
    description: 'Beginner-friendly acoustic guitar with nylon strings.',
    price: 400,
    category: 'Musical Instruments',
    stock: 15,
    lowStockThreshold: 3,
    imageUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400',
    isActive: true
  },
  {
    name: 'Keyboard - 61 Keys',
    description: 'Electronic keyboard with 61 keys, perfect for learning music.',
    price: 450,
    category: 'Musical Instruments',
    stock: 12,
    lowStockThreshold: 3,
    imageUrl: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=400',
    isActive: true
  },
  {
    name: 'Tabla Set',
    description: 'Traditional Indian percussion instrument - complete tabla set.',
    price: 350,
    category: 'Musical Instruments',
    stock: 10,
    lowStockThreshold: 2,
    imageUrl: 'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=400',
    isActive: true
  },
  {
    name: 'Harmonica',
    description: 'Beginner-friendly harmonica in key of C.',
    price: 80,
    category: 'Musical Instruments',
    stock: 50,
    lowStockThreshold: 10,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    isActive: true
  },

  // Toys & Games
  {
    name: 'Chess Board Set',
    description: 'Complete chess set with wooden board and pieces.',
    price: 120,
    category: 'Toys & Games',
    stock: 30,
    lowStockThreshold: 5,
    imageUrl: 'https://images.unsplash.com/photo-1560174036-641f7d853e5a?w=400',
    isActive: true
  },
  {
    name: 'Puzzle - 1000 Pieces',
    description: 'Challenging 1000-piece jigsaw puzzle for family fun.',
    price: 90,
    category: 'Toys & Games',
    stock: 40,
    lowStockThreshold: 10,
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
    isActive: true
  },
  {
    name: 'Building Blocks Set',
    description: 'Creative building blocks set with 500+ pieces.',
    price: 150,
    category: 'Toys & Games',
    stock: 45,
    lowStockThreshold: 10,
    imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400',
    isActive: true
  },
  {
    name: 'Carrom Board',
    description: 'Standard size carrom board with coins and striker.',
    price: 200,
    category: 'Toys & Games',
    stock: 20,
    lowStockThreshold: 5,
    imageUrl: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=400',
    isActive: true
  },

  // Electronics
  {
    name: 'USB Flash Drive 32GB',
    description: 'High-speed 32GB USB flash drive for data storage.',
    price: 80,
    category: 'Electronics',
    stock: 60,
    lowStockThreshold: 15,
    imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400',
    isActive: true
  },
  {
    name: 'Earphones',
    description: 'Comfortable in-ear earphones with good sound quality.',
    price: 70,
    category: 'Electronics',
    stock: 100,
    lowStockThreshold: 20,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
    isActive: true
  },
  {
    name: 'Power Bank 10000mAh',
    description: 'Portable power bank to charge your devices on the go.',
    price: 150,
    category: 'Electronics',
    stock: 40,
    lowStockThreshold: 10,
    imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400',
    isActive: true
  },
  {
    name: 'Digital Watch',
    description: 'Sporty digital watch with alarm and stopwatch features.',
    price: 100,
    category: 'Electronics',
    stock: 55,
    lowStockThreshold: 12,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    isActive: true
  },

  // Clothing & Accessories
  {
    name: 'Sports T-Shirt',
    description: 'Comfortable cotton sports t-shirt available in multiple sizes.',
    price: 70,
    category: 'Clothing & Accessories',
    stock: 80,
    lowStockThreshold: 15,
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    isActive: true
  },
  {
    name: 'School Bag',
    description: 'Durable school backpack with multiple compartments.',
    price: 180,
    category: 'Clothing & Accessories',
    stock: 50,
    lowStockThreshold: 10,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    isActive: true
  },
  {
    name: 'Water Bottle',
    description: 'Insulated stainless steel water bottle - 750ml capacity.',
    price: 60,
    category: 'Clothing & Accessories',
    stock: 90,
    lowStockThreshold: 20,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
    isActive: true
  },
  {
    name: 'Cap/Hat',
    description: 'Stylish sports cap for sun protection.',
    price: 40,
    category: 'Clothing & Accessories',
    stock: 70,
    lowStockThreshold: 15,
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400',
    isActive: true
  },

  // Hygiene & Personal Care
  {
    name: 'Toothbrush & Toothpaste Set',
    description: 'Dental hygiene set with soft-bristle toothbrush and fluoride toothpaste.',
    price: 35,
    category: 'Hygiene & Personal Care',
    stock: 120,
    lowStockThreshold: 25,
    imageUrl: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400',
    isActive: true
  },
  {
    name: 'Soap Set (Pack of 3)',
    description: 'Natural glycerin soap bars for gentle skin cleansing.',
    price: 45,
    category: 'Hygiene & Personal Care',
    stock: 100,
    lowStockThreshold: 20,
    imageUrl: 'https://images.unsplash.com/photo-1588016207-8576da26cf92?w=400',
    isActive: true
  },
  {
    name: 'Hand Sanitizer 500ml',
    description: 'Antibacterial hand sanitizer with 70% alcohol content.',
    price: 50,
    category: 'Hygiene & Personal Care',
    stock: 80,
    lowStockThreshold: 15,
    imageUrl: 'https://images.unsplash.com/photo-1584744982493-c48f8e6c1616?w=400',
    isActive: true
  },
  {
    name: 'Towel Set',
    description: 'Soft cotton towel set - 2 pieces.',
    price: 90,
    category: 'Hygiene & Personal Care',
    stock: 60,
    lowStockThreshold: 12,
    imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400',
    isActive: true
  },

  // Snacks & Treats
  {
    name: 'Chocolate Bar',
    description: 'Delicious milk chocolate bar - 100g.',
    price: 20,
    category: 'Snacks & Treats',
    stock: 200,
    lowStockThreshold: 40,
    imageUrl: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=400',
    isActive: true
  },
  {
    name: 'Biscuit Pack',
    description: 'Assorted biscuits in family pack - 400g.',
    price: 30,
    category: 'Snacks & Treats',
    stock: 150,
    lowStockThreshold: 30,
    imageUrl: 'https://images.unsplash.com/photo-1548848614-d2b8e7fef9d1?w=400',
    isActive: true
  },
  {
    name: 'Juice Tetra Pack',
    description: 'Fresh fruit juice - 1 liter tetra pack.',
    price: 40,
    category: 'Snacks & Treats',
    stock: 100,
    lowStockThreshold: 20,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
    isActive: true
  },
  {
    name: 'Dry Fruits Mix 250g',
    description: 'Healthy mix of almonds, cashews, and raisins.',
    price: 100,
    category: 'Snacks & Treats',
    stock: 80,
    lowStockThreshold: 15,
    imageUrl: 'https://images.unsplash.com/photo-1508736793122-f516e3ba5569?w=400',
    isActive: true
  }
];

async function seedShopData() {
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

    // Check if products already exist
    const existingCount = await ShopItem.countDocuments();

    if (existingCount > 0) {
      console.log(`\n⚠️  Database already contains ${existingCount} products.`);
      console.log('Do you want to:');
      console.log('  1. Add more products (keep existing)');
      console.log('  2. Replace all products (delete existing)');
      console.log('  3. Cancel');
      console.log('\nTo replace all products, run: node backend/scripts/seedShopData.js --replace');

      if (!process.argv.includes('--replace')) {
        console.log('\n❌ Cancelled. Use --replace flag to replace existing products.');
        await mongoose.disconnect();
        process.exit(0);
      }

      // Delete existing products
      console.log('\n🗑️  Deleting existing products...');
      await ShopItem.deleteMany({});
      console.log('✅ Deleted all existing products');
    }

    // Insert new products
    console.log(`\n📦 Inserting ${shopProducts.length} products...`);
    const result = await ShopItem.insertMany(shopProducts);
    console.log(`✅ Successfully inserted ${result.length} products`);

    // Show summary
    const categories = await ShopItem.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    console.log('\n📊 Products by category:');
    categories.forEach(cat => {
      console.log(`  - ${cat._id}: ${cat.count} products`);
    });

    console.log('\n🎉 Shop data seeding completed successfully!');
    console.log('\n💡 You can now browse products at: http://localhost:3000/shop');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedShopData();
