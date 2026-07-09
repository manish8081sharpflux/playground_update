const mongoose = require('mongoose');
const ShopItem = require('../models/shopItem');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';

// Repairs category products for testing
const repairsProducts = [
    {
        name: 'Broken Chair Repair',
        description: 'Professional repair service for broken chairs including welding and wood work',
        price: 150,
        category: 'other',
        purchaseCategory: 'Repairs',
        stock: 0,  // Services don't have stock
        lowStockThreshold: 0,
        sku: 'REP-CHAIR-001',
        imageUrl: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=400',
        isActive: true,
        isService: true,
        isPendingProduct: true  // Bypass stock filter - services are always available
    },
    {
        name: 'Plumbing Repair Service',
        description: 'Plumbing repair including pipe fixing, leak repairs, and drain cleaning',
        price: 250,
        category: 'other',
        purchaseCategory: 'Repairs',
        stock: 0,  // Services don't have stock
        lowStockThreshold: 0,
        sku: 'REP-PLUMB-001',
        imageUrl: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400',
        isActive: true,
        isService: true,
        isPendingProduct: true  // Bypass stock filter - services are always available
    },
    {
        name: 'Electrical Repair Service',
        description: 'Electrical repairs including wiring, switch replacement, and fixture installation',
        price: 200,
        category: 'other',
        purchaseCategory: 'Repairs',
        stock: 0,  // Services don't have stock
        lowStockThreshold: 0,
        sku: 'REP-ELEC-001',
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
        isActive: true,
        isService: true,
        isPendingProduct: true  // Bypass stock filter - services are always available
    },
    {
        name: 'Appliance Repair',
        description: 'Repair service for household appliances - fans, mixers, grinders, etc.',
        price: 180,
        category: 'other',
        purchaseCategory: 'Repairs',
        stock: 0,  // Services don't have stock
        lowStockThreshold: 0,
        sku: 'REP-APPL-001',
        imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400',
        isActive: true,
        isService: true,
        isPendingProduct: true  // Bypass stock filter - services are always available
    },
    {
        name: 'Door/Window Repair',
        description: 'Carpentry repair for doors, windows, cupboards, etc.',
        price: 175,
        category: 'other',
        purchaseCategory: 'Repairs',
        stock: 0,  // Services don't have stock
        lowStockThreshold: 0,
        sku: 'REP-CARP-001',
        imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400',
        isActive: true,
        isService: true,
        isPendingProduct: true  // Bypass stock filter - services are always available
    }
];

async function seedRepairsProducts() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Check if Repairs products already exist
        const existingRepairs = await ShopItem.find({ purchaseCategory: 'Repairs' });

        if (existingRepairs.length > 0) {
            console.log(`⚠️  Found ${existingRepairs.length} existing Repairs products:`);
            existingRepairs.forEach(item => {
                console.log(`   - ${item.name} (${item.sku})`);
            });
            console.log('\n❌ Repairs products already exist. Use --replace flag to replace them.');

            if (!process.argv.includes('--replace')) {
                await mongoose.connection.close();
                process.exit(0);
            }

            console.log('\n🗑️  Deleting existing Repairs products...');
            await ShopItem.deleteMany({ purchaseCategory: 'Repairs' });
            console.log('✅ Deleted existing Repairs products');
        }

        // Insert Repairs products
        console.log(`\n📦 Inserting ${repairsProducts.length} Repairs products...`);
        const result = await ShopItem.insertMany(repairsProducts);
        console.log(`✅ Successfully inserted ${result.length} products\n`);

        console.log('📋 Repairs products created:');
        result.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.name}`);
            console.log(`      SKU: ${item.sku}`);
            console.log(`      Price: ₹${item.price}`);
            console.log(`      Category: ${item.purchaseCategory}`);
        });

        console.log('\n✅ Repairs test data seeding completed!');
        console.log('\n💡 Next step: Create a purchase request with category "Repairs"');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

seedRepairsProducts();
